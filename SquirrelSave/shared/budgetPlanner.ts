/** Daily budget planner categories (shown in Wealth Coach budget panel). */
export const BUDGET_PLANNER_CATEGORIES = [
  { id: "food_beverage", labelKey: "wealth.budget_food", emoji: "🍔" },
  { id: "shopping", labelKey: "wealth.budget_groceries", emoji: "🛒" },
  { id: "transport", labelKey: "wealth.budget_transport", emoji: "🚗" },
  { id: "bills_utilities", labelKey: "wealth.budget_bills", emoji: "💡" },
  { id: "entertainment", labelKey: "wealth.budget_fun", emoji: "🎮" },
  { id: "health", labelKey: "wealth.budget_health", emoji: "💊" },
  { id: "other", labelKey: "wealth.budget_other", emoji: "📦" },
] as const;

export type BudgetCategoryId = (typeof BUDGET_PLANNER_CATEGORIES)[number]["id"];

export type DailyBudgetPlan = Record<string, Partial<Record<BudgetCategoryId, number>>>;

export const BUDGET_STORAGE_KEY = "squirry-daily-budget-v1";

export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function emptyCategoryAmounts(): Record<BudgetCategoryId, number> {
  return Object.fromEntries(
    BUDGET_PLANNER_CATEGORIES.map((c) => [c.id, 0])
  ) as Record<BudgetCategoryId, number>;
}

export function sumDailyPlan(amounts: Partial<Record<BudgetCategoryId, number>>): number {
  return BUDGET_PLANNER_CATEGORIES.reduce((s, c) => s + (amounts[c.id] ?? 0), 0);
}
