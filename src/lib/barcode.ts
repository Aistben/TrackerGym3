/** Достаём из отсканированного текста номер товара (GTIN), а не случайные цифры из чека или ссылки. */
export function extractBarcode(raw: string): string | null {
  const text = raw.trim().replace(/^\][A-Za-z]\d/, "").replace(/^\x1D/, "");
  if (!text) return null;
  const normalize = (value: string) => /^\d{8}$|^\d{12,14}$/.test(value) ? normalizeGtin(value) : null;

  // GS1: элемент (01)GTIN и коды «Честного знака». Разделители не удаляем,
  // чтобы поля не склеивались в одно длинное число.
  const ai = text.match(/^(?:\(01\)|01)(\d{14})(?=\D|21|10|17|15|11|\x1D|$)/);
  if (ai) return normalize(ai[1]);

  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      for (const key of ["gtin", "ean", "barcode", "code", "upc"]) {
        const value = url.searchParams.get(key);
        if (value && normalize(value)) return normalize(value);
      }
      const digitalLink = url.pathname.match(/\/01\/(\d{14})(?:\/|$)/);
      if (digitalLink) return normalize(digitalLink[1]);
      const segment = url.pathname.match(/(?:^|\/)(\d{8}|\d{12,14})(?:\/|$)/);
      return segment ? normalize(segment[1]) : null;
    } catch {
      return null;
    }
  }

  // Пробелы и дефисы при ручном вводе допускаем, буквы мусорного кода — нет.
  if (/^[\d\s-]+$/.test(text)) return normalize(text.replace(/[\s-]/g, ""));
  return null;
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
