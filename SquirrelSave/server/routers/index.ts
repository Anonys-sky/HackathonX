import { router } from "../_core/trpc";
import { systemRouter } from "../_core/systemRouter";
import { authRouter } from "./auth";
import { coachRouter } from "./coach";
import { gamificationRouter } from "./gamification";
import { goalsRouter } from "./goals";
import { profileRouter } from "./profile";
import { streaksRouter } from "./streaks";
import { transactionsRouter } from "./transactions";
import { walletsRouter } from "./wallets";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  profile: profileRouter,
  wallets: walletsRouter,
  transactions: transactionsRouter,
  goals: goalsRouter,
  streaks: streaksRouter,
  gamification: gamificationRouter,
  coach: coachRouter,
});

export type AppRouter = typeof appRouter;
