import assert from "node:assert/strict";
import test from "node:test";
import {
  TYPICAL_FOODS,
  averageProducts,
  estimateFromProducts,
  estimateFromTable,
  estimateToDraft,
  matchTypical,
  normalizeName,
  suggestFoods,
} from "../src/lib/estimate";
import type { Product } from "../src/lib/types";

test("справочник заполнен, без дублей и опечаток в калорийности", () => {
  assert.ok(TYPICAL_FOODS.length >= 90, `блюд в справочнике: ${TYPICAL_FOODS.length}`);
  const names = new Set<string>();
  for (const food of TYPICAL_FOODS) {
    assert.ok(!names.has(food.name), `дубль: ${food.name}`);
    names.add(food.name);
    assert.ok(food.kcal > 0 && food.protein >= 0 && food.fat >= 0 && food.carbs >= 0, `отрицательные значения: ${food.name}`);
    assert.ok(food.group, `нет группы: ${food.name}`);
    if (food.alcohol) continue; // калории частично из спирта — формула 4/9/4 не работает
    const calculated = food.protein * 4 + food.fat * 9 + food.carbs * 4;
    const tolerance = Math.max(25, food.kcal * 0.12);
    assert.ok(
      Math.abs(calculated - food.kcal) <= tolerance,
      `${food.name}: БЖУ даёт ${Math.round(calculated)} ккал, а указано ${food.kcal}`,
    );
  }
});

test("нормализация названия", () => {
  assert.equal(normalizeName("  Шаурма, с Курицей! "), "шаурма с курицей");
  assert.equal(normalizeName("Творог 5%"), "творог 5");
  assert.equal(normalizeName("мёд"), "мед");
});

test("узнаём блюда по обычным названиям", () => {
  const cases: [string, string][] = [
    ["шаурма", "Шаурма с курицей"],
    ["Шаурма с курицей", "Шаурма с курицей"],
    ["борщ со сметаной", "Борщ"],
    ["гречка", "Гречка отварная"],
    ["гречневая каша", "Гречка отварная"],
    ["куриная грудка", "Куриная грудка отварная"],
    ["пельмени", "Пельмени отварные"],
    ["оладьи", "Оладьи"],
    ["цезарь", "Цезарь с курицей"],
    ["кофе с молоком", "Кофе с молоком"],
    ["селёдка", "Сельдь солёная"],
    ["творог", "Творог 5%"],
  ];
  for (const [query, expected] of cases) {
    assert.equal(matchTypical(query)?.food.name, expected, `не узнали: ${query}`);
  }
});

test("незнакомое название не подменяем случайным блюдом", () => {
  assert.equal(estimateFromTable("блаблакафе"), null);
  assert.equal(estimateFromTable(""), null);
  assert.equal(matchTypical("xyzzy"), null);
});

test("оценка по справочнику: порция, источник и уверенность", () => {
  const estimate = estimateFromTable("шаурма")!;
  assert.equal(estimate.source, "table");
  assert.equal(estimate.kcal, 215);
  assert.equal(estimate.portion, 250);
  assert.equal(estimate.confidence, "high");
  assert.match(estimate.basis, /Шаурма с курицей/);
  assert.equal(estimate.name, "шаурма"); // имя пользователя сохраняем

  const fuzzy = estimateFromTable("шаурма с сыром")!;
  assert.ok(["high", "medium", "low"].includes(fuzzy.confidence));
  assert.ok(fuzzy.kcal > 0);
});

test("подсказки: несколько похожих блюд по убыванию похожести", () => {
  const suggestions = suggestFoods("суп");
  assert.ok(suggestions.length >= 2);
  assert.ok(suggestions.every((s, i) => i === 0 || suggestions[i - 1].score >= s.score));
  assert.ok(suggestFoods("абракадабра").length === 0);
});

const product = (kcal: number, protein = 1, fat = 1, carbs = 1): Product => ({
  id: String(kcal) + protein,
  name: "тест",
  kcal,
  protein,
  fat,
  carbs,
  source: "off",
  createdAt: "2026-01-01",
});

test("среднее по Open Food Facts — медиана, выбросы не портят оценку", () => {
  const avg = averageProducts([product(100, 10), product(110, 12), product(0), product(900, 1)])!;
  assert.equal(avg.samples, 3); // продукт без калорий не учитываем
  assert.equal(avg.kcal, 110);
  assert.equal(avg.protein, 10);
  assert.equal(averageProducts([]), null);
  assert.equal(averageProducts([product(0)]), null);
});

test("оценка по онлайн-продуктам и черновик карточки", () => {
  const estimate = estimateFromProducts("творожная масса", [product(150, 12, 5), product(170, 14, 6), product(160, 13, 5.5)])!;
  assert.equal(estimate.source, "online");
  assert.equal(estimate.kcal, 160);
  assert.equal(estimate.confidence, "low"); // всего 3 продукта — доверия мало
  assert.match(estimate.basis, /3 похожим продуктам/);

  const draft = estimateToDraft({ ...estimate, portion: 150 });
  assert.deepEqual(draft, { name: "творожная масса", kcal: "160", protein: "13", fat: "5.5", carbs: "1", portion: "150" });
});
