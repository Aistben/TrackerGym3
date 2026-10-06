import assert from "node:assert/strict";
import test from "node:test";
import { calculate, formatCalculatorResult } from "../src/lib/calculator";

test("калькулятор считает четыре базовые операции", () => {
  assert.equal(calculate("12", "+", "3"), 15);
  assert.equal(calculate("12", "-", "3"), 9);
  assert.equal(calculate("12", "*", "3"), 36);
  assert.equal(calculate("12", "/", "3"), 4);
});

test("калькулятор принимает десятичную запятую и форматирует результат по-русски", () => {
  assert.equal(calculate("1,25", "*", "2"), 2.5);
  assert.equal(formatCalculatorResult(2.5), "2,5");
});

test("неполные выражения и деление на ноль не дают результата", () => {
  assert.equal(calculate("", "+", "2"), null);
  assert.equal(calculate("abc", "+", "2"), null);
  assert.equal(calculate("2", "/", "0"), null);
});
