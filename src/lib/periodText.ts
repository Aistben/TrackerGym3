import { mealLabel } from "./dayText";
import { round, shiftDate, sumTotals } from "./nutrition";
import type { Macros, Meal, Targets } from "./types";

/**
 * Экспорт питания за период: месяц, прошлый месяц или неделя.
 *
 * В отличие от «Скопировать рацион» за один день, здесь текст рассчитан на
 * бухгалтерию по БЖУ: сначала строка за каждый день («понедельник, 3 ноября
 * 2026 — 1 850 ккал · Б 121 г · Ж 58 г · У 210 г»), потом итог за весь период
 * и среднее в день. По желанию под днём выводятся приёмы пищи и продукты.
 */

export type PeriodTotals = Macros & { kcal: number };

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const MONTHS_NOMINATIVE = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

const WEEKDAYS_FULL = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];

function emptyTotals(): PeriodTotals {
  return { kcal: 0, protein: 0, fat: 0, carbs: 0 };
}

/** «42350» → «42 350»: большие итоги за месяц читаются, а не слипаются. */
function num(value: number) {
  const n = round(value);
  const sign = n < 0 ? "−" : "";
  return sign + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Граммовка: целые граммы не дробим, дробные показываем с одним знаком. */
function grams(value: number) {
  return Number.isInteger(value) ? String(value) : String(round(value, 1));
}

/** «1 850 ккал · Б 121 г · Ж 58 г · У 210 г» */
function totalsLine(m: PeriodTotals) {
  return `${num(m.kcal)} ккал · Б ${num(m.protein)} г · Ж ${num(m.fat)} г · У ${num(m.carbs)} г`;
}

/** 2026-11-04 → 04.11.2026 */
export function dottedDate(iso: string) {
  return iso.split("-").reverse().join(".");
}

/** «понедельник, 3 ноября 2026» — полный день недели: так удобно читать выгрузку. */
export function fullWeekdayDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${WEEKDAYS_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
}

/** Границы календарного месяца по любой дате внутри него (YYYY-MM-DD или YYYY-MM). */
export function monthRange(monthIso: string) {
  const d = new Date(`${monthIso.slice(0, 7)}-01T12:00:00`);
  const year = d.getFullYear();
  const month = d.getMonth();
  const last = new Date(year, month + 1, 0).getDate();
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, "0")}` };
}

/** Неделя с понедельника по воскресенье, в которой лежит дата. */
export function weekRange(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const offset = Number.isNaN(d.getTime()) ? 0 : (d.getDay() + 6) % 7;
  const from = shiftDate(iso, -offset);
  return { from, to: shiftDate(from, 6) };
}

/** Все дни периода, включая оба конца. */
export function periodDays(from: string, to: string) {
  if (!from || !to || to < from) return [];
  const days: string[] = [];
  for (let day = from; day <= to; day = shiftDate(day, 1)) days.push(day);
  return days;
}

/** «ноябрь 2026» — подпись периода, если он совпадает с календарным месяцем. */
export function periodLabel(from: string, to: string) {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime()) && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${MONTHS_NOMINATIVE[a.getMonth()]} ${a.getFullYear()}`;
  }
  return `${dottedDate(from)} – ${dottedDate(to)}`;
}

/** «ноябрь 2026» по месяцу календаря. */
export function monthLabel(monthIso: string) {
  const { from, to } = monthRange(monthIso);
  return periodLabel(from, to);
}

