import assert from "node:assert/strict";
import test from "node:test";
import { SEED_PRODUCTS } from "../src/lib/seed";
import { emptyState, loadState, saveState } from "../src/lib/storage";
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

test("история возврата корректировки живёт в профиле и переживает перезапуск", () => {
  withStorage({ ...emptyState, profile: { ...profile, calorieAdjust: 300, calorieAdjustHistory: [0, 150] } });
  const saved = loadState();
  assert.deepEqual(saved.profile?.calorieAdjustHistory, [0, 150]);

  // сохраняем поверх — стрелка ↩ должна помнить шаги и в новой сессии
  saveState(saved);
  assert.deepEqual(loadState().profile?.calorieAdjustHistory, [0, 150]);
});

test("старый профиль без истории возврата не ломается", () => {
  withStorage({ ...emptyState, profile });
  const state = loadState();
  assert.ok(state.profile);
  assert.equal(state.profile.calorieAdjustHistory, undefined);
  assert.equal(state.profile.calorieAdjust, 0);
});

test("общий замок профиля мигрирует старый замок калорий и сохраняет состояние", () => {
  withStorage({ ...emptyState, profile: { ...profile, calorieAdjustLocked: false } });
  const migrated = loadState();
  assert.equal(migrated.profile?.profileSettingsLocked, true);
  assert.equal(migrated.profile?.calorieAdjustLocked, undefined);
  assert.equal(migrated.profile?.calorieAdjustLockInitialized, undefined);

  const unlocked = {
    ...migrated,
    profile: { ...migrated.profile!, profileSettingsLocked: false },
  };
  saveState(unlocked);
  assert.equal(loadState().profile?.profileSettingsLocked, false);
});

test("явно снятый старый замок калорий становится снятым общим замком", () => {
  withStorage({
    ...emptyState,
    profile: { ...profile, calorieAdjustLocked: false, calorieAdjustLockInitialized: true },
  });
  assert.equal(loadState().profile?.profileSettingsLocked, false);
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
