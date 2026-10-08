import type { ActivityKey, Goal, Macros, Meal, MealEntry, Profile, Targets, WeighIn } from "./types";

export const ACTIVITY: Record<ActivityKey, { label: string; hint: string; k: number }> = {
  sedentary: { label: "Минимальная", hint: "сидячая работа, без тренировок", k: 1.2 },
  light: { label: "Лёгкая", hint: "1–2 тренировки в неделю", k: 1.375 },
  moderate: { label: "Средняя", hint: "3–4 тренировки в неделю", k: 1.55 },
  high: { label: "Высокая", hint: "5–6 тренировок в неделю", k: 1.725 },
  athlete: { label: "Очень высокая", hint: "2 раза в день / физический труд", k: 1.9 },
};

/**
 * Цель задаёт базовую норму, пока БЖУ не заданы руками:
 * shift — сдвиг калорий от TDEE (−0,2 = на 20% ниже расхода),
 * proteinPerKg — белок, г на кг текущего веса.
 */
export const GOALS: Record<Goal, { label: string; emoji: string; desc: string; shift: number; proteinPerKg: number }> = {
  lose: { label: "Похудение", emoji: "🔥", desc: "дефицит калорий, сохраняем мышцы", shift: -0.2, proteinPerKg: 2.2 },
  maintain: { label: "Поддержание", emoji: "⚖️", desc: "держим текущий вес и форму", shift: 0, proteinPerKg: 1.8 },
  gain: { label: "Набор массы", emoji: "🍚", desc: "профицит калорий, растим массу", shift: 0.1, proteinPerKg: 1.8 },
};

/** Цель из сохранённых данных: всё непонятное считаем поддержанием, а не роняем приложение. */
export function normalizeGoal(value: unknown): Goal {
  return typeof value === "string" && (Object.keys(GOALS) as string[]).includes(value) ? (value as Goal) : "maintain";
}

