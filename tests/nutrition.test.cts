import assert from "node:assert/strict";
import test from "node:test";
import { dateRange, weekdayDate } from "../src/lib/nutrition";

test("выбранная неделя содержит ровно семь дней до конечной даты", () => {
  assert.deepEqual(dateRange("2026-10-04", 7), [
    "2026-09-28",
    "2026-09-29",
    "2026-09-30",
    "2026-10-01",
    "2026-10-02",
    "2026-10-03",
    "2026-10-04",
  ]);
});

test("подписи субботы и воскресенья соответствуют календарным датам", () => {
  assert.equal(weekdayDate("2026-10-03"), "сб 3");
  assert.equal(weekdayDate("2026-10-04"), "вс 4");
});

test("пустой период не создаёт дополнительных точек", () => {
  assert.deepEqual(dateRange("2026-10-04", 0), []);
  assert.deepEqual(dateRange("2026-10-04", -3), []);
});
