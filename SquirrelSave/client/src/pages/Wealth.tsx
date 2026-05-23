import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { AppLayout } from "@/components/AppLayout";
import { BudgetPlannerView } from "@/components/BudgetPlannerView";
import { SquirryMascot } from "@/components/SquirryMascot";
import { toast } from "sonner";
import {
  Zap,
  Flame,
  Crown,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "budget" | "gamification" | "partners";

const INVEST_CATEGORIES = [
  {
    titleKey: "wealth.category_micro",
    partners: [
      {
        name: "Versa",
        descKey: "wealth.partner_versa",
        emoji: "💰",
        minInvest: "RM1",
        accent: "from-[oklch(0.97_0.04_160)] to-[oklch(0.99_0.02_160)]",
        badge: "bg-[oklch(0.92_0.06_160)] text-[oklch(0.35_0.12_160)]",
      },
    ],
  },
  {
    titleKey: "wealth.category_robo",
    partners: [
      {
        name: "StashAway",
        descKey: "wealth.partner_stashaway",
        emoji: "📈",
        minInvest: "RM0",
        accent: "from-[oklch(0.97_0.04_250)] to-white",
        badge: "bg-[oklch(0.92_0.06_250)] text-[oklch(0.35_0.12_250)]",
      },
      {
        name: "Wahed Invest",
        descKey: "wealth.partner_wahed",
        emoji: "🌙",
        minInvest: "RM100",
        accent: "from-[oklch(0.97_0.04_295)] to-white",
        badge: "bg-[oklch(0.92_0.06_295)] text-[oklch(0.35_0.12_295)]",
      },
    ],
  },
  {
    titleKey: "wealth.category_digital",
    partners: [
      {
        name: "Luno",
        descKey: "wealth.partner_luno",
        emoji: "₿",
        minInvest: "RM10",
        accent: "from-[oklch(0.97_0.05_55)] to-white",
        badge: "bg-[oklch(0.94_0.08_55)] text-[oklch(0.4_0.14_55)]",
      },
    ],
  },
] as const;

const LEVEL_TITLES: Record<number, string> = {
  1: "Squirry Saver",
  2: "Budget Apprentice",
  3: "Wallet Wizard",
  4: "Finance Hero",
  5: "Money Master",
  6: "Wealth Champion",
  7: "Investment Sage",
  8: "Financial Legend",
  9: "Millionaire Mindset",
  10: "Squirry Billionaire",
};

function getLevelTitle(level: number) {
  return LEVEL_TITLES[Math.min(level, 10)] ?? "Squirry Billionaire";
}

function formatMinEntry(t: (key: string) => string, amount: string) {
  return t("wealth.min_entry").replace("{amount}", amount);
}

function dayGroupLabel(date: Date, t: (key: string) => string): string {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startEvent = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startToday.getTime() - startEvent.getTime()) / 86400000);
  if (diffDays === 0) return t("wealth.today");
  if (diffDays === 1) return t("wealth.yesterday");
  return t("wealth.earlier");
}

export default function Wealth() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("budget");

  const tabs: { id: TabId; label: string }[] = [
    { id: "budget", label: t("wealth.budget_tab") },
    { id: "gamification", label: t("wealth.progress_tab") },
    { id: "partners", label: t("wealth.invest_tab") },
  ];

  return (
    <AppLayout>
      <div className="max-w-[430px] mx-auto w-full min-h-full pb-24 bg-[oklch(0.98_0.015_25)]">
        <header className="px-4 pt-4 pb-2">
          <h1 className="text-2xl font-display text-foreground">{t("wealth.title")}</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">{t("wealth.subtitle")}</p>
        </header>

        <div className="sticky top-14 z-30 px-4 py-2 bg-[oklch(0.98_0.015_25)]/95 backdrop-blur-sm border-b border-border/40">
          <div className="flex rounded-full bg-white/90 border border-[oklch(0.92_0.02_25)] p-1 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 rounded-full py-2 text-xs font-bold transition-all",
                  activeTab === tab.id
                    ? "bg-[oklch(0.55_0.14_25)] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pt-3">
          {activeTab === "budget" && <BudgetPlannerView />}
          {activeTab === "gamification" && <ProgressTab t={t} />}
          {activeTab === "partners" && <InvestTab t={t} />}
        </div>
      </div>
    </AppLayout>
  );
}

