import type { Product } from "./types";
import { uid } from "./storage";

const API = "https://world.openfoodfacts.org";

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

export async function lookupBarcode(barcode: string): Promise<Product | null> {
  const res = await fetch(`${API}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,product_name_ru,generic_name,brands,serving_quantity,nutriments`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1) return null;
  return mapProduct(data.product);
}

export async function searchOnline(query: string, signal?: AbortSignal): Promise<Product[]> {
  const url = `${API}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,product_name_ru,generic_name,brands,serving_quantity,nutriments`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.products ?? []) as any[]).map(mapProduct).filter((p): p is Product => !!p && p.kcal > 0);
}
