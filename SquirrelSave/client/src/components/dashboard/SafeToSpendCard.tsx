import { CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export function SafeToSpendCard({
  amount,
  currency,
  label,
  daysLeft,
  daysLeftLabel,
}: {
  amount: number;
  currency: string;
  label: string;
  daysLeft: number;
  daysLeftLabel: string;
}) {
  return (
    <section
      className="mx-4 mt-4 rounded-3xl bg-white border border-primary/20 shadow-md p-5 sm:p-6"
      aria-labelledby="safe-to-spend-heading"
    >
      <p
        id="safe-to-spend-heading"
        className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
      >
        {label}
      </p>
      <p className="text-4xl sm:text-[2.75rem] font-display text-primary mt-2 leading-none tabular-nums tracking-tight">
        {formatCurrency(amount, currency)}
      </p>
      <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
        <CalendarDays size={16} className="text-primary/80 shrink-0" />
        <p className="font-medium text-foreground/75">{daysLeftLabel}</p>
      </div>
      <p className="sr-only">{daysLeft} days remaining in budget cycle</p>
    </section>
  );
}
