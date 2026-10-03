import assert from "node:assert/strict";
import test from "node:test";
import { ADJUST_LIMIT, formatAdjust, pushValue, undoTarget } from "../src/lib/adjust";

test("возврат к значению, которое было до случайного сдвига", () => {
  // было +300, слайдер случайно уехал на +500
  let stack: number[] = [];
  stack = pushValue(stack, 300); // начали движение от +300

  const undo = undoTarget(stack)!;
  assert.equal(undo.value, 300);
  assert.deepEqual(undo.stack, []);
});

test("несколько движений — возврат по шагам, от последнего к первому", () => {
  let stack: number[] = [];
  stack = pushValue(stack, 0); // 0 → +300
  stack = pushValue(stack, 300); // +300 → +500
  assert.deepEqual(stack, [0, 300]);

  const first = undoTarget(stack)!;
  assert.equal(first.value, 300);
  const second = undoTarget(first.stack)!;
  assert.equal(second.value, 0);
  assert.equal(undoTarget(second.stack), null);
});

test("одно движение слайдера не засоряет историю промежуточными кадрами", () => {
  // перетаскивание вызывает onChange много раз, но точку возврата пишем один раз
  const stack = pushValue([], 0);
  assert.deepEqual(pushValue(stack, 0), [0]); // то же значение подряд не дублируется
  assert.deepEqual(pushValue(stack, 25), [0, 25]); // новое — добавляется
  assert.deepEqual(pushValue([0, 25], 0), [0, 25, 0]); // возврат к прежнему тоже помним
});

test("история не растёт бесконечно", () => {
  let stack: number[] = [];
  for (let i = 0; i < ADJUST_LIMIT + 5; i++) stack = pushValue(stack, i);
  assert.equal(stack.length, ADJUST_LIMIT);
  assert.equal(stack[stack.length - 1], ADJUST_LIMIT + 4);
});

test("форматирование значения", () => {
  assert.equal(formatAdjust(300), "+300 ккал");
  assert.equal(formatAdjust(0), "0 ккал");
  assert.equal(formatAdjust(-75), "-75 ккал");
  assert.equal(formatAdjust(24.6), "+25 ккал");
});
