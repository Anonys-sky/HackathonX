import { z } from "zod";
import { GAMIFICATION } from "@shared/config";
import { computeLevel } from "@shared/gamification";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createXpEvent,
  getUserProfile,
  getUserXpEvents,
  updateUserProfile,
} from "../db";

export const gamificationRouter = router({
  xpHistory: protectedProcedure.query(async ({ ctx }) =>
    getUserXpEvents(ctx.user.id, 20)
  ),

  logDailyAction: protectedProcedure
    .input(
      z.object({
        action: z.enum(["logged_expense", "stayed_in_budget", "saved_to_goal"]),
      })
    )
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
});
