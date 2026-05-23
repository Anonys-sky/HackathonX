/** Calendar-month budget cycle helpers for dashboard "safe to spend" math. */

export function monthDateRange(date = new Date()): { from: string; to: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function formatBudgetMonth(date = new Date(), locale = "en-MY"): string {
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export function daysLeftInMonth(date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.max(1, lastDay - date.getDate() + 1);
}

/** Daily allowance = remaining spending budget ÷ days left in the month. */
export function safeToSpendDaily(remainingBudget: number, date = new Date()): number {
  if (remainingBudget <= 0) return 0;
  return remainingBudget / daysLeftInMonth(date);
}

export function walletSpent(allocated: number, balance: number): number {
  return Math.max(0, allocated - balance);
}
