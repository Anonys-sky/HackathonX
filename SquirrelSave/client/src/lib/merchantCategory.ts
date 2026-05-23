import { TRANSACTION_CATEGORIES, type TransactionCategory } from "@shared/config";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food_beverage: ["mcd", "kfc", "starbucks", "food", "restaurant", "cafe", "grab food", "foodpanda", "makan", "coffee"],
  transport: ["grab", "uber", "petrol", "fuel", "toll", "parking", "lrt", "mrt", "transit", "bas"],
  shopping: ["shopee", "lazada", "amazon", "mall", "uniqlo", "grocery", "grocer", "pasar"],
  bills_utilities: ["tnb", "electric", "water", "internet", "unifi", "maxis", "celcom", "bill"],
  entertainment: ["netflix", "spotify", "cinema", "game", "steam"],
  health: ["clinic", "hospital", "pharmacy", "guardian", "watson", "medical"],
  education: ["course", "tuition", "book", "udemy", "school"],
  savings: ["epf", "asb", "fixed deposit"],
  income: ["salary", "payroll", "received", "credit", "refund", "cashback"],
};

export function guessMerchantCategory(
  merchantName: string,
  type: "expense" | "income" = "expense"
): TransactionCategory {
  if (type === "income") return "income";

  const lower = merchantName.toLowerCase();
  for (const cat of TRANSACTION_CATEGORIES) {
    if (cat === "other" || cat === "income") continue;
    if (CATEGORY_KEYWORDS[cat]?.some((kw) => lower.includes(kw))) {
      return cat;
    }
  }
  if (/\b(salary|payroll|income|received)\b/i.test(lower)) return "income";
  if (/\b(food|lunch|dinner|breakfast|makan)\b/i.test(lower)) return "food_beverage";
  return "other";
}
