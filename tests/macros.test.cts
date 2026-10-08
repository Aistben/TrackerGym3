import assert from "node:assert/strict";
import test from "node:test";
import { MACRO_STEP, computeTargets, currentWeight, lastWeighIn, stepMacro } from "../src/lib/nutrition";
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

test("пока БЖУ не заданы руками, работает формула: белок по весу, калории по TDEE", () => {
  const t = computeTargets(profile, 80);
  assert.equal(t.protein, 176, "при похудении белок 2,2 г/кг");
  // Темпа и корректировки больше нет: норма это TDEE, округлённый через БЖУ
  // (±1–2 ккал — округление граммов, а не отдельная надбавка).
  assert.ok(Math.abs(t.calories - t.tdee) <= 3, `норма ${t.calories} должна быть около TDEE ${t.tdee}`);
  assert.equal(t.fat, Math.round((t.tdee * 0.3) / 9));
  assert.equal(t.carbs, Math.round((t.tdee - t.protein * 4 - t.fat * 9) / 4));
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
