import { useEffect, useState } from "react";
import type { AppState, Profile } from "./types";
import { SEED_PRODUCTS } from "./seed";

const KEY = "nutri-tracker-v1";

export const emptyState: AppState = {
  profile: null,
  products: SEED_PRODUCTS,
  meals: [],
  weights: [],
  recentProductIds: [],
};

/**
 * В ранних версиях можно было задать БЖУ вручную. Этот режим убрали, поэтому
 * сохранённые значения вычищаем — иначе старые макросы молча перебивали бы
 * расчёт и их нельзя было бы изменить в интерфейсе.
 */
function dropLegacyMacros(profile: Profile): Profile {
  const clean = { ...profile } as Profile & { customMacros?: unknown };
  delete clean.customMacros;
  return clean;
}

/**
 * Раньше слайдер корректировки создавался разблокированным. При первом чтении
 * старого профиля фиксируем его, а маркер сохраняет явное решение пользователя
 * разблокировать слайдер при следующих загрузках.
 */
function normalizeProfile(profile: Profile): Profile {
  const clean = dropLegacyMacros(profile);
  if (!clean.calorieAdjustLockInitialized) {
    return { ...clean, calorieAdjustLocked: true, calorieAdjustLockInitialized: true };
  }
  return {
    ...clean,
    calorieAdjustLocked: clean.calorieAdjustLocked ?? true,
    calorieAdjustLockInitialized: true,
  };
}

/** Нормализация используется и при чтении localStorage, и при импорте резервной копии. */
export function normalizeState(value: unknown): AppState {
  const parsed = value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<AppState>) : {};
  const profile = parsed.profile && typeof parsed.profile === "object" ? normalizeProfile(parsed.profile as Profile) : null;
  const products = Array.isArray(parsed.products) ? parsed.products : [];
  const ids = new Set(products.map((product) => product.id));

  return {
    ...emptyState,
    ...parsed,
    profile,
    products: [...products, ...SEED_PRODUCTS.filter((product) => !ids.has(product.id))],
    meals: Array.isArray(parsed.meals) ? parsed.meals : [],
    weights: Array.isArray(parsed.weights) ? parsed.weights : [],
    recentProductIds: Array.isArray(parsed.recentProductIds) ? parsed.recentProductIds : [],
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState;
    return normalizeState(JSON.parse(raw));
  } catch {
    return emptyState;
  }
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function usePersistentState() {
  const [state, setState] = useState<AppState>(() => loadState());
  useEffect(() => {
    saveState(state);
  }, [state]);
  return [state, setState] as const;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
