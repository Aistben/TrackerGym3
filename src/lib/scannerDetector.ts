import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
  type Result,
} from "@zxing/library";
import { expandUpce, extractBarcode } from "./barcode";

/** Форматы, которые ищем и нативным детектором, и через ZXing. */
export const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
];

export const ZXING_HINTS = new Map<DecodeHintType, any>([[DecodeHintType.POSSIBLE_FORMATS, FORMATS]]);

export const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code", "data_matrix"];

type DetectedCode = { rawValue: string; format?: string | number };
export type NativeDetector = {
  detect: (source: HTMLVideoElement | HTMLImageElement) => Promise<DetectedCode[]>;
};
type DetectorConstructor = {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats?: () => Promise<string[]>;
};

/**
 * Нативный BarcodeDetector может поддерживать только часть форматов (часто нет
 * QR/DataMatrix). Поэтому возвращаем его как «ускоритель», а не как замену
 * ZXing: кадры, которые он не разобрал, всё равно уходят в JS-декодер.
 */
export async function createNativeDetector(
  Native: DetectorConstructor | undefined = (globalThis as typeof globalThis & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector,
): Promise<NativeDetector | null> {
  if (!Native) return null;
  try {
    const supported = await Native.getSupportedFormats?.();
    const formats = supported ? NATIVE_FORMATS.filter((f) => supported.includes(f)) : NATIVE_FORMATS;
    return formats.length ? new Native({ formats }) : null;
  } catch {
    return null;
  }
}

/**
 * В кадре может быть и рекламный QR без номера товара, и штрихкод рядом.
 * Перебираем все найденные коды и берём первый, из которого номер достаётся.
 */
export function pickProductCode(codes: DetectedCode[] = []): string | null {
  for (const code of codes) {
    if (!code?.rawValue) continue;
    const raw = code.format === "upc_e" || code.format === BarcodeFormat.UPC_E ? expandUpce(code.rawValue.trim()) : code.rawValue;
    const gtin = extractBarcode(raw);
    if (gtin) return gtin;
  }
  return null;
}

export type PixelRegion = { x: number; y: number; w: number; h: number };

/** Крупные области кадра: полный кадр, полосы и центр — чтобы найти код не по центру. */
export function scanRegions(width: number, height: number): PixelRegion[] {
  const full = { x: 0, y: 0, w: width, h: height };
  if (width < 240 || height < 180) return [full];
  const w = Math.max(160, Math.round(width * 0.6));
  const h = Math.max(120, Math.round(height * 0.6));
  const stripes: PixelRegion[] = [
    { x: 0, y: 0, w, h: height },
    { x: width - w, y: 0, w, h: height },
    { x: 0, y: 0, w: width, h },
    { x: 0, y: height - h, w: width, h },
    { x: Math.round((width - w) / 2), y: Math.round((height - h) / 2), w, h },
  ];
  return [full, ...stripes];
}

function luminance(pixels: Uint8ClampedArray | Uint8Array, width: number, region: PixelRegion): Uint8ClampedArray {
  const out = new Uint8ClampedArray(region.w * region.h);
  for (let y = 0; y < region.h; y++) {
    const srcRow = (region.y + y) * width + region.x;
    for (let x = 0; x < region.w; x++) {
      const p = (srcRow + x) * 4;
      const alpha = pixels[p + 3];
      if (alpha === 255) {
        out[y * region.w + x] = (pixels[p] + 2 * pixels[p + 1] + pixels[p + 2]) >> 2;
        continue;
      }
      // Полупрозрачные/прозрачные пиксели (PNG-скриншоты, картинки из галереи)
      // считаем на белом фоне, иначе код на прозрачном фоне выглядит чёрным.
      const over = (channel: number) => (channel * alpha + 255 * (255 - alpha)) / 255;
      out[y * region.w + x] = (over(pixels[p]) + 2 * over(pixels[p + 1]) + over(pixels[p + 2])) >> 2;
    }
  }
  return out;
}

function decodeRegion(
  pixels: Uint8ClampedArray | Uint8Array,
  width: number,
  region: PixelRegion,
  hints: Map<DecodeHintType, any>,
): Result | null {
  try {
    const source = new RGBLuminanceSource(luminance(pixels, width, region), region.w, region.h);
    return new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(source)), hints);
  } catch {
    // Кадр без кода — обычная ситуация, а не ошибка.
    return null;
  }
}

/**
 * Разбор кадра из RGBA-пикселей. Пробуем и целиком, и по областям: на фото
 * штрихкод часто занимает угол, а одна попытка «всё изображение» его теряет.
 */
export function decodePixels(
  pixels: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  { tryHarder = false, multiple = false }: { tryHarder?: boolean; multiple?: boolean } = {},
): Result[] {
  if (!width || !height || pixels.length < width * height * 4) return [];
  const hints = new Map(ZXING_HINTS);
  if (tryHarder) hints.set(DecodeHintType.TRY_HARDER, true);

  const found: Result[] = [];
  const seen = new Set<string>();
  const regions = multiple ? scanRegions(width, height) : [{ x: 0, y: 0, w: width, h: height }];
  for (const region of regions) {
    const result = decodeRegion(pixels, width, region, hints);
    if (!result) continue;
    const text = result.getText();
    if (seen.has(text)) continue;
    seen.add(text);
    found.push(result);
  }
  return found;
}
