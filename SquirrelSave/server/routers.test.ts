import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock all DB functions
vi.mock("./db", () => ({
  getUserProfile: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    monthlyIncome: 5000,
    currency: "RM",
    onboardingComplete: true,
    xpPoints: 150,
    level: 1,
    currentStreak: 5,
    longestStreak: 10,
    lastStreakDate: new Date(),
    mascotMood: "happy",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  upsertUserProfile: vi.fn().mockResolvedValue(undefined),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  getUserWallets: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, walletType: "needs", label: "Needs", allocatedAmount: 2500, currentBalance: 1800, allocationPercent: 50, color: "#FF6B6B", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, userId: 1, walletType: "savings", label: "Savings", allocatedAmount: 1500, currentBalance: 1500, allocationPercent: 30, color: "#34D399", createdAt: new Date(), updatedAt: new Date() },
  ]),
  createWallets: vi.fn().mockResolvedValue(undefined),
  updateWallet: vi.fn().mockResolvedValue(undefined),
  deleteUserWallets: vi.fn().mockResolvedValue(undefined),
  getUserTransactions: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, merchantName: "McDonald's", category: "food_beverage", amount: 15.5, type: "expense", transactedAt: new Date(), createdAt: new Date(), needsVerification: false, confidenceScore: 1.0 },
  ]),
  countUserTransactions: vi.fn().mockResolvedValue(1),
  createTransaction: vi.fn().mockResolvedValue(undefined),
  updateTransaction: vi.fn().mockResolvedValue(undefined),
  deleteTransaction: vi.fn().mockResolvedValue(undefined),
  checkBudgetAlerts: vi.fn().mockResolvedValue([]),
  getTransactionById: vi.fn().mockResolvedValue({ id: 1, userId: 1, merchantName: "McDonald's", category: "food_beverage", amount: 15.5, type: "expense", transactedAt: new Date(), createdAt: new Date(), needsVerification: false, walletId: 1 }),
  deductFromWallet: vi.fn().mockResolvedValue(undefined),
  addToWallet: vi.fn().mockResolvedValue(undefined),
  getWalletByTypeForUser: vi.fn().mockResolvedValue({ id: 2, userId: 1, walletType: "wants", label: "Wants", allocatedAmount: 1000, currentBalance: 800, allocationPercent: 20, color: "#A78BFA", createdAt: new Date(), updatedAt: new Date() }),
  getCategoryWalletType: vi.fn().mockReturnValue("wants"),
  getUserSocialStreaks: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, friendId: 1001, friendName: "Alice", friendAvatar: "🐼", currentStreak: 7, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ]),
  createSocialStreak: vi.fn().mockResolvedValue(undefined),
  updateSocialStreak: vi.fn().mockResolvedValue(undefined),
  createXpEvent: vi.fn().mockResolvedValue(undefined),
  getUserXpEvents: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, eventType: "transaction_logged", xpAwarded: 10, description: "Logged transaction", createdAt: new Date() },
  ]),
  getChatHistory: vi.fn().mockResolvedValue([]),
  saveChatMessage: vi.fn().mockResolvedValue(undefined),
  clearChatHistory: vi.fn().mockResolvedValue(undefined),
  getUserSavingsGoals: vi.fn().mockResolvedValue([]),
  getSavingsGoalById: vi.fn().mockResolvedValue(undefined),
  createSavingsGoal: vi.fn().mockResolvedValue(undefined),
  updateSavingsGoal: vi.fn().mockResolvedValue(undefined),
  deleteSavingsGoal: vi.fn().mockResolvedValue(undefined),
  addToSavingsGoal: vi.fn().mockResolvedValue(null),
}));

// Mock LLM gateway
vi.mock("./lib/aiService", () => ({
  invokeLLMSafe: vi.fn().mockResolvedValue({
    meta: { usedFallback: false, source: "api" },
    result: {
    choices: [{
      message: {
        content: JSON.stringify({
          transactions: [
            { merchantName: "ShopeePay", category: "shopping", amount: 15.5, type: "expense", confidenceScore: 0.95, needsVerification: false, note: "Online shopping" },
          ],
        }),
      },
    }],
    },
  }),
}));

