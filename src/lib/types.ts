export type Sex = "male" | "female";
export type Goal = "lose" | "maintain" | "gain";

export type ActivityKey = "sedentary" | "light" | "moderate" | "high" | "athlete";

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  height: number; // см
  startWeight: number; // кг
  /** @deprecated Целевой вес убран из настроек: норму задаёт цель. Оставлен для старых бэкапов. */
  targetWeight?: number; // кг
  activity: ActivityKey;
  /** Цель задаёт базовую норму (калории от TDEE и белок), пока БЖУ не заданы руками. */
  goal: Goal;
  startDate: string; // YYYY-MM-DD
  /** Общий замок цели, параметров тела и нормы калорий в профиле. */
  profileSettingsLocked?: boolean;
  /**
   * Норма БЖУ, которую пользователь задал руками в настройках.
   * Пока её нет (новый профиль) — БЖУ считаются по формуле, а калории
   * получаются из них: белки и углеводы по 4 ккал/г, жиры по 9 ккал/г.
   */
  macroTargets?: Macros;
  /** @deprecated Темп (кг/нед). Убран: норму задают руками. Оставлен для миграции. */
  pace?: number;
  /** @deprecated Ручная корректировка калорий. Оставлена для миграции профилей. */
  calorieAdjust?: number;
  /** @deprecated Старый замок только корректировки калорий, оставлен для миграции профилей. */
  calorieAdjustLocked?: boolean;
  /** @deprecated Маркер миграции старого замка корректировки калорий. */
  calorieAdjustLockInitialized?: boolean;
  /** @deprecated История корректировки калорий (кнопка «вернуть»). Убрана вместе со слайдером. */
  calorieAdjustHistory?: number[];
}

export interface Macros {
  protein: number;
  fat: number;
  carbs: number;
}

export interface Targets extends Macros {
  calories: number;
  bmr: number;
  tdee: number;
}

/** Продукт в базе. Значения на 100 г / 100 мл */
export interface Product {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  /** г в одной "порции"/штуке, если применимо */
  portion?: number;
  source: "base" | "user" | "off";
  createdAt: string;
}

export interface MealEntry {
  id: string;
  productId?: string;
  name: string;
  grams: number;
  kcal: number; // на 100 г
  protein: number;
  fat: number;
  carbs: number;
}

export interface Meal {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  time: string; // HH:MM
  entries: MealEntry[];
}

export interface WeighIn {
  date: string; // YYYY-MM-DD
  weight: number;
}

export interface DayNote {
  date: string; // YYYY-MM-DD
  text: string;
}

/**
 * Продукт, скопированный на другой день, но ещё не разложенный по приёмам.
 * Живёт в корзине своего дня: пользователь зажимает продукт в корзине и
 * перетаскивает в нужную карточку приёма.
 */
export interface BasketItem {
  id: string;
  /** день, на который продукт перенесён (YYYY-MM-DD) — корзина этого дня */
  date: string;
  /** когда положили в корзину: порядок в списке */
  createdAt: number;
  /** копия продукта; id строки в приёме выдаётся заново при перетаскивании */
  entry: MealEntry;
}

export interface AppState {
  profile: Profile | null;
  products: Product[];
  meals: Meal[];
  weights: WeighIn[];
  /** Личные заметки к выбранным дням дневника. */
  notes: DayNote[];
  /** id-ы продуктов в порядке последнего использования (самый свежий — первый) */
  recentProductIds: string[];
  /** корзина: продукты, перенесённые на день, но ещё не разложенные по приёмам */
  basket: BasketItem[];
}
