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
  /** ручные макросы (если заданы) */
  customMacros?: Macros | null;
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
}
