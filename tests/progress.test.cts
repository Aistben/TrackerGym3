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
  startDate: "2026-09-01",
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
});

test("плана от темпа в точках графика больше нет", () => {
  const series = weightSeries({
    days: dateRange("2026-09-30", 2),
    weights: [{ date: "2026-09-30", weight: 79 }],
    profile,
  });
  assert.ok(series.every((point) => !("план" in point)), "точки плана остались");
});

test("в точках графика нет ничего кроме веса и подписей дня", () => {
  const series = weightSeries({
    days: dateRange("2026-09-30", 2),
    weights: [{ date: "2026-09-30", weight: 79 }],
    profile,
  });
  for (const point of series) {
    assert.deepEqual(Object.keys(point).sort(), ["date", "day", "iso", "факт"].filter((key) => key in point).sort());
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

test("автоматический график: пять месяцев без переключателей и без будущих записей", async () => {
  const { progressWindow } = await import("../src/lib/progress");
  const weights = [
    { date: "2026-01-01", weight: 85 },
    { date: "2026-06-14", weight: 83 },
    { date: "2026-10-01", weight: 81 },
    { date: "2026-11-14", weight: 80 },
    { date: "2026-12-01", weight: 79 },
  ];
  const result = progressWindow(weights, "2026-11-14");
  assert.equal(result.start, "2026-06-14");
  assert.equal(result.end, "2026-11-14");
  assert.equal(result.points.length, 3);
  assert.equal(result.points.at(-1)?.факт, 80);
  assert.equal(weights.length, 5, "история не удаляется");
  assert.deepEqual(progressWindow(weights, "2026-11-14"), result, "повторное открытие не сбрасывает период");
});

test("график автоматически сдвигается при смене месяца и новом взвешивании", async () => {
  const { progressWindow } = await import("../src/lib/progress");
  const weights = [{ date: "2026-06-30", weight: 82 }, { date: "2026-11-30", weight: 80 }];
  assert.equal(progressWindow(weights, "2026-11-30").points.length, 2);
  const next = progressWindow([...weights, { date: "2026-12-01", weight: 79 }], "2026-12-01");
  assert.equal(next.start, "2026-07-01");
  assert.equal(next.points.length, 2);
  assert.equal(next.points.at(-1)?.факт, 79);
});

test("давняя запись видна без ручной настройки; пустая история безопасна", async () => {
  const { progressWindow, fiveMonthsBefore } = await import("../src/lib/progress");
  const result = progressWindow([{ date: "2024-02-29", weight: 80 }], "2026-11-14");
  assert.equal(result.historical, true);
  assert.equal(result.end, "2024-02-29");
  assert.equal(result.points.length, 1);
  assert.deepEqual(progressWindow([], "2026-11-14").points, []);
  assert.equal(fiveMonthsBefore("2026-07-31"), "2026-02-28");
  assert.equal(fiveMonthsBefore("2024-07-31"), "2024-02-29");
});
