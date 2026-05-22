import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// User financial profile
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  monthlyIncome: float("monthlyIncome").notNull().default(0),
  currency: varchar("currency", { length: 8 }).notNull().default("RM"),
  onboardingComplete: boolean("onboardingComplete").notNull().default(false),
  // Gamification
  xpPoints: int("xpPoints").notNull().default(0),
  level: int("level").notNull().default(1),
  currentStreak: int("currentStreak").notNull().default(0),
  longestStreak: int("longestStreak").notNull().default(0),
  lastStreakDate: timestamp("lastStreakDate"),
  mascotMood: mysqlEnum("mascotMood", ["happy", "worried", "alert", "celebrating", "sleeping"]).notNull().default("happy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// Wallet allocations (needs/wants/savings/emergency/goals)
export const wallets = mysqlTable("wallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  walletType: mysqlEnum("walletType", ["needs", "wants", "savings", "emergency", "goals"]).notNull(),
  label: varchar("label", { length: 64 }).notNull(),
  allocatedAmount: float("allocatedAmount").notNull().default(0),
  currentBalance: float("currentBalance").notNull().default(0),
  allocationPercent: float("allocationPercent").notNull().default(0),
  color: varchar("color", { length: 16 }).notNull().default("#FF6B6B"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;

// Transactions
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  walletId: int("walletId"),
  merchantName: varchar("merchantName", { length: 128 }).notNull(),
  rawText: text("rawText"),
  category: mysqlEnum("category", [
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
  ]).notNull().default("other"),
  amount: float("amount").notNull(),
  type: mysqlEnum("type", ["expense", "income"]).notNull().default("expense"),
  confidenceScore: float("confidenceScore").default(1.0),
  needsVerification: boolean("needsVerification").notNull().default(false),
  note: text("note"),
  transactedAt: timestamp("transactedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// Social streaks between users
export const socialStreaks = mysqlTable("social_streaks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  friendId: int("friendId").notNull(),
  friendName: varchar("friendName", { length: 128 }).notNull().default("Friend"),
  friendAvatar: varchar("friendAvatar", { length: 8 }).notNull().default("🐿️"),
  currentStreak: int("currentStreak").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialStreak = typeof socialStreaks.$inferSelect;
export type InsertSocialStreak = typeof socialStreaks.$inferInsert;

// XP events log
export const xpEvents = mysqlTable("xp_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  xpAwarded: int("xpAwarded").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type XpEvent = typeof xpEvents.$inferSelect;
export type InsertXpEvent = typeof xpEvents.$inferInsert;

// Chat messages for AI Wealth Coach
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// Savings goals
export const savingsGoals = mysqlTable("savings_goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  targetAmount: float("targetAmount").notNull(),
  currentAmount: float("currentAmount").notNull().default(0),
  deadline: timestamp("deadline"),
  category: varchar("category", { length: 64 }).notNull().default("general"),
  emoji: varchar("emoji", { length: 8 }).notNull().default("🎯"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type InsertSavingsGoal = typeof savingsGoals.$inferInsert;
