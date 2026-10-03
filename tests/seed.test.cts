import assert from "node:assert/strict";
import test from "node:test";
import { SEED_PRODUCTS } from "../src/lib/seed";
import { emptyState, normalizeState } from "../src/lib/storage";

/** Контрольная цифра EAN-13: иначе сканер не сойдётся с базой. */
function validEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const sum = digits.slice(0, 12).reduce((total, digit, index) => total + digit * (index % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === digits[12];
}

test("база непустая и без дублей названий у одного бренда", () => {
  assert.ok(SEED_PRODUCTS.length >= 130, `продуктов в базе: ${SEED_PRODUCTS.length}`);
  const seen = new Set<string>();
  for (const product of SEED_PRODUCTS) {
    const key = `${product.brand ?? ""}|${product.name}`.toLowerCase();
    assert.ok(!seen.has(key), `дубль в базе: ${key}`);
    seen.add(key);
    assert.ok(product.kcal >= 0 && product.protein >= 0 && product.fat >= 0 && product.carbs >= 0, product.name);
  }
});

test("штрихкоды в базе настоящие EAN-13 и не повторяются", () => {
  const withCode = SEED_PRODUCTS.filter((product) => product.barcode);
  assert.ok(withCode.length >= 8, `продуктов со штрихкодом: ${withCode.length}`);
  const codes = new Set<string>();
  for (const product of withCode) {
    assert.ok(validEan13(product.barcode!), `неверный штрихкод ${product.barcode} у «${product.name}»`);
    assert.ok(!codes.has(product.barcode!), `штрихкод ${product.barcode} указан дважды`);
    codes.add(product.barcode!);
  }
});

test("продукты из «Магнита» лежат в конце базы — id не сдвигаются у тех, кто уже пользуется приложением", () => {
  const sauce = SEED_PRODUCTS.find((product) => product.barcode === "4604248018276")!;
  assert.equal(sauce.name, "Соус майонезный Сырный 50.5%");
  assert.equal(sauce.brand, "Махеевъ");
  assert.equal(sauce.kcal, 461);
  assert.equal(sauce.fat, 50.5);
  // Блок «Магнит» — в самом конце списка: значит, id ранее добавленных
  // продуктов не сдвинулись и сохранённая база не перепуталась.
  assert.deepEqual(
    SEED_PRODUCTS.slice(-3).map((product) => product.name),
    ["Кетчуп Томатный", "Кетчуп Шашлычный", "Майонез Провансаль 50.5%"],
  );
});

test("новая версия базы докатывается к сохранённым данным без потерь", () => {
  // Так выглядит состояние того, кто пользовался приложением до обновления:
  // в базе нет последних пяти позиций, зато есть свой продукт.
  const oldBase = SEED_PRODUCTS.slice(0, -5);
  const mine = {
    id: "user-1",
    name: "Мой соус",
    brand: "Домашний",
    kcal: 100,
    protein: 1,
    fat: 5,
    carbs: 10,
    source: "user" as const,
    createdAt: "2025-01-01T00:00:00.000Z",
  };
  const merged = normalizeState({ ...emptyState, products: [...oldBase, mine] });

  assert.ok(merged.products.some((product) => product.id === "user-1"), "свой продукт потерялся");
  assert.ok(
    merged.products.some((product) => product.barcode === "4604248018276"),
    "новинки из обновления не доехали до сохранённой базы",
  );
  assert.equal(
    merged.products.filter((product) => product.barcode === "4604248018276").length,
    1,
    "новинка задвоилась при слиянии с сохранённой базой",
  );
});
