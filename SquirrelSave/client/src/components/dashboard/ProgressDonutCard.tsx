import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

/** Empty-track fill — visible ring when utilization is 0% */
const TRACK_COLOR = "oklch(0.9 0.015 25)";
const TRACK_BORDER = "oklch(0.85 0.02 25)";

export function ProgressDonutCard({
  title,
  icon,
  current,
  goal,
  currency,
  subtitle,
  progressColor,
  accentClass,
}: {
  title: string;
  icon: React.ReactNode;
  current: number;
  goal: number;
  currency: string;
  subtitle: string;
  progressColor: string;
  accentClass: string;
}) {
  const pct = goal > 0 ? Math.min(100, Math.max(0, (current / goal) * 100)) : 0;

  const trackData = [{ name: "track", value: 100, color: TRACK_COLOR }];
  const progressData =
    pct <= 0
      ? []
      : pct >= 100
        ? [{ name: "progress", value: 100, color: progressColor }]
        : [
            { name: "progress", value: pct, color: progressColor },
            { name: "gap", value: 100 - pct, color: "transparent" },
          ];

  return (
    <div className={cn("rounded-2xl border p-3 sm:p-4 shadow-sm flex flex-col", accentClass)}>
      <div className="flex items-center gap-1.5 mb-2 shrink-0">
        {icon}
        <p className="text-sm font-bold text-foreground">{title}</p>
      </div>

      <div className="relative w-full h-32 shrink-0">
        <ResponsiveContainer width="100%" height={128}>
          <PieChart>
            <Pie
              data={trackData}
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="82%"
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke={TRACK_BORDER}
              strokeWidth={1}
              isAnimationActive={false}
            >
              <Cell fill={TRACK_COLOR} />
            </Pie>
            {progressData.length > 0 && (
              <Pie
                data={progressData}
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="82%"
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
              >
                {progressData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            )}
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2 text-center">
          <p className="text-[11px] font-bold text-foreground tabular-nums leading-tight">
            {formatCurrency(current, currency)}
          </p>
          <p className="text-[9px] text-muted-foreground tabular-nums">/</p>
          <p className="text-[11px] font-semibold text-muted-foreground tabular-nums leading-tight">
            {formatCurrency(goal, currency)}
          </p>
        </div>
      </div>

      <p className="text-center text-xs font-bold text-foreground mt-1 shrink-0">{subtitle}</p>
      <p className="text-center text-[10px] text-muted-foreground shrink-0 tabular-nums">
        {Math.round(pct)}%
      </p>
    </div>
  );
}
