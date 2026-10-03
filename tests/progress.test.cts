import assert from "node:assert/strict";
import test from "node:test";
import { dateRange, today, weightSeries } from "../src/lib/nutrition";
import type { Profile, WeighIn } from "../src/lib/types";

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

test("график веса: точка на каждый день, вес — только в дни взвешиваний", () => {
  const days = ["2026-09-28", "2026-09-29", "2026-09-30"];
  const weights: WeighIn[] = [
    { date: "2026-09-29", weight: 79.4 },
    { date: "2026-09-30", weight: 79.1 },
  ];
  const series = weightSeries({ days, weights, profile });

  assert.equal(series.length, 3);
  assert.equal(series[0].факт, undefined, "в день без взвешивания вес не рисуется");
  assert.equal(series[1].факт, 79.4);
  assert.equal(series[2].факт, 79.1);
  // Пунктир плана должен быть в каждой точке, иначе линия обрывается.
  assert.ok(series.every((point) => typeof point.план === "number"), "план должен быть в каждой точке");
  assert.ok(series[0].план >= 75 && series[2].план <= series[0].план + 1e-9, "план идёт вниз, но не ниже цели");
});

test("в точках графика нет ничего кроме веса и плана", () => {
  const series = weightSeries({
    days: dateRange("2026-09-30", 2),
    weights: [{ date: "2026-09-30", weight: 79 }],
    profile,
  });
  for (const point of series) {
    assert.deepEqual(Object.keys(point).sort(), ["date", "day", "iso", "факт", "план"].filter((key) => key in point).sort());
  }
});

test("дни до старта программы в график не попадают", () => {
  const series = weightSeries({
    days: ["2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02"],
    weights: [],
    profile,
  });
  assert.deepEqual(
    series.map((point) => point.iso),
    ["2026-09-01", "2026-09-02"],
  );
});

test("подписи осей: день недели для недели и дата для длинных периодов", () => {
  const series = weightSeries({ days: dateRange("2026-09-30", 2), weights: [], profile });
  assert.equal(series.length, 2);
  assert.match(series[0].day, /^[а-я]{2} \d+$/); // «ср 30»
  assert.match(series[0].date, /^\d+ [а-я]{3}$/); // «30 сен»
});

test("без взвешиваний линия веса пустая, но график строится", () => {
  const series = weightSeries({ days: dateRange(today(), 7), weights: [], profile: { ...profile, startDate: "2020-01-01" } });
  assert.equal(series.length, 7);
  assert.equal(series.filter((point) => point.факт != null).length, 0);
  assert.equal(series.filter((point) => point.план != null).length, 7);
});

test("одно взвешивание даёт одну точку, а не пустой график", () => {
  const series = weightSeries({
    days: dateRange(today(), 7),
    weights: [{ date: today(), weight: 78.9 }],
    profile: { ...profile, startDate: "2020-01-01" },
  });
  assert.equal(series.at(-1)?.факт, 78.9);
  assert.equal(series.filter((point) => point.факт != null).length, 1);
});
