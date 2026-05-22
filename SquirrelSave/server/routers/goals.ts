import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { GAMIFICATION } from "@shared/config";
import {
  savingsGoalCreateSchema,
  savingsGoalUpdateSchema,
} from "@shared/schemas";
import { computeLevel } from "@shared/gamification";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addToSavingsGoal,
  createSavingsGoal,
  createXpEvent,
  deleteSavingsGoal,
  getSavingsGoalById,
  getUserProfile,
  getUserSavingsGoals,
  updateSavingsGoal,
  updateUserProfile,
} from "../db";

export const goalsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => getUserSavingsGoals(ctx.user.id, input?.limit)),

  create: protectedProcedure
    .input(savingsGoalCreateSchema)
    .mutation(async ({ ctx, input }) => {
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

  update: protectedProcedure
    .input(savingsGoalUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { goalId, ...data } = input;
      const existing = await getSavingsGoalById(goalId, ctx.user.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found" });
      await updateSavingsGoal(goalId, ctx.user.id, {
        ...data,
        deadline: data.deadline
          ? new Date(data.deadline)
          : data.deadline === null
            ? null
            : undefined,
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
});
