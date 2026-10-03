import assert from "node:assert/strict";
import test from "node:test";
import { SEED_PRODUCTS } from "../src/lib/seed";
import { emptyState, loadState } from "../src/lib/storage";
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
  pace: 0.5,
  startDate: "2026-01-01",
  calorieAdjust: 0,
  calorieAdjustLocked: false,
};

function withStorage(payload: unknown) {
  const store = new Map<string, string>();
  store.set("nutri-tracker-v1", JSON.stringify(payload));
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  };
}

test("ручные БЖУ из старых версий вычищаются при загрузке", () => {
  withStorage({
    profile: { ...profile, customMacros: { protein: 155, fat: 103, carbs: 387 } },
    products: [],
    meals: [],
    weights: [],
    recentProductIds: [],
  });
  const state = loadState();
  assert.ok(state.profile);
  assert.ok(!("customMacros" in state.profile), "старые ручные макросы остались в профиле");
  assert.equal(state.profile.calorieAdjust, 0);
});

test("без сохранённых данных отдаём базовое состояние с продуктами", () => {
  (globalThis as any).localStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
  const state = loadState();
  assert.equal(state.products.length, SEED_PRODUCTS.length);
  assert.equal(state.profile, emptyState.profile);
});

test("битые данные не роняют приложение", () => {
  (globalThis as any).localStorage = {
    getItem: () => "{не json",
    setItem: () => undefined,
    removeItem: () => undefined,
  };
  assert.deepEqual(loadState().products, SEED_PRODUCTS);
});
