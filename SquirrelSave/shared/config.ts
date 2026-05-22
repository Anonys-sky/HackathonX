/** Central app configuration — safe in browser and Node. */

import { BRAND_NAME } from "./brand";
import { envNumber, envString } from "./env";

export const WALLET_TYPES = ["needs", "wants", "savings", "emergency", "goals"] as const;
export type WalletType = (typeof WALLET_TYPES)[number];

export const TRANSACTION_CATEGORIES = [
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
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const MASCOT_MOODS = ["happy", "worried", "alert", "celebrating", "sleeping"] as const;
export type MascotMood = (typeof MASCOT_MOODS)[number];

export const DEFAULT_WALLET_ALLOCATIONS: ReadonlyArray<{
  type: WalletType;
  labelKey: string;
  color: string;
  defaultPercent: number;
}> = [
  { type: "needs", labelKey: "wallet.needs", color: "#FF6B6B", defaultPercent: 50 },
  { type: "wants", labelKey: "wallet.wants", color: "#A78BFA", defaultPercent: 30 },
  { type: "savings", labelKey: "wallet.savings", color: "#34D399", defaultPercent: 20 },
  { type: "emergency", labelKey: "wallet.emergency", color: "#FBBF24", defaultPercent: 0 },
];

/** 50/30/20 rule — recommended defaults (users can override in onboarding). */
export const RECOMMENDED_ALLOCATION_RULE = "50/30/20";
export const RECOMMENDED_SPLIT = {
  needs: 50,
  wants: 30,
  savings: 20,
  emergency: 0,
} as const;

export const CATEGORY_WALLET_MAP: Record<TransactionCategory, WalletType> = {
  food_beverage: "wants",
  transport: "wants",
  shopping: "wants",
  bills_utilities: "needs",
  entertainment: "wants",
  health: "needs",
  education: "needs",
  savings: "savings",
  income: "savings",
  other: "wants",
};

export const CATEGORY_META: ReadonlyArray<{
  value: TransactionCategory;
  labelKey: string;
  emoji: string;
  colorClass: string;
}> = [
  { value: "food_beverage", labelKey: "category.food_beverage", emoji: "🍔", colorClass: "bg-orange-100 text-orange-700" },
  { value: "transport", labelKey: "category.transport", emoji: "🚗", colorClass: "bg-blue-100 text-blue-700" },
  { value: "shopping", labelKey: "category.shopping", emoji: "🛍️", colorClass: "bg-purple-100 text-purple-700" },
  { value: "bills_utilities", labelKey: "category.bills_utilities", emoji: "💡", colorClass: "bg-yellow-100 text-yellow-700" },
  { value: "entertainment", labelKey: "category.entertainment", emoji: "🎮", colorClass: "bg-pink-100 text-pink-700" },
  { value: "health", labelKey: "category.health", emoji: "💊", colorClass: "bg-green-100 text-green-700" },
  { value: "education", labelKey: "category.education", emoji: "📚", colorClass: "bg-indigo-100 text-indigo-700" },
  { value: "savings", labelKey: "category.savings", emoji: "💰", colorClass: "bg-emerald-100 text-emerald-700" },
  { value: "income", labelKey: "category.income", emoji: "💵", colorClass: "bg-teal-100 text-teal-700" },
  { value: "other", labelKey: "category.other", emoji: "📦", colorClass: "bg-gray-100 text-gray-700" },
];

export const GAMIFICATION = {
  xpPerLevel: envNumber("XP_PER_LEVEL", 500),
  xpOnboarding: envNumber("XP_ONBOARDING", 100),
  xpTransaction: envNumber("XP_TRANSACTION", 10),
  xpStreak: envNumber("XP_STREAK", 25),
  dailyActions: {
    logged_expense: envNumber("XP_DAILY_LOGGED", 10),
    stayed_in_budget: envNumber("XP_DAILY_BUDGET", 20),
    saved_to_goal: envNumber("XP_DAILY_GOAL", 30),
  } as const,
  streakCelebrationDays: envNumber("STREAK_CELEBRATION_DAYS", 7),
  spendingCelebratingMax: envNumber("SPENDING_CELEBRATING_MAX", 60),
  spendingWorriedMin: envNumber("SPENDING_WORRIED_MIN", 70),
  spendingAlertMin: envNumber("SPENDING_ALERT_MIN", 90),
  weeklyChallengeDays: envNumber("WEEKLY_CHALLENGE_DAYS", 7),
  streakBadges: [
    { days: 3, labelKey: "badge.spark", emoji: "⚡", color: "bg-yellow-100 text-yellow-700" },
    { days: 7, labelKey: "badge.warrior", emoji: "🔥", color: "bg-orange-100 text-orange-700" },
    { days: 14, labelKey: "badge.hero", emoji: "🏆", color: "bg-amber-100 text-amber-700" },
    { days: 30, labelKey: "badge.master", emoji: "👑", color: "bg-purple-100 text-purple-700" },
    { days: 100, labelKey: "badge.centurion", emoji: "💎", color: "bg-blue-100 text-blue-700" },
  ],
} as const;

export const PAGINATION = {
  activityPageSize: envNumber("ACTIVITY_PAGE_SIZE", 15),
  dashboardTxLimit: envNumber("DASHBOARD_TX_LIMIT", 5),
  dashboardGoalsLimit: envNumber("DASHBOARD_GOALS_LIMIT", 3),
} as const;

export const BUDGET = {
  alertThresholdPercent: envNumber("BUDGET_ALERT_THRESHOLD_PERCENT", 80),
  dashboardWarningPercent: envNumber("DASHBOARD_WARNING_PERCENT", 60),
  dashboardAlertPercent: envNumber("DASHBOARD_ALERT_PERCENT", 80),
} as const;

/** Server-only LLM settings (defaults used if env unset in browser bundle). */
export const LLM = {
  model: envString("LLM_MODEL", "gpt-4o-mini"),
  maxTokens: envNumber("LLM_MAX_TOKENS", 32768),
  thinkingBudgetTokens: envNumber("LLM_THINKING_BUDGET", 128),
  parserConfidenceThreshold: envNumber("LLM_PARSER_CONFIDENCE_THRESHOLD", 0.8),
  chatHistoryLimit: envNumber("LLM_CHAT_HISTORY_LIMIT", 50),
  chatContextLimit: envNumber("LLM_CHAT_CONTEXT_LIMIT", 10),
  chatMessagesInPrompt: envNumber("LLM_CHAT_MESSAGES_IN_PROMPT", 8),
} as const;

export const DEFAULTS = {
  currency: envString("DEFAULT_CURRENCY", "RM"),
  defaultIncomePlaceholder: envString("DEFAULT_INCOME_PLACEHOLDER", "5000"),
  coachName: envString("COACH_NAME", BRAND_NAME),
  appName: envString("VITE_APP_NAME", BRAND_NAME) === "PiggyCoach" ? BRAND_NAME : envString("VITE_APP_NAME", BRAND_NAME),
} as const;

export const SOCIAL = {
  friendAvatars: ["🐿️", "🐼", "🦊", "🐨", "🐸", "🦁", "🐯", "🐺", "🦄", "🐻"],
  defaultFriendAvatar: "🐿️",
} as const;

export const GOAL_CATEGORIES = ["general", "travel", "emergency", "gadget", "education", "home"] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

export const GOAL_EMOJIS = ["🎯", "✈️", "🏠", "📱", "🎓", "💍", "🚗", "🏖️"] as const;
