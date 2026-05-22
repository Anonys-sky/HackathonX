import { eq, gte, lte, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  userProfiles,
  wallets,
  transactions,
  socialStreaks,
  xpEvents,
  chatMessages,
  savingsGoals,
  type InsertUserProfile,
  type InsertSavingsGoal,
  type InsertWallet,
  type InsertTransaction,
  type InsertSocialStreak,
  type InsertXpEvent,
  type InsertChatMessage,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { CATEGORY_WALLET_MAP, type TransactionCategory } from "@shared/config";
import { isBudgetAlert } from "@shared/gamification";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new Error(
      "Database is not available. Set DATABASE_URL or enable AUTO_START_MYSQL=true and restart the server."
    );
  }
  return db;
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await requireDb();

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ── User Profiles ──────────────────────────────────────────────────────────

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function upsertUserProfile(data: InsertUserProfile) {
  const db = await requireDb();
  const { userId, ...fields } = data;
  await db
    .insert(userProfiles)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        ...fields,
        updatedAt: new Date(),
      },
    });
}

export async function updateUserProfile(userId: number, data: Partial<InsertUserProfile>) {
  const db = await requireDb();
  await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId));
}

// ── Wallets ────────────────────────────────────────────────────────────────

export async function getUserWallets(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wallets).where(eq(wallets.userId, userId));
}

export async function getWalletByTypeForUser(userId: number, walletType: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(wallets).where(and(eq(wallets.userId, userId), eq(wallets.walletType, walletType as any))).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertWallet(data: InsertWallet) {
  const db = await getDb();
  if (!db) return;
  await db.insert(wallets).values(data).onDuplicateKeyUpdate({ set: data });
}

export async function createWallets(walletsData: InsertWallet[]) {
  const db = await requireDb();
  if (walletsData.length === 0) return;
  await db.insert(wallets).values(walletsData);
}

export async function updateWallet(walletId: number, data: Partial<InsertWallet>) {
  const db = await getDb();
  if (!db) return;
  await db.update(wallets).set(data).where(eq(wallets.id, walletId));
}

export async function deleteUserWallets(userId: number) {
  const db = await requireDb();
  await db.delete(wallets).where(eq(wallets.userId, userId));
}

export async function checkBudgetAlerts(userId: number): Promise<{ walletId: number; walletLabel: string; spendingPercent: number; isAlert: boolean }[]> {
  const userWallets = await getUserWallets(userId);
  const alerts = [];
  
  for (const wallet of userWallets) {
    const spendingPercent = wallet.allocatedAmount > 0 
      ? Math.round(((wallet.allocatedAmount - wallet.currentBalance) / wallet.allocatedAmount) * 100)
      : 0;
    
    alerts.push({
      walletId: wallet.id,
      walletLabel: wallet.label,
      spendingPercent,
      isAlert: isBudgetAlert(spendingPercent),
    });
  }
  
  return alerts;
}

// ── Transactions ───────────────────────────────────────────────────────────

export async function getUserTransactions(
  userId: number,
  opts?: { limit?: number; offset?: number; fromDate?: Date; toDate?: Date; category?: string }
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(transactions.userId, userId)];
  if (opts?.fromDate) conditions.push(gte(transactions.transactedAt, opts.fromDate));
  if (opts?.toDate) conditions.push(lte(transactions.transactedAt, opts.toDate));

  let query = db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.transactedAt));

  if (opts?.limit) {
    return (query as any).limit(opts.limit).offset(opts?.offset ?? 0);
  }
  return query;
}

export async function countUserTransactions(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(transactions).where(eq(transactions.userId, userId));
  return result.length;
}

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(transactions).values(data);
  return result;
}

export async function updateTransaction(txId: number, data: Partial<InsertTransaction>) {
  const db = await getDb();
  if (!db) return;
  await db.update(transactions).set(data).where(eq(transactions.id, txId));
}

export async function getTransactionById(txId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transactions).where(eq(transactions.id, txId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteTransaction(txId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(transactions).where(eq(transactions.id, txId));
}

export async function deductFromWallet(walletId: number, amount: number) {
  const db = await getDb();
  if (!db) return;
  const wallet = await db.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
  if (wallet.length > 0) {
    const newBalance = Math.max(0, wallet[0].currentBalance - amount);
    await updateWallet(walletId, { currentBalance: newBalance });
  }
}

export async function addToWallet(walletId: number, amount: number) {
  const db = await getDb();
  if (!db) return;
  const wallet = await db.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
  if (wallet.length > 0) {
    const newBalance = wallet[0].currentBalance + amount;
    await updateWallet(walletId, { currentBalance: newBalance });
  }
}

export function getCategoryWalletType(category: string): string {
  const mapped = CATEGORY_WALLET_MAP[category as TransactionCategory];
  return mapped ?? "wants";
}

// ── Social Streaks ─────────────────────────────────────────────────────────

export async function getUserSocialStreaks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(socialStreaks).where(eq(socialStreaks.userId, userId)).orderBy(desc(socialStreaks.currentStreak));
}

export async function createSocialStreak(data: InsertSocialStreak) {
  const db = await getDb();
  if (!db) return;
  await db.insert(socialStreaks).values(data);
}

export async function updateSocialStreak(streakId: number, data: Partial<InsertSocialStreak>) {
  const db = await getDb();
  if (!db) return;
  await db.update(socialStreaks).set(data).where(eq(socialStreaks.id, streakId));
}

// ── XP Events ─────────────────────────────────────────────────────────────

export async function createXpEvent(data: InsertXpEvent) {
  const db = await getDb();
  if (!db) return;
  await db.insert(xpEvents).values(data);
}

export async function getUserXpEvents(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return (db.select().from(xpEvents).where(eq(xpEvents.userId, userId)).orderBy(desc(xpEvents.createdAt)) as any).limit(limit);
}

// ── Chat Messages ──────────────────────────────────────────────────────────

export async function getChatHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return (db.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(desc(chatMessages.createdAt)) as any).limit(limit);
}

export async function saveChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatMessages).values(data);
}

export async function clearChatHistory(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
}

// ── Savings Goals ──────────────────────────────────────────────────────────

export async function getUserSavingsGoals(userId: number, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  const base = db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.userId, userId))
    .orderBy(desc(savingsGoals.updatedAt));
  if (limit) {
    return base.limit(limit);
  }
  return base;
}

export async function getSavingsGoalById(goalId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(savingsGoals)
    .where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId)))
    .limit(1);
  return result[0];
}

export async function createSavingsGoal(data: InsertSavingsGoal) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(savingsGoals).values(data);
  return result;
}

export async function updateSavingsGoal(goalId: number, userId: number, data: Partial<InsertSavingsGoal>) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(savingsGoals)
    .set(data)
    .where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId)));
}

export async function deleteSavingsGoal(goalId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(savingsGoals).where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId)));
}

export async function addToSavingsGoal(goalId: number, userId: number, amount: number) {
  const goal = await getSavingsGoalById(goalId, userId);
  if (!goal) return null;
  const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
  await updateSavingsGoal(goalId, userId, { currentAmount: newAmount });
  return { ...goal, currentAmount: newAmount };
}
