import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { GAMIFICATION } from "@shared/config";
import { computeLevel } from "@shared/gamification";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createSocialStreak,
  createXpEvent,
  getUserProfile,
  getUserSocialStreaks,
  updateSocialStreak,
  updateUserProfile,
} from "../db";
import { generateFriendId } from "./helpers";

export const streaksRouter = router({
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
});
