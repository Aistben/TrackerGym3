import assert from "node:assert/strict";
import test from "node:test";
import { BarcodeFormat } from "@zxing/library";
import { createNativeDetector, NATIVE_FORMATS, pickProductCode } from "../src/lib/scannerDetector";

function fakeNative(supported?: string[]) {
  const calls: string[][] = [];
  class Fake {
    static getSupportedFormats = supported ? async () => supported : undefined;
    constructor(options: { formats: string[] }) {
      calls.push(options.formats);
    }
    async detect() {
      return [];
    }
  }
  return { Fake, calls };
}

test("без BarcodeDetector уходим на ZXing", async () => {
  assert.equal(await createNativeDetector(undefined), null);
});

test("используем только реально поддерживаемые форматы", async () => {
  const { Fake, calls } = fakeNative(["ean_13", "qr_code", "nonsense"]);
  const detector = await createNativeDetector(Fake);
  assert.ok(detector);
  assert.deepEqual(calls[0], ["ean_13", "qr_code"]);
});

test("если нужных форматов нет — не ломаем сканер, а уходим на ZXing", async () => {
  const { Fake } = fakeNative([]);
  assert.equal(await createNativeDetector(Fake), null);
});

test("без getSupportedFormats пробуем все форматы", async () => {
  const { Fake, calls } = fakeNative();
  const detector = await createNativeDetector(Fake);
  assert.ok(detector);
  assert.deepEqual(calls[0], NATIVE_FORMATS);
});

test("pickProductCode: выбирает код товара среди прочих кодов", () => {
  assert.equal(pickProductCode([]), null);
  assert.equal(pickProductCode([{ rawValue: "https://moloko.ru/promo" }]), null);
  assert.equal(
    pickProductCode([
      { rawValue: "https://moloko.ru/promo" },
      { rawValue: "4600494561238", format: "ean_13" },
    ]),
    "4600494561238",
  );
  assert.equal(pickProductCode([{ rawValue: "010460049456123821ABC", format: "data_matrix" }]), "4600494561238");
  // GTIN-14 из маркировки этого зефира нормализуется к EAN-13 в локальной базе.
  assert.equal(pickProductCode([{ rawValue: "010460351300687121ABC123", format: "data_matrix" }]), "4603513006871");
  // Срок годности «120» на этикетке не должен приклеиваться к номеру товара.
  assert.equal(pickProductCode([{ rawValue: "4603513006871120", format: "ean_13" }]), "4603513006871");
  // UPC-A разворачивается и приводится к EAN-13 — как и все остальные коды в приложении.
  assert.equal(pickProductCode([{ rawValue: "01234565", format: "upc_e" }]), "0012345000065");
  assert.equal(pickProductCode([{ rawValue: "01234565", format: BarcodeFormat.UPC_E }]), "0012345000065");
  assert.equal(pickProductCode([{ rawValue: "01234565", format: "ean_8" }]), "01234565");
});

test("исключение в конструкторе не роняет приложение", async () => {
  class Boom {
    constructor() {
      throw new Error("nope");
    }
    async detect() {
      return [];
    }
  }
  assert.equal(await createNativeDetector(Boom as any), null);
});
