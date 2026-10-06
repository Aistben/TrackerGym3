export type CalculatorOperator = "+" | "-" | "*" | "/";

/** Рассчитывает одно действие между двумя числами; принимает точку или запятую. */
export function calculate(first: string, operator: CalculatorOperator, second: string): number | null {
  if (!first.trim() || !second.trim()) return null;

  const left = Number(first.trim().replace(",", "."));
  const right = Number(second.trim().replace(",", "."));
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;

  let result: number;
  switch (operator) {
    case "+":
      result = left + right;
      break;
    case "-":
      result = left - right;
      break;
    case "*":
      result = left * right;
      break;
    case "/":
      if (right === 0) return null;
      result = left / right;
      break;
  }

  return Number.isFinite(result) ? result : null;
}

export function formatCalculatorResult(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 6 }).format(value);
}
