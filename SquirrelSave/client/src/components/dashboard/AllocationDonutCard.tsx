import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

export type DonutSlice = {
  name: string;
  value: number;
  color: string;
  balance: number;
  budgetPercent: number;
};

export function AllocationDonutCard({
  title,
  icon,
  data,
  currency,
  t,
  accentClass,
  footerNote,
}: {
  title: string;
  icon: React.ReactNode;
  data: DonutSlice[];
  currency: string;
  t: (key: string) => string;
  accentClass: string;
  footerNote?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border-2 p-3 shadow-sm flex flex-col min-h-[240px]",
        accentClass
      )}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="text-sm font-bold text-foreground">{title}</p>
      </div>

      <div className="flex-1 w-full min-h-[140px]">
        {data.length === 0 || total === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            —
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="42%"
                outerRadius="78%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, _n: string, props: { payload?: { name?: string } }) => [
                  formatCurrency(Number(v), currency),
                  props.payload?.name ?? "",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-center text-sm font-display text-foreground mt-1">
        {formatCurrency(total, currency)}
      </p>
      <p className="text-[10px] text-center text-muted-foreground">{t("dashboard.total_left")}</p>

      <div className="mt-2 space-y-1 max-h-[72px] overflow-y-auto">
        {data.map((w) => (
          <div key={w.name} className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: w.color }} />
            <span className="flex-1 truncate text-foreground">{w.name}</span>
            <span className="font-bold shrink-0">{formatCurrency(w.balance, currency)}</span>
          </div>
        ))}
      </div>

      {footerNote && (
        <p className="text-[9px] text-primary font-medium mt-1 text-center">{footerNote}</p>
      )}
    </motion.div>
  );
}
