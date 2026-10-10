import assert from "node:assert/strict";
import test from "node:test";
import { MACRO_STEP, computeTargets, currentWeight, goalShiftText, lastWeighIn, stepMacro } from "../src/lib/nutrition";
import type { Profile } from "../src/lib/types";

const profile: Profile = {
  name: "Тест",
  sex: "male",
  age: 30,
  height: 180,
  startWeight: 80,
  targetWeight: 75,
  activity: "moderate",
  goal: "lose",
  startDate: "2026-01-01",
};

test("кнопка «+» прибавляет ровно шаг: углеводы +100, белки +10, жиры +5", () => {
  assert.equal(MACRO_STEP.carbs, 100);
  assert.equal(MACRO_STEP.protein, 10);
  assert.equal(MACRO_STEP.fat, 5);

  assert.equal(stepMacro(150, MACRO_STEP.carbs), 250);
  assert.equal(stepMacro(150, -MACRO_STEP.carbs), 50);
  assert.equal(stepMacro(150, MACRO_STEP.protein), 160);
  assert.equal(stepMacro(100, MACRO_STEP.fat), 105);
});

test("значение не уходит в минус и не превращается в NaN", () => {
  assert.equal(stepMacro(30, -100), 0);
  assert.equal(stepMacro(Number.NaN), 0);
  assert.equal(stepMacro(Number.NaN, 10), 10);
  assert.equal(stepMacro(150.6), 151, "дробное число округляется до целого");
  assert.equal(stepMacro(1200, 100), 1000, "больше 1000 г в день не бывает");
});

test("калории считаются из ручных БЖУ: Б и У по 4 ккал/г, Ж по 9", () => {
  const t = computeTargets({ ...profile, macroTargets: { protein: 160, fat: 70, carbs: 250 } }, 80);
  assert.equal(t.protein, 160);
  assert.equal(t.fat, 70);
  assert.equal(t.carbs, 250);
  assert.equal(t.calories, 160 * 4 + 70 * 9 + 250 * 4);
  // BMR и TDEE по-прежнему считаются по формуле — это справочные цифры.
  assert.equal(t.bmr, 1780);
  assert.equal(t.tdee, 2759);
});

test("ручные БЖУ важнее изменения веса и активности", () => {
  const manual = { ...profile, activity: "sedentary" as const, macroTargets: { protein: 160, fat: 70, carbs: 250 } };
  assert.equal(computeTargets(manual, 95).calories, 160 * 4 + 70 * 9 + 250 * 4);
});

test("пока БЖУ не заданы руками, норма считается от цели: похудение −20%, набор +10%, поддержание — TDEE", () => {
  const lose = computeTargets({ ...profile, goal: "lose" }, 80);
  const maintain = computeTargets({ ...profile, goal: "maintain" }, 80);
  const gain = computeTargets({ ...profile, goal: "gain" }, 80);

  // Граммы БЖУ округляются целыми, поэтому допуск ±3 ккал.
  assert.ok(Math.abs(lose.calories - lose.tdee * 0.8) <= 3, `похудение: норма ${lose.calories} при TDEE ${lose.tdee}`);
  assert.ok(Math.abs(maintain.calories - maintain.tdee) <= 3, `поддержание: норма ${maintain.calories} при TDEE ${maintain.tdee}`);
  assert.ok(Math.abs(gain.calories - gain.tdee * 1.1) <= 3, `набор: норма ${gain.calories} при TDEE ${gain.tdee}`);
  assert.ok(lose.calories < maintain.calories && maintain.calories < gain.calories, "цель должна реально менять норму");
});

test("белок по цели: при похудении 2,2 г на кг, при поддержании и наборе — 1,8", () => {
  assert.equal(computeTargets({ ...profile, goal: "lose" }, 80).protein, 176);
  assert.equal(computeTargets({ ...profile, goal: "maintain" }, 80).protein, 144);
  assert.equal(computeTargets({ ...profile, goal: "gain" }, 80).protein, 144);
});

test("жиры — 30% калорий цели, углеводы — остаток калорий до цели", () => {
  const t = computeTargets({ ...profile, goal: "gain" }, 80);
  const target = Math.round(t.tdee * 1.1); // норма набора массы
  assert.equal(t.fat, Math.round((target * 0.3) / 9));
  assert.equal(t.carbs, Math.round((target - t.protein * 4 - t.fat * 9) / 4));
});

test("при похудении норма не опускается ниже BMR", () => {
  // Малоподвижный образ жизни: TDEE = 1,2 × BMR, а минус 20% дал бы меньше базового обмена.
  const t = computeTargets({ ...profile, activity: "sedentary", goal: "lose" }, 80);
  assert.equal(t.bmr, 1780);
  assert.ok(Math.abs(t.calories - t.bmr) <= 3, `норма ${t.calories} должна быть около BMR ${t.bmr}`);
});

test("ручные БЖУ важнее цели: смена цели их не меняет", () => {
  const manual = { ...profile, macroTargets: { protein: 160, fat: 70, carbs: 250 } };
  assert.equal(computeTargets({ ...manual, goal: "lose" }, 80).calories, 160 * 4 + 70 * 9 + 250 * 4);
  assert.equal(computeTargets({ ...manual, goal: "gain" }, 80).calories, 160 * 4 + 70 * 9 + 250 * 4);
});

test("подпись цели показывает сдвиг нормы от TDEE", () => {
  assert.equal(goalShiftText("lose"), "−20% от TDEE");
  assert.equal(goalShiftText("maintain"), "на уровне TDEE");
  assert.equal(goalShiftText("gain"), "+10% от TDEE");
});

test("нажатие «+» у углеводов: +100 г и +400 ккал к норме дня", () => {
  const before = computeTargets(profile, 80);
  // То же, что делает карточка настроек: берём текущие БЖУ и шагаем на шаг вверх.
  const macros = { protein: before.protein, fat: before.fat, carbs: before.carbs };
  const after = computeTargets({ ...profile, macroTargets: { ...macros, carbs: stepMacro(macros.carbs, MACRO_STEP.carbs) } }, 80);

  assert.equal(after.carbs, before.carbs + 100);
  assert.equal(after.protein, before.protein, "остальные макросы не трогаем");
  assert.equal(after.fat, before.fat);
  assert.equal(after.calories - before.calories, 400, "100 г углеводов — это 400 ккал");
});

test("цифра, вписанная руками, фиксируется как есть", () => {
  // Поле ввода отдаёт строку — разбираем её так же, как карточка настроек.
  const typed = (value: string) => stepMacro(Number(value.replace(",", ".")));
  assert.equal(typed("250"), 250);
  assert.equal(typed("187,4"), 187, "дробное значение округляется до целого грамма");
  assert.equal(typed(""), 0, "пустое поле не ломает норму");
});

test("текущий вес берётся из последнего взвешивания, а не из будущего", () => {
  const weights = [
    { date: "2026-01-01", weight: 80 },
    { date: "2026-02-01", weight: 78 },
    { date: "2030-01-01", weight: 60 },
  ];
  assert.equal(lastWeighIn(weights, "2026-03-01")?.weight, 78);
  assert.equal(currentWeight(profile, weights), 78);
  assert.equal(currentWeight(profile, []), 80, "без взвешиваний — стартовый вес");
});
