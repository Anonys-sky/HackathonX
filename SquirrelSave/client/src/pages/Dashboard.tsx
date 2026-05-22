import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { AppLayout } from "@/components/AppLayout";
import { SquirryMascot, MoodBadge, type MascotMood } from "@/components/SquirryMascot";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatTodayHeader } from "@/lib/currency";
import { AllocationDonutCard } from "@/components/dashboard/AllocationDonutCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { CATEGORY_META } from "@shared/config";
import {
  Flame,
  Zap,
  ChevronRight,
  Plus,
  Bell,
  Sparkles,
  Search,
  Coins,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGINATION } from "@shared/config";
import { Progress } from "@/components/ui/progress";
import { SquirryNudgeBubble } from "@/components/SquirryNudgeBubble";
import { dateKey } from "@shared/budgetPlanner";
import { BRAND_NAME } from "@shared/brand";

const CATEGORY_ICONS = Object.fromEntries(
  CATEGORY_META.map((c) => [c.value, c.emoji])
);

const SAVING_WALLET_TYPES = new Set(["savings", "emergency", "goals"]);
const SPENDING_WALLET_TYPES = new Set(["needs", "wants"]);

type WalletRow = {
  id: number;
  label: string;
  color: string;
  currentBalance: number;
  allocatedAmount: number;
  allocationPercent: number;
  walletType: string;
};

