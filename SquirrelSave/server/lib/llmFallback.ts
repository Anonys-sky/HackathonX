import { DEFAULTS, LLM, TRANSACTION_CATEGORIES, type TransactionCategory } from "@shared/config";
import type { InvokeResult } from "../_core/llm";

export type CoachContext = {
  currency: string;
  monthlyIncome: number;
  currentStreak: number;
  level: number;
  xpPoints: number;
  walletContext: string;
};

const CATEGORY_KEYWORDS: Record<TransactionCategory, string[]> = {
  food_beverage: ["mcd", "kfc", "starbucks", "food", "restaurant", "cafe", "grab food", "foodpanda"],
  transport: ["grab", "uber", "petrol", "fuel", "toll", "parking", "transit", "bus", "lrt", "mrt"],
  shopping: ["shopee", "lazada", "amazon", "mall", "uniqlo", "ikea", "store"],
  bills_utilities: ["tnb", "electric", "water", "internet", "unifi", "maxis", "celcom", "bill", "utility"],
  entertainment: ["netflix", "spotify", "cinema", "game", "steam"],
  health: ["clinic", "hospital", "pharmacy", "guardian", "watson", "medical"],
  education: ["course", "tuition", "book", "udemy", "school"],
  savings: ["transfer to savings", "epf", "asb", "fixed deposit"],
  income: ["salary", "payroll", "received", "credit", "refund", "cashback"],
  other: [],
};

function guessCategory(text: string): TransactionCategory {
  const lower = text.toLowerCase();
  for (const cat of TRANSACTION_CATEGORIES) {
    if (cat === "other") continue;
    if (CATEGORY_KEYWORDS[cat].some((kw) => lower.includes(kw))) return cat;
  }
  if (/\b(salary|payroll|income|received)\b/i.test(lower)) return "income";
  if (/\b(food|eat|lunch|dinner|breakfast)\b/i.test(lower)) return "food_beverage";
  return "other";
}

export function parseTransactionsHeuristic(rawText: string) {
  const lines = rawText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const transactions: Array<{
    merchantName: string;
    category: string;
    amount: number;
    type: string;
    confidenceScore: number;
    needsVerification: boolean;
    note: string;
  }> = [];

  for (const line of lines) {
    const amountMatch =
      line.match(/(?:RM\s*)?(-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i) ??
      line.match(/(-?\d+(?:\.\d{1,2})?)/);

    if (!amountMatch) continue;

    const rawAmount = parseFloat(amountMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(rawAmount) || rawAmount === 0) continue;

    const amount = Math.abs(rawAmount);
    const lower = line.toLowerCase();
    const isIncome =
      rawAmount < 0
        ? false
        : /\b(salary|payroll|income|received|credit|refund)\b/i.test(lower) &&
          !/\b(debit|paid|payment|purchase)\b/i.test(lower);

    let merchantName = line
      .replace(amountMatch[0], "")
      .replace(/\bRM\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    merchantName = merchantName.replace(/^[-–—•*]+\s*/, "").trim() || "Transaction";

    const category = guessCategory(`${merchantName} ${line}`);
    const type =
      category === "income" || isIncome ? "income" : "expense";

    transactions.push({
      merchantName: merchantName.slice(0, 80),
      category,
      amount,
      type,
      confidenceScore: 0.65,
      needsVerification: true,
      note: "Parsed locally (AI quota unavailable) — please verify",
    });
  }

  return { transactions };
}

export function coachFallbackReply(message: string, ctx: CoachContext): string {
  const lower = message.toLowerCase();
  const coach = DEFAULTS.coachName;

  if (/\b(invest|stock|etf|crypto|portfolio)\b/.test(lower)) {
    return `${coach} here 🐿️ Start with an emergency fund (3–6 months of expenses), then explore low-cost diversified options. I'm in offline mode right now, so treat this as general education—not personal investment advice.`;
  }

  if (/\b(emergency|rainy day)\b/.test(lower)) {
    return `Great question! Aim for ${ctx.currency}${Math.round(ctx.monthlyIncome * 3).toLocaleString()}–${ctx.currency}${Math.round(ctx.monthlyIncome * 6).toLocaleString()} in an emergency wallet based on your ${ctx.currency}${ctx.monthlyIncome.toLocaleString()} monthly income. Build it before aggressive investing 🌰`;
  }

  if (/\b(debt|loan|credit card)\b/.test(lower)) {
    return `Focus on high-interest debt first, then minimum payments on the rest. Even ${ctx.currency}50 extra per week adds up. Squirry's cheering you on! 🐿️`;
  }

  if (/\b(budget|50\/30\/20|allocate|split)\b/.test(lower)) {
    return `A solid starting point: 50% needs, 30% wants, 20% savings. Your wallets: ${ctx.walletContext || "set up onboarding first"}. Adjust sliders in onboarding if life doesn't fit the default split.`;
  }

  if (/\b(save|saving|streak|xp)\b/.test(lower)) {
    return `You're level ${ctx.level} with ${ctx.xpPoints} XP and a ${ctx.currentStreak}-day streak — nice work! Log expenses daily and hit your savings wallet to keep the streak alive 🔥`;
  }

  if (/\b(hello|hi|hey|help)\b/.test(lower)) {
    return `Hi! I'm ${coach} 🐿️ (offline coach mode — OpenAI quota is unavailable). Ask me about budgeting, saving, emergency funds, or debt. Wallets: ${ctx.walletContext || "not set up yet"}.`;
  }

  return `${coach} says 🐿️: Thanks for your message! I'm running in offline mode while the AI API quota is full. For "${message.slice(0, 60)}${message.length > 60 ? "…" : ""}" — track spending in Activity, keep wants under 30%, and grow savings weekly. Add billing at platform.openai.com or set LLM_API_URL to Groq (see SETUP.md) for full AI replies.`;
}

export function textInvokeResult(content: string): InvokeResult {
  return {
    id: "local-fallback",
    created: Math.floor(Date.now() / 1000),
    model: "local-fallback",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
  };
}

export function jsonInvokeResult(data: unknown): InvokeResult {
  return textInvokeResult(JSON.stringify(data));
}

export function isRecoverableLlmError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /429|too many requests|quota|insufficient_quota|rate.?limit/i.test(msg) ||
    /401|403|invalid.*api.*key/i.test(msg) ||
    /500|502|503|504|fetch failed|ECONNREFUSED|ETIMEDOUT|network/i.test(msg) ||
    /LLM_API_KEY.*not configured/i.test(msg)
  );
}

export function isLlmFallbackEnabled(): boolean {
  if (process.env.LLM_FALLBACK_ENABLED === "false") return false;
  if (process.env.LLM_FALLBACK_ENABLED === "true") return true;
  return process.env.NODE_ENV !== "production";
}
