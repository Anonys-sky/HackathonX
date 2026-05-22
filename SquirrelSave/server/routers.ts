import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { DEFAULTS, GAMIFICATION, LLM } from "@shared/config";
import {
  transactionCategorySchema,
  walletTypeSchema,
  savingsGoalCreateSchema,
  savingsGoalUpdateSchema,
} from "@shared/schemas";
import { computeLevel, computeMascotMood, xpToNextLevel } from "@shared/gamification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLMSafe } from "./lib/aiService";
import { buildCoachSystemPrompt, buildTransactionParserPrompt } from "./lib/prompts";
import {
  buildBudgetPlannerPrompt,
  budgetPlannerFallback,
  parseBudgetPlanResponse,
} from "./lib/budgetPlanner";
import {
  getUserProfile,
  upsertUserProfile,
  updateUserProfile,
  getUserWallets,
  getWalletByTypeForUser,
  createWallets,
  updateWallet,
  deleteUserWallets,
  checkBudgetAlerts,
  getUserTransactions,
  countUserTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionById,
  deductFromWallet,
  addToWallet,
  getCategoryWalletType,
  getUserSocialStreaks,
  createSocialStreak,
  updateSocialStreak,
  createXpEvent,
  getUserXpEvents,
  getChatHistory,
  saveChatMessage,
  clearChatHistory,
  getUserSavingsGoals,
  getSavingsGoalById,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  addToSavingsGoal,
} from "./db";

async function syncMascotMoodFromAlerts(userId: number) {
  const alerts = await checkBudgetAlerts(userId);
  const hasAlert = alerts.some((a) => a.isAlert);
  const profile = await getUserProfile(userId);
  const walletList = await getUserWallets(userId);
  const totalAllocated = walletList.reduce((s, w) => s + w.allocatedAmount, 0);
  const totalSpent = walletList.reduce((s, w) => s + (w.allocatedAmount - w.currentBalance), 0);
  const spendingPercent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  const mood = computeMascotMood(spendingPercent, profile?.currentStreak ?? 0, hasAlert);
  await updateUserProfile(userId, { mascotMood: mood });
  return { alerts, mood };
}

