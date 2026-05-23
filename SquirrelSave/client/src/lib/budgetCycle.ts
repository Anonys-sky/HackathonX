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

/** Spending buckets: balance goes down as you spend. */
export function walletSpent(allocated: number, balance: number): number {
  return Math.max(0, allocated - balance);
}

const SAVING_WALLET_TYPES = new Set(["savings", "emergency", "goals"]);

export function isSavingWalletType(walletType: string): boolean {
  return SAVING_WALLET_TYPES.has(walletType);
}

/**
 * Savings buckets fill toward a goal (0 → allocated).
 * Legacy wallets started with balance === allocated; deposits push balance above allocated.
 */
export function walletSavedTowardGoal(allocated: number, balance: number): number {
  if (allocated <= 0) return 0;
  const bal = Math.max(0, balance);
  if (bal > allocated) {
    return Math.min(allocated, bal - allocated);
  }
  if (bal === allocated) {
    return 0;
  }
  return Math.min(allocated, bal);
}

/** Income logged as savings this month (matches Activity "+RM50 Saving"). */
export function savingsContributionsFromTransactions(
  transactions: Array<{ type: string; category: string; amount: number }>
): number {
  return transactions
    .filter((tx) => tx.type === "income" && tx.category === "savings")
    .reduce((sum, tx) => sum + tx.amount, 0);
}
