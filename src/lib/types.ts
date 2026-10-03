export type Sex = "male" | "female";
export type Goal = "lose" | "maintain" | "gain";

export type ActivityKey = "sedentary" | "light" | "moderate" | "high" | "athlete";

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  height: number; // см
  startWeight: number; // кг
  targetWeight: number; // кг
  activity: ActivityKey;
  goal: Goal;
  /** темп изменения веса, кг в неделю (модуль) */
  pace: number;
  startDate: string; // YYYY-MM-DD
  /** ручная корректировка калорий */
  calorieAdjust: number;
  /** замок: значение корректировки защищено от случайного сдвига слайдером */
  calorieAdjustLocked?: boolean;
  /** внутренний флаг: применена миграция значения замка по умолчанию */
  calorieAdjustLockInitialized?: boolean;
  /**
   * История значений корректировки для стрелки «вернуть» (последнее — наверху).
   * Живёт в профиле, а не в компоненте: возврат к прежнему значению работает
   * и после закрытия настроек, перезагрузки или открытия приложения на телефоне.
   */
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

export interface AppState {
  profile: Profile | null;
  products: Product[];
  meals: Meal[];
  weights: WeighIn[];
  /** id-ы продуктов в порядке последнего использования (самый свежий — первый) */
  recentProductIds: string[];
}