function generateFriendId(userId: number): number {
  return -(userId * 10000 + (Date.now() % 10000));
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
  }),

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getUserProfile(ctx.user.id);
      return profile ?? null;
    }),

    setup: protectedProcedure
      .input(
        z.object({
          monthlyIncome: z.number().positive(),
          currency: z.string().default(DEFAULTS.currency),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertUserProfile({
          userId: ctx.user.id,
          monthlyIncome: input.monthlyIncome,
          currency: input.currency,
          onboardingComplete: false,
        });
        return { success: true };
      }),

    completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
      const existing = await getUserProfile(ctx.user.id);
      await upsertUserProfile({
        userId: ctx.user.id,
        monthlyIncome: existing?.monthlyIncome ?? 0,
        currency: existing?.currency ?? DEFAULTS.currency,
        onboardingComplete: true,
        xpPoints: GAMIFICATION.xpOnboarding,
        level: 1,
      });
      await createXpEvent({
        userId: ctx.user.id,
        eventType: "onboarding_complete",
        xpAwarded: GAMIFICATION.xpOnboarding,
        description: `Completed onboarding! Welcome to ${DEFAULTS.coachName} 🐿️`,
      });
      return { success: true };
    }),

    getStats: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getUserProfile(ctx.user.id);
      const walletList = await getUserWallets(ctx.user.id);
      const xpList = await getUserXpEvents(ctx.user.id, 5);
      const alerts = await checkBudgetAlerts(ctx.user.id);
      const hasAlert = alerts.some((a) => a.isAlert);

      const totalAllocated = walletList.reduce((s, w) => s + w.allocatedAmount, 0);
      const totalSpent = walletList.reduce((s, w) => s + (w.allocatedAmount - w.currentBalance), 0);
      const spendingPercent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

      const mood = computeMascotMood(spendingPercent, profile?.currentStreak ?? 0, hasAlert);
      if (profile && profile.mascotMood !== mood) {
        await updateUserProfile(ctx.user.id, { mascotMood: mood });
      }

      const xp = profile?.xpPoints ?? 0;
      return {
        profile: profile ?? null,
        wallets: walletList,
        recentXp: xpList,
        spendingPercent,
        xpToNextLevel: xpToNextLevel(xp),
        mascotMood: mood,
        budgetAlerts: alerts.filter((a) => a.isAlert),
      };
    }),
  }),

  wallets: router({
    list: protectedProcedure.query(async ({ ctx }) => getUserWallets(ctx.user.id)),

    setup: protectedProcedure
      .input(
        z.object({
          monthlyIncome: z.number().positive(),
          allocations: z.array(
            z.object({
              walletType: walletTypeSchema,
              label: z.string(),
              allocationPercent: z.number().min(0).max(100),
              color: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await deleteUserWallets(ctx.user.id);
        const walletsToCreate = input.allocations.map((a) => ({
          userId: ctx.user.id,
          walletType: a.walletType,
          label: a.label,
          allocationPercent: a.allocationPercent,
          allocatedAmount: (a.allocationPercent / 100) * input.monthlyIncome,
          currentBalance: (a.allocationPercent / 100) * input.monthlyIncome,
          color: a.color,
        }));
        await createWallets(walletsToCreate);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({ walletId: z.number(), currentBalance: z.number() }))
      .mutation(async ({ input }) => {
        await updateWallet(input.walletId, { currentBalance: input.currentBalance });
        return { success: true };
      }),
  }),

  transactions: router({
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(20),
          offset: z.number().default(0),
          fromDate: z.string().optional(),
          toDate: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const txs = await getUserTransactions(ctx.user.id, {
          limit: input.limit,
          offset: input.offset,
          fromDate: input.fromDate ? new Date(input.fromDate) : undefined,
          toDate: input.toDate ? new Date(input.toDate) : undefined,
        });
        const total = await countUserTransactions(ctx.user.id);
        return { transactions: txs, total };
      }),

    add: protectedProcedure
      .input(
        z.object({
          merchantName: z.string(),
          category: transactionCategorySchema,
          amount: z.number().positive(),
          type: z.enum(["expense", "income"]).default("expense"),
          walletId: z.number().optional(),
          note: z.string().optional(),
          transactedAt: z.string().optional(),
          rawText: z.string().optional(),
          confidenceScore: z.number().optional(),
          needsVerification: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createTransaction({
          userId: ctx.user.id,
          merchantName: input.merchantName,
          category: input.category,
          amount: input.amount,
          type: input.type,
          walletId: input.walletId,
          note: input.note,
          rawText: input.rawText,
          confidenceScore: input.confidenceScore ?? 1.0,
          needsVerification: input.needsVerification ?? false,
          transactedAt: input.transactedAt ? new Date(input.transactedAt) : new Date(),
        });

        let targetWalletId = input.walletId;
        if (!targetWalletId) {
          const walletType = getCategoryWalletType(input.category);
          const wallet = await getWalletByTypeForUser(ctx.user.id, walletType);
          targetWalletId = wallet?.id;
        }

        if (targetWalletId) {
          if (input.type === "expense") {
            await deductFromWallet(targetWalletId, input.amount);
          } else {
            await addToWallet(targetWalletId, input.amount);
          }
        }

        const profile = await getUserProfile(ctx.user.id);
        const newXp = (profile?.xpPoints ?? 0) + GAMIFICATION.xpTransaction;
        await updateUserProfile(ctx.user.id, { xpPoints: newXp, level: computeLevel(newXp) });
        await createXpEvent({
          userId: ctx.user.id,
          eventType: "transaction_logged",
          xpAwarded: GAMIFICATION.xpTransaction,
          description: `Logged transaction: ${input.merchantName}`,
        });

        await syncMascotMoodFromAlerts(ctx.user.id);
        return { success: true, xpAwarded: GAMIFICATION.xpTransaction };
      }),

    update: protectedProcedure
      .input(
        z.object({
          txId: z.number(),
          merchantName: z.string().optional(),
          category: transactionCategorySchema.optional(),
          note: z.string().optional(),
          needsVerification: z.boolean().optional(),
          amount: z.number().optional(),
          type: z.enum(["income", "expense"]).optional(),
          walletId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const oldTx = await getTransactionById(input.txId);
        if (!oldTx) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });

        const amountChanged = input.amount !== undefined && input.amount !== oldTx.amount;
        const typeChanged = input.type !== undefined && input.type !== oldTx.type;

        if (amountChanged || typeChanged) {
          if (oldTx.walletId) {
            if (oldTx.type === "expense") {
              await addToWallet(oldTx.walletId, oldTx.amount);
            } else {
              await deductFromWallet(oldTx.walletId, oldTx.amount);
            }
          }

          const newAmount = input.amount ?? oldTx.amount;
          const newType = input.type ?? oldTx.type;
          let targetWalletId: number | null = input.walletId ?? oldTx.walletId ?? null;
          if (!targetWalletId) {
            const walletType = getCategoryWalletType(oldTx.category);
            const wallet = await getWalletByTypeForUser(ctx.user.id, walletType);
            targetWalletId = wallet?.id ?? null;
          }
          if (targetWalletId) {
            if (newType === "expense") {
              await deductFromWallet(targetWalletId, newAmount);
            } else {
              await addToWallet(targetWalletId, newAmount);
            }
          }
        }

        await updateTransaction(input.txId, {
          merchantName: input.merchantName,
          category: input.category,
          note: input.note,
          needsVerification: input.needsVerification,
          amount: input.amount,
          type: input.type,
          walletId: input.walletId,
        });

        await syncMascotMoodFromAlerts(ctx.user.id);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ txId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tx = await getTransactionById(input.txId);
        if (!tx) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });

        if (tx.walletId) {
          if (tx.type === "expense") {
            await addToWallet(tx.walletId, tx.amount);
          } else {
            await deductFromWallet(tx.walletId, tx.amount);
          }
        }

        await deleteTransaction(input.txId);
        await syncMascotMoodFromAlerts(ctx.user.id);
        return { success: true };
      }),

    budgetAlerts: protectedProcedure.query(async ({ ctx }) => {
      const { alerts } = await syncMascotMoodFromAlerts(ctx.user.id);
      return alerts;
    }),

    parseRaw: protectedProcedure
      .input(z.object({ rawText: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const { result: response } = await invokeLLMSafe({
          messages: [
            { role: "system", content: buildTransactionParserPrompt() },
            { role: "user", content: `Parse these transactions:\n${input.rawText}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "transactions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  transactions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        merchantName: { type: "string" },
                        category: { type: "string" },
                        amount: { type: "number" },
                        type: { type: "string" },
                        confidenceScore: { type: "number" },
                        needsVerification: { type: "boolean" },
                        note: { type: "string" },
                      },
                      required: [
                        "merchantName",
                        "category",
                        "amount",
                        "type",
                        "confidenceScore",
                        "needsVerification",
                        "note",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["transactions"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawMsg = response.choices[0]?.message?.content;
        const content = typeof rawMsg === "string" ? rawMsg : "{}";
        try {
          const parsed = JSON.parse(content);
          const transactions = (parsed.transactions ?? []).map((tx: Record<string, unknown>) => ({
            ...tx,
            needsVerification:
              Boolean(tx.needsVerification) ||
              (typeof tx.confidenceScore === "number" && tx.confidenceScore < LLM.parserConfidenceThreshold),
          }));
          return { transactions };
        } catch {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to parse AI response. Please try again with clearer text.",
          });
        }
      }),
  }),

  goals: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => getUserSavingsGoals(ctx.user.id, input?.limit)),

    create: protectedProcedure.input(savingsGoalCreateSchema).mutation(async ({ ctx, input }) => {
      await createSavingsGoal({
        userId: ctx.user.id,
        name: input.name,
        targetAmount: input.targetAmount,
        currentAmount: input.currentAmount,
        deadline: input.deadline ? new Date(input.deadline) : undefined,
        category: input.category,
        emoji: input.emoji,
      });
      return { success: true };
    }),

    update: protectedProcedure.input(savingsGoalUpdateSchema).mutation(async ({ ctx, input }) => {
      const { goalId, ...data } = input;
      const existing = await getSavingsGoalById(goalId, ctx.user.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found" });
      await updateSavingsGoal(goalId, ctx.user.id, {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : data.deadline === null ? null : undefined,
      });
      return { success: true };
    }),

    delete: protectedProcedure
      .input(z.object({ goalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getSavingsGoalById(input.goalId, ctx.user.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found" });
        await deleteSavingsGoal(input.goalId, ctx.user.id);
        return { success: true };
      }),

    addFunds: protectedProcedure
      .input(z.object({ goalId: z.number(), amount: z.number().positive() }))
      .mutation(async ({ ctx, input }) => {
        const updated = await addToSavingsGoal(input.goalId, ctx.user.id, input.amount);
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found" });

        const profile = await getUserProfile(ctx.user.id);
        const xp = GAMIFICATION.dailyActions.saved_to_goal;
        const newXp = (profile?.xpPoints ?? 0) + xp;
        await updateUserProfile(ctx.user.id, { xpPoints: newXp, level: computeLevel(newXp) });
        await createXpEvent({
          userId: ctx.user.id,
          eventType: "saved_to_goal",
          xpAwarded: xp,
          description: `Added to goal: ${updated.name}`,
        });

        return { success: true, currentAmount: updated.currentAmount, xpAwarded: xp };
      }),
  }),

  streaks: router({
    list: protectedProcedure.query(async ({ ctx }) => getUserSocialStreaks(ctx.user.id)),

    addFriend: protectedProcedure
      .input(
        z.object({
          friendName: z.string().min(1),
          friendAvatar: z.string().default("🐿️"),
          initialStreak: z.number().min(0).default(0),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createSocialStreak({
          userId: ctx.user.id,
          friendId: generateFriendId(ctx.user.id),
          friendName: input.friendName,
          friendAvatar: input.friendAvatar,
          currentStreak: input.initialStreak,
        });
        return { success: true };
      }),

    incrementStreak: protectedProcedure
      .input(z.object({ streakId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const streaks = await getUserSocialStreaks(ctx.user.id);
        const streak = streaks.find((s) => s.id === input.streakId);
        if (!streak) throw new TRPCError({ code: "NOT_FOUND", message: "Streak not found" });

        const newCount = streak.currentStreak + 1;
        await updateSocialStreak(input.streakId, { currentStreak: newCount });

        const profile = await getUserProfile(ctx.user.id);
        const newStreak = (profile?.currentStreak ?? 0) + 1;
        const newLongest = Math.max(newStreak, profile?.longestStreak ?? 0);
        const newXp = (profile?.xpPoints ?? 0) + GAMIFICATION.xpStreak;
        await updateUserProfile(ctx.user.id, {
          currentStreak: newStreak,
          longestStreak: newLongest,
          xpPoints: newXp,
          level: computeLevel(newXp),
          lastStreakDate: new Date(),
        });
        await createXpEvent({
          userId: ctx.user.id,
          eventType: "streak_extended",
          xpAwarded: GAMIFICATION.xpStreak,
          description: `Extended streak with ${streak.friendName} to ${newCount} days!`,
        });

        return { success: true, newStreak: newCount, xpAwarded: GAMIFICATION.xpStreak };
      }),
  }),

  gamification: router({
    xpHistory: protectedProcedure.query(async ({ ctx }) => getUserXpEvents(ctx.user.id, 20)),

    logDailyAction: protectedProcedure
      .input(z.object({ action: z.enum(["logged_expense", "stayed_in_budget", "saved_to_goal"]) }))
      .mutation(async ({ ctx, input }) => {
        const xp = GAMIFICATION.dailyActions[input.action];
        const profile = await getUserProfile(ctx.user.id);
        const newXp = (profile?.xpPoints ?? 0) + xp;
        const newLevel = computeLevel(newXp);
        await updateUserProfile(ctx.user.id, { xpPoints: newXp, level: newLevel });
        await createXpEvent({
          userId: ctx.user.id,
          eventType: input.action,
          xpAwarded: xp,
          description: `Daily action: ${input.action.replace(/_/g, " ")}`,
        });
        return { success: true, xpAwarded: xp, newXp, newLevel };
      }),
  }),

  coach: router({
    history: protectedProcedure.query(async ({ ctx }) => {
      const msgs = await getChatHistory(ctx.user.id, LLM.chatHistoryLimit);
      return msgs.reverse();
    }),

    chat: protectedProcedure
      .input(z.object({ message: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await saveChatMessage({ userId: ctx.user.id, role: "user", content: input.message });

        const profile = await getUserProfile(ctx.user.id);
        const walletList = await getUserWallets(ctx.user.id);
        const history = await getChatHistory(ctx.user.id, LLM.chatContextLimit);
        const currency = profile?.currency ?? DEFAULTS.currency;

        const walletContext = walletList
          .map(
            (w) =>
              `${w.label}: ${currency}${w.currentBalance.toFixed(2)} / ${currency}${w.allocatedAmount.toFixed(2)}`
          )
          .join(", ");

        const systemPrompt = buildCoachSystemPrompt({
          currency,
          monthlyIncome: profile?.monthlyIncome ?? 0,
          currentStreak: profile?.currentStreak ?? 0,
          level: profile?.level ?? 1,
          xpPoints: profile?.xpPoints ?? 0,
          walletContext,
        });

        type ChatMsg = { role: "system" | "user" | "assistant"; content: string };
        const messages: ChatMsg[] = [
          { role: "system", content: systemPrompt },
          ...history
            .slice(0, LLM.chatMessagesInPrompt)
            .reverse()
            .map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          { role: "user", content: input.message },
        ];

        try {
          const { result: response, meta } = await invokeLLMSafe(
            { messages },
            {
              coachContext: {
                currency,
                monthlyIncome: profile?.monthlyIncome ?? 0,
                currentStreak: profile?.currentStreak ?? 0,
                level: profile?.level ?? 1,
                xpPoints: profile?.xpPoints ?? 0,
                walletContext,
              },
              userMessage: input.message,
            }
          );
          const rawContent = response.choices[0]?.message?.content;
          const assistantContent =
            typeof rawContent === "string" ? rawContent : "I'm here to help! 🐿️";

          await saveChatMessage({ userId: ctx.user.id, role: "assistant", content: assistantContent });
          return { reply: assistantContent, usedFallback: meta.usedFallback };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Coach is temporarily unavailable";
          if (/quota|429|insufficient_quota/i.test(msg)) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "AI quota exceeded. Add OpenAI billing, use Groq (see SETUP.md), or set LLM_FALLBACK_ENABLED=true in .env.",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: msg,
          });
        }
      }),

    clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
      await clearChatHistory(ctx.user.id);
      return { success: true };
    }),

    planBudget: protectedProcedure
      .input(
        z.object({
          message: z.string().min(1),
          selectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          categories: z.array(
            z.object({
              id: z.string(),
              amount: z.number().min(0),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await saveChatMessage({ userId: ctx.user.id, role: "user", content: input.message });

        const profile = await getUserProfile(ctx.user.id);
        const walletList = await getUserWallets(ctx.user.id);
        const currency = profile?.currency ?? DEFAULTS.currency;

        const walletContext = walletList
          .map(
            (w) =>
              `${w.label}: ${currency}${w.currentBalance.toFixed(0)} left of ${currency}${w.allocatedAmount.toFixed(0)}`
          )
          .join(", ");

        const systemPrompt = buildBudgetPlannerPrompt({
          currency,
          monthlyIncome: profile?.monthlyIncome ?? 0,
          selectedDate: input.selectedDate,
          walletContext,
          currentPlan: { selectedDate: input.selectedDate, categories: input.categories },
        });

        const userPayload = `${input.message}\n\n[Planning date: ${input.selectedDate}]`;

        try {
          const { result: response, meta } = await invokeLLMSafe({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPayload },
            ],
            response_format: { type: "json_object" },
          });

          const raw = response.choices[0]?.message?.content;
          const content = typeof raw === "string" ? raw : "{}";
          let plan = parseBudgetPlanResponse(content);

          if (!plan || plan.categories.length === 0) {
            plan = budgetPlannerFallback(input.message, {
              currency,
              monthlyIncome: profile?.monthlyIncome ?? 0,
              currentPlan: { selectedDate: input.selectedDate, categories: input.categories },
            });
          }

          await saveChatMessage({
            userId: ctx.user.id,
            role: "assistant",
            content: plan.reply,
          });

          return {
            reply: plan.reply,
            categories: plan.categories,
            dailyTotal: plan.dailyTotal,
            usedFallback: meta.usedFallback,
          };
        } catch (err) {
          const plan = budgetPlannerFallback(input.message, {
            currency,
            monthlyIncome: profile?.monthlyIncome ?? 0,
            currentPlan: { selectedDate: input.selectedDate, categories: input.categories },
          });
          await saveChatMessage({ userId: ctx.user.id, role: "assistant", content: plan.reply });
          return {
            reply: plan.reply,
            categories: plan.categories,
            dailyTotal: plan.dailyTotal,
            usedFallback: true,
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
