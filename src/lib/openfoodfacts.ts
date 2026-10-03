import type { Product } from "./types";
import { uid } from "./storage";
import { normalizeGtin } from "./barcode";

// Русский сервер первым: он быстрее отвечает из РФ и на нём имена на русском.
const API_HOSTS = ["https://ru.openfoodfacts.org", "https://world.openfoodfacts.org"];
const FIELDS =
  "code,product_name,product_name_ru,product_name_en,generic_name,generic_name_ru,generic_name_en,brands,serving_quantity,serving_size,nutriments,nutrition_data_per";

/**
 * Учитываем несколько вариантов ключей (RU-сервер часто пишет другими
 * именами, а старые карточки — без суффикса _100g) и умеем считать из порции.
 */
function nutriment(raw: any, keys: string[], servingGrams?: number): number {
  const num = (v: unknown) => {
    const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : (v as number);
    return Number.isFinite(n) ? n : null;
  };
  for (const key of keys) {
    const value = num(raw?.[key]);
    if (value != null) return value;
    if (servingGrams) {
      const perServing = num(raw?.[key.replace(/_100g$/, "_serving")]);
      if (perServing != null) return (perServing * 100) / servingGrams;
    }
  }
  return 0;
}

export function mapProduct(p: any): Product | null {
  if (!p) return null;
  const n = p.nutriments ?? {};
  const servingGrams = Number.parseFloat(String(p.serving_quantity ?? "")) || undefined;
  const protein = nutriment(n, ["proteins_100g", "proteins"], servingGrams);
  const fat = nutriment(n, ["fat_100g", "fat"], servingGrams);
  const carbs = nutriment(n, ["carbohydrates_100g", "carbohydrates"], servingGrams);
  const declaredKcal =
    nutriment(n, ["energy-kcal_100g", "energy-kcal", "energy-kcal_value"]) ||
    Math.round(nutriment(n, ["energy_100g", "energy", "energy_value"]) / 4.184);
  // Некоторые карточки содержат БЖУ, но не заполненную энергетическую ценность.
  // Рассчитываем ккал по стандартной формуле, чтобы такие продукты тоже находились.
  const kcal = declaredKcal || Math.round(protein * 4 + fat * 9 + carbs * 4);
  const name: string = p.product_name_ru || p.product_name || p.product_name_en || p.generic_name_ru || p.generic_name || p.generic_name_en || "";
  if (!name) return null;
  return {
    id: uid(),
    name: name.trim().slice(0, 80),
    brand: (typeof p.brands === "string" ? p.brands.split(",")[0] : p.brands?.[0] ?? "").trim() || undefined,
    barcode: p.code,
    kcal: Math.round(Math.max(0, kcal) * 10) / 10,
    protein,
    fat,
    carbs,
    portion: servingGrams,
    source: "off",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Ответ разбираем без window/таймеров — так это тестируется в node.
 * timeoutMs обрывает запрос: интернет может быть медленным, но ждать
 * «вечность» и оставлять сканер в подвешенном состоянии нельзя.
 *
 * `reached` отличает «сервер ответил» от «сети не было» — иначе обрыв связи
 * выглядит для пользователя как «товара нет в Open Food Facts».
 */
export type JsonResult = { reached: boolean; data: any };

export async function fetchJsonResult(url: string, externalSignal?: AbortSignal, timeoutMs = 7000): Promise<JsonResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  externalSignal?.addEventListener("abort", abort, { once: true });
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return { reached: res.status < 500, data: null };
    const data = await res.json().catch(() => null);
    // 200 с нечитаемым ответом — почти всегда прокси/каптивный портал.
    return { reached: data != null, data };
  } catch {
    return { reached: false, data: null };
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abort);
  }
}

export async function fetchJson(url: string, externalSignal?: AbortSignal, timeoutMs = 7000): Promise<any> {
  return (await fetchJsonResult(url, externalSignal, timeoutMs)).data;
}