/** Подпись сдвига нормы для карточек и подсказок: «−20% от TDEE», «на уровне TDEE». */
export function goalShiftText(goal: Goal): string {
  const pct = Math.round(GOALS[normalizeGoal(goal)].shift * 100);
  if (pct === 0) return "на уровне TDEE";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct)}% от TDEE`;
}

/** ~7700 ккал в 1 кг массы тела */
export const KCAL_PER_KG = 7700;

export function bmrMifflin(p: { sex: string; weight: number; height: number; age: number }) {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return Math.round(p.sex === "male" ? base + 5 : base - 161);
}

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

/** Шаг кнопок «−/+» рядом с БЖУ в настройках. */
export const MACRO_STEP: Record<keyof Macros, number> = { protein: 10, fat: 5, carbs: 100 };

/** Больше 1000 г любого макроса в день — уже опечатка, а не норма. */
export const MACRO_LIMIT = 1000;

/**
 * Значение БЖУ после кнопки «−/+» или ручного ввода: целое число в границах
 * 0…1000. Нечисловой ввод (пустое поле, буквы) превращается в 0, а не в NaN —
 * иначе норма калорий ломалась бы целиком.
 */
export function stepMacro(value: number, delta = 0): number {
  return clamp(Math.round((Number.isFinite(value) ? value : 0) + delta), 0, MACRO_LIMIT);
}

/** БЖУ, которые человек задал в настройках руками (или null, если их нет). */
function manualMacros(value?: Partial<Macros> | null): Macros | null {
  if (!value) return null;
  const { protein, fat, carbs } = value;
  if (![protein, fat, carbs].every((item) => typeof item === "number" && Number.isFinite(item))) return null;
  return { protein: stepMacro(protein!), fat: stepMacro(fat!), carbs: stepMacro(carbs!) };
}

/**
 * БЖУ по формуле, пока норму не задали руками: белок — г на кг по цели,
 * жиры — 30% калорий, углеводы — остаток калорий.
 */
function formulaMacros(goal: Goal, weight: number, calories: number): Macros {
  const protein = Math.round(weight * GOALS[goal].proteinPerKg);
  const fat = Math.round((calories * 0.3) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { protein, fat, carbs };
}

/**
 * Калории по цели: TDEE со сдвигом цели (похудение −20%, набор +10%), но не
 * ниже BMR — ниже базового обмена норму не опускаем.
 */
function goalCalories(goal: Goal, bmr: number, tdee: number): number {
  return Math.max(Math.round(tdee * (1 + GOALS[normalizeGoal(goal)].shift)), bmr);
}

/**
 * Норма на день. Базовая норма — от цели: калории по цели, БЖУ по формуле.
 * Если человек задал БЖУ руками, они важнее цели. Калории всегда получаются
 * из БЖУ (белки и углеводы по 4 ккал/г, жиры по 9 ккал/г).
 */
export function computeTargets(profile: Profile, currentWeight: number): Targets {
  const weight = clamp(currentWeight || profile.startWeight, 20, 400);
  const height = clamp(profile.height, 100, 250);
  const age = clamp(profile.age, 13, 100);
  const bmr = bmrMifflin({ sex: profile.sex, weight, height, age });
  const tdee = Math.round(bmr * ACTIVITY[profile.activity].k);
  const goal = normalizeGoal(profile.goal);

  const macros = manualMacros(profile.macroTargets) ?? formulaMacros(goal, weight, goalCalories(goal, bmr, tdee));
  return { bmr, tdee, calories: Math.round(macroCalories(macros)), ...macros };
}

/**
 * Прежняя норма: TDEE + темп + слайдер корректировки, а БЖУ — по формуле.
 * Нужна только при обновлении приложения: у старых профилей норма один раз
 * замораживается в ручные БЖУ, чтобы цифры не «прыгали» после удаления темпа.
 * @deprecated считает по полям Profile.pace и Profile.calorieAdjust, которых больше нет в UI.
 */
export function legacyTargets(profile: Profile, currentWeight: number): Macros {
  const weight = clamp(currentWeight || profile.startWeight, 20, 400);
  const height = clamp(profile.height, 100, 250);
  const age = clamp(profile.age, 13, 100);
  const pace = clamp(profile.pace ?? 0, 0, 1);
  const bmr = bmrMifflin({ sex: profile.sex, weight, height, age });
  const tdee = Math.round(bmr * ACTIVITY[profile.activity].k);
  const sign = profile.goal === "lose" ? -1 : profile.goal === "gain" ? 1 : 0;
  const dailyDelta = sign * ((pace * KCAL_PER_KG) / 7);
  let calories = Math.round(tdee + dailyDelta + (profile.calorieAdjust || 0));
  calories = Math.max(calories, Math.round(bmr * 0.85));
  const macros = formulaMacros(normalizeGoal(profile.goal), weight, calories);
  return macros;
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

/** Последнее взвешивание не из будущего — точка отсчёта текущего веса. */
export function lastWeighIn(weights: WeighIn[], upto = today()) {
  return (
    [...weights]
      .filter((item) => item.date <= upto)
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1) ?? null
  );
}

/** Текущий вес: последнее взвешивание, а если его нет — стартовый вес. */
export function currentWeight(profile: Profile, weights: WeighIn[]) {
  return lastWeighIn(weights)?.weight ?? profile.startWeight;
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

/** Даты выбранного периода, включая конечный день (без лишних будущих точек). */
export function dateRange(end: string, count: number) {
  const length = Math.max(0, Math.floor(count));
  if (!length) return [];
  const start = shiftDate(end, -(length - 1));
  return Array.from({ length }, (_, index) => shiftDate(start, index));
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

/** Подпись с днём недели: «пт 3» — для недельного графика, где важен день недели. */
export function weekdayDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return `${WD[d.getDay()]} ${d.getDate()}`;
}

/** Точка графика веса: одна на каждый день периода. */
export type WeightPoint = {
  iso: string;
  date: string;
  day: string;
  /** вес, кг — только в дни взвешиваний, иначе линия рвётся */
  факт?: number;
};

/**
 * Данные для графика веса: по точке на каждый день периода, вес — только
 * в дни взвешиваний (пропуски recharts просто не рисует). Плана от темпа
 * больше нет: темп убран, цель видна карточкой «Цель» и нормой на день.
 */
export function weightSeries({
  days,
  weights,
  profile,
}: {
  days: string[];
  weights: WeighIn[];
  profile: Profile;
}): WeightPoint[] {
  const weightsByDate = new Map(weights.map((item) => [item.date, item.weight]));
  return days
    .filter((iso) => iso >= profile.startDate)
    .map((iso) => ({
      iso,
      date: shortDate(iso),
      day: weekdayDate(iso),
      факт: weightsByDate.get(iso),
    }));
}

export function round(n: number, d = 0) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}
