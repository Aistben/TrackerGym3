import assert from "node:assert/strict";
import test from "node:test";
import { dateRange, progressSeries, today } from "../src/lib/nutrition";
import type { Meal, Profile, WeighIn } from "../src/lib/types";

const profile: Profile = {
  name: "Тест",
  sex: "male",
  age: 30,
  height: 180,
  startWeight: 80,
  targetWeight: 75,
  activity: "light",
  goal: "lose",
  pace: 0.5,
  startDate: "2026-09-01",
  calorieAdjust: 0,
};

function meal(date: string, entries: Meal["entries"]): Meal {
  return { id: `m-${date}`, date, title: "Обед", time: "13:00", entries };
}

const entry = (kcal: number, protein: number, fat: number, carbs: number) => ({
  id: `e-${kcal}-${protein}`,
  name: "блюдо",
  grams: 100,
  kcal,
  protein,
  fat,
  carbs,
});

test("БЖУ из дневника попадают в график прогресса (раньше линии БЖУ пропали)", () => {
  const days = ["2026-09-28", "2026-09-29", "2026-09-30"];
  const series = progressSeries({
    days,
    meals: [meal("2026-09-29", [entry(200, 20, 10, 5)]), meal("2026-09-30", [entry(300, 30, 15, 7)])],
    weights: [],
    profile,
  });

  assert.equal(series.length, 3);
  // В дни без еды БЖУ не рисуются (иначе линии «прилипают» к нулю).
  assert.equal(series[0].белки, undefined);
  assert.equal(series[0].жиры, undefined);
  assert.equal(series[0].углеводы, undefined);
  // В дни с едой — есть и белки, и жиры, и углеводы.
  for (const point of series.slice(1)) {
    assert.equal(typeof point.белки, "number", `${point.iso}: нет белков`);
    assert.equal(typeof point.жиры, "number", `${point.iso}: нет жиров`);
    assert.equal(typeof point.углеводы, "number", `${point.iso}: нет углеводов`);
  }
  assert.deepEqual(
    [series[1].белки, series[1].жиры, series[1].углеводы],
    [20, 10, 5],
  );
  assert.equal(series[2].kcal, 300);
});

test("вес рисуется только в дни взвешиваний, план — каждый день", () => {
  const days = ["2026-09-28", "2026-09-29", "2026-09-30"];
  const weights: WeighIn[] = [
    { date: "2026-09-29", weight: 79.4 },
    { date: "2026-09-30", weight: 79.1 },
  ];
  const series = progressSeries({ days, meals: [], weights, profile });

  assert.equal(series[0].факт, undefined);
  assert.equal(series[1].факт, 79.4);
  assert.equal(series[2].факт, 79.1);
  assert.ok(series.every((point) => typeof point.план === "number"), "план должен быть в каждой точке");
  // План идёт вниз при цели «похудение», но не ниже целевого веса.
  assert.ok(series[0].план >= 75);
  assert.ok(series[2].план <= series[0].план + 1e-9);
});

test("дни до старта программы в график не попадают", () => {
  const days = ["2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02"];
  const series = progressSeries({ days, meals: [], weights: [], profile });
  assert.deepEqual(
    series.map((point) => point.iso),
    ["2026-09-01", "2026-09-02"],
  );
});

test("точки содержат подписи для осей: день недели и дата", () => {
  const series = progressSeries({ days: dateRange("2026-09-30", 2), meals: [], weights: [], profile });
  assert.equal(series.length, 2);
  assert.match(series[0].date, /^\d+ [а-я]{3}$/);
  assert.match(series[0].day, /^[а-я]{2} \d+$/);
});

test("пустой дневник не ломает график веса", () => {
  const series = progressSeries({
    days: dateRange(today(), 7),
    meals: [],
    weights: [{ date: today(), weight: 78.9 }],
    profile: { ...profile, startDate: "2020-01-01" },
  });
  assert.equal(series.length, 7);
  assert.equal(series.at(-1)?.факт, 78.9);
  assert.equal(series.filter((point) => point.белки != null).length, 0);
});
