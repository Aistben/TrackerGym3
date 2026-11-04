import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPeriodText,
  fullWeekdayDate,
  monthLabel,
  monthRange,
  monthShortLabel,
  periodDays,
  periodLabel,
  shiftMonth,
  summarizePeriod,
  weekRange,
} from "../src/lib/periodText";
import type { Meal, Targets } from "../src/lib/types";

const targets: Targets = { calories: 2100, protein: 150, fat: 70, carbs: 230, bmr: 1700, tdee: 2400 };

function meal(id: string, date: string, time: string, title: string, name: string, grams: number, kcal: number, protein: number, fat: number, carbs: number): Meal {
  return {
    id,
    date,
    title,
    time,
    entries: [{ id: `${id}-e`, name, grams, kcal, protein, fat, carbs }],
  };
}

const october: Meal[] = [
  meal("m1", "2026-10-30", "08:30", "Завтрак", "Овсянка", 100, 350, 12, 6, 62),
  meal("m2", "2026-10-30", "13:30", "Обед", "Творог 5%", 200, 121, 17, 5, 3),
  meal("m3", "2026-11-02", "19:00", "Ужин", "Рыба", 150, 120, 20, 4, 0),
];

test("границы месяца — от первого до последнего дня", () => {
  assert.deepEqual(monthRange("2026-11-04"), { from: "2026-11-01", to: "2026-11-30" });
  assert.deepEqual(monthRange("2026-02"), { from: "2026-02-01", to: "2026-02-28" });
  assert.equal(monthLabel("2026-11-04"), "ноябрь 2026");
  assert.equal(monthShortLabel("2026-11-04"), "ноя 2026");
});

test("неделя начинается с понедельника", () => {
  // 4 ноября 2026 — среда
  assert.deepEqual(weekRange("2026-11-04"), { from: "2026-11-02", to: "2026-11-08" });
  // воскресенье закрывает ту же неделю, а не начинает новую
  assert.deepEqual(weekRange("2026-11-08"), { from: "2026-11-02", to: "2026-11-08" });
  assert.deepEqual(weekRange("2026-11-09"), { from: "2026-11-09", to: "2026-11-15" });
});

test("дни периода включают оба конца, пустой период — ноль дней", () => {
  assert.deepEqual(periodDays("2026-10-30", "2026-11-02"), ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  assert.deepEqual(periodDays("2026-11-02", "2026-10-30"), []);
});

test("подпись периода: месяц, если границы в одном месяце, иначе даты", () => {
  assert.equal(periodLabel("2026-11-01", "2026-11-30"), "ноябрь 2026");
  assert.equal(periodLabel("2026-10-26", "2026-11-01"), "26.10.2026 – 01.11.2026");
});

test("итог за месяц складывает дни и не берёт соседний месяц", () => {
  const summary = summarizePeriod(october, ...Object.values(monthRange("2026-10-01")) as [string, string]);

  assert.equal(summary.days, 31);
  assert.equal(summary.daysWithEntries, 1);
  // овсянка 100 г + творог 200 г
  assert.equal(Math.round(summary.totals.kcal), 350 + 242);
  assert.equal(Math.round(summary.totals.protein), 12 + 34);
  assert.equal(summary.emptyDays.length, 30);
  assert.equal(summary.emptyDays[0], "2026-10-01");
  assert.ok(!summary.emptyDays.includes("2026-10-30"));
});

test("среднее считается по дням с записями, а не по всем дням месяца", () => {
  const summary = summarizePeriod(october, "2026-10-01", "2026-10-31");
  assert.equal(Math.round(summary.average.kcal), 350 + 242);
});

test("текст за месяц: по дню на строку, итог и среднее внизу", () => {
  const text = buildPeriodText({ from: "2026-10-01", to: "2026-10-31", meals: october, targets, name: "Тест" });

  assert.match(text, /^Питание за октябрь 2026/);
  assert.match(text, /Период: 01\.10\.2026 – 31\.10\.2026/);
  assert.match(text, /Профиль: Тест/);
  assert.match(text, /Норма в день: 2 100 ккал · белки 150 г · жиры 70 г · углеводы 230 г/);
  assert.match(text, /пятница, 30 октября 2026 — 592 ккал · Б 46 г · Ж 16 г · У 68 г/);
  assert.match(text, /Всего за период: 592 ккал · Б 46 г · Ж 16 г · У 68 г/);
  assert.match(text, /Дней с записями: 1 из 31/);
  assert.match(text, /В среднем за день: 592 ккал · Б 46 г · Ж 16 г · У 68 г/);
  assert.match(text, /Без записей: 1, 2, 3/);
  assert.ok(!text.includes("Рыба"), "продукты соседнего месяца в текст не попадают");
});

test("без записей текст честно говорит, что пусто", () => {
  const text = buildPeriodText({ from: "2026-09-01", to: "2026-09-30", meals: october, targets });

  assert.match(text, /За этот период записей нет\./);
  assert.match(text, /Всего за период: 0 ккал · Б 0 г · Ж 0 г · У 0 г/);
  assert.match(text, /Дней с записями: 0 из 30/);
  assert.ok(!text.includes("В среднем за день"), "среднее по пустому периоду не выводится");
  assert.ok(!text.includes("Профиль:"), "без имени строка профиля не выводится");
});

test("режим «с продуктами» добавляет приёмы пищи и граммовки", () => {
  const text = buildPeriodText({ from: "2026-10-30", to: "2026-10-30", meals: october, targets, includeProducts: true });

  assert.match(text, /пятница, 30 октября 2026 — 592 ккал/);
  assert.match(text, /   • 08:30 Завтрак — 350 ккал · Б 12 г · Ж 6 г · У 62 г/);
  assert.match(text, /      • Овсянка — 100 г · 350 ккал/);
  assert.match(text, /   • 13:30 Обед — 242 ккал/);
  // приёмы идут по времени
  assert.ok(text.indexOf("08:30 Завтрак") < text.indexOf("13:30 Обед"));
});

test("соседний месяц сдвигается через границу года", () => {
  assert.equal(shiftMonth("2026-01-01", -1), "2025-12-01");
  assert.equal(shiftMonth("2026-12-15", 1), "2027-01-01");
});

test("полная дата с днём недели для выгрузки", () => {
  assert.equal(fullWeekdayDate("2026-11-04"), "среда, 4 ноября 2026");
  assert.equal(fullWeekdayDate("2026-10-30"), "пятница, 30 октября 2026");
});
