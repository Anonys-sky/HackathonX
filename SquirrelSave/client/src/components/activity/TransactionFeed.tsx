import { motion } from "framer-motion";
import { AlertCircle, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTIVITY_CATEGORIES } from "./constants";
import type { GroupableTx } from "@/lib/groupTransactionsByDate";

export function TransactionFeed({
  groups,
  currency,
  t,
  onEdit,
  onDelete,
}: {
  groups: { key: string; label: string; items: GroupableTx[] }[];
  currency: string;
  t: (key: string) => string;
  onEdit: (tx: GroupableTx) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="space-y-4 pb-4">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="sticky top-0 z-10 -mx-1 px-1 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground bg-[oklch(0.98_0.015_25)]/95 backdrop-blur-sm">
            {group.label}
          </h3>
          <div className="bg-white rounded-2xl border border-border/80 shadow-sm overflow-hidden divide-y divide-border/80">
            {group.items.map((tx, i) => {
              const cat = ACTIVITY_CATEGORIES.find((c) => c.value === tx.category);
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 px-3 py-3.5 min-h-[60px]"
                >
                  <div
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center text-lg shrink-0",
                      cat?.colorClass ?? "bg-muted"
                    )}
                  >
                    {cat?.emoji ?? "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground truncate">{tx.merchantName}</p>
                      {tx.needsVerification && (
                        <AlertCircle size={12} className="text-amber-500 shrink-0" />
                      )}
                    </div>
                    {cat && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t(cat.labelKey)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums min-w-[4.5rem] text-right",
                        tx.type === "income" ? "text-[oklch(0.5_0.18_160)]" : "text-foreground"
                      )}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {currency}
                      {tx.amount.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEdit(tx)}
                      className="p-2 text-muted-foreground active:text-primary"
                      aria-label={t("activity.edit")}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(tx.id)}
                      className="p-2 text-muted-foreground active:text-destructive"
                      aria-label={t("activity.delete")}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
