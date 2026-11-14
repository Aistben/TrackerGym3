import { useEffect, useState } from "react";
import type { AppState, DayNote, Profile, WeighIn } from "./types";
import { SEED_PRODUCTS } from "./seed";
import { pruneBasket, sanitizeBasket } from "./basket";
import { validDate, validEntry, validMeal, validProduct, validProfile, validWeight, record } from "./validation";
import { currentWeight, legacyTargets, normalizeGoal, stepMacro, today } from "./nutrition";

const KEY = "nutri-tracker-v1";

export const emptyState: AppState = {
  profile: null,
  products: SEED_PRODUCTS,
  meals: [],
  weights: [],
  notes: [],
  recentProductIds: [],
  basket: [],
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
 * Приводим профиль к текущей модели настроек:
 *
 * - прежний замок слайдера переносим на общий замок всего блока настроек;
 * - убранные темп (кг/нед) и слайдер «ручная корректировка» больше не храним;
 * - у профилей, где они были, БЖУ один раз замораживаются в ручные значения
 *   (та же норма, что человек видел до обновления) — чтобы цифры не «прыгнули».
 *   Новый профиль ручных БЖУ не имеет: пока их не задали, работает формула.
 */
function normalizeProfile(profile: Profile, weights: WeighIn[]): Profile {
  const clean = dropLegacyMacros(profile);
  clean.goal = normalizeGoal(clean.goal);
  const profileSettingsLocked =
    typeof clean.profileSettingsLocked === "boolean"
      ? clean.profileSettingsLocked
      : clean.calorieAdjustLockInitialized
        ? clean.calorieAdjustLocked ?? true
        : true;

  const macros = clean.macroTargets;
  const macroTargets =
    macros && [macros.protein, macros.fat, macros.carbs].every((item) => typeof item === "number" && Number.isFinite(item))
      ? { protein: stepMacro(macros.protein), fat: stepMacro(macros.fat), carbs: stepMacro(macros.carbs) }
      : typeof clean.pace === "number" || typeof clean.calorieAdjust === "number"
        ? legacyTargets(clean, currentWeight(clean, weights))
        : undefined;

  delete clean.calorieAdjustLocked;
  delete clean.calorieAdjustLockInitialized;
  delete clean.pace;
  delete clean.calorieAdjust;
  delete clean.calorieAdjustHistory;
  // Целевой вес в настройках больше не нужен: норму задаёт цель, а вес — текущий.
  delete clean.targetWeight;
  return { ...clean, profileSettingsLocked, macroTargets };
}

function normalizeNotes(value: unknown): DayNote[] {
  if (!Array.isArray(value)) return [];
  const byDate = new Map<string, string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const note = item as Partial<DayNote>;
    if (!validDate(note.date)) continue;
    if (typeof note.text !== "string" || !note.text.trim()) continue;
    byDate.set(note.date, note.text);
  }
  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, text]) => ({ date, text }));
}

/** Нормализация используется и при чтении localStorage, и при импорте резервной копии. */
export function normalizeState(value: unknown): AppState {
  const parsed = value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<AppState>) : {};
  const weights = Array.isArray(parsed.weights) ? parsed.weights.filter(validWeight) : [];
  const profile =
    validProfile(parsed.profile) ? normalizeProfile(parsed.profile, weights) : null;
  const products = Array.isArray(parsed.products) ? parsed.products.filter(validProduct) : [];
  const ids = new Set(products.map((product) => product.id));
  const seedById = new Map(SEED_PRODUCTS.map((product) => [product.id, product]));
  // Базовые карточки обновляем из сида: иначе старый неверный штрихкод зефира
  // так и остался бы в localStorage, и сканер его не находил.
  const merged = products.map((product) => {
    const seed = seedById.get(product.id);
    if (!seed || product.source !== "base") return product;
    return {
      ...product,
      name: seed.name,
      brand: seed.brand,
      barcode: seed.barcode,
      kcal: seed.kcal,
      protein: seed.protein,
      fat: seed.fat,
      carbs: seed.carbs,
      portion: seed.portion,
    };
  });

  return {
    ...emptyState,
    ...parsed,
    profile,
    products: [...merged, ...SEED_PRODUCTS.filter((product) => !ids.has(product.id))],
    meals: Array.isArray(parsed.meals) ? parsed.meals.filter(validMeal).map((meal) => ({ ...meal, entries: meal.entries.filter(validEntry) })) : [],
    weights,
    notes: normalizeNotes(parsed.notes),
    recentProductIds: Array.isArray(parsed.recentProductIds) ? parsed.recentProductIds.filter((id) => typeof id === "string") : [],
    // Корзина: и из localStorage, и из бэкапа берём только корректные позиции,
    // а неразобранное за месяц выбрасываем — чтобы список не пух вечно.
    basket: pruneBasket(sanitizeBasket(parsed.basket), today()),
  };
}

/** Import is transactional: never replace a diary with an unrelated/invalid JSON file. */
export function importState(value: unknown): AppState {
  if (!record(value) || !validProfile(value.profile) ||
      !Array.isArray(value.products) || !value.products.every(validProduct) ||
      !Array.isArray(value.meals) || !value.meals.every((m) => validMeal(m) && m.entries.every(validEntry)) ||
      !Array.isArray(value.weights) || !value.weights.every(validWeight)) {
    throw new Error("Некорректная резервная копия: проверьте профиль, продукты, приёмы пищи и вес.");
  }
  return normalizeState(value);
}

let storageWarning: string | null = null;
export function loadState(): AppState {
  storageWarning = null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (!raw) return emptyState;
    const parsed: unknown = JSON.parse(raw);
    const state = normalizeState(parsed);
    // Keep an exact recovery copy before sanitizing malformed stored data.
    if (!record(parsed) || (parsed.profile != null && !validProfile(parsed.profile)) ||
        (parsed.products != null && (!Array.isArray(parsed.products) || !parsed.products.every(validProduct))) ||
        (parsed.weights != null && (!Array.isArray(parsed.weights) || !parsed.weights.every(validWeight))) ||
        (parsed.meals != null && (!Array.isArray(parsed.meals) || !parsed.meals.every((m) => validMeal(m) && m.entries.every(validEntry))))) {
      localStorage.setItem(`${KEY}-recovery`, raw);
      storageWarning = "Повреждённые записи исключены. Исходные данные сохранены в резервной записи хранилища.";
    }
    return state;
  } catch {
    if (raw) {
      try { localStorage.setItem(`${KEY}-recovery`, raw); } catch { /* leave original untouched below */ }
    }
    storageWarning = "Не удалось прочитать данные. Автосохранение отключено до перезагрузки. Сохраните резервную копию хранилища перед восстановлением.";
    return emptyState;
  }
}

export function saveState(s: AppState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function usePersistentState() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [warning, setWarning] = useState(storageWarning);
  const [blocked] = useState(() => storageWarning?.includes("Автосохранение отключено") ?? false);
  useEffect(() => {
    if (blocked) return;
    if (!saveState(state)) setWarning("Не удалось сохранить изменения на устройстве. Экспортируйте данные в профиле, прежде чем закрывать приложение.");
    else setWarning(storageWarning);
  }, [state, blocked]);
  return [state, setState, warning] as const;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
