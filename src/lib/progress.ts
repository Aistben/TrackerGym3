import type { WeighIn } from "./types";
import { lastWeighIn, toISO } from "./nutrition";
import { validWeight } from "./validation";

/** Five calendar months, clamping month-end dates instead of overflowing them. */
export function fiveMonthsBefore(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() - 5);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toISO(date);
}

/** Bounded rolling window; an inactive diary automatically shows its latest history. */
export function progressWindow(weights: WeighIn[], today: string) {
  const valid = weights.filter(validWeight);
  const latest = lastWeighIn(valid, today);
  const recentStart = fiveMonthsBefore(today);
  const end = latest && latest.date < recentStart ? latest.date : today;
  const start = fiveMonthsBefore(end);
  const byDate = new Map(valid.filter((w) => w.date >= start && w.date <= end).map((w) => [w.date, w]));
  const points = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).map((w) => ({
    iso: w.date,
    timestamp: Date.parse(`${w.date}T12:00:00`),
    факт: w.weight,
  }));
  return { start, end, points, historical: end !== today };
}