function ProgressTab({ t }: { t: (key: string) => string }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const statsQuery = trpc.profile.getStats.useQuery();
  const xpQuery = trpc.gamification.xpHistory.useQuery();
  const logAction = trpc.gamification.logDailyAction.useMutation({
    onSuccess: (data, vars) => {
      setCompleted((prev) => new Set(prev).add(vars.action));
      toast.success(`+${data.xpAwarded} XP ${t("common.earned")}`);
      statsQuery.refetch();
      xpQuery.refetch();
    },
  });

  const profile = statsQuery.data?.profile;
  const level = profile?.level ?? 1;
  const xp = profile?.xpPoints ?? 0;
  const streak = profile?.currentStreak ?? 0;
  const xpInLevel = xp % 500;
  const xpToNext = 500 - xpInLevel;
  const xpHistory = xpQuery.data ?? [];

  const dailyActions = [
    { action: "logged_expense" as const, labelKey: "wealth.action_log", xp: 10 },
    { action: "stayed_in_budget" as const, labelKey: "wealth.action_budget", xp: 20 },
    { action: "saved_to_goal" as const, labelKey: "wealth.action_save", xp: 30 },
  ];

  const groupedXp = useMemo(() => {
    const groups: { label: string; events: typeof xpHistory }[] = [];
    const seen = new Set<string>();
    for (const event of xpHistory.slice(0, 12)) {
      const d = new Date(event.createdAt);
      const label = dayGroupLabel(d, t);
      if (!seen.has(label)) {
        seen.add(label);
        groups.push({ label, events: [] });
      }
      groups.find((g) => g.label === label)?.events.push(event);
    }
    return groups;
  }, [xpHistory, t]);

  return (
    <div className="space-y-3 pb-4">
      <div className="rounded-2xl border border-[oklch(0.92_0.03_85)] bg-gradient-to-r from-[oklch(0.99_0.03_85)] to-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <SquirryMascot mood={streak >= 7 ? "celebrating" : "happy"} size={48} level={level} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {t("wealth.current_level")}
            </p>
            <p className="text-lg font-display font-bold text-foreground">
              {t("wealth.level")} {level}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{getLevelTitle(level)}</p>
            <div className="mt-2 h-1.5 bg-[oklch(0.94_0.03_85)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[oklch(0.72_0.16_85)]"
                initial={{ width: 0 }}
                animate={{ width: `${(xpInLevel / 500) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">
              {xpInLevel} XP · {xpToNext} {t("wealth.to_next")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { labelKey: "wealth.total_xp", value: xp.toLocaleString(), icon: Zap, tone: "text-[oklch(0.55_0.14_85)]", bg: "bg-[oklch(0.97_0.04_85)]" },
          { labelKey: "wealth.day_streak", value: String(streak), icon: Flame, tone: "text-primary", bg: "bg-[oklch(0.97_0.04_25)]" },
          { labelKey: "wealth.level_label", value: String(level), icon: Crown, tone: "text-[oklch(0.5_0.16_295)]", bg: "bg-[oklch(0.97_0.04_295)]" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.labelKey} className="rounded-xl bg-white border border-border/60 p-2.5 text-center shadow-sm">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1", s.bg, s.tone)}>
                <Icon size={14} />
              </div>
              <p className="text-base font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-[9px] text-muted-foreground font-semibold mt-0.5 leading-tight">{t(s.labelKey)}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-foreground px-0.5">{t("wealth.daily_actions")}</p>
        {dailyActions.map((item) => {
          const done = completed.has(item.action);
          return (
            <button
              key={item.action}
              type="button"
              disabled={logAction.isPending || done}
              onClick={() => logAction.mutate({ action: item.action })}
              className={cn(
                "w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.99]",
                done
                  ? "bg-[oklch(0.97_0.04_160)] border-[oklch(0.9_0.05_160)]"
                  : "bg-white border-border/70 shadow-sm hover:border-primary/25"
              )}
            >
              <span
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                  done ? "border-[oklch(0.55_0.14_160)] bg-[oklch(0.55_0.14_160)]" : "border-muted-foreground/40"
                )}
              >
                {done && <Check size={12} className="text-white" strokeWidth={3} />}
              </span>
              <span className="flex-1 text-sm font-semibold text-foreground">{t(item.labelKey)}</span>
              <span className="text-[10px] font-bold rounded-full px-2 py-1 bg-[oklch(0.96_0.05_85)] text-[oklch(0.45_0.12_85)] shrink-0">
                +{item.xp} XP
              </span>
            </button>
          );
        })}
      </div>

      {groupedXp.length > 0 && (
        <div className="rounded-2xl bg-white border border-border/60 shadow-sm overflow-hidden">
          <p className="text-xs font-bold text-foreground px-4 py-3 border-b border-border/50">
            {t("wealth.xp_history")}
          </p>
          <div className="px-4 py-2 space-y-3">
            {groupedXp.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {group.label}
                </p>
                <ul className="space-y-0 border-l-2 border-[oklch(0.92_0.04_85)] ml-1.5 pl-3">
                  {group.events.map((event, i) => (
                    <motion.li
                      key={event.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-2 py-2 border-b border-border/30 last:border-0"
                    >
                      <div className="w-6 h-6 rounded-lg bg-[oklch(0.97_0.04_85)] flex items-center justify-center shrink-0">
                        <Zap size={12} className="text-[oklch(0.55_0.14_85)]" />
                      </div>
                      <p className="flex-1 text-xs font-medium text-foreground truncate">{event.description}</p>
                      <span className="text-xs font-bold text-[oklch(0.55_0.14_85)] shrink-0">
                        +{event.xpAwarded}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InvestTab({ t }: { t: (key: string) => string }) {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <div className="space-y-4 pb-4">
      <div className="rounded-xl border border-[oklch(0.9_0.05_160)] bg-[oklch(0.97_0.04_160)] overflow-hidden">
        <button
          type="button"
          onClick={() => setDisclaimerOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
        >
          <p className="text-xs font-bold text-[oklch(0.35_0.12_160)]">{t("wealth.disclaimer_title")}</p>
          {disclaimerOpen ? (
            <ChevronDown size={16} className="text-[oklch(0.4_0.1_160)] shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-[oklch(0.4_0.1_160)] shrink-0" />
          )}
        </button>
        {!disclaimerOpen && (
          <p className="px-3 pb-2.5 text-[10px] text-[oklch(0.4_0.1_160)] leading-snug">
            {t("wealth.disclaimer_short")}
          </p>
        )}
        {disclaimerOpen && (
          <p className="px-3 pb-3 text-[10px] text-[oklch(0.38_0.1_160)] leading-relaxed border-t border-[oklch(0.9_0.04_160)] pt-2">
            {t("wealth.disclaimer_text")}
          </p>
        )}
      </div>

      {INVEST_CATEGORIES.map((category) => (
        <section key={category.titleKey} className="space-y-2">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide px-0.5">
            {t(category.titleKey)}
          </h2>
          <div className="space-y-2">
            {category.partners.map((card, i) => (
              <motion.div
                key={card.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "rounded-2xl border border-border/60 p-3 bg-gradient-to-br shadow-sm",
                  card.accent
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm shrink-0">
                    {card.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{card.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t(card.descKey)}</p>
                    <span
                      className={cn(
                        "inline-block mt-2 text-[10px] font-bold px-2.5 py-1 rounded-lg",
                        card.badge
                      )}
                    >
                      {formatMinEntry(t, card.minInvest)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.info(`${t("wealth.opening")} ${card.name}…`)}
                    className="shrink-0 flex items-center gap-1 rounded-xl bg-[oklch(0.55_0.14_25)] text-white text-[11px] font-bold px-3 py-2 min-h-[40px] shadow-sm active:scale-95 transition-transform"
                  >
                    {t("wealth.explore_btn")}
                    <ExternalLink size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      ))}

      <div className="rounded-2xl border border-[oklch(0.92_0.05_85)] bg-gradient-to-br from-[oklch(0.99_0.03_85)] to-white p-4 flex gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-[oklch(0.96_0.06_85)] flex items-center justify-center shrink-0">
          <Lightbulb size={18} className="text-[oklch(0.55_0.14_85)]" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{t("wealth.squirry_tip")}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("wealth.tip_text")}</p>
        </div>
      </div>
    </div>
  );
}
