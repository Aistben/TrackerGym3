import assert from "node:assert/strict";
import test from "node:test";
import { SEED_PRODUCTS } from "../src/lib/seed";
import { emptyState, loadState, saveState } from "../src/lib/storage";
import { computeTargets, legacyTargets } from "../src/lib/nutrition";
import type { Profile } from "../src/lib/types";

/** Профиль текущей версии: норма БЖУ задаётся руками, темпа нет. */
const profile: Profile = {
  name: "Тест",
  sex: "male",
  age: 30,
  height: 180,
  startWeight: 80,
  targetWeight: 75,
  activity: "moderate",
  goal: "lose",
  startDate: "2026-01-01",
};

/** Профиль прошлых версий: с темпом (кг/нед) и слайдером корректировки калорий. */
const legacyProfile: Profile = {
  ...profile,
  pace: 0.5,
  calorieAdjust: 300,
  calorieAdjustHistory: [0, 150],
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
  // Новый профиль ручных БЖУ не имеет: норма пока считается по формуле.
  assert.equal(state.profile.macroTargets, undefined);
});

test("норма старого профиля замораживается в ручные БЖУ и не «прыгает»", () => {
  withStorage({ ...emptyState, profile: legacyProfile, weights: [{ date: "2026-02-01", weight: 78 }] });
  const state = loadState();
  assert.ok(state.profile);

  // Темп и корректировка из профиля убраны, а их результат остался в БЖУ.
  assert.equal(state.profile.pace, undefined);
  assert.equal(state.profile.calorieAdjust, undefined);
  assert.deepEqual(state.profile.macroTargets, legacyTargets(legacyProfile, 78));

  // Калории дня остались теми же, что человек видел до обновления (±округление).
  const before = legacyTargets(legacyProfile, 78);
  const legacyKcal = before.protein * 4 + before.fat * 9 + before.carbs * 4;
  assert.ok(Math.abs(computeTargets(state.profile, 78).calories - legacyKcal) <= 2);
});

test("ручные БЖУ сохраняются и переживают перезапуск", () => {
  withStorage({ ...emptyState, profile });
  const state = loadState();
  const withMacros = {
    ...state,
    profile: { ...state.profile!, macroTargets: { protein: 160, fat: 70, carbs: 250 } },
  };
  saveState(withMacros);

  const saved = loadState();
  assert.deepEqual(saved.profile?.macroTargets, { protein: 160, fat: 70, carbs: 250 });
  assert.equal(computeTargets(saved.profile!, 80).calories, 160 * 4 + 70 * 9 + 250 * 4);
});

test("битые значения БЖУ в профиле игнорируются, а не ломают норму", () => {
  withStorage({
    ...emptyState,
    profile: { ...profile, macroTargets: { protein: "160", fat: null, carbs: 250 } as unknown as Profile["macroTargets"] },
  });
  const state = loadState();
  assert.equal(state.profile?.macroTargets, undefined);
  assert.ok(computeTargets(state.profile!, 80).calories > 0);

  withStorage({
    ...emptyState,
    profile: { ...profile, macroTargets: { protein: 160.4, fat: 70, carbs: -20 } },
  });
  assert.deepEqual(loadState().profile?.macroTargets, { protein: 160, fat: 70, carbs: 0 });
});

test("заметки сохраняются по дням и очищаются от некорректных записей", () => {
  withStorage({
    ...emptyState,
    notes: [
      { date: "2026-05-02", text: "Заметка за второй день" },
      { date: "2026-05-01", text: "Старая запись" },
      { date: "2026-05-01", text: "Обновлённая запись" },
      { date: "не-дата", text: "Некорректная" },
      { date: "2026-05-03", text: "   " },
    ],
  });
  const state = loadState();
  assert.deepEqual(state.notes, [
    { date: "2026-05-01", text: "Обновлённая запись" },
    { date: "2026-05-02", text: "Заметка за второй день" },
  ]);

  saveState(state);
  assert.deepEqual(loadState().notes, state.notes);
});

test("общий замок профиля мигрирует старый замок калорий и сохраняет состояние", () => {
  withStorage({ ...emptyState, profile: { ...legacyProfile, calorieAdjustLocked: false } });
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
    profile: { ...legacyProfile, calorieAdjustLocked: false, calorieAdjustLockInitialized: true },
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