type Period = "today" | "week";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("today");
  const [search, setSearch] = useState("");

  const statsQuery = trpc.profile.getStats.useQuery();
  const txQuery = trpc.transactions.list.useQuery({
    limit: PAGINATION.dashboardTxLimit,
    offset: 0,
  });
  const goalsQuery = trpc.goals.list.useQuery({ limit: PAGINATION.dashboardGoalsLimit });
  const alertsQuery = trpc.transactions.budgetAlerts.useQuery();

  const todayKey = dateKey(new Date());
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const todayTxQuery = trpc.transactions.list.useQuery({
    limit: 100,
    offset: 0,
    fromDate: `${todayKey}T00:00:00.000Z`,
    toDate: `${todayKey}T23:59:59.999Z`,
  });

  const weekTxQuery = trpc.transactions.list.useQuery({
    limit: 200,
    offset: 0,
    fromDate: weekStart,
    toDate: new Date().toISOString(),
  });

  const [justUploadedTx, setJustUploadedTx] = useState(false);

  const todayStats = useMemo(() => {
    const txs = todayTxQuery.data?.transactions ?? [];
    const expenses = txs.filter((tx: { type: string }) => tx.type === "expense");
    return {
      count: txs.length,
      expenseTotal: expenses.reduce((s: number, tx: { amount: number }) => s + tx.amount, 0),
    };
  }, [todayTxQuery.data]);

  const weekExpenseTotal = useMemo(() => {
    const txs = weekTxQuery.data?.transactions ?? [];
    return txs
      .filter((tx: { type: string }) => tx.type === "expense")
      .reduce((s: number, tx: { amount: number }) => s + tx.amount, 0);
  }, [weekTxQuery.data]);

  useEffect(() => {
    const storageKey = `squirry-tx-count-${todayKey}`;
    const prev = parseInt(localStorage.getItem(storageKey) ?? "0", 10);
    if (todayStats.count > prev && todayStats.count > 0) {
      setJustUploadedTx(true);
      const timer = setTimeout(() => setJustUploadedTx(false), 10000);
      localStorage.setItem(storageKey, String(todayStats.count));
      return () => clearTimeout(timer);
    }
    if (todayStats.count !== prev) {
      localStorage.setItem(storageKey, String(todayStats.count));
    }
  }, [todayStats.count, todayKey]);

  if (statsQuery.isLoading) return <DashboardSkeleton />;

  const stats = statsQuery.data;
  const profile = stats?.profile;

  if (!statsQuery.isLoading && profile && !profile.onboardingComplete) {
    navigate("/onboard");
    return null;
  }
  if (!statsQuery.isLoading && !profile) {
    navigate("/onboard");
    return null;
  }

  const wallets = (stats?.wallets ?? []) as WalletRow[];
  const alerts = alertsQuery.data ?? [];
  const hasAlert = alerts.some((a) => a.isAlert);
  const mood = (hasAlert ? "worried" : stats?.mascotMood) ?? ("happy" as MascotMood);
  const spendingPercent = stats?.spendingPercent ?? 0;
  const xpToNext = stats?.xpToNextLevel ?? 500;
  const xpPoints = profile?.xpPoints ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.currentStreak ?? 0;
  const currency = profile?.currency ?? "RM";
  const safeToSpend = wallets.find((w) => w.walletType === "wants")?.currentBalance ?? 0;

  const savingWallets = wallets.filter((w) => SAVING_WALLET_TYPES.has(w.walletType));
  const spendingWallets = wallets.filter((w) => SPENDING_WALLET_TYPES.has(w.walletType));

  const savingPie = savingWallets.map((w) => ({
    name: w.label,
    value: Math.max(0, w.currentBalance),
    color: w.color,
    balance: w.currentBalance,
    budgetPercent: w.allocationPercent,
  }));

  const spendingPie = spendingWallets.map((w) => ({
    name: w.label,
    value: Math.max(0, w.currentBalance),
    color: w.color,
    balance: w.currentBalance,
    budgetPercent: w.allocationPercent,
  }));

  return (
    <AppLayout>
      <div className="bg-gradient-to-b from-[oklch(0.96_0.04_25)] to-background min-h-full pb-36">
        {/* Top bar: brand + search | date + streak */}
        <div className="px-4 pt-8 pb-2 flex items-start gap-3">
          <div className="flex flex-col gap-2 shrink-0 w-[4.5rem]">
            <div className="bg-white rounded-xl border border-border p-1.5 flex flex-col items-center shadow-sm">
              <SquirryMascot mood={mood} size={44} level={level} />
              <span className="text-[9px] font-display font-bold text-foreground mt-0.5">{BRAND_NAME}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1 max-w-[200px]">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && navigate("/activity")}
                  placeholder={t("common.search")}
                  className="h-8 pl-8 text-xs rounded-lg bg-white"
                />
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-bold text-muted-foreground tracking-wide">{t("dashboard.today")}</p>
                <p className="text-xs font-semibold text-foreground">{formatTodayHeader()}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <div className="flex items-center gap-1 bg-white rounded-full px-2.5 py-1 shadow-sm border border-border">
                <Flame size={14} className="text-primary" />
                <span className="font-bold text-xs">{streak}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/wealth")}
                className="w-8 h-8 bg-white rounded-full shadow-sm border border-border flex items-center justify-center"
                aria-label={t("alerts.title")}
              >
                <Bell size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Compact status */}
        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
          <MoodBadge mood={mood} />
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Zap size={10} /> {xpPoints} XP · Lv.{level}
          </span>
          <span className="text-[10px] text-primary font-semibold ml-auto">
            {t("dashboard.safe_to_spend")}: {formatCurrency(safeToSpend, currency)}
          </span>
        </div>

        {hasAlert && alerts.length > 0 && (
          <div className="px-4 mb-3">
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-800">
              {t("alerts.squirry_worried")} — {alerts.filter((a) => a.isAlert).map((a) => a.walletLabel).join(", ")}
            </div>
          </div>
        )}

        {/* Main focus: wealth allocations */}
        <div className="px-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-display text-foreground">{t("dashboard.wallet_allocations")}</h2>
            <div className="flex rounded-lg bg-muted p-0.5 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setPeriod("today")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  period === "today" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
                )}
              >
                {t("dashboard.period_today")}
              </button>
              <button
                type="button"
                onClick={() => setPeriod("week")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  period === "week" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
                )}
              >
                {t("dashboard.period_week")}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AllocationDonutCard
              title={t("dashboard.saving")}
              icon={<Coins size={16} className="text-[oklch(0.5_0.18_160)]" />}
              data={savingPie}
              currency={currency}
              t={t}
              accentClass="border-green-200 bg-[oklch(0.97_0.04_160)]"
            />
            <AllocationDonutCard
              title={t("dashboard.spending")}
              icon={<Wallet size={16} className="text-primary" />}
              data={spendingPie}
              currency={currency}
              t={t}
              accentClass="border-primary/30 bg-[oklch(0.97_0.04_25)]"
              footerNote={
                period === "week"
                  ? `${t("dashboard.period_week")}: ${formatCurrency(weekExpenseTotal, currency)} spent`
                  : undefined
              }
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">{t("dashboard.wallet_left_hint")}</p>
        </div>

        {/* Quick actions */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/activity")}
              className="bg-white rounded-2xl p-3 shadow-sm border border-border flex items-center gap-2 card-hover"
            >
              <div className="w-9 h-9 rounded-xl bg-[oklch(0.95_0.05_25)] flex items-center justify-center shrink-0">
                <Plus size={18} className="text-primary" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-foreground">{t("dashboard.add")}</p>
                <p className="text-[10px] text-muted-foreground truncate">{t("dashboard.transaction")}</p>
              </div>
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/activity?parse=1")}
              className="bg-white rounded-2xl p-3 shadow-sm border border-border flex items-center gap-2 card-hover"
            >
              <div className="w-9 h-9 rounded-xl bg-[oklch(0.95_0.05_295)] flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-[oklch(0.5_0.2_295)]" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-foreground">{t("dashboard.ai_parse")}</p>
                <p className="text-[10px] text-muted-foreground truncate">{t("dashboard.transactions")}</p>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Savings goals — below */}
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-foreground">{t("dashboard.savings_goals")}</h2>
            <button
              type="button"
              onClick={() => navigate("/goals")}
              className="text-xs text-primary font-semibold flex items-center gap-0.5"
            >
              {t("dashboard.view_all_goals")} <ChevronRight size={14} />
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-border p-3">
            {goalsQuery.isLoading ? (
              <Skeleton className="h-12 w-full rounded-xl" />
            ) : (goalsQuery.data ?? []).length === 0 ? (
              <button
                type="button"
                onClick={() => navigate("/goals")}
                className="w-full text-center text-xs text-muted-foreground py-2 hover:text-primary"
              >
                {t("dashboard.create_goal")} →
              </button>
            ) : (
              <div className="space-y-2">
                {(goalsQuery.data ?? []).map((goal) => {
                  const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold truncate">
                          {goal.emoji} {goal.name}
                        </span>
                        <span className="text-muted-foreground text-[10px] shrink-0 ml-2">
                          {currency}
                          {goal.currentAmount.toFixed(0)}/{currency}
                          {goal.targetAmount.toFixed(0)}
                        </span>
                      </div>
                      <Progress value={Math.min(100, pct)} className="h-1" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent activity — below */}
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-foreground">{t("dashboard.recent_activity")}</h2>
            <button
              type="button"
              onClick={() => navigate("/activity")}
              className="text-xs text-primary font-semibold flex items-center gap-0.5"
            >
              {t("dashboard.see_all")} <ChevronRight size={14} />
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            {txQuery.isLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-lg" />
                ))}
              </div>
            ) : txQuery.data?.transactions.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-xl mb-1">📭</p>
                <p className="text-xs text-muted-foreground">{t("dashboard.no_transactions")}</p>
                <Button size="sm" variant="outline" className="mt-2 rounded-xl h-8 text-xs" onClick={() => navigate("/activity")}>
                  {t("dashboard.add_first")}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {txQuery.data?.transactions.map((tx: NonNullable<typeof txQuery.data>["transactions"][0]) => (
                  <div key={tx.id} className="flex items-center gap-2.5 px-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm shrink-0">
                      {CATEGORY_ICONS[tx.category] ?? "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{tx.merchantName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.transactedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-bold shrink-0",
                        tx.type === "income" ? "text-[oklch(0.5_0.18_160)]" : "text-foreground"
                      )}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {currency}
                      {tx.amount.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SquirryNudgeBubble
        justUploadedTx={justUploadedTx}
        context={{
          userName: user?.name?.split(" ")[0] ?? "Friend",
          currency,
          todayExpenseTotal: todayStats.expenseTotal,
          todayTxCount: todayStats.count,
          spendingPercent,
          safeToSpend,
          monthlyIncome: profile?.monthlyIncome ?? 0,
          hasBudgetAlert: hasAlert,
          streak,
          hour: new Date().getHours(),
          justUploadedTx,
        }}
      />
    </AppLayout>
  );
}
