import { motion } from "framer-motion";
import { Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAMIFICATION } from "@shared/config";

export type LeagueRow = {
  id: string;
  friendName: string;
  friendAvatar: string;
  currentStreak: number;
  isActive?: boolean;
  isMe?: boolean;
  /** Numeric id for friend streak API */
  streakId?: number;
};

function getStreakBadge(streak: number) {
  return [...GAMIFICATION.streakBadges].reverse().find((b) => streak >= b.days);
}

const RANK_STYLES = [
  "bg-[oklch(0.98_0.04_85)] border-l-4 border-[oklch(0.75_0.16_85)]",
  "bg-[oklch(0.97_0.01_25)] border-l-4 border-[oklch(0.78_0.02_25)]",
  "bg-[oklch(0.97_0.03_55)] border-l-4 border-[oklch(0.72_0.12_55)]",
];

export function LeagueLeaderboard({
  entries,
  t,
  onPoke,
  pokingId,
}: {
  entries: LeagueRow[];
  t: (key: string) => string;
  onPoke?: (entry: LeagueRow) => void;
  pokingId?: number | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border/80 shadow-sm overflow-hidden divide-y divide-border/80">
      {entries.map((entry, rank) => {
        const isTop3 = rank < 3;
        const rankEmoji = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : null;
        const badge = getStreakBadge(entry.currentStreak);
        const canPoke =
          !entry.isMe && entry.currentStreak === 0 && entry.streakId != null && onPoke;

        return (
          <motion.div
            key={`${entry.id}-${rank}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: rank * 0.03 }}
            className={cn(
              "flex items-center gap-3 px-3 py-3.5 min-h-[60px]",
              isTop3 && RANK_STYLES[rank],
              entry.isMe && !isTop3 && "bg-[oklch(0.97_0.03_25)]"
            )}
          >
            <div className="w-8 text-center shrink-0">
              {rankEmoji ? (
                <span className="text-lg">{rankEmoji}</span>
              ) : (
                <span className="text-sm font-bold text-muted-foreground">{rank + 1}</span>
              )}
            </div>

            <div
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0",
                isTop3 ? "ring-2 ring-white shadow-sm bg-white" : "bg-muted"
              )}
            >
              {entry.friendAvatar}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-bold truncate",
                  entry.isMe ? "text-primary" : "text-foreground"
                )}
              >
                {entry.friendName}
                {entry.isMe ? ` (${t("social.you")})` : ""}
              </p>
              {badge && entry.currentStreak > 0 && (
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", badge.color)}>
                  {badge.emoji} {t(badge.labelKey)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums flex items-center justify-end gap-0.5">
                  <span className={entry.currentStreak > 0 ? "flame-animate" : "opacity-40"}>🔥</span>
                  {entry.currentStreak}
                </p>
                <p className="text-[10px] text-muted-foreground">{t("social.days")}</p>
              </div>

              {canPoke && (
                <button
                  type="button"
                  onClick={() => onPoke(entry)}
                  disabled={pokingId === entry.streakId}
                  className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center active:bg-primary/20"
                  title={t("social.poke")}
                  aria-label={t("social.poke")}
                >
                  {pokingId === entry.streakId ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Bell size={16} />
                  )}
                </button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
