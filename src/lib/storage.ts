import { useEffect, useState } from "react";
import type { AppState } from "./types";
import { SEED_PRODUCTS } from "./seed";

const KEY = "nutri-tracker-v1";

export const emptyState: AppState = {
  profile: null,
  products: SEED_PRODUCTS,
  meals: [],
  weights: [],
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as AppState;
    const ids = new Set(parsed.products?.map((p) => p.id));
    const merged = [...(parsed.products ?? []), ...SEED_PRODUCTS.filter((p) => !ids.has(p.id))];
    return { ...emptyState, ...parsed, products: merged };
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
