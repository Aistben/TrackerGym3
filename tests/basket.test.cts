import assert from "node:assert/strict";
import test from "node:test";
import {
  BASKET_TTL_DAYS,
  addBasketItem,
  basketCount,
  basketEntryForMeal,
  basketForDate,
  makeBasketItem,
  pruneBasket,
  removeBasketItem,
  sanitizeBasket,
} from "../src/lib/basket";
import type { BasketItem, MealEntry } from "../src/lib/types";

const entry: MealEntry = {
  id: "e1",
  productId: "p1",
  name: "Творог 5%",
  grams: 200,
  kcal: 121,
  protein: 17,
  fat: 5,
  carbs: 3,
};

test("свайп «На завтра» кладёт копию продукта в корзину следующего дня", () => {
  const item = makeBasketItem(entry, "2026-10-04", "b1", 1000);
  const basket = addBasketItem([], item);

  assert.equal(basket.length, 1);
  assert.equal(basketCount(basket, "2026-10-04"), 1);
  // В корзине именно копия: правки в приёме не должны менять позицию корзины
  assert.notEqual(item.entry, entry);
  assert.deepEqual(item.entry, entry);
  // Другие дни корзины не видят
  assert.equal(basketCount(basket, "2026-10-03"), 0);
  assert.equal(basketCount(basket, "2026-10-05"), 0);
});

test("в списке корзины порядок добавления, а не порядок записи в состояние", () => {
  const later = makeBasketItem({ ...entry, name: "Позже" }, "2026-10-04", "b2", 2000);
  const earlier = makeBasketItem({ ...entry, name: "Раньше" }, "2026-10-04", "b1", 1000);
  const other = makeBasketItem({ ...entry, name: "Другой день" }, "2026-10-05", "b3", 1500);

  const basket = addBasketItem(addBasketItem(addBasketItem([], later), other), earlier);
  assert.deepEqual(
    basketForDate(basket, "2026-10-04").map((item) => item.entry.name),
    ["Раньше", "Позже"],
  );
  assert.deepEqual(
    basketForDate(basket, "2026-10-05").map((item) => item.entry.name),
    ["Другой день"],
  );
});

test("продукт из корзины встаёт в приём со свежим id строки", () => {
  const item = makeBasketItem(entry, "2026-10-04", "b1", 1000);
  const forMeal = basketEntryForMeal(item, "fresh");

  assert.equal(forMeal.id, "fresh");
  assert.equal(forMeal.name, entry.name);
  assert.equal(forMeal.grams, entry.grams);
  // id в корзине не «утекает» в приём: иначе строка совпала бы с оригиналом
  assert.notEqual(forMeal.id, item.entry.id);
});

test("разложенный продукт уходит из корзины, остальные остаются", () => {
  const a = makeBasketItem(entry, "2026-10-04", "b1", 1000);
  const b = makeBasketItem({ ...entry, name: "Йогурт" }, "2026-10-04", "b2", 2000);
  const basket = removeBasketItem(addBasketItem(addBasketItem([], a), b), "b1");

  assert.equal(basketCount(basket, "2026-10-04"), 1);
  assert.equal(basket[0].entry.name, "Йогурт");
});

test("корзина чистится от неразобранного за месяц и от мусора", () => {
  const today = "2026-10-03";
  const fresh = makeBasketItem(entry, "2026-10-03", "b1", 1000);
  const tomorrow = makeBasketItem(entry, "2026-10-04", "b2", 1000);
  const farFuture = makeBasketItem(entry, "2026-10-20", "b3", 1000);
  const stale = makeBasketItem(entry, "2026-09-01", "b4", 1000);

  const kept = pruneBasket([fresh, tomorrow, farFuture, stale], today);
  assert.deepEqual(
    kept.map((item) => item.id),
    ["b1", "b2", "b3"],
  );
  // Ровно на границе TTL позиция ещё живёт, на день старше — уже нет
  assert.equal(BASKET_TTL_DAYS, 30);
  assert.equal(pruneBasket([makeBasketItem(entry, "2026-09-03", "b5", 1000)], today).length, 1);
  assert.equal(pruneBasket([makeBasketItem(entry, "2026-09-02", "b6", 1000)], today).length, 0);
});

test("битые записи из localStorage и бэкапа не ломают корзину", () => {
  const good: BasketItem = makeBasketItem(entry, "2026-10-04", "b1", 1000);
  const cleaned = sanitizeBasket([
    good,
    { id: "x" }, // нет даты и продукта
    { id: "y", date: "04.10.2026", entry: { name: "Плохая дата" } },
    { id: "z", date: "2026-10-04", entry: { name: "Без чисел", grams: "200" } },
    null,
    "строка",
  ]);

  assert.equal(cleaned.length, 2);
  assert.equal(cleaned[0].id, "b1");
  assert.equal(cleaned[1].entry.name, "Без чисел");
  // Числовые поля приводятся к числам: дальше по коду они считаются
  assert.equal(cleaned[1].entry.grams, 0);
  assert.equal(cleaned[1].entry.kcal, 0);

  assert.deepEqual(sanitizeBasket(undefined), []);
  assert.deepEqual(sanitizeBasket("не массив"), []);
});