async function fetchOne(host: string, code: string, markAnswered: () => void, timeoutMs: number): Promise<Product | null> {
  const { reached, data } = await fetchJsonResult(
    `${host}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`,
    undefined,
    timeoutMs,
  );
  if (!reached) return null;
  markAnswered();
  if (!data || data.status !== 1) return null;
  return mapProduct(data.product);
}

/** Возвращает первый успешный (не-null) результат; остальные просто игнорируются. */
export function firstFound<T>(tasks: Array<Promise<T | null>>): Promise<T | null> {
  return new Promise((resolve) => {
    if (!tasks.length) {
      resolve(null);
      return;
    }
    let remaining = tasks.length;
    let settled = false;
    for (const task of tasks) {
      task
        .then((value) => {
          if (!settled && value != null) {
            settled = true;
            resolve(value);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          remaining -= 1;
          if (!settled && remaining === 0) resolve(null);
        });
    }
  });
}

export type BarcodeLookup = {
  /** ok — карточка найдена; not-found — база ответила, товара нет; offline — база недоступна/сеть не ответила */
  status: "ok" | "not-found" | "offline";
  product: Product | null;
};

export function lookupVariants(barcode: string): string[] {
  const norm = normalizeGtin(barcode);
  return [...new Set([norm, barcode.replace(/\D/g, ""), norm.replace(/^0+/, "")])].filter((c) => c.length >= 8);
}

/** Ищем товар по штрихкоду в Open Food Facts (параллельно по двум доменам). */
export async function lookupBarcodeResult(barcode: string, timeoutMs = 7000): Promise<BarcodeLookup> {
  const norm = normalizeGtin(barcode);
  const variants = lookupVariants(barcode);
  if (!variants.length) return { status: "not-found", product: null };

  // Все хосты × варианты кода запускаем параллельно и берём первый ответ:
  // последовательный опрос выглядел как «сканер висит и ничего не находит».
  let answered = false;
  const markAnswered = () => {
    answered = true;
  };
  const attempts = API_HOSTS.flatMap((host) => variants.map((code) => fetchOne(host, code, markAnswered, timeoutMs)));
  const direct = await firstFound(attempts);
  if (direct) return { status: "ok", product: direct };

  // Некоторые карточки индексируются поиском раньше, чем появляются в product API.
  const searches = await Promise.all(
    API_HOSTS.map((host) =>
      fetchJsonResult(`${host}/api/v2/search?code=${encodeURIComponent(norm)}&page_size=5&fields=${FIELDS}`, undefined, timeoutMs).then(({ reached, data }) => {
        if (reached) answered = true;
        return data;
      }),
    ),
  );
  for (const data of searches) {
    const found = (data?.products ?? [])
      .map(mapProduct)
      .find((p: Product | null) => p?.barcode && variants.includes(normalizeGtin(p.barcode)));
    if (found) return { status: "ok", product: found };
  }
  return { status: answered ? "not-found" : "offline", product: null };
}

/**
 * Пробует ещё раз (с меньшим таймаутом): сеть могла отвалиться на 100 мс,
 * из-за чего пользователь видит «товар не найден». Дольше ~11 с ждать не
 * даём, иначе сканер кажется зависшим.
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeLookup> {
  const first = await lookupBarcodeResult(barcode);
  if (first.status !== "offline") return first;
  return lookupBarcodeResult(barcode, 4000);
}

export async function searchOnline(query: string, signal?: AbortSignal): Promise<Product[]> {
  const url = (host: string) =>
    `${host}/api/v2/search?categories_tags_en=foods&search_terms=${encodeURIComponent(query)}&page_size=15&fields=${FIELDS}`;
  // Два зеркала параллельно: у мобильных провайдеров одно может быть
  // недоступно. Имена с ru-сервера идут первыми — они на русском.
  const results = await Promise.all(API_HOSTS.map((host) => fetchJson(url(host), signal).catch(() => null)));
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const data of results) {
    for (const raw of (data?.products ?? []) as any[]) {
      const product = mapProduct(raw);
      if (!product || product.kcal <= 0) continue;
      const key = product.barcode ? normalizeGtin(product.barcode).replace(/^0+/, "") : product.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(product);
    }
  }
  return out.slice(0, 15);
}
