export type WalletContextRow = {
  label: string;
  currentBalance: number;
  allocatedAmount: number;
};

/** Formats wallet balances for LLM coach / budget prompts. */
export function formatWalletContext(
  walletList: WalletContextRow[],
  currency: string,
  style: "detailed" | "compact" = "detailed"
): string {
  if (style === "compact") {
    return walletList
      .map(
        (w) =>
          `${w.label}: ${currency}${w.currentBalance.toFixed(0)} left of ${currency}${w.allocatedAmount.toFixed(0)}`
      )
      .join(", ");
  }
  return walletList
    .map(
      (w) =>
        `${w.label}: ${currency}${w.currentBalance.toFixed(2)} / ${currency}${w.allocatedAmount.toFixed(2)}`
    )
    .join(", ");
}
