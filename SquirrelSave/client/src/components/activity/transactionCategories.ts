export const VALID_TRANSACTION_CATEGORIES = [
  "food_beverage",
  "transport",
  "shopping",
  "bills_utilities",
  "entertainment",
  "health",
  "education",
  "savings",
  "income",
  "other",
] as const;

export type TransactionCategory = (typeof VALID_TRANSACTION_CATEGORIES)[number];

export function normalizeTransactionCategory(category: string): TransactionCategory {
  return VALID_TRANSACTION_CATEGORIES.includes(category as TransactionCategory)
    ? (category as TransactionCategory)
    : "other";
}
