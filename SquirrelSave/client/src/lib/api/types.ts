/** API response shapes (matches FastAPI JSON payloads). */

export type ApiAuthUser = {
  id?: string | number;
  name?: string;
  email?: string;
  openId?: string;
};

export type ApiProfile = {
  userId?: string;
  monthlyIncome?: number;
  currency?: string;
  onboardingComplete?: boolean;
  xpPoints?: number;
  level?: number;
  currentStreak?: number;
  longestStreak?: number;
  mascotMood?: string;
};

export type ApiWallet = {
  id: number;
  userId?: string;
  walletType: string;
  label: string;
  allocatedAmount: number;
  currentBalance: number;
  allocationPercent: number;
  color: string;
};

export type ApiTransaction = {
  id: number;
  userId?: string;
  merchantName: string;
  category: string;
  amount: number;
  type: string;
  walletId?: number | null;
  note?: string | null;
  transactedAt?: string;
  needsVerification?: boolean;
  confidenceScore?: number;
};

export type ApiGoal = {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  emoji?: string;
  category?: string;
  deadline?: string | null;
};

export type ApiBudgetAlert = {
  walletId: number;
  walletLabel: string;
  spendingPercent: number;
  isAlert: boolean;
};

export type ApiStreak = {
  id: number;
  userId?: string;
  friendId?: number;
  friendName: string;
  friendAvatar?: string;
  currentStreak: number;
  isActive?: boolean;
};

export type ApiXpEvent = {
  id: number;
  eventType?: string;
  xpAwarded: number;
  description: string;
  createdAt: string;
};

export type ApiXpMutation = {
  success: boolean;
  xpAwarded: number;
  newXp?: number;
  newLevel?: number;
  newStreak?: number;
  currentAmount?: number;
};

export type ApiStats = {
  profile: ApiProfile | null;
  wallets: ApiWallet[];
  recentXp: ApiXpEvent[];
  spendingPercent: number;
  xpToNextLevel: number;
  mascotMood: string;
  budgetAlerts: ApiBudgetAlert[];
};

export type ApiPlanBudgetResult = {
  reply: string;
  categories: Array<{ id: string; amount: number }>;
  dailyTotal: number;
  usedFallback?: boolean;
  providerError?: string | null;
};

export type ApiStreakPotMember = {
  uid: string;
  displayName: string;
  avatar: string;
  isNpc?: boolean;
  staked: boolean;
  breachedToday?: boolean;
  forfeitedXp?: number;
  wonXp?: number;
  /** @deprecated legacy field */
  forfeited?: number;
  won?: number;
};

export type ApiStreakPot = {
  id: number;
  name: string;
  weekKey: string;
  stakeXp: number;
  rewardType?: "xp";
  potTotalXp: number;
  members: ApiStreakPotMember[];
  dailySafeLimit?: number;
  todaySpent?: number;
  /** @deprecated use stakeXp */
  stakeAmount?: number;
  potTotal?: number;
  settlement?: {
    losers: string[];
    winners: string[];
    shareXpEach: number;
    /** @deprecated */
    shareEach?: number;
  };
};

export type ApiStreakPotCheckIn = {
  pot: ApiStreakPot;
  breached: boolean;
  dailySafeLimit: number;
  todaySpent: number;
};
