import { computeMascotMood } from "@shared/gamification";
import {
  checkBudgetAlerts,
  getUserProfile,
  getUserWallets,
  updateUserProfile,
} from "../db";

export type WalletBalanceRow = {
  allocatedAmount: number;
  currentBalance: number;
};

export function computeSpendingSnapshot(walletList: WalletBalanceRow[]) {
  const totalAllocated = walletList.reduce((s, w) => s + w.allocatedAmount, 0);
  const totalSpent = walletList.reduce(
    (s, w) => s + (w.allocatedAmount - w.currentBalance),
    0
  );
  const spendingPercent =
    totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  return { totalAllocated, totalSpent, spendingPercent };
}

export async function syncMascotMoodFromAlerts(userId: number) {
  const alerts = await checkBudgetAlerts(userId);
  const hasAlert = alerts.some((a) => a.isAlert);
  const profile = await getUserProfile(userId);
  const walletList = await getUserWallets(userId);
  const { spendingPercent } = computeSpendingSnapshot(walletList);
  const mood = computeMascotMood(
    spendingPercent,
    profile?.currentStreak ?? 0,
    hasAlert
  );
  await updateUserProfile(userId, { mascotMood: mood });
  return { alerts, mood };
}
