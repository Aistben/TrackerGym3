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
  assert.equal(SEED_PRODUCTS.length, 232);
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

  // Первый продукт базы остался на своём месте: значит, новые позиции
  // добавлены в конец и id ранее добавленных продуктов не сдвинулись.
  const first = SEED_PRODUCTS.find((product) => product.id === "brand-0")!;
  assert.equal(first.name, "Молоко ультрапастеризованное 2.5%");
  assert.equal(first.brand, "Простоквашино");

  const magnetBrands = new Set(["Махеевъ", "Heinz", "Слобода", "Astoria", "Mr. Ricco", "Pikador"]);
  const sauces = SEED_PRODUCTS.slice(-19, -4);
  assert.equal(sauces.length, 15);
  assert.ok(
    sauces.every((product) => magnetBrands.has(product.brand ?? "")),
    sauces.map((product) => `${product.brand} ${product.name}`).join(" | "),
  );

  const zephyr = SEED_PRODUCTS.find((product) => product.id === "brand-163")!;
  assert.equal(zephyr.name, "Зефир «Бело-розовый» с ароматом ванили и малины");
  assert.equal(zephyr.brand, "Сокол");
  assert.equal(zephyr.barcode, "4603513006871");
  assert.equal(zephyr.kcal, 320);
  assert.equal(zephyr.protein, 0.8);
  assert.equal(zephyr.fat, 0);
  assert.equal(zephyr.carbs, 80.4);

  const groats = [
    ["4601780000189", "Макфа", "Макароны Спагетти из твёрдых сортов"],
    ["4607001850090", "Шебекинские", "Макароны Перья"],
    ["4607016240893", "Увелка", "Гречка ядрица"],
    ["4600935000036", "Националь", "Рис круглозёрный"],
    ["4601916000342", "Мистраль", "Рис басмати"],
  ] as const;
  for (const [code, brand, name] of groats) {
    const product = SEED_PRODUCTS.find((item) => item.barcode === code)!;
    assert.equal(product.brand, brand, code);
    assert.equal(product.name, name, code);
  }

  const stm = SEED_PRODUCTS.slice(-3);
  assert.deepEqual(
    stm.map((product) => `${product.id}|${product.brand}|${product.name}`),
    [
      "brand-164|Магнит (СТМ)|Гречка ядрица",
      "brand-165|Магнит (СТМ)|Рис круглозёрный",
      "brand-166|Магнит (СТМ)|Макароны Спагетти",
    ],
  );
  assert.equal(stm[0].kcal, 350);
  assert.equal(stm[0].protein, 13);
  assert.equal(stm[1].kcal, 350);
  assert.equal(stm[2].kcal, 340);
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
  assert.ok(merged.products.some((product) => product.barcode === "4603513006871"), "зефир из обновления не доехал до сохранённой базы");
  assert.equal(merged.products.filter((product) => product.barcode === "4603513006871").length, 1);

  // Старый неверный код в сохранённой карточке должен замениться фабричным.
  const stale = {
    ...SEED_PRODUCTS.find((product) => product.id === "brand-163")!,
    barcode: "4680328047688",
  };
  const patched = normalizeState({ ...emptyState, products: [stale] });
  const updated = patched.products.find((product) => product.id === "brand-163")!;
  assert.equal(updated.barcode, "4603513006871");
});
