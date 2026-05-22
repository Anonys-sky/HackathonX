import { BUDGET, GAMIFICATION, type MascotMood } from "./config";

export function computeLevel(xp: number, xpPerLevel = GAMIFICATION.xpPerLevel): number {
  return Math.floor(xp / xpPerLevel) + 1;
}

export function xpToNextLevel(xp: number, xpPerLevel = GAMIFICATION.xpPerLevel): number {
  return xpPerLevel - (xp % xpPerLevel);
}

export function computeMascotMood(
  spendingPercent: number,
  streak: number,
  hasBudgetAlert = false
): MascotMood {
  if (hasBudgetAlert) return "worried";
  if (streak === 0 && spendingPercent === 0) return "sleeping";
  if (streak >= GAMIFICATION.streakCelebrationDays && spendingPercent < GAMIFICATION.spendingCelebratingMax) {
    return "celebrating";
  }
  if (spendingPercent >= GAMIFICATION.spendingAlertMin) return "alert";
  if (spendingPercent >= GAMIFICATION.spendingWorriedMin) return "worried";
  return "happy";
}

export function isBudgetAlert(spendingPercent: number): boolean {
  return spendingPercent >= BUDGET.alertThresholdPercent;
}
