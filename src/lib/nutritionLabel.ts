export type LabelValues = Partial<Record<"kcal" | "protein" | "fat" | "carbs", string>>;

function valueAfter(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = Number(match[1].replace(",", "."));
      if (Number.isFinite(value) && value >= 0 && value < 10000) return String(Math.round(value * 10) / 10);
    }
  }
}

/** Достаёт значения «на 100 г» из русского или английского текста этикетки. */
export function parseNutritionLabel(raw: string): LabelValues {
  const text = raw
    .toLowerCase()
    .replace(/[|]/g, " ")
    .replace(/(\d)\s*[,.:]\s*(\d)/g, "$1.$2")
    .replace(/\s+/g, " ");

  const kcal = valueAfter(text, [
    /(?:энергетическ\w*\s+ценност\w*|калорийн\w*|energy)[^\d]{0,45}(\d{2,4}(?:\.\d+)?)(?:\s*ккал|\s*kcal)/i,
    /(\d{2,4}(?:\.\d+)?)\s*(?:ккал|kcal)/i,
  ]);
  const protein = valueAfter(text, [/(?:белк\w*|protein)[^\d]{0,15}(\d{1,3}(?:\.\d+)?)/i]);
  const fat = valueAfter(text, [/(?:жир\w*|fat)[^\d]{0,15}(\d{1,3}(?:\.\d+)?)/i]);
  const carbs = valueAfter(text, [/(?:углевод\w*|carbohydrate\w*)[^\d]{0,20}(\d{1,3}(?:\.\d+)?)/i]);

  return {
    ...(kcal ? { kcal } : {}),
    ...(protein ? { protein } : {}),
    ...(fat ? { fat } : {}),
    ...(carbs ? { carbs } : {}),
  };
}
