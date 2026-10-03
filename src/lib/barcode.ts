/** Достаём из отсканированного текста номер товара (GTIN), а не случайные цифры из чека или ссылки. */

function asGtin(value: string): string | null {
  return /^\d{8}$|^\d{12,14}$/.test(value) ? normalizeGtin(value) : null;
}

/** Контрольная цифра EAN-8 / UPC-A / EAN-13 / GTIN-14. */
export function validGtinChecksum(code: string): boolean {
  let d = code.replace(/\D/g, "");
  if (d.length === 12) d = "0" + d;
  if (d.length !== 8 && d.length !== 13 && d.length !== 14) return false;
  const digits = d.split("").map(Number);
  const body = digits.slice(0, -1);
  // EAN-13: позиция 1 (индекс 0) ×1; EAN-8 и GTIN-14: индекс 0 ×3.
  const oddWeightIsOne = d.length === 13;
  const sum = body.reduce((total, digit, index) => {
    const odd = index % 2 === 0;
    return total + digit * (odd === oddWeightIsOne ? 1 : 3);
  }, 0);
  return (10 - (sum % 10)) % 10 === digits[digits.length - 1];
}

/**
 * На этикетке рядом со штрихкодом часто стоят срок годности («120» дней),
 * вес или хвост маркировки — сканер склеивает их в одно длинное число.
 * Берём самый длинный префикс с верной контрольной цифрой.
 */
function fromLongDigits(digits: string): string | null {
  if (/^\d{8}$|^\d{12,14}$/.test(digits)) return normalizeGtin(digits);
  if (digits.length < 15 || digits.length > 20) return null;
  for (const len of [14, 13, 12, 8]) {
    const slice = digits.slice(0, len);
    if (validGtinChecksum(slice)) return normalizeGtin(slice);
  }
  return null;
}

function fromGs1(text: string): string | null {
  // GTIN-14 после AI (01) — обычный Честный знак.
  const gtin14 = text.match(/(?:\(01\)|01)(\d{14})(?=\D|21|10|17|15|11|\x1D|$)/);
  if (gtin14) return asGtin(gtin14[1]);
  // Иногда в код кладут EAN-13 без ведущего нуля: 01 + 13 цифр.
  const gtin13 = text.match(/(?:\(01\)|01)(\d{13})(?=\D|21|10|17|15|11|\x1D|$)/);
  return gtin13 ? asGtin(gtin13[1]) : null;
}

function fromUrl(text: string): string | null {
  if (!/^https?:\/\//i.test(text)) return null;
  try {
    const url = new URL(text);
    for (const key of ["gtin", "ean", "barcode", "code", "upc"]) {
      const value = url.searchParams.get(key);
      if (value && asGtin(value.replace(/\D/g, ""))) return asGtin(value.replace(/\D/g, ""));
    }
    const digitalLink = url.pathname.match(/\/01\/(\d{14})(?:\/|$)/);
    if (digitalLink) return asGtin(digitalLink[1]);
    const segment = url.pathname.match(/(?:^|\/)(\d{8}|\d{12,14})(?:\/|$)/);
    return segment ? asGtin(segment[1]) : null;
  } catch {
    return null;
  }
}

/** Все правдоподобные GTIN из сырого скана: EAN, GTIN-14, код + «120» с этикетки. */
export function gtinCandidates(raw: string): string[] {
  const text = raw.trim().replace(/^\][A-Za-z]\d/, "").replace(/^\x1D/, "");
  if (!text) return [];
  const out: string[] = [];
  const push = (value: string | null) => {
    if (value && !out.includes(value)) out.push(value);
  };

  push(fromGs1(text));
  push(fromUrl(text));

  // Цифры из чека/ссылки не выдираем: только чистый номер (с пробелами) или GS1/URL выше.
  if (/^[\d\s-]+$/.test(text)) {
    const digits = text.replace(/\D/g, "");
    push(fromLongDigits(digits));
    push(asGtin(digits));
  }

  return out;
}

export function extractBarcode(raw: string): string | null {
  return gtinCandidates(raw)[0] ?? null;
}

/** ITF-14 с ведущими нулями → EAN-13; UPC-A (12) → EAN-13. */
export function normalizeGtin(code: string): string {
  let c = code.replace(/\D/g, "");
  while (c.length > 13 && c.startsWith("0")) c = c.slice(1);
  if (c.length === 12) c = "0" + c;
  return c;
}

/** UPC-E разворачиваем только когда формат известен: 8-значный EAN-8 так нельзя. */
export function expandUpce(code: string): string {
  if (!/^[01]\d{7}$/.test(code)) return code;
  const [system, a, b, c, d, e, f, check] = code;
  let body: string;
  if (f <= "2") body = `${a}${b}${f}0000${c}${d}${e}`;
  else if (f === "3") body = `${a}${b}${c}00000${d}${e}`;
  else if (f === "4") body = `${a}${b}${c}${d}00000${e}`;
  else body = `${a}${b}${c}${d}${e}0000${f}`;
  return system + body + check;
}

export function sameBarcode(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const compact = (value: string) => normalizeGtin(value).replace(/^0+/, "");
  return !!compact(a) && compact(a) === compact(b);
}

/** Совпадение с карточкой: EAN, GTIN-14, код с ведущим нулём или хвостом «120». */
export function productMatchesBarcode(product: { barcode?: string }, code?: string): boolean {
  if (!product.barcode || !code) return false;
  if (sameBarcode(product.barcode, code)) return true;
  return gtinCandidates(code).some((candidate) => sameBarcode(product.barcode, candidate));
}
