import { trpc } from "@/lib/trpc";

/** Invalidate ledger, stats, and budget alerts after transaction mutations. */
export function useTransactionCacheInvalidation() {
  const utils = trpc.useUtils();
  return () => {
    void utils.transactions.list.invalidate();
    void utils.profile.getStats.invalidate();
    void utils.transactions.budgetAlerts.invalidate();
  };
}
