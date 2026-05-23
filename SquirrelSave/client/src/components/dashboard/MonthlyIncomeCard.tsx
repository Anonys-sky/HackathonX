import { Banknote, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export function MonthlyIncomeCard({
  monthLabel,
  salary,
  currency,
  title,
  hint,
  receivedLabel,
  receivedAmount,
  editLabel,
  onEdit,
}: {
  monthLabel: string;
  salary: number;
  currency: string;
  title: string;
  hint: string;
  receivedLabel?: string;
  receivedAmount?: number;
  editLabel: string;
  onEdit: () => void;
}) {
  const showReceived =
    receivedAmount !== undefined && receivedAmount > 0 && receivedAmount !== salary;

  return (
    <section className="mx-4 mt-4 rounded-2xl bg-white border border-border/80 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[oklch(0.96_0.04_160)] flex items-center justify-center shrink-0">
          <Banknote size={20} className="text-[oklch(0.5_0.18_160)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {monthLabel}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
          <p className="text-2xl font-display text-foreground mt-1 tabular-nums leading-none">
            {formatCurrency(salary, currency)}
          </p>
          {showReceived && receivedLabel && (
            <p className="text-[11px] text-[oklch(0.5_0.18_160)] font-medium mt-1.5 tabular-nums">
              {receivedLabel}: {formatCurrency(receivedAmount!, currency)}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 text-[10px] font-semibold text-primary flex items-center gap-0.5 min-h-[44px] -mr-1"
        >
          {editLabel}
          <ChevronRight size={12} />
        </button>
      </div>
    </section>
  );
}
