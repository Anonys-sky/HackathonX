import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Zap, Loader2, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiStreakPot } from "@/lib/api/types";

const DEFAULT_STAKE_XP = 50;

function potStakeXp(pot: ApiStreakPot): number {
  return pot.stakeXp ?? pot.stakeAmount ?? DEFAULT_STAKE_XP;
}

function potTotalXp(pot: ApiStreakPot): number {
  return pot.potTotalXp ?? pot.potTotal ?? potStakeXp(pot) * (pot.members?.length ?? 3);
}

function settlementShareXp(pot: ApiStreakPot): number {
  return pot.settlement?.shareXpEach ?? pot.settlement?.shareEach ?? 0;
}

export function StreakPotCard({ t }: { t: (key: string) => string }) {
  const potsQuery = trpc.streakPots.list.useQuery();
  const utils = trpc.useUtils();
  const createPot = trpc.streakPots.create.useMutation({
    onSuccess: () => {
      utils.streakPots.list.invalidate();
      toast.success(t("pot.created"));
    },
    onError: () => toast.error(t("common.error")),
  });
  const checkIn = trpc.streakPots.checkIn.useMutation({
    onSuccess: (data) => {
      utils.streakPots.list.invalidate();
      if (data.breached) toast.error(t("pot.breached"));
      else toast.success(t("pot.safe_today"));
    },
  });
  const settle = trpc.streakPots.settle.useMutation({
    onSuccess: (pot) => {
      utils.streakPots.list.invalidate();
      utils.profile.getStats.invalidate();
      const share = settlementShareXp(pot);
      if (pot.settlement?.winners.length && share > 0) {
        toast.success(t("pot.settled").replace("{{xp}}", String(Math.round(share))));
      } else {
        toast.success(t("common.success"));
      }
    },
  });

  const pot = potsQuery.data?.[0] as ApiStreakPot | undefined;
  const busy = createPot.isPending || checkIn.isPending || settle.isPending;
  const stakeXp = pot ? potStakeXp(pot) : DEFAULT_STAKE_XP;

  return (
    <section className="rounded-2xl border-2 border-[oklch(0.55_0.14_85)]/35 bg-gradient-to-br from-[oklch(0.99_0.03_85)] to-white p-4 shadow-md mb-4">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-9 h-9 rounded-xl bg-[oklch(0.96_0.06_85)] flex items-center justify-center shrink-0">
          <Zap size={18} className="text-[oklch(0.55_0.14_85)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{t("pot.title")}</p>
          <p className="text-[10px] text-muted-foreground leading-snug">{t("pot.subtitle")}</p>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wide text-[oklch(0.45_0.12_85)] bg-[oklch(0.96_0.06_85)] px-2 py-0.5 rounded-full shrink-0">
          {t("pot.xp_badge")}
        </span>
      </div>

      {!pot ? (
        <div className="space-y-3 mt-2">
          <p className="text-xs text-muted-foreground">{t("pot.empty")}</p>
          <Button
            className="w-full rounded-xl h-11 font-bold"
            disabled={busy}
            onClick={() => createPot.mutate({ stakeXp: DEFAULT_STAKE_XP })}
          >
            {createPot.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              t("pot.create_btn").replace("{{xp}}", String(DEFAULT_STAKE_XP))
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 mt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">{pot.name}</span>
            <span className="text-muted-foreground font-semibold text-[oklch(0.5_0.14_85)]">
              {t("pot.vault")}: {potTotalXp(pot)} XP
            </span>
          </div>

          <ul className="space-y-1.5">
            {pot.members.map((m) => (
              <li
                key={m.uid}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs border",
                  m.breachedToday
                    ? "bg-red-50/80 border-red-200/70"
                    : "bg-white border-border/60"
                )}
              >
                <span className="text-base">{m.avatar}</span>
                <span className="flex-1 font-semibold truncate">{m.displayName}</span>
                <span className="text-[10px] font-bold text-[oklch(0.5_0.14_85)]">
                  {stakeXp} XP
                </span>
                {m.breachedToday ? (
                  <span className="text-[10px] font-bold text-red-600">{t("pot.over")}</span>
                ) : (
                  <span className="text-[10px] font-bold text-[oklch(0.45_0.12_160)]">{t("pot.safe")}</span>
                )}
              </li>
            ))}
          </ul>

          {pot.dailySafeLimit != null && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Shield size={12} />
              {t("pot.limit_hint")
                .replace("{{spent}}", String(Math.round(pot.todaySpent ?? 0)))
                .replace("{{limit}}", String(Math.round(pot.dailySafeLimit)))}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl text-xs font-bold"
              disabled={busy}
              onClick={() => checkIn.mutate({ potId: pot.id })}
            >
              {checkIn.isPending ? <Loader2 size={14} className="animate-spin" /> : t("pot.check_in")}
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-xl text-xs font-bold"
              disabled={busy}
              onClick={() => settle.mutate({ potId: pot.id })}
            >
              {settle.isPending ? <Loader2 size={14} className="animate-spin" /> : t("pot.settle")}
            </Button>
          </div>

          {pot.settlement && (
            <p className="text-[10px] text-center text-muted-foreground">
              <Users size={12} className="inline mr-1" />
              {t("pot.last_settlement")
                .replace("{{losers}}", pot.settlement.losers.join(", ") || "—")
                .replace("{{winners}}", pot.settlement.winners.join(", ") || "—")
                .replace("{{xp}}", String(Math.round(settlementShareXp(pot))))}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
