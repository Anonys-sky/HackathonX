import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { GAMIFICATION, LLM } from "@shared/config";
import {
  transactionAddSchema,
  transactionCategorySchema,
} from "@shared/schemas";
import { computeLevel } from "@shared/gamification";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLMSafe } from "../lib/aiService";
import { buildTransactionParserPrompt } from "../lib/prompts";
import { syncMascotMoodFromAlerts } from "../lib/spendingStats";
import {
  addToWallet,
  countUserTransactions,
  createTransaction,
  createXpEvent,
  deductFromWallet,
  deleteTransaction,
  getCategoryWalletType,
  getTransactionById,
  getUserProfile,
  getUserTransactions,
  getWalletByTypeForUser,
  updateTransaction,
  updateUserProfile,
} from "../db";

export const transactionsRouter = router({
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
    .input(transactionAddSchema)
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
      await updateUserProfile(ctx.user.id, {
        xpPoints: newXp,
        level: computeLevel(newXp),
      });
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
        const transactions = (parsed.transactions ?? []).map(
          (tx: Record<string, unknown>) => ({
            ...tx,
            needsVerification:
              Boolean(tx.needsVerification) ||
              (typeof tx.confidenceScore === "number" &&
                tx.confidenceScore < LLM.parserConfidenceThreshold),
          })
        );
        return { transactions };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to parse AI response. Please try again with clearer text.",
        });
      }
    }),
});
