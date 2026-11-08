import assert from "node:assert/strict";
import test from "node:test";
import { buildMyProductsText, myProducts } from "../src/lib/productsText";
import type { Product } from "../src/lib/types";

function product(partial: Partial<Product>): Product {
  return {
    id: "p1",
    name: "Продукт",
    kcal: 100,
    protein: 10,
    fat: 5,
    carbs: 20,
    source: "user",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

const peas = product({ id: "u1", name: "Горох колотый", kcal: 331, protein: 23, fat: 1.5, carbs: 62 });
const sauce = product({ id: "o1", name: "Соус Сырный", brand: "Махеевъ", kcal: 420, protein: 1.2, fat: 40, carbs: 6.5, source: "off" });
const seed = product({ id: "s1", name: "Абрикос", kcal: 44, protein: 0.9, fat: 0.1, carbs: 9, source: "base" });

test("в свои продукты попадают введённые вручную и найденные онлайн, но не встроенная база", () => {
  assert.deepEqual(
    myProducts([seed, sauce, peas]).map((p) => p.id),
    ["u1", "o1"],
  );
});

test("текст: заголовок со счётчиком, строки по алфавиту, бренд в скобках, БЖУ на 100 г", () => {
  assert.equal(
    buildMyProductsText([sauce, seed, peas]),
    [
      "Мои продукты (2) — БЖУ на 100 г",
      "",
      "• Горох колотый — 331 ккал · Б 23 г · Ж 1,5 г · У 62 г",
      "• Соус Сырный (Махеевъ) — 420 ккал · Б 1,2 г · Ж 40 г · У 6,5 г",
    ].join("\n"),
  );
});

test("без бренда скобок нет, целые числа не дробим, дробные — с запятой", () => {
  const text = buildMyProductsText([peas]);
  assert.ok(!text.includes("()"));
  assert.match(text, /Ж 1,5 г/);
  assert.match(text, /Б 23 г ·/);
});

test("штрихкод и порция в текст не попадают — нужен читаемый список", () => {
  const text = buildMyProductsText([product({ name: "Сыр", barcode: "4601234567890", portion: 30 })]);
  assert.ok(!text.includes("4601234567890"));
  assert.ok(!text.includes("порци"));
});

test("пустой список честно говорит, что своих продуктов пока нет", () => {
  const text = buildMyProductsText([seed]);
  assert.match(text, /Пока нет ни одного своего продукта/);
  assert.ok(!text.includes("Абрикос"), "встроенный продукт не должен утечь даже в пустой текст");
});
