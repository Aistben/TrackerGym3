import { round, sumTotals } from "./nutrition";
import type { Macros, Meal, Targets } from "./types";

const WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
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

type Totals = Macros & { kcal: number };

/** «пн, 5 октября 2026» — дата так, как её удобно прочитать в тексте. */
export function fullDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
}

/** Имя файла для сохранения рациона: «рацион-2026-10-05.txt». */
export function dayTextFileName(iso: string) {
  return `рацион-${iso}.txt`;
}

/** Целые цифры в тексте: 318.4 → 318, 0.5 → 1. */
function num(value: number) {
  return String(round(value));
}

/** Граммовка: целые граммы не дробим, дробные показываем с одним знаком. */
function grams(value: number) {
  return Number.isInteger(value) ? String(value) : String(round(value, 1));
}

/** «1850 ккал · Б 121 г · Ж 58 г · У 210 г» */
function totalsLine(m: Totals) {
  return `${num(m.kcal)} ккал · Б ${num(m.protein)} г · Ж ${num(m.fat)} г · У ${num(m.carbs)} г`;
}

/** Название приёма для текста: пустое и служебное «Приём» заменяем словом. */
export function mealLabel(title?: string) {
  const value = title?.trim() ?? "";
  return !value || value === "Приём" ? "Приём пищи" : value;
}

export interface DayRationInput {
  /** день, за который собираем рацион (YYYY-MM-DD) */
  date: string;
  /** приёмы пищи этого дня — в том виде, в каком их видно на экране */
  meals: Meal[];
  /** норма из настроек профиля: её и показываем в тексте */
  targets: Targets;
  /** имя из профиля — строка «Профиль: …» появится, только если оно заполнено */
  name?: string;
}

/**
 * Рацион за день обычным текстом: приёмы пищи с продуктами и граммовками,
 * итог за день, норма БЖУ из настроек и сколько до неё осталось. Такой текст
 * можно вставить в сообщение или сохранить файлом — например, отправить тренеру.
 */
export function buildDayRationText({ date, meals, targets, name }: DayRationInput) {
  const day = [...meals].sort((a, b) => a.time.localeCompare(b.time));
  const totals = sumTotals(day.flatMap((meal) => meal.entries));

  const lines: string[] = ["Рацион за день", fullDate(date)];
  const who = name?.trim();
  if (who) lines.push(`Профиль: ${who}`);
  lines.push("");

  // Норма стоит наверху — её видно сразу, ещё до списка продуктов.
  lines.push(`Норма в день: ${num(targets.calories)} ккал · белки ${num(targets.protein)} г · жиры ${num(targets.fat)} г · углеводы ${num(targets.carbs)} г`);
  lines.push(`Съедено за день: ${totalsLine(totals)}`);
  lines.push(
    `Осталось до нормы: ${totalsLine({
      kcal: Math.max(0, targets.calories - totals.kcal),
      protein: Math.max(0, targets.protein - totals.protein),
      fat: Math.max(0, targets.fat - totals.fat),
      carbs: Math.max(0, targets.carbs - totals.carbs),
    })}`,
  );

  // Перебор показываем отдельной строкой и только когда он есть: строка из нулей
  // в обычном дне только путала бы.
  const over: string[] = [];
  if (totals.kcal > targets.calories) over.push(`${num(totals.kcal - targets.calories)} ккал`);
  if (totals.protein > targets.protein) over.push(`Б ${num(totals.protein - targets.protein)} г`);
  if (totals.fat > targets.fat) over.push(`Ж ${num(totals.fat - targets.fat)} г`);
  if (totals.carbs > targets.carbs) over.push(`У ${num(totals.carbs - targets.carbs)} г`);
  if (over.length) lines.push(`Перебор: ${over.join(" · ")}`);

  lines.push("", "Приёмы пищи:");
  if (!day.length) {
    lines.push("пока пусто — за этот день ничего не добавлено");
  } else {
    day.forEach((meal, index) => {
      if (index) lines.push("");
      const mealTotals = sumTotals(meal.entries);
      const head = `• ${meal.time} ${mealLabel(meal.title)}`;
      lines.push(meal.entries.length ? `${head} — ${totalsLine(mealTotals)}` : `${head} — пока пусто`);
      for (const entry of meal.entries) {
        const t = sumTotals([entry]);
        lines.push(`   • ${entry.name} — ${grams(entry.grams)} г · ${totalsLine(t)}`);
      }
    });
  }

  return lines.join("\n");
}
