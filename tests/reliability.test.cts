import assert from "node:assert/strict";
import test from "node:test";
import { normalizeState, importState, loadState, saveState, emptyState } from "../src/lib/storage";
import { computeTargets, currentWeight } from "../src/lib/nutrition";
import { updateProfile } from "../src/lib/profile";
import { fetchJsonResult, lookupBarcodeResult } from "../src/lib/openfoodfacts";
import type { Profile } from "../src/lib/types";

const profile: Profile = { name: "Тест", sex: "male", age: 30, height: 180, startWeight: 80,
  activity: "moderate", goal: "gain", startDate: "2026-01-01" };
const date = new Date().toLocaleDateString("en-CA");

test("изменение веса обновляет расчёт набора массы несмотря на прежнее взвешивание", () => {
  const state = { ...emptyState, profile, weights: [{ date: "2020-01-01", weight: 80 }] };
  const before = computeTargets(profile, currentWeight(profile, state.weights));
  const next = updateProfile(state, { startWeight: 90 }, date);
  const after = computeTargets(next.profile!, currentWeight(next.profile!, next.weights));
  assert.equal(currentWeight(next.profile!, next.weights), 90);
  assert.equal(after.protein, 162);
  for (const field of ["protein", "fat", "carbs", "calories", "bmr", "tdee"] as const) assert.notEqual(after[field], before[field]);
  assert.deepEqual(next.weights[0], state.weights[0]);
  assert.equal(updateProfile(next, { startWeight: 92 }, date).weights.length, 2);
  assert.equal(normalizeState(next).profile?.startWeight, 90);
});

test("параметры тела пересчитывают формулу, ручные БЖУ сохраняются до явного сброса", () => {
  const base = computeTargets(profile, 80);
  assert.notEqual(computeTargets({ ...profile, age: 50 }, 80).calories, base.calories);
  assert.notEqual(computeTargets({ ...profile, height: 200 }, 80).fat, base.fat);
  const state = { ...emptyState, profile: { ...profile, macroTargets: { protein: 150, fat: 70, carbs: 300 } } };
  const next = updateProfile(state, { startWeight: 90 }, date);
  assert.equal(computeTargets(next.profile!, 90).protein, 150);
  const reset = updateProfile(next, { macroTargets: undefined });
  assert.equal(computeTargets(reset.profile!, 90).protein, 162);
});

test("неверный и пустой вес не изменяет профиль и историю", () => {
  const state = { ...emptyState, profile };
  for (const weight of [0, -1, NaN, Infinity, 500]) assert.equal(updateProfile(state, { startWeight: weight }), state);
});

test("повреждённые вложенные записи не роняют нормализацию", () => {
  const state = normalizeState({ profile: {}, products: [null, {}], weights: [null, { date: "2026-02-30", weight: 80 }], meals: [null, {}], recentProductIds: [null, 12] });
  assert.equal(state.profile, null);
  assert.ok(state.products.length > 0);
  assert.deepEqual(state.weights, []);
  assert.deepEqual(state.meals, []);
  assert.deepEqual(state.recentProductIds, []);
});

test("импорт отклоняет чужой JSON и повреждённые записи; экспорт проходит round-trip", () => {
  for (const payload of [{}, { profile: {} }, { ...emptyState, profile, products: [null] }, { ...emptyState, profile, meals: [null] }]) {
    assert.throws(() => importState(payload));
  }
  assert.deepEqual(importState(JSON.parse(JSON.stringify({ ...emptyState, profile }))), normalizeState({ ...emptyState, profile }));
});

test("повреждённое хранилище резервируется, ошибка записи возвращается вызывающему коду", () => {
  const old = globalThis.localStorage;
  const store = new Map([["nutri-tracker-v1", "{broken"]]);
  try {
    globalThis.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) } as unknown as Storage;
    loadState();
    assert.equal(store.get("nutri-tracker-v1-recovery"), "{broken");
    assert.equal(store.get("nutri-tracker-v1"), "{broken");
    globalThis.localStorage.setItem = () => { throw new Error("quota"); };
    assert.equal(saveState(emptyState), false);
  } finally { globalThis.localStorage = old; }
});

test("уже отменённый запрос передаёт отмену fetch", async () => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, init) => {
      assert.equal(init?.signal?.aborted, true);
      throw new Error("aborted");
    };
    const controller = new AbortController(); controller.abort();
    assert.equal((await fetchJsonResult("https://example.test", controller.signal)).reached, false);
  } finally { globalThis.fetch = old; }
});

test("прямой поиск и fallback делят единый бюджет времени", async () => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("timeout")), { once: true });
    });
    const start = performance.now();
    assert.equal((await lookupBarcodeResult("4600494561238", 100)).status, "offline");
    assert.ok(performance.now() - start < 190, "каждый этап не должен расходовать весь бюджет");
  } finally { globalThis.fetch = old; }
});
