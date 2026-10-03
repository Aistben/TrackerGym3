import assert from "node:assert/strict";
import test from "node:test";
import { editDistance, normalizeText, searchProducts, textTokens } from "../src/lib/search";
import { SEED_PRODUCTS } from "../src/lib/seed";
import { hasNutrition, mapProduct } from "../src/lib/openfoodfacts";
import type { Product } from "../src/lib/types";

const magnet = SEED_PRODUCTS.find((p) => p.name === "Соус майонезный Сырный 50.5%")!;

function names(query: string, products: Product[] = SEED_PRODUCTS, limit = 10): string[] {
  return searchProducts(products, query, limit).items.map((p) => `${p.brand ?? ""} ${p.name}`.trim());
}

test("normalizeText: регистр, ё → е, ъ, пунктуация", () => {
  assert.equal(normalizeText("Махеевъ"), "махеев");
  assert.equal(normalizeText("  Соус  Сырный, 50,5% "), "соус сырный 50 5");
  assert.equal(normalizeText("Мёд"), "мед");
  assert.equal(normalizeText("Пельмени «Сибирская коллекция»"), "пельмени сибирская коллекция");
});

test("textTokens отбрасывает единицы измерения, но не цифры состава", () => {
  assert.deepEqual(textTokens("Соус Сырный 200 г"), ["соус", "сырный", "200"]);
  assert.deepEqual(textTokens("Творог 5%"), ["творог", "5"]);
});

test("editDistance считает опечатки и перестановку букв", () => {
  assert.equal(editDistance("соус", "суос"), 1);
  assert.equal(editDistance("сырный", "сырны"), 1);
  assert.equal(editDistance("махеев", "махеев"), 0);
  assert.equal(editDistance("кетчуп", "горчица"), 6);
});

test("соус сырный Махеевъ находится словами в любом порядке", () => {
  for (const query of ["сырный соус махеев", "соус махеев сырный", "махеевъ сырный"]) {
    const found = names(query, undefined, 3);
    assert.ok(found.includes("Махеевъ Соус майонезный Сырный 50.5%"), `не нашли по запросу «${query}»: ${found.join(" | ")}`);
  }
  // «махеев соус» — запрос без вкуса: показываем всю соусную линейку бренда.
  const line = names("махеев соус", undefined, 6);
  assert.ok(line.includes("Махеевъ Соус майонезный Сырный 50.5%"), line.join(" | "));
  assert.ok(line.every((name) => name.startsWith("Махеевъ")), line.join(" | "));
});

test("штрихкод из базы находится и без интернета", () => {
  assert.equal(magnet.barcode, "4604248018276");
  const byCode = searchProducts(SEED_PRODUCTS, "4604248018276", 5);
  assert.equal(byCode.items[0]?.id, magnet.id);
  assert.equal(byCode.fuzzy, false);

  // Код с лишними пробелами и в другом формате (UPC → EAN) тоже узнаётся.
  assert.equal(searchProducts(SEED_PRODUCTS, "460 4248 018276", 5).items[0]?.id, magnet.id);
});

test("зефир Сокол находится по названию и коду маркировки", () => {
  const zephyr = SEED_PRODUCTS.find((product) => product.barcode === "4680328047688")!;
  assert.ok(zephyr);
  assert.equal(searchProducts(SEED_PRODUCTS, "зефир бело-розовый ароматом ванили малины").items[0]?.id, zephyr.id);
  assert.equal(searchProducts(SEED_PRODUCTS, "4680328047688").items[0]?.id, zephyr.id);
});

test("опечатка и перестановка букв находят соус", () => {
  // Неполное слово — это ещё строгое совпадение (префикс).
  const partial = searchProducts(SEED_PRODUCTS, "махеев сырны соус");
  assert.equal(partial.fuzzy, false);
  assert.equal(partial.items[0]?.id, magnet.id);

  // «суос» вместо «соус»: строгого совпадения нет, но продукт в подсказках.
  const typo = searchProducts(SEED_PRODUCTS, "суос махеев");
  assert.equal(typo.fuzzy, true);
  assert.ok(
    typo.items.slice(0, 5).some((p) => p.id === magnet.id),
    typo.items.map((p) => p.name).join(" | "),
  );
});

test("запрос по части слова находит продукт", () => {
  const found = names("простокваш творог");
  assert.ok(found.some((name) => name.includes("Простоквашино")), found.join(" | "));
});

test("нераспознанный запрос не подменяется случайными продуктами", () => {
  const nonsense = searchProducts(SEED_PRODUCTS, "абракадабра");
  assert.equal(nonsense.items.length, 0);
});

test("поиск не зависит от склейки «название + бренд»", () => {
  // Раньше строка искалась целиком: «соус кетчуп махеев» не находил ничего,
  // потому что в названии между словами стоят другие слова.
  const found = names("кетчуп махеев");
  assert.ok(found.some((name) => name.includes("Махеевъ")), found.join(" | "));
});

test("карточка без БЖУ не считается готовыми данными", () => {
  const empty = mapProduct({ code: "4604248018276", product_name: "Mayonnaise Sauce Käse", brands: "Lackmann" })!;
  assert.equal(empty.kcal, 0);
  assert.equal(hasNutrition(empty), false);

  const real = mapProduct({
    code: "4604248018276",
    product_name: "Соус майонезный Сырный",
    brands: "Махеевъ",
    nutriments: { "energy-kcal_100g": 461, fat_100g: 50.5, carbohydrates_100g: 1.5 },
  })!;
  assert.equal(hasNutrition(real), true);
});
