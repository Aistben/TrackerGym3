import type { Product } from "./types";
import { uid } from "./storage";
import { normalizeGtin } from "./barcode";

const API_HOSTS = ["https://world.openfoodfacts.org", "https://ru.openfoodfacts.org"];
const FIELDS = "code,product_name,product_name_ru,generic_name,brands,serving_quantity,nutriments";

function num(v: unknown) {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? Math.round((n as number) * 10) / 10 : 0;
}

function mapProduct(p: any): Product | null {
  if (!p) return null;
  const n = p.nutriments ?? {};
  const kcal = num(n["energy-kcal_100g"]) || Math.round(num(n["energy_100g"]) / 4.184);
  const name: string = p.product_name_ru || p.product_name || p.generic_name || "";
  if (!name) return null;
  return {
    id: uid(),
    name: name.trim().slice(0, 80),
    brand: (p.brands ?? "").split(",")[0]?.trim() || undefined,
    barcode: p.code,
    kcal,
    protein: num(n.proteins_100g),
    fat: num(n.fat_100g),
    carbs: num(n.carbohydrates_100g),
    portion: num(p.serving_quantity) || undefined,
    source: "off",
    createdAt: new Date().toISOString(),
  };
}

async function json(url: string, externalSignal?: AbortSignal) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 7000);
  const abort = () => controller.abort();
  externalSignal?.addEventListener("abort", abort, { once: true });
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abort);
  }
}

async function fetchOne(host: string, code: string): Promise<Product | null> {
  const data = await json(`${host}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  if (!data || data.status !== 1) return null;
  return mapProduct(data.product);
}

/** Возвращает первый успешный (не-null) результат; остальные просто игнорируются. */
function firstFound<T>(tasks: Array<Promise<T | null>>): Promise<T | null> {
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

export async function lookupBarcode(barcode: string): Promise<Product | null> {
  const norm = normalizeGtin(barcode);
  const variants = [...new Set([norm, barcode.replace(/\D/g, ""), norm.replace(/^0+/, "")])].filter((c) => c.length >= 8);

  // Раньше все хосты × варианты кода опрашивались строго по очереди (до 6
  // запросов с таймаутом 7с каждый) — на деле это выглядело как «сканер
  // долго висит и ничего не находит». Теперь гоняем их параллельно и берём
  // первый ответ. Российский сервер оставлен резервным доменом: у мобильных
  // провайдеров один из них иногда недоступен.
  const direct = await firstFound(
    API_HOSTS.flatMap((host) => variants.map((code) => fetchOne(host, code).catch(() => null))),
  );
  if (direct) return direct;

  // Некоторые карточки индексируются поиском раньше, чем появляются в product API.
  const searches = await Promise.all(
    API_HOSTS.map((host) =>
      json(`${host}/api/v2/search?code=${encodeURIComponent(norm)}&page_size=5&fields=${FIELDS}`).catch(() => null),
    ),
  );
  for (const data of searches) {
    const found = (data?.products ?? []).map(mapProduct).find((p: Product | null) => p?.barcode && variants.includes(normalizeGtin(p.barcode)));
    if (found) return found;
  }
  return null;
}

export async function searchOnline(query: string, signal?: AbortSignal): Promise<Product[]> {
  const url = `${API_HOSTS[0]}/api/v2/search?categories_tags_en=foods&search_terms=${encodeURIComponent(query)}&page_size=15&fields=${FIELDS}`;
  const data = await json(url, signal);
  return ((data?.products ?? []) as any[]).map(mapProduct).filter((p): p is Product => !!p && p.kcal > 0);
}
