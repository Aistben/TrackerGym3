import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { lookupBarcode, lookupVariants, mapProduct, searchOnline } from "../src/lib/openfoodfacts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  const calls: string[] = [];
  globalThis.fetch = (async (input: any) => {
    const url = String(input);
    calls.push(url);
    return handler(url);
  }) as typeof fetch;
  return calls;
}

const offProduct = {
  status: 1,
  product: {
    code: "4600494561238",
    product_name_ru: "Молоко 3,2%",
    brands: "Простоквашино, Вимм-Билль-Данн",
    serving_quantity: "200",
    nutriments: {
      "energy-kcal_100g": 60,
      proteins_100g: "3,0",
      fat_100g: 3.2,
      carbohydrates_100g: 4.7,
    },
  },
};

test("mapProduct: русское имя, БЖУ, бренд, порция", () => {
  const p = mapProduct(offProduct.product)!;
  assert.equal(p.name, "Молоко 3,2%");
  assert.equal(p.brand, "Простоквашино");
  assert.equal(p.kcal, 60);
  assert.equal(p.protein, 3); // «3,0» с запятой
  assert.equal(p.fat, 3.2);
  assert.equal(p.carbs, 4.7);
  assert.equal(p.portion, 200);
  assert.equal(p.barcode, "4600494561238");
});

test("mapProduct: энергия в кДж и БЖУ только на порцию", () => {
  const p = mapProduct({
    code: "1234567890128",
    product_name: "Yoghurt",
    serving_quantity: "100",
    nutriments: { energy_100g: 418.4, proteins_serving: 10 },
  })!;
  assert.equal(p.kcal, 100);
  assert.equal(p.protein, 10); // 10 г на порцию 100 г = 10 г на 100 г
  assert.equal(p.name, "Yoghurt");
});

test("mapProduct: без названия карточка не создаётся", () => {
  assert.equal(mapProduct({ code: "123", nutriments: {} }), null);
  assert.equal(mapProduct(null), null);
});

test("mapProduct: рассчитывает ккал из БЖУ, если энергия не указана", () => {
  const p = mapProduct({
    code: "1234567890128",
    product_name_ru: "Томатный соус",
    nutriments: { proteins_100g: 2, fat_100g: 1, carbohydrates_100g: 8 },
  })!;
  assert.equal(p.kcal, 49); // 2×4 + 1×9 + 8×4
  assert.equal(p.protein, 2);
  assert.equal(p.fat, 1);
  assert.equal(p.carbs, 8);
});

test("lookupVariants: добавленный ведущий ноль не ломает поиск", () => {
  const variants = lookupVariants("04600494561238");
  assert.ok(variants.includes("4600494561238"));
  assert.ok(variants.includes("04600494561238"));
  assert.deepEqual(lookupVariants("460"), []);
});

test("lookupBarcode: карточка найдена на одном из зеркал", async () => {
  const calls = mockFetch((url) =>
    url.startsWith("https://ru.openfoodfacts.org") ? jsonResponse(offProduct) : jsonResponse({ status: 0 }),
  );
  const result = await lookupBarcode("4600494561238");
  assert.equal(result.status, "ok");
  assert.equal(result.product?.name, "Молоко 3,2%");
  assert.ok(calls.some((c) => c.includes("/api/v2/product/4600494561238.json")));
});

test("lookupBarcode: база ответила, товара нет → not-found (не «нет связи»)", async () => {
  mockFetch(() => jsonResponse({ status: 0 }));
  const result = await lookupBarcode("4600494561238");
  assert.equal(result.status, "not-found");
  assert.equal(result.product, null);
});

test("lookupBarcode: сеть недоступна → offline и одна повторная попытка", async () => {
  const calls = mockFetch(() => {
    throw new TypeError("Failed to fetch");
  });
  const result = await lookupBarcode("4600494561238");
  assert.equal(result.status, "offline");
  assert.ok(calls.length >= 4, `ожидали повторную попытку, запросов: ${calls.length}`);
});

test("lookupBarcode: нечитаемый ответ (HTML вместо JSON) не считается «не найден»", async () => {
  mockFetch(() => new Response("<html>502</html>", { status: 200 }));
  const result = await lookupBarcode("4600494561238");
  assert.equal(result.status, "offline");
});

test("searchOnline: зеркала объединяются без дублей", async () => {
  const product = { code: "4600494561238", product_name: "Кефир", nutriments: { "energy-kcal_100g": 40 } };
  mockFetch((url) => (url.includes("/api/v2/search") ? jsonResponse({ products: [product, { ...product }] }) : jsonResponse({ status: 0 })));
  const found = await searchOnline("кефир");
  assert.equal(found.length, 1);
  assert.equal(found[0].name, "Кефир");
});
