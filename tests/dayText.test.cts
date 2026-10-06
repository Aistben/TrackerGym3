import assert from "node:assert/strict";
import test from "node:test";
import { buildDayRationText, fullDate, mealLabel } from "../src/lib/dayText";
import type { Meal, Targets } from "../src/lib/types";

const targets: Targets = { calories: 2100, protein: 150, fat: 70, carbs: 230, bmr: 1700, tdee: 2400 };

const breakfast: Meal = {
  id: "m1",
  date: "2026-10-05",
  title: "Завтрак",
  time: "08:30",
  entries: [{ id: "e1", name: "Овсянка", grams: 60, kcal: 350, protein: 12, fat: 6, carbs: 62 }],
};

const lunch: Meal = {
  id: "m2",
  date: "2026-10-05",
  title: "Обед",
  time: "13:30",
  entries: [{ id: "e2", name: "Творог 5%", grams: 200, kcal: 121, protein: 17, fat: 5, carbs: 3 }],
};

test("текст рациона содержит норму, итог за день и остаток до нормы", () => {
  const text = buildDayRationText({ date: "2026-10-05", meals: [lunch, breakfast], targets, name: "Тест" });

  assert.equal(
    text,
    [
      "Рацион за день",
      "пн, 5 октября 2026",
      "Профиль: Тест",
      "",
      "Норма в день: 2100 ккал · белки 150 г · жиры 70 г · углеводы 230 г",
      "Съедено за день: 452 ккал · Б 41 г · Ж 14 г · У 43 г",
      "Осталось до нормы: 1648 ккал · Б 109 г · Ж 56 г · У 187 г",
      "",
      "Приёмы пищи:",
      "• 08:30 Завтрак — 210 ккал · Б 7 г · Ж 4 г · У 37 г",
      "   • Овсянка — 60 г · 210 ккал · Б 7 г · Ж 4 г · У 37 г",
      "",
      "• 13:30 Обед — 242 ккал · Б 34 г · Ж 10 г · У 6 г",
      "   • Творог 5% — 200 г · 242 ккал · Б 34 г · Ж 10 г · У 6 г",
    ].join("\n"),
  );
});

test("приёмы идут по времени, а не в порядке добавления", () => {
  const text = buildDayRationText({ date: "2026-10-05", meals: [lunch, breakfast], targets });
  assert.ok(text.indexOf("08:30 Завтрак") < text.indexOf("13:30 Обед"));
});

test("норма видна и в пустом дне — им можно поделиться как планом", () => {
  const text = buildDayRationText({ date: "2026-10-05", meals: [], targets });

  assert.match(text, /Норма в день: 2100 ккал · белки 150 г · жиры 70 г · углеводы 230 г/);
  assert.match(text, /Съедено за день: 0 ккал · Б 0 г · Ж 0 г · У 0 г/);
  assert.match(text, /Осталось до нормы: 2100 ккал · Б 150 г · Ж 70 г · У 230 г/);
  assert.match(text, /Приёмы пищи:\nпока пусто/);
  assert.ok(!text.includes("Перебор"), "в пустом дне не должно быть строки перебора");
  assert.ok(!text.includes("Профиль:"), "без имени строка профиля не выводится");
});

test("превышение нормы показывается отдельной строкой и только по факту", () => {
  const heavy: Meal = {
    id: "m3",
    date: "2026-10-05",
    title: "Приём",
    time: "20:00",
    entries: [{ id: "e3", name: "Пицца", grams: 300, kcal: 400, protein: 100, fat: 80, carbs: 20 }],
  };
  const text = buildDayRationText({
    date: "2026-10-05",
    meals: [heavy],
    targets: { ...targets, calories: 1000, protein: 150, fat: 70, carbs: 230 },
  });

  assert.match(text, /Съедено за день: 1200 ккал · Б 300 г · Ж 240 г · У 60 г/);
  assert.match(text, /Осталось до нормы: 0 ккал · Б 0 г · Ж 0 г · У 170 г/);
  assert.match(text, /Перебор: 200 ккал · Б 150 г · Ж 170 г/);
  // Служебное название «Приём» в тексте не остаётся
  assert.match(text, /• 20:00 Приём пищи — 1200 ккал/);
});

test("дробные граммовки продуктов читаются по-человечески", () => {
  const fractional: Meal = {
    id: "m4",
    date: "2026-10-05",
    title: "Перекус",
    time: "16:00",
    entries: [{ id: "e4", name: "Сыр", grams: 12.5, kcal: 360, protein: 25, fat: 27, carbs: 0 }],
  };
  const text = buildDayRationText({ date: "2026-10-05", meals: [fractional], targets });
  assert.match(text, /• Сыр — 12\.5 г · 45 ккал · Б 3 г · Ж 3 г · У 0 г/);
});

test("дата форматируется для текста рациона", () => {
  assert.equal(fullDate("2026-10-05"), "пн, 5 октября 2026");
});

test("название приёма подставляется, если пользователь его не задал", () => {
  assert.equal(mealLabel(undefined), "Приём пищи");
  assert.equal(mealLabel("  "), "Приём пищи");
  assert.equal(mealLabel("Приём"), "Приём пищи");
  assert.equal(mealLabel(" После тренировки "), "После тренировки");
});
