import { Flame } from "lucide-react";
import { SquirryMascot, type MascotMood } from "@/components/SquirryMascot";
import { cn } from "@/lib/utils";

type DashboardGamificationBarProps = {
  mood: MascotMood;
  level: number;
  xpPoints: number;
  xpToNext: number;
  streak: number;
  assistantLabel: string;
  streakTitle: string;
};

export function DashboardGamificationBar({
  mood,
  level,
  xpPoints,
  xpToNext,
  streak,
  assistantLabel,
  streakTitle,
}: DashboardGamificationBarProps) {
  const xpPerLevel = 500;
  const xpInLevel = Math.max(0, xpPerLevel - xpToNext);
  const xpPercent = Math.min(100, (xpInLevel / xpPerLevel) * 100);

  return (
    <div className="mx-4 mt-3 flex items-center gap-2.5 rounded-2xl bg-white/90 border border-border/80 px-2.5 py-2 shadow-sm">
      <div className="shrink-0 rounded-xl bg-[oklch(0.97_0.03_25)] p-1">
        <SquirryMascot mood={mood} size={36} level={level} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground truncate">{assistantLabel}</p>
        <div className="mt-1 h-1.5 rounded-full bg-[oklch(0.94_0.02_25)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[oklch(0.62_0.16_25)] transition-[width] duration-500"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
        <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
          {xpPoints.toLocaleString()} XP
        </p>
      </div>

      <div
        className={cn(
          "shrink-0 flex items-center gap-1 rounded-xl px-2 py-1.5",
          streak > 0 ? "bg-[oklch(0.97_0.04_55)]" : "bg-muted/60"
        )}
        title={streakTitle}
      >
        <Flame
          size={15}
          className={cn(streak > 0 ? "text-[oklch(0.62_0.18_45)]" : "text-muted-foreground/50")}
        />
        <span className="text-sm font-bold text-foreground tabular-nums">{streak}</span>
      </div>
    </div>
  );
}
