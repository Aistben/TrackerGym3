import { round } from "./nutrition";
import type { Product } from "./types";

/**
 * Свои продукты пользователя: всё, кроме встроенной базы (`source: "base"`).
 * Сюда попадают и карточки, заведённые вручную (`"user"` — БЖУ вписаны
 * с упаковки), и найденные по штрихкоду / поиску в Open Food Facts (`"off"`)
 * и сохранённые в базу. Встроенные 232 позиции в список не входят: они и так
 * есть в каждой копии приложения, а человеку нужен именно свой набор.
 */
export function myProducts(products: Product[]): Product[] {
  return products
    .filter((p) => p.source !== "base")
    .sort((a, b) => a.name.localeCompare(b.name, "ru") || (a.brand ?? "").localeCompare(b.brand ?? "", "ru"));
}

/** Число так, как его вводили: 23 → «23», 1.5 → «1,5», без лишних нулей и с точностью до десятых. */
function num(value: number) {
  return String(round(Number.isFinite(value) ? value : 0, 1)).replace(".", ",");
}

/** «Горох колотый — 331 ккал · Б 23 г · Ж 1,5 г · У 62 г» (+ бренд в скобках, если он указан). */
function productLine(p: Product) {
  const title = p.brand?.trim() ? `${p.name} (${p.brand.trim()})` : p.name;
  return `• ${title} — ${num(p.kcal)} ккал · Б ${num(p.protein)} г · Ж ${num(p.fat)} г · У ${num(p.carbs)} г`;
}

/**
 * Свои продукты обычным текстом (БЖУ на 100 г), по одному на строку и по
 * алфавиту: такой список можно вставить в сообщение, заметку или таблицу.
 * Штрихкод и порцию сюда сознательно не пишем — нужен именно читаемый список.
 */
export function buildMyProductsText(products: Product[]) {
  const mine = myProducts(products);
  if (!mine.length) {
    return ["Мои продукты — БЖУ на 100 г", "", "Пока нет ни одного своего продукта: свои появятся, когда добавишь продукт вручную или найдёшь по штрихкоду."].join("\n");
  }
  return [`Мои продукты (${mine.length}) — БЖУ на 100 г`, "", ...mine.map(productLine)].join("\n");
}
