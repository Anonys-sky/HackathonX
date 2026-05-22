import { BUDGET_PLANNER_CATEGORIES, type BudgetCategoryId } from "@shared/budgetPlanner";
import { DEFAULTS } from "@shared/config";

const VALID_IDS = new Set(BUDGET_PLANNER_CATEGORIES.map((c) => c.id));

export type BudgetPlanInput = {
  selectedDate: string;
  categories: Array<{ id: string; amount: number }>;
};

export type BudgetPlanResult = {
  reply: string;
  categories: Array<{ id: BudgetCategoryId; amount: number }>;
  dailyTotal: number;
};

export function buildBudgetPlannerPrompt(ctx: {
  currency: string;
  monthlyIncome: number;
  selectedDate: string;
  walletContext: string;
  currentPlan: BudgetPlanInput;
}): string {
  const categoryList = BUDGET_PLANNER_CATEGORIES.map((c) => c.id).join(", ");
  const currentLines =
    ctx.currentPlan.categories
      .filter((c) => c.amount > 0)
      .map((c) => `${c.id}: ${ctx.currency}${c.amount}`)
      .join(", ") || "empty";

  return `You are ${DEFAULTS.coachName}, a warm friend helping plan a daily budget — casual, encouraging, like chatting with a close friend 🐿️.
The user is lazy to fill forms; you MUST suggest concrete RM amounts and update their budget sheet.

Context:
- Monthly income: ${ctx.currency}${ctx.monthlyIncome}
- Planning date: ${ctx.selectedDate}
- Wallets: ${ctx.walletContext || "not set up"}
- Current plan for this day: ${currentLines}

Valid category ids: ${categoryList}

When the user asks to plan, adjust, or set spending for the day, return JSON ONLY (no markdown):
{
  "reply": "2-4 friendly sentences acknowledging what you set",
  "categories": [{ "id": "food_beverage", "amount": 25 }, ...],
  "dailyTotal": number
}

Rules:
- amounts are positive numbers in ${ctx.currency}
- include ALL categories you want set (merge with sensible defaults from income/30 if user is vague)
- dailyTotal must equal sum of category amounts
- reply tone: supportive friend, not corporate
- if user only chats without budget intent, still return helpful amounts if they mention food/groceries/transport costs`;
}

export function parseBudgetPlanResponse(raw: string): BudgetPlanResult | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      reply?: string;
      categories?: Array<{ id: string; amount: number }>;
      dailyTotal?: number;
    };
    const categories = (parsed.categories ?? [])
      .filter((c) => VALID_IDS.has(c.id as BudgetCategoryId) && typeof c.amount === "number")
      .map((c) => ({
        id: c.id as BudgetCategoryId,
        amount: Math.max(0, Math.round(c.amount * 100) / 100),
      }));
    const dailyTotal =
      typeof parsed.dailyTotal === "number"
        ? parsed.dailyTotal
        : categories.reduce((s, c) => s + c.amount, 0);
    return {
      reply: typeof parsed.reply === "string" ? parsed.reply : "Here's a budget plan for your day! 🐿️",
      categories,
      dailyTotal,
    };
  } catch {
    return null;
  }
}

export function budgetPlannerFallback(
  message: string,
  ctx: {
    currency: string;
    monthlyIncome: number;
    currentPlan: BudgetPlanInput;
  }
): BudgetPlanResult {
  const lower = message.toLowerCase();
  const dailyBudget = ctx.monthlyIncome > 0 ? ctx.monthlyIncome / 30 : 50;
  const amounts: Record<BudgetCategoryId, number> = {} as Record<BudgetCategoryId, number>;

  for (const c of ctx.currentPlan.categories) {
    if (VALID_IDS.has(c.id as BudgetCategoryId)) {
      amounts[c.id as BudgetCategoryId] = c.amount;
    }
  }

  const patterns: Array<{ re: RegExp; id: BudgetCategoryId }> = [
    { re: /(?:food|drink|makan|lunch|dinner|breakfast|coffee)[^\d]*(?:rm\s*)?(\d+(?:\.\d+)?)/i, id: "food_beverage" },
    { re: /(?:grocer|grocery|market|pasar)[^\d]*(?:rm\s*)?(\d+(?:\.\d+)?)/i, id: "shopping" },
    { re: /(?:grab|uber|petrol|transport)[^\d]*(?:rm\s*)?(\d+(?:\.\d+)?)/i, id: "transport" },
    { re: /(?:bill|utilit|electric|internet)[^\d]*(?:rm\s*)?(\d+(?:\.\d+)?)/i, id: "bills_utilities" },
    { re: /(?:fun|entertain|netflix|game)[^\d]*(?:rm\s*)?(\d+(?:\.\d+)?)/i, id: "entertainment" },
    { re: /(?:rm\s*)?(\d+(?:\.\d+)?)\s*(?:on\s+)?(?:food|makan)/i, id: "food_beverage" },
    { re: /(?:rm\s*)?(\d+(?:\.\d+)?)\s*(?:on\s+)?(?:grocer)/i, id: "shopping" },
  ];

  for (const { re, id } of patterns) {
    const m = lower.match(re) ?? message.match(re);
    if (m?.[1]) amounts[id] = parseFloat(m[1]);
  }

  if (Object.values(amounts).every((v) => !v || v === 0)) {
    if (/\b(plan|budget|fill|help|suggest|today|hari)\b/i.test(message)) {
      amounts.food_beverage = Math.round(dailyBudget * 0.25);
      amounts.shopping = Math.round(dailyBudget * 0.35);
      amounts.transport = Math.round(dailyBudget * 0.15);
      amounts.entertainment = Math.round(dailyBudget * 0.1);
      amounts.other = Math.round(dailyBudget * 0.15);
    }
  }

  const categories = BUDGET_PLANNER_CATEGORIES.map((c) => ({
    id: c.id,
    amount: amounts[c.id] ?? 0,
  })).filter((c) => c.amount > 0);

  const dailyTotal = categories.reduce((s, c) => s + c.amount, 0);

  return {
    reply:
      dailyTotal > 0
        ? `Done! I filled in about ${ctx.currency}${dailyTotal} for the day — tweak any line if you want 🐿️ (offline planner mode)`
        : `Tell me amounts like "food RM30, groceries RM80" and I'll fill the sheet for you! 🐿️`,
    categories,
    dailyTotal,
  };
}
