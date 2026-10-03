import type { Product } from "./types";

/**
 * Поиск по своей базе продуктов.
 *
 * Раньше совпадение искали одной подстрокой по склейке «название + бренд + код»,
 * поэтому «сырный соус махеев» не находил «Соус Махеевъ Сырный»: слова стоят в
 * другом порядке, а бренд вообще в отдельном поле. Теперь запрос разбивается на
 * слова, каждое ищется по названию, бренду и штрихкоду независимо, с учётом
 * «ё/ъ» и опечаток.
 */

/** Приводим текст к сравнимому виду: регистр, «ё/ъ», пунктуация, лишние пробелы. */
export function normalizeText(value: string): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/ъ/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** «100 г», «0,5 л», «2 шт» — единицы измерения ничего не говорят о продукте. */
const UNIT_WORDS = new Set(["г", "гр", "гр.", "кг", "мл", "л", "шт", "штук", "упак", "пач", "уп", "порц", "порция"]);

export function textTokens(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token && !UNIT_WORDS.has(token));
}

/**
 * Расстояние редактирования (Дамерау — Левенштейн): перестановка соседних букв
 * считается одной ошибкой, потому что «суос» вместо «соус» — самая частая опечатка.
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev2: number[] | null = null;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prev2[j - 2] + 1);
      }
      row[j] = value;
    }
    prev2 = prev;
    prev = row;
  }
  return prev[b.length];
}

/** «Суос» ≈ «соус», но «сок» ≠ «сыр»: короткие слова сверяем строго. */
function isCloseToken(a: string, b: string): boolean {
  const shorter = Math.min(a.length, b.length);
  if (shorter < 4) return false;
  if (Math.abs(a.length - b.length) > 2) return false;
  return editDistance(a, b) <= (Math.max(a.length, b.length) >= 8 ? 2 : 1);
}

type Searchable = {
  product: Product;
  barcode: string;
  nameTokens: string[];
  brandTokens: string[];
};

function prepare(product: Product): Searchable {
  return {
    product,
    barcode: (product.barcode ?? "").replace(/\D/g, ""),
    nameTokens: textTokens(product.name),
    brandTokens: textTokens(product.brand ?? ""),
  };
}

/** Насколько одно слово запроса похоже на продукт: 0 — не подходит. */
function tokenScore(token: string, item: Searchable, fuzzy: boolean): number {
  // Длинное число — это штрихкод: сравниваем с кодом целиком, а не со словами.
  if (/^\d{4,}$/.test(token)) return item.barcode.includes(token) ? 3 : 0;

  let score = 0;
  for (const word of item.nameTokens) {
    if (word === token) score = Math.max(score, 2.4);
    else if (word.startsWith(token)) score = Math.max(score, 2 + Math.min(token.length, 12) / 20);
    else if (token.length >= 4 && word.includes(token)) score = Math.max(score, 1.1);
  }
  for (const word of item.brandTokens) {
    if (word === token) score = Math.max(score, 2.4);
    else if (word.startsWith(token)) score = Math.max(score, 1.8);
    else if (token.length >= 4 && word.includes(token)) score = Math.max(score, 0.9);
  }
  if (score > 0) return score;

  if (fuzzy && token.length >= 4) {
    for (const word of [...item.nameTokens, ...item.brandTokens]) {
      if (isCloseToken(token, word)) return 0.6;
    }
  }
  return 0;
}

const sourceRank = (product: Product) => (product.source === "base" ? 1 : 0);

type Rated = { product: Product; score: number; strong: number; matched: number };

function rate(products: Product[], queryTokens: string[], fuzzy: boolean): Rated[] {
  const rated: Rated[] = [];
  for (const product of products) {
    const item = prepare(product);
    let score = 0;
    let strong = 0;
    let matched = 0;
    for (const token of queryTokens) {
      const value = tokenScore(token, item, fuzzy);
      if (!value) continue;
      score += value;
      matched += 1;
      if (value >= 1) strong += 1;
    }
    if (matched) rated.push({ product, score, strong, matched });
  }
  return rated;
}

function bestFirst(rated: Rated[]): Product[] {
  return rated
    .sort(
      (a, b) =>
        b.strong - a.strong ||
        b.matched - a.matched ||
        b.score - a.score ||
        sourceRank(a.product) - sourceRank(b.product) ||
        a.product.name.length - b.product.name.length,
    )
    .map((entry) => entry.product);
}

export type SearchOutcome = {
  items: Product[];
  /** совпадение не строгое (опечатка или совпала только часть слов) — показываем пометку */
  fuzzy: boolean;
};

/**
 * Ищем продукт в своей базе. Порядок: все слова совпали → слова с опечатками →
 * совпала хотя бы часть слов (последнее помечаем как «похожие»).
 */
export function searchProducts(products: Product[], query: string, limit = 60): SearchOutcome {
  const tokens = textTokens(query);
  if (!tokens.length) return { items: products.slice(0, limit), fuzzy: false };

  const strict = rate(products, tokens, false);
  const complete = strict.filter((entry) => entry.matched === tokens.length);
  if (complete.length) return { items: bestFirst(complete).slice(0, limit), fuzzy: false };

  // Строгих совпадений нет — пробуем с опечатками: важно, чтобы совпали ВСЕ слова
  // запроса, пусть и с ошибкой в одном из них («суос махеев» → соус «Махеевъ»).
  const guessed = rate(products, tokens, true).filter((entry) => entry.matched === tokens.length);
  const guessedIds = new Set(guessed.map((entry) => entry.product.id));
  if (guessed.length) {
    // Плюс продукты, где совпали все слова кроме одного — это тоже подсказка.
    const relaxed = strict.filter((entry) => entry.matched === tokens.length - 1 && !guessedIds.has(entry.product.id));
    return { items: bestFirst([...guessed, ...relaxed]).slice(0, limit), fuzzy: true };
  }
  const relaxed = strict.filter((entry) => entry.matched === tokens.length - 1);
  if (relaxed.length) return { items: bestFirst(relaxed).slice(0, limit), fuzzy: true };

  // Совсем не то: показываем всё, где совпало хоть одно слово — обычно это и надо.
  const partial = strict.filter((entry) => entry.strong > 0);
  return { items: bestFirst(partial).slice(0, limit), fuzzy: true };
}
