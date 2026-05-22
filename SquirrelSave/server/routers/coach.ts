import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { DEFAULTS, LLM } from "@shared/config";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLMSafe } from "../lib/aiService";
import { buildCoachSystemPrompt } from "../lib/prompts";
import {
  buildBudgetPlannerPrompt,
  budgetPlannerFallback,
  parseBudgetPlanResponse,
} from "../lib/budgetPlanner";
import { formatWalletContext } from "../lib/walletContext";
import {
  clearChatHistory,
  getChatHistory,
  getUserProfile,
  getUserWallets,
  saveChatMessage,
} from "../db";

export const coachRouter = router({
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
      const walletContext = formatWalletContext(walletList, currency, "detailed");

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

        await saveChatMessage({
          userId: ctx.user.id,
          role: "assistant",
          content: assistantContent,
        });
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
      const walletContext = formatWalletContext(walletList, currency, "compact");

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
      } catch {
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
});
