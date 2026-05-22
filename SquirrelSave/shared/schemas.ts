import { z } from "zod";
import {
  TRANSACTION_CATEGORIES,
  WALLET_TYPES,
  GOAL_CATEGORIES,
  MASCOT_MOODS,
} from "./config";

export const walletTypeSchema = z.enum(WALLET_TYPES);
export const transactionCategorySchema = z.enum(TRANSACTION_CATEGORIES);
export const mascotMoodSchema = z.enum(MASCOT_MOODS);
export const goalCategorySchema = z.enum(GOAL_CATEGORIES);

export const transactionAddSchema = z.object({
  merchantName: z.string(),
  category: transactionCategorySchema,
  amount: z.number().positive(),
  type: z.enum(["expense", "income"]).default("expense"),
  walletId: z.number().optional(),
  note: z.string().optional(),
  transactedAt: z.string().optional(),
  rawText: z.string().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  needsVerification: z.boolean().optional(),
});

export const walletAllocationSchema = z.object({
  walletType: walletTypeSchema,
  label: z.string(),
  allocationPercent: z.number().min(0).max(100),
  color: z.string(),
});

export const savingsGoalCreateSchema = z.object({
  name: z.string().min(1).max(128),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).default(0),
  deadline: z.string().optional(),
  category: goalCategorySchema.default("general"),
  emoji: z.string().max(8).default("🎯"),
});

export const savingsGoalUpdateSchema = savingsGoalCreateSchema.partial().extend({
  goalId: z.number(),
});
