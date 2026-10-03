import assert from "node:assert/strict";
import test from "node:test";
import bwipjs from "bwip-js/node";
import { PNG } from "pngjs";
import { decodePixels, pickProductCode, scanRegions } from "../src/lib/scannerDetector";

type Raster = { width: number; height: number; data: Uint8ClampedArray };

async function render(bcid: string, text: string, options: Record<string, unknown> = {}): Promise<Raster> {
  const buffer = await bwipjs.toBuffer({ bcid, text, scale: 3, padding: 8, backgroundcolor: "FFFFFF", ...options } as any);
  const png = PNG.sync.read(buffer);
  return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
}

/** Как кадр с камеры: картинку уменьшаем (в приложении live-кадр — до 800 px). */
function downscale(image: Raster, targetWidth: number): Raster {
  const scale = targetWidth / image.width;
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = Math.min(image.width - 1, Math.floor(x / scale));
      const sy = Math.min(image.height - 1, Math.floor(y / scale));
      const src = (sy * image.width + sx) * 4;
      const dst = (y * width + x) * 4;
      for (let c = 0; c < 4; c++) data[dst + c] = image.data[src + c];
    }
  }
  return { width, height, data };
}

/** Два кода рядом, как на упаковке: рекламный QR и товарный штрихкод. */
function sideBySide(left: Raster, right: Raster): Raster {
  const height = Math.max(left.height, right.height) + 20;
  const width = left.width + right.width + 30;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (const [offset, image] of [
    [0, left],
    [left.width + 30, right],
  ] as const) {
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const src = (y * image.width + x) * 4;
        const dst = (y * width + offset + x) * 4;
        for (let c = 0; c < 4; c++) data[dst + c] = image.data[src + c];
      }
    }
  }
  return { width, height, data };
}

function decode(image: Raster, options?: { tryHarder?: boolean; multiple?: boolean }) {
  return decodePixels(image.data, image.width, image.height, options);
}

function codes(results: ReturnType<typeof decode>) {
  return results.map((r) => ({ rawValue: r.getText(), format: r.getBarcodeFormat() }));
}

test("QR с номером товара читается на уменьшенном кадре (live-режим)", async () => {
  const qr = await render("qrcode", "https://example.com/product?gtin=4600494561238");
  const frame = downscale(qr, 480);
  const results = decode(frame);
  assert.ok(results.length, "QR не распознан");
  assert.equal(pickProductCode(codes(results)), "4600494561238");
});

test("QR с голым GTIN и DataMatrix Честного знака читаются", async () => {
  const qr = await render("qrcode", "4600494561238");
  assert.equal(pickProductCode(codes(decode(qr))), "4600494561238");

  const matrix = await render("gs1datamatrix", "(01)04600494561238(21)ABC123");
  assert.equal(pickProductCode(codes(decode(matrix))), "4600494561238");
});

test("EAN-13 читается в live-режиме после уменьшения кадра", async () => {
  const ean = await render("ean13", "4600494561238");
  const results = decode(downscale(ean, 640));
  assert.equal(pickProductCode(codes(results)), "4600494561238");
});

test("на фото с рекламным QR рядом со штрихкодом товарный код всё равно находится", async () => {
  const promoQr = await render("qrcode", "https://moloko.ru/promo");
  const ean = await render("ean13", "4600494561238");
  const photo = sideBySide(promoQr, ean);

  // Одиночный проход по всему кадру вернёт не больше одного кода, и им
  // вполне может оказаться рекламный QR — поэтому фото разбираем по областям.
  assert.ok(codes(decode(photo)).length <= 1);
  const results = decode(photo, { tryHarder: true, multiple: true });
  assert.equal(pickProductCode(codes(results)), "4600494561238");
});

test("рекламный QR без номера товара не превращается в штрихкод", async () => {
  const promoQr = await render("qrcode", "https://moloko.ru/promo");
  assert.equal(pickProductCode(codes(decode(promoQr))), null);
});

test("scanRegions покрывает центр и края кадра", () => {
  const regions = scanRegions(800, 600);
  assert.ok(regions.length >= 5 && regions.length <= 8);
  assert.deepEqual(regions[0], { x: 0, y: 0, w: 800, h: 600 });
  const reachesRight = regions.some((r) => r.x + r.w === 800);
  const reachesBottom = regions.some((r) => r.y + r.h === 600);
  assert.ok(reachesRight && reachesBottom);
});

test("битые пиксели не роняют декодер", () => {
  assert.deepEqual(decodePixels(new Uint8ClampedArray(0), 0, 0), []);
  assert.deepEqual(decodePixels(new Uint8ClampedArray(4), 100, 100), []);
});
