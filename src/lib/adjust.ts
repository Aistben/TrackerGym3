/**
 * История значений для кнопки «вернуть прежнее»: одна запись на одно
 * движение слайдера, чтобы ↶ возвращала не промежуточный кадр перетаскивания,
 * а то значение, которое было до него.
 */
export const ADJUST_LIMIT = 20;

/** Добавляет значение-точку возврата. Повтор подряд не дублируется. */
export function pushValue(stack: readonly number[], value: number): number[] {
  if (stack.length && stack[stack.length - 1] === value) return [...stack];
  return [...stack, value].slice(-ADJUST_LIMIT);
}

/** Значение для возврата и история без него. */
export function undoTarget(stack: readonly number[]): { value: number; stack: number[] } | null {
  if (!stack.length) return null;
  return { value: stack[stack.length - 1], stack: stack.slice(0, -1) };
}

/** «+300 ккал», «-75 ккал», «0 ккал» */
export function formatAdjust(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded} ккал`;
}
