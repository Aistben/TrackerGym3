import assert from "node:assert/strict";
import test from "node:test";
import { expandUpce, extractBarcode, gtinCandidates, productMatchesBarcode, validGtinChecksum, normalizeGtin, sameBarcode } from "../src/lib/barcode";

test("обычные штрихкоды EAN/UPC/ITF", () => {
  assert.equal(extractBarcode("4600494561238"), "4600494561238");
  assert.equal(extractBarcode(" 4600494561238 "), "4600494561238");
  assert.equal(extractBarcode("4600 4945 61238"), "4600494561238");
  assert.equal(extractBarcode("04600494561238"), "4600494561238"); // ITF-14
  assert.equal(extractBarcode("0460049456123"), "0460049456123"); // EAN-13 с ведущим нулём
  assert.equal(extractBarcode("46004940"), "46004940"); // EAN-8
  assert.equal(extractBarcode("4600494561"), null); // 10 цифр — не GTIN
  assert.equal(extractBarcode("привет"), null);
});

test("GS1: DataMatrix и Честный знак", () => {
  assert.equal(extractBarcode("0104600494561238215B2X!E"), "4600494561238");
  assert.equal(extractBarcode("(01)04600494561238(21)ABC"), "4600494561238");
  assert.equal(extractBarcode("\x1D0104600494561238\x1D21ABC"), "4600494561238");
  assert.equal(extractBarcode("]d2010460049456123821ABC"), "4600494561238"); // префикс AIM
});

test("QR со ссылкой", () => {
  assert.equal(extractBarcode("https://example.com/01/04600494561238/10/ABC"), "4600494561238");
  assert.equal(extractBarcode("https://example.com/product?gtin=04600494561238"), "4600494561238");
  assert.equal(extractBarcode("https://example.com/product?ean=4600494561238"), "4600494561238");
  assert.equal(extractBarcode("https://example.com/p/4600494561238"), "4600494561238");
  // Ссылка на сайт производителя без номера товара не должна «находить» случайные цифры.
  assert.equal(extractBarcode("https://moloko.ru/about/2024"), null);
  assert.equal(extractBarcode("https://example.com"), null);
});

test("мусорные QR не превращаются в штрихкод", () => {
  assert.equal(extractBarcode("SKU123456788"), null);
  assert.equal(extractBarcode("t=20201003&s=1234.56"), null);
  assert.equal(extractBarcode("Наименование товара 4600494561238 шт"), null);
});

test("хвост «120» со срока годности не ломает EAN-13", () => {
  // На стикере зефира Сокол рядом со штрихкодом стоит «срок годности 120 дней».
  assert.equal(validGtinChecksum("4603513006871"), true);
  assert.equal(extractBarcode("4603513006871120"), "4603513006871");
  assert.equal(extractBarcode("4603513006871 120"), "4603513006871");
  assert.ok(gtinCandidates("4603513006871120").includes("4603513006871"));
  assert.equal(productMatchesBarcode({ barcode: "4603513006871" }, "4603513006871120"), true);
  assert.equal(productMatchesBarcode({ barcode: "4603513006871" }, "04603513006871"), true);
});

test("GS1 с EAN-13 без ведущего нуля в GTIN-14", () => {
  assert.equal(extractBarcode("01460351300687121ABC"), "4603513006871");
});

test("normalizeGtin и sameBarcode", () => {
  assert.equal(normalizeGtin("04600494561238"), "4600494561238");
  assert.equal(normalizeGtin("4600494561238"), "4600494561238");
  assert.equal(normalizeGtin("400638133393"), "0400638133393"); // UPC-A → EAN-13
  assert.equal(sameBarcode("04600494561238", "4600494561238"), true);
  assert.equal(sameBarcode("04600494561238", "4600494561239"), false);
  assert.equal(sameBarcode("", "4600494561238"), false);
  assert.equal(sameBarcode("000", "0000"), false);
});

function upcCheckDigit(data11: string) {
  let sum = 0;
  for (let i = 0; i < 11; i++) sum += Number(data11[i]) * (i % 2 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}

function makeUpce(e1: string, e2: string, e3: string, e4: string, e5: string, e6: string) {
  const body =
    e6 <= "2" ? `${e1}${e2}${e6}0000${e3}${e4}${e5}` : e6 === "3" ? `${e1}${e2}${e3}00000${e4}${e5}` : e6 === "4" ? `${e1}${e2}${e3}${e4}00000${e5}` : `${e1}${e2}${e3}${e4}${e5}0000${e6}`;
  const upcaData = "0" + body;
  return "0" + e1 + e2 + e3 + e4 + e5 + e6 + upcCheckDigit(upcaData);
}

test("UPC-E разворачивается только когда формат известен", () => {
  assert.equal(expandUpce("01234565"), "012345000065"); // классический пример
  for (const digits of ["123451", "123453", "123454", "123456"]) {
    const [e1, e2, e3, e4, e5, e6] = digits;
    const upce = makeUpce(e1, e2, e3, e4, e5, e6);
    const upca = expandUpce(upce);
    assert.equal(upca.length, 12);
    assert.equal(upca.slice(11), upcCheckDigit(upca.slice(0, 11)), `контрольная цифра для ${upce}`);
  }
  assert.equal(expandUpce("46012345"), "46012345"); // EAN-8 не трогаем
});