/** «ноя 2026» — короткая подпись для кнопок выбора периода. */
export function monthShortLabel(monthIso: string) {
  const d = new Date(`${monthIso.slice(0, 7)}-01T12:00:00`);
  if (Number.isNaN(d.getTime())) return monthIso;
  return `${MONTHS_NOMINATIVE[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

/** Соседний месяц: -1 — прошлый, +1 — следующий. */
export function shiftMonth(monthIso: string, delta: number) {
  const d = new Date(`${monthIso.slice(0, 7)}-01T12:00:00`);
  const next = new Date(d.getFullYear(), d.getMonth() + delta, 1, 12);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Итоги по каждому дню периода — только дни, где есть записи. Пустые дни в
 * карту не попадают: их отдельно считает `summarizePeriod`.
 */
export function periodTotalsByDay(meals: Meal[], from: string, to: string) {
  const result = new Map<string, PeriodTotals>();
  for (const meal of meals) {
    if (!meal.entries.length) continue;
    if (meal.date < from || meal.date > to) continue;
    const previous = result.get(meal.date) ?? emptyTotals();
    const current = sumTotals(meal.entries);
    result.set(meal.date, {
      kcal: previous.kcal + current.kcal,
      protein: previous.protein + current.protein,
      fat: previous.fat + current.fat,
      carbs: previous.carbs + current.carbs,
    });
  }
  return result;
}

export interface PeriodSummary {
  from: string;
  to: string;
  /** всего дней в периоде */
  days: number;
  /** сколько дней с записями */
  daysWithEntries: number;
  totals: PeriodTotals;
  /** среднее в день с записями (нули, если записей нет) */
  average: PeriodTotals;
  /** дни без записей — по порядку */
  emptyDays: string[];
  byDay: Map<string, PeriodTotals>;
}

/** Итоги за период: сумма БЖУ, среднее в день и дни без записей. */
export function summarizePeriod(meals: Meal[], from: string, to: string): PeriodSummary {
  const days = periodDays(from, to);
  const byDay = periodTotalsByDay(meals, from, to);
  const totals = emptyTotals();
  for (const day of days) {
    const dayTotals = byDay.get(day);
    if (!dayTotals) continue;
    totals.kcal += dayTotals.kcal;
    totals.protein += dayTotals.protein;
    totals.fat += dayTotals.fat;
    totals.carbs += dayTotals.carbs;
  }
  const daysWithEntries = byDay.size;
  const average = emptyTotals();
  if (daysWithEntries) {
    average.kcal = totals.kcal / daysWithEntries;
    average.protein = totals.protein / daysWithEntries;
    average.fat = totals.fat / daysWithEntries;
    average.carbs = totals.carbs / daysWithEntries;
  }
  return {
    from,
    to,
    days: days.length,
    daysWithEntries,
    totals,
    average,
    emptyDays: days.filter((day) => !byDay.has(day)),
    byDay,
  };
}

/** «1, 2 ноября 2026; 1 декабря 2026» — дни без записей одной строкой. */
function emptyDaysText(days: string[]) {
  const groups = new Map<string, number[]>();
  for (const iso of days) {
    const d = new Date(`${iso}T12:00:00`);
    const key = `${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
    const list = groups.get(key) ?? [];
    list.push(d.getDate());
    groups.set(key, list);
  }
  return [...groups.entries()].map(([month, numbers]) => `${numbers.join(", ")} ${month}`).join("; ");
}

export interface PeriodTextInput {
  from: string;
  to: string;
  meals: Meal[];
  targets: Targets;
  /** имя из профиля — строка «Профиль: …» появится, только если оно заполнено */
  name?: string;
  /** добавить под каждым днём приёмы пищи и продукты */
  includeProducts?: boolean;
}

/**
 * Питание за период обычным текстом: день за днём, итог за весь период и
 * среднее в день. Такую выгрузку можно вставить в заметки или отправить
 * тренеру — БЖУ за каждый день и за месяц видно целиком.
 */
export function buildPeriodText({ from, to, meals, targets, name, includeProducts = false }: PeriodTextInput) {
  const summary = summarizePeriod(meals, from, to);
  const lines: string[] = [`Питание за ${periodLabel(from, to)}`, `Период: ${dottedDate(from)} – ${dottedDate(to)}`];
  const who = name?.trim();
  if (who) lines.push(`Профиль: ${who}`);
  lines.push("", `Норма в день: ${num(targets.calories)} ккал · белки ${num(targets.protein)} г · жиры ${num(targets.fat)} г · углеводы ${num(targets.carbs)} г`, "");

  if (!summary.daysWithEntries) {
    lines.push("За этот период записей нет.");
  } else {
    for (const iso of periodDays(from, to)) {
      const dayTotals = summary.byDay.get(iso);
      if (!dayTotals) continue;
      lines.push(`${fullWeekdayDate(iso)} — ${totalsLine(dayTotals)}`);
      if (!includeProducts) continue;

      const dayMeals = meals
        .filter((meal) => meal.date === iso && meal.entries.length)
        .sort((a, b) => a.time.localeCompare(b.time));
      for (const meal of dayMeals) {
        lines.push(`   • ${meal.time} ${mealLabel(meal.title)} — ${totalsLine(sumTotals(meal.entries))}`);
        for (const entry of meal.entries) {
          lines.push(`      • ${entry.name} — ${grams(entry.grams)} г · ${totalsLine(sumTotals([entry]))}`);
        }
      }
    }
  }

  lines.push("");
  lines.push(`Всего за период: ${totalsLine(summary.totals)}`);
  lines.push(`Дней с записями: ${summary.daysWithEntries} из ${summary.days}`);
  if (summary.daysWithEntries) lines.push(`В среднем за день: ${totalsLine(summary.average)}`);
  if (summary.emptyDays.length) lines.push(`Без записей: ${emptyDaysText(summary.emptyDays)}`);

  return lines.join("\n");
}
