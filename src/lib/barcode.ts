/**
 * Из отсканированного текста достаём GTIN/штрихкод.
 * Поддержка:
 *  - обычный EAN-8 / EAN-13 / UPC-A / UPC-E / ITF-14 (только цифры)
 *  - GS1 Digital Link: https://example.com/01/04600494561238/10/ABC
 *  - произвольная ссылка с параметром ?gtin= / ?ean= / ?barcode=
 *  - GS1-128 с AI (01)
 *  - ссылка, где в пути просто лежит 8–14-значное число
 */
export function extractBarcode(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  const digitsOnly = text.replace(/\D/g, "");
  if (/^\d{8,14}$/.test(text)) return normalizeGtin(text);

  // GS1-128 / элемент (01)GTIN
  const ai = text.match(/\(01\)(\d{14})|^01(\d{14})/);
  if (ai) return normalizeGtin(ai[1] ?? ai[2]);

  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      for (const key of ["gtin", "ean", "barcode", "code", "upc"]) {
        const v = url.searchParams.get(key);
        if (v && /^\d{8,14}$/.test(v)) return normalizeGtin(v);
      }
      // GS1 Digital Link: /01/<gtin>
      const dl = url.pathname.match(/\/01\/(\d{8,14})/);
      if (dl) return normalizeGtin(dl[1]);
      // просто число в пути
      const any = url.pathname.match(/(?:^|\/)(\d{8,14})(?:\/|$)/);
      if (any) return normalizeGtin(any[1]);
    } catch {
      /* не URL */
    }
  }

  if (/^\d{8,14}$/.test(digitsOnly)) return normalizeGtin(digitsOnly);
  return null;
}

/** ITF-14 / GTIN-14 с ведущими нулями → EAN-13, UPC-A (12) → EAN-13 */
export function normalizeGtin(code: string): string {
  let c = code.replace(/\D/g, "");
  while (c.length > 13 && c.startsWith("0")) c = c.slice(1);
  if (c.length === 12) c = "0" + c;
  return c;
}