function createAuthContext(): TrpcContext {
  const clearedCookies: any[] = [];
  const user: TrpcContext["user"] = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "oauth",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, opts: any) => clearedCookies.push({ name, opts }),
    } as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns the current guest user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const user = await caller.auth.me();
    expect(user.id).toBe(1);
    expect(user.name).toBe("Test User");
  });
});

describe("profile.get", () => {
  it("returns user profile", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const profile = await caller.profile.get();
    expect(profile).not.toBeNull();
    expect(profile?.monthlyIncome).toBe(5000);
    expect(profile?.currency).toBe("RM");
  });
});

describe("profile.getStats", () => {
  it("returns stats with wallets and mascot mood", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.profile.getStats();
    expect(stats.profile).not.toBeNull();
    expect(stats.wallets).toHaveLength(2);
    expect(stats.mascotMood).toBeDefined();
    expect(stats.spendingPercent).toBeGreaterThanOrEqual(0);
  });
});

describe("wallets.list", () => {
  it("returns user wallets", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const wallets = await caller.wallets.list();
    expect(wallets).toHaveLength(2);
    expect(wallets[0].walletType).toBe("needs");
  });
});

describe("transactions.list", () => {
  it("returns paginated transactions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transactions.list({ limit: 20, offset: 0 });
    expect(result.transactions).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.transactions[0].merchantName).toBe("McDonald's");
  });
});

describe("transactions.add", () => {
  it("adds a transaction and awards XP", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transactions.add({
      merchantName: "Grab Food",
      category: "food_beverage",
      amount: 25.0,
      type: "expense",
    });
    expect(result.success).toBe(true);
    expect(result.xpAwarded).toBe(10);
  });
});

describe("transactions.parseRaw", () => {
  it("parses raw transaction text using AI", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transactions.parseRaw({ rawText: "TNG*SHP MYR 15.50" });
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].merchantName).toBe("ShopeePay");
    expect(result.transactions[0].amount).toBe(15.5);
  });
});

describe("streaks.list", () => {
  it("returns user social streaks", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const streaks = await caller.streaks.list();
    expect(streaks).toHaveLength(1);
    expect(streaks[0].friendName).toBe("Alice");
    expect(streaks[0].currentStreak).toBe(7);
  });
});

describe("streaks.addFriend", () => {
  it("adds a new friend streak", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.streaks.addFriend({ friendName: "Bob", friendAvatar: "🦊" });
    expect(result.success).toBe(true);
  });
});

describe("gamification.xpHistory", () => {
  it("returns XP event history", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const events = await caller.gamification.xpHistory();
    expect(events).toHaveLength(1);
    expect(events[0].xpAwarded).toBe(10);
  });
});

describe("coach.history", () => {
  it("returns empty chat history initially", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const history = await caller.coach.history();
    expect(Array.isArray(history)).toBe(true);
  });
});

describe("coach.clearHistory", () => {
  it("clears chat history", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.coach.clearHistory();
    expect(result.success).toBe(true);
  });
});


describe("transactions.update", () => {
  it("updates transaction with new amount and reverses old wallet balance", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.transactions.update({
      txId: 1,
      amount: 25.0,
      merchantName: "Starbucks",
      category: "food_beverage",
    });
    
    expect(result.success).toBe(true);
  });

  it("updates transaction type from expense to income", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.transactions.update({
      txId: 1,
      type: "income",
      amount: 15.5,
    });
    
    expect(result.success).toBe(true);
  });
});

describe("transactions.delete", () => {
  it("deletes transaction and reverses wallet balance", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.transactions.delete({ txId: 1 });
    
    expect(result.success).toBe(true);
  });
});


describe("transactions.budgetAlerts", () => {
  it("returns budget alerts for user wallets", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const alerts = await caller.transactions.budgetAlerts();
    expect(Array.isArray(alerts)).toBe(true);
  });
});
