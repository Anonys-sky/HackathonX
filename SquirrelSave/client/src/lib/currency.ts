/** Format amount with currency prefix (e.g. RM1,234). */
export function formatCurrency(
  amount: number,
  currency: string,
  options?: { minFractionDigits?: number; maxFractionDigits?: number }
) {
  const min = options?.minFractionDigits ?? 0;
  const max = options?.maxFractionDigits ?? 0;
  return `${currency}${amount.toLocaleString("en-MY", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  })}`;
}

/** Short date for dashboard header: D/M/YYYY */
export function formatTodayHeader(date = new Date()) {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}
