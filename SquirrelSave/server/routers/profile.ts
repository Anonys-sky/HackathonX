import { z } from "zod";
import { DEFAULTS, GAMIFICATION } from "@shared/config";
import { computeMascotMood, xpToNextLevel } from "@shared/gamification";
import { protectedProcedure, router } from "../_core/trpc";
import {
  checkBudgetAlerts,
  createXpEvent,
  getUserProfile,
  getUserWallets,
  getUserXpEvents,
  updateUserProfile,
  upsertUserProfile,
} from "../db";
import { computeSpendingSnapshot } from "../lib/spendingStats";

export const profileRouter = router({
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

    const { spendingPercent } = computeSpendingSnapshot(walletList);
    const mood = computeMascotMood(
      spendingPercent,
      profile?.currentStreak ?? 0,
      hasAlert
    );
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
});
