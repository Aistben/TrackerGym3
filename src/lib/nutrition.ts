import type { ActivityKey, Goal, Macros, Meal, MealEntry, Profile, Targets } from "./types";

export const ACTIVITY: Record<ActivityKey, { label: string; hint: string; k: number }> = {
  sedentary: { label: "Минимальная", hint: "сидячая работа, без тренировок", k: 1.2 },
  light: { label: "Лёгкая", hint: "1–2 тренировки в неделю", k: 1.375 },
  moderate: { label: "Средняя", hint: "3–4 тренировки в неделю", k: 1.55 },
  high: { label: "Высокая", hint: "5–6 тренировок в неделю", k: 1.725 },
  athlete: { label: "Очень высокая", hint: "2 раза в день / физический труд", k: 1.9 },
};

export const GOALS: Record<Goal, { label: string; emoji: string; desc: string }> = {
  lose: { label: "Похудение", emoji: "🔥", desc: "дефицит калорий, сохраняем мышцы" },
  maintain: { label: "Поддержание", emoji: "⚖️", desc: "держим текущий вес и форму" },
  gain: { label: "Набор массы", emoji: "🍚", desc: "профицит калорий, растим массу" },
};

/** ~7700 ккал в 1 кг массы тела */
export const KCAL_PER_KG = 7700;

export function bmrMifflin(p: { sex: string; weight: number; height: number; age: number }) {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return Math.round(p.sex === "male" ? base + 5 : base - 161);
}

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

export function computeTargets(profile: Profile, currentWeight: number): Targets {
  const weight = clamp(currentWeight || profile.startWeight, 20, 400);
  const height = clamp(profile.height, 100, 250);
  const age = clamp(profile.age, 13, 100);
  const pace = clamp(profile.pace || 0, 0, 1);
  const bmr = bmrMifflin({ sex: profile.sex, weight, height, age });
  const tdee = Math.round(bmr * ACTIVITY[profile.activity].k);

  const sign = profile.goal === "lose" ? -1 : profile.goal === "gain" ? 1 : 0;
  const dailyDelta = sign * ((pace * KCAL_PER_KG) / 7);
  let calories = Math.round(tdee + dailyDelta + (profile.calorieAdjust || 0));
  calories = Math.max(calories, Math.round(bmr * 0.85));

  if (profile.customMacros) {
    const m = profile.customMacros;
    return { bmr, tdee, calories, ...m };
  }

  // Белок: 1.8–2.2 г/кг. Жиры — 30% калорий, остаток приходится на углеводы.
  // Более высокая доля жиров не завышает углеводы при наборе массы.
  const proteinPerKg = profile.goal === "lose" ? 2.2 : 1.8;
  const protein = Math.round(weight * proteinPerKg);
  const fatPct = 0.3;
  const fat = Math.round((calories * fatPct) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { bmr, tdee, calories, protein, fat, carbs };
}

export function entryTotals(e: MealEntry) {
  const k = e.grams / 100;
  return {
    kcal: e.kcal * k,
    protein: e.protein * k,
    fat: e.fat * k,
    carbs: e.carbs * k,
  };
}

export function sumTotals(entries: MealEntry[]) {
  return entries.reduce(
    (acc, e) => {
      const t = entryTotals(e);
      acc.kcal += t.kcal;
      acc.protein += t.protein;
      acc.fat += t.fat;
      acc.carbs += t.carbs;
      return acc;
    },
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

export function dayTotals(meals: Meal[]) {
  return sumTotals(meals.flatMap((m) => m.entries));
}

export function macroCalories(m: Macros) {
  return m.protein * 4 + m.fat * 9 + m.carbs * 4;
}

/* ---------- даты ---------- */

export function toISO(d: Date) {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

export function today() {
  return toISO(new Date());
}

export function shiftDate(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function daysBetween(a: string, b: string) {
  const d1 = new Date(a + "T12:00:00").getTime();
  const d2 = new Date(b + "T12:00:00").getTime();
  return Math.round((d2 - d1) / 86400000);
}

const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function humanDate(iso: string) {
  const t = today();
  if (iso === t) return "Сегодня";
  if (iso === shiftDate(t, -1)) return "Вчера";
  if (iso === shiftDate(t, 1)) return "Завтра";
  const d = new Date(iso + "T12:00:00");
  return `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
}

export function shortDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

/** Плановая траектория веса по дням */
export function planWeight(profile: Profile, iso: string) {
  const n = Math.max(0, daysBetween(profile.startDate, iso));
  const sign = profile.goal === "lose" ? -1 : profile.goal === "gain" ? 1 : 0;
  if (!sign) return profile.startWeight;
  const perDay = (profile.pace / 7) * sign;
  const w = profile.startWeight + perDay * n;
  return sign < 0 ? Math.max(w, profile.targetWeight) : Math.min(w, profile.targetWeight);
}

export function etaDays(profile: Profile, currentWeight: number) {
  if (profile.goal === "maintain" || !profile.pace) return null;
  const diff = Math.abs(profile.targetWeight - currentWeight);
  if (diff < 0.1) return 0;
  return Math.ceil((diff / profile.pace) * 7);
}

export function round(n: number, d = 0) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}
