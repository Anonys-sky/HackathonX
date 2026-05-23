/** On-device bank / e-wallet text parser (no server required). */

import { TRANSACTION_CATEGORIES, type TransactionCategory } from "./config";

export type ParsedBankTransaction = {
  merchantName: string;
  category: TransactionCategory;
  amount: number;
  type: "expense" | "income";
  confidenceScore: number;
  needsVerification: boolean;
  note: string | null;
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food_beverage: ["mcd", "kfc", "starbucks", "food", "restaurant", "cafe", "grab food", "foodpanda", "makan"],
  transport: ["grab", "uber", "petrol", "fuel", "toll", "parking", "lrt", "mrt", "transit"],
  shopping: ["shopee", "lazada", "amazon", "mall", "uniqlo", "grocery", "grocer", "pasar"],
  bills_utilities: ["tnb", "electric", "water", "internet", "unifi", "maxis", "celcom", "bill"],
  entertainment: ["netflix", "spotify", "cinema", "game", "steam"],
  health: ["clinic", "hospital", "pharmacy", "guardian", "watson", "medical"],
  education: ["course", "tuition", "book", "udemy", "school"],
  savings: ["epf", "asb", "fixed deposit", "transfer to savings"],
  income: ["salary", "payroll", "received", "credit", "refund", "cashback"],
};

function guessCategory(text: string): TransactionCategory {
  const lower = text.toLowerCase();
  for (const cat of TRANSACTION_CATEGORIES) {
    if (cat === "other") continue;
    const keywords = CATEGORY_KEYWORDS[cat] ?? [];
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  if (/\b(salary|payroll|income|received)\b/i.test(lower)) return "income";
  if (/\b(food|lunch|dinner|breakfast|makan)\b/i.test(lower)) return "food_beverage";
  return "other";
}

export function parseBankText(rawText: string): { transactions: ParsedBankTransaction[] } {
  const transactions: ParsedBankTransaction[] = [];
  const lines = rawText.split("\n").map((ln) => ln.trim()).filter(Boolean);

  for (const line of lines) {
    const m =
      line.match(/(?:RM\s*)?(-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i) ??
      line.match(/(-?\d+(?:\.\d{1,2})?)/);
    if (!m) continue;

    const rawAmount = parseFloat(m[1].replace(/,/g, ""));
    if (!rawAmount) continue;

    const amount = Math.abs(rawAmount);
    const lower = line.toLowerCase();
    const isIncome =
      rawAmount > 0 &&
      /\b(salary|payroll|income|received|credit|refund)\b/i.test(lower) &&
      !/\b(debit|paid|payment|purchase)\b/i.test(lower);

    let merchant = line.replace(m[0], "").replace(/RM/gi, "").trim();
    merchant = merchant.replace(/^[-–—•*]+\s*/, "").trim() || "Transaction";

    const category = guessCategory(`${merchant} ${line}`);
    const type: "expense" | "income" = category === "income" || isIncome ? "income" : "expense";

    transactions.push({
      merchantName: merchant.slice(0, 80),
      category,
      amount,
      type,
      confidenceScore: 0.72,
      needsVerification: category === "other" || amount > 500,
      note: null,
    });
  }

  return { transactions };
}
