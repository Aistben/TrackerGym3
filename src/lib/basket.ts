/**
 * Корзина дня: продукты, скопированные на другой день, но ещё не разложенные
 * по приёмам. Логика чистая (без DOM и localStorage) — её проверяют тесты.
 *
 * Сценарий: свайп по продукту вправо → «На завтра» → копия продукта попадает
 * в корзину следующего дня. На следующий день корзина видна над кнопкой
 * «Сканировать»; продукт зажимают пальцем и перетаскивают в нужную карточку
 * приёма. Пока продукт в корзине, в калории дня он не идёт.
 */
import type { BasketItem, MealEntry } from "./types";

/** Сколько дней корзина хранит неразобранные продукты. */
export const BASKET_TTL_DAYS = 30;

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Новая позиция корзины: копия продукта на указанный день. */
export function makeBasketItem(entry: MealEntry, date: string, id: string, createdAt: number): BasketItem {
  return { id, date, createdAt, entry: { ...entry } };
}

export function addBasketItem(items: BasketItem[], item: BasketItem): BasketItem[] {
  return [...items, item];
}

export function removeBasketItem(items: BasketItem[], id: string): BasketItem[] {
  return items.filter((item) => item.id !== id);
}

/** Позиции корзины конкретного дня — в порядке добавления (сверху старые). */
export function basketForDate(items: BasketItem[], date: string): BasketItem[] {
  return items.filter((item) => item.date === date).sort((a, b) => a.createdAt - b.createdAt);
}

/** Сколько продуктов ждёт раскладки в этот день (для счётчика на корзине). */
export function basketCount(items: BasketItem[], date: string): number {
  return basketForDate(items, date).length;
}

/** Продукт из корзины — в приём. Возвращает новую строку приёма (свежий id). */
export function basketEntryForMeal(item: BasketItem, id: string): MealEntry {
  return { ...item.entry, id };
}

/** Разница в днях между ISO-датами (без учёта времени). */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T12:00:00`);
  const b = Date.parse(`${to}T12:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/** Чистим корзину: старые дни (не разобрали за месяц) и битые записи. */
export function pruneBasket(items: BasketItem[], today: string): BasketItem[] {
  if (!isDate(today)) return items;
  return items.filter((item) => {
    if (!isDate(item?.date)) return false;
    // Будущие дни (отрицательный возраст) сохраняем: корзину можно наполнять
    // заранее, листая дни вперёд.
    return daysBetween(item.date, today) <= BASKET_TTL_DAYS;
  });
}

/** Значения из localStorage/бэкапа: оставляем только корректные позиции. */
export function sanitizeBasket(value: unknown): BasketItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Partial<BasketItem>;
    const entry = item.entry as Partial<MealEntry> | undefined;
    if (!item.id || !isDate(item.date) || !entry || typeof entry.name !== "string") return [];
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
    return [
      {
        id: String(item.id),
        date: item.date,
        createdAt: num(item.createdAt),
        entry: {
          id: typeof entry.id === "string" && entry.id ? entry.id : String(item.id),
          productId: entry.productId,
          name: entry.name,
          grams: num(entry.grams),
          kcal: num(entry.kcal),
          protein: num(entry.protein),
          fat: num(entry.fat),
          carbs: num(entry.carbs),
        },
      },
    ];
  });
}
