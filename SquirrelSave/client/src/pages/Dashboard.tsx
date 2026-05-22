import { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { AppLayout } from "@/components/AppLayout";
import { SquirryMascot, MoodBadge, type MascotMood } from "@/components/SquirryMascot";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Flame, Zap, ChevronRight, Plus, Bell, Sparkles, Wallet, Coins, Shield, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BUDGET, PAGINATION } from "@shared/config";
import { Progress } from "@/components/ui/progress";

const CATEGORY_ICONS: Record<string, string> = {
  food_beverage: "🍔", transport: "🚗", shopping: "🛍️",
  bills_utilities: "💡", entertainment: "🎮", health: "💊",
  education: "📚", savings: "💰", income: "💵", other: "📦",
};

const WALLET_ICONS: Record<string, React.ElementType> = {
  needs: Wallet, wants: Sparkles, savings: Coins, emergency: Shield, goals: Target,
};

function getTimeOfDay(t: (key: string) => string) {
  const hour = new Date().getHours();
  if (hour < 12) return t("dashboard.good_morning");
  if (hour < 18) return t("dashboard.good_afternoon");
  return t("dashboard.good_evening");
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const statsQuery = trpc.profile.getStats.useQuery();
  const txQuery = trpc.transactions.list.useQuery({
    limit: PAGINATION.dashboardTxLimit,
    offset: 0,
  });
  const goalsQuery = trpc.goals.list.useQuery({ limit: PAGINATION.dashboardGoalsLimit });
  const alertsQuery = trpc.transactions.budgetAlerts.useQuery();

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

  const wallets = stats?.wallets ?? [];
  const alerts = alertsQuery.data ?? [];
  const hasAlert = alerts.some((a) => a.isAlert);
  const mood = (hasAlert ? "worried" : stats?.mascotMood) ?? "happy" as MascotMood;
  const spendingPercent = stats?.spendingPercent ?? 0;
  const xpToNext = stats?.xpToNextLevel ?? 500;
  const xpPoints = profile?.xpPoints ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.currentStreak ?? 0;
  const currency = profile?.currency ?? "RM";

  const totalAllocated = wallets.reduce((s, w) => s + w.allocatedAmount, 0);
  const totalSpent = wallets.reduce((s, w) => s + (w.allocatedAmount - w.currentBalance), 0);
  const safeToSpend = wallets.find((w) => w.walletType === "wants")?.currentBalance ?? 0;

  const pieData = wallets.map((w) => ({
    name: w.label,
    value: w.allocatedAmount,
    color: w.color,
    spent: w.allocatedAmount - w.currentBalance,
  }));

  return (
    <AppLayout>
      <div className="bg-gradient-to-b from-[oklch(0.96_0.04_25)] to-background min-h-full">
        {/* Header */}
        <div className="px-4 pt-10 pb-2 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{getTimeOfDay(t)}</p>
            <h1 className="text-xl font-display text-foreground">{user?.name?.split(" ")[0] ?? "Friend"} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white rounded-full px-3 py-1.5 shadow-sm border border-border">
              <span className="flame-animate text-lg">🔥</span>
              <span className="font-bold text-sm text-foreground">{streak}</span>
            </div>
            <button
              onClick={() => navigate("/wealth")}
              className="w-9 h-9 bg-white rounded-full shadow-sm border border-border flex items-center justify-center"
              title={t("common.loading")}
            >
              <Bell size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Mascot + XP */}
        <div className="px-4 py-4 flex items-center gap-4">
          <div className="relative">
            <SquirryMascot mood={mood} size={90} level={level} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <MoodBadge mood={mood} />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Lv.{level}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={12} className="text-[oklch(0.78_0.18_85)]" />
              <span className="text-xs text-muted-foreground">{xpPoints} XP · {xpToNext} {t("common.next")}</span>
            </div>
            <div className="h-2.5 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full xp-bar-shimmer"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, ((xpPoints % 500) / 500) * 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {spendingPercent > 80 ? t("dashboard.budget_running_low") : spendingPercent > 60 ? t("dashboard.on_track") : t("dashboard.looking_great")}
            </p>
          </div>
        </div>

        {/* Budget Alerts */}
        {hasAlert && alerts.length > 0 && (
          <div className="px-4 mb-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-red-600" />
                <h3 className="font-semibold text-red-900 text-sm">{t("alerts.warning")}</h3>
              </div>
              {alerts.filter((a) => a.isAlert).map((alert) => (
                <div key={alert.walletId} className="text-sm text-red-800 bg-white rounded-lg p-2 border border-red-100">
                  <p className="font-medium">{alert.walletLabel}</p>
                  <p className="text-xs text-red-700 mt-1">
                    {t("alerts.spending")} {alert.spendingPercent}% {t("alerts.of_budget")}
                  </p>
                </div>
              ))}
              <p className="text-xs text-red-700 font-medium">{t("alerts.squirry_worried")}</p>
            </div>
          </div>
        )}

        {/* Swipeable Cards */}
        <div className="px-4 mb-4">
          <SwipeableDeck
            safeToSpend={safeToSpend}
            totalAllocated={totalAllocated}
            totalSpent={totalSpent}
            spendingPercent={spendingPercent}
            wallets={wallets}
            currency={currency}
            pieData={pieData}
            t={t}
          />
        </div>

        {/* Savings Goals */}
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">{t("dashboard.savings_goals")}</h2>
            <button onClick={() => navigate("/goals")} className="text-xs text-primary font-semibold flex items-center gap-0.5">
              {t("dashboard.view_all_goals")} <ChevronRight size={14} />
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
            {goalsQuery.isLoading ? (
              <Skeleton className="h-16 w-full rounded-xl" />
            ) : (goalsQuery.data ?? []).length === 0 ? (
              <button
                type="button"
                onClick={() => navigate("/goals")}
                className="w-full text-center text-sm text-muted-foreground py-2 hover:text-primary"
              >
                {t("dashboard.create_goal")} →
              </button>
            ) : (
              <div className="space-y-3">
                {(goalsQuery.data ?? []).map((goal) => {
                  const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold truncate">
                          {goal.emoji} {goal.name}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {currency}
                          {goal.currentAmount.toFixed(0)}/{currency}
                          {goal.targetAmount.toFixed(0)}
                        </span>
                      </div>
                      <Progress value={Math.min(100, pct)} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/activity")}
              className="bg-white rounded-2xl p-4 shadow-sm border border-border flex items-center gap-3 card-hover"
            >
              <div className="w-10 h-10 rounded-xl bg-[oklch(0.95_0.05_25)] flex items-center justify-center">
                <Plus size={20} className="text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">{t("dashboard.add")}</p>
                <p className="text-xs text-muted-foreground">{t("dashboard.transaction")}</p>
              </div>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/activity?parse=1")}
              className="bg-white rounded-2xl p-4 shadow-sm border border-border flex items-center gap-3 card-hover"
            >
              <div className="w-10 h-10 rounded-xl bg-[oklch(0.95_0.05_295)] flex items-center justify-center">
                <Sparkles size={20} className="text-[oklch(0.5_0.2_295)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">{t("dashboard.ai_parse")}</p>
                <p className="text-xs text-muted-foreground">{t("dashboard.transactions")}</p>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">{t("dashboard.recent_activity")}</h2>
            <button onClick={() => navigate("/activity")} className="text-xs text-primary font-semibold flex items-center gap-0.5">
              {t("dashboard.see_all")} <ChevronRight size={14} />
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            {txQuery.isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
              </div>
            ) : txQuery.data?.transactions.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-2xl mb-2">📭</p>
                <p className="text-sm text-muted-foreground">{t("dashboard.no_transactions")}</p>
                <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={() => navigate("/activity")}>
                  {t("dashboard.add_first")}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {txQuery.data?.transactions.map((tx: NonNullable<typeof txQuery.data>["transactions"][0]) => (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-base">
                      {CATEGORY_ICONS[tx.category] ?? "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{tx.merchantName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.transactedAt).toLocaleDateString()}</p>
                    </div>
                    <span className={cn("text-sm font-bold", tx.type === "income" ? "text-[oklch(0.5_0.18_160)]" : "text-foreground")}>
                      {tx.type === "income" ? "+" : "-"}{currency}{tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

const CARDS = ["safe_to_spend", "wallet_chart", "ai_insights"] as const;
type CardType = typeof CARDS[number];

function SwipeableDeck({ safeToSpend, totalAllocated, totalSpent, spendingPercent, wallets, currency, pieData, t }: any) {
  const [activeIdx, setActiveIdx] = useState(0);

  function handleDragEnd(_: any, info: PanInfo) {
    if (info.offset.x < -50 && activeIdx < CARDS.length - 1) setActiveIdx((i) => i + 1);
    if (info.offset.x > 50 && activeIdx > 0) setActiveIdx((i) => i - 1);
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIdx}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="cursor-grab active:cursor-grabbing"
          >
            {activeIdx === 0 && <SafeToSpendCard safeToSpend={safeToSpend} totalAllocated={totalAllocated} totalSpent={totalSpent} spendingPercent={spendingPercent} currency={currency} t={t} />}
            {activeIdx === 1 && <WalletChartCard wallets={wallets} pieData={pieData} currency={currency} t={t} />}
            {activeIdx === 2 && <AIInsightsCard spendingPercent={spendingPercent} wallets={wallets} currency={currency} t={t} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-1.5 mt-3">
        {CARDS.map((_, i) => (
          <button key={i} onClick={() => setActiveIdx(i)}>
            <motion.div
              animate={{ width: i === activeIdx ? 20 : 6, backgroundColor: i === activeIdx ? "oklch(0.65 0.22 25)" : "oklch(0.85 0.03 60)" }}
              className="h-1.5 rounded-full"
              transition={{ duration: 0.2 }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function SafeToSpendCard({ safeToSpend, totalAllocated, totalSpent, spendingPercent, currency, t }: any) {
  return (
    <div className="bg-coral-gradient rounded-2xl p-5 text-white shadow-lg min-h-[160px]">
      <p className="text-white/80 text-sm font-medium mb-1">{t("dashboard.safe_to_spend")}</p>
      <p className="text-4xl font-display mb-3">{currency}{safeToSpend.toFixed(2)}</p>
      <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full bg-white rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, spendingPercent)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between text-xs text-white/70">
        <span>{t("dashboard.spent")}{currency}{totalSpent.toFixed(2)}</span>
        <span>{t("dashboard.budget")}{currency}{totalAllocated.toFixed(2)}</span>
      </div>
      <p className="text-xs text-white/60 mt-1">{t("dashboard.swipe")}</p>
    </div>
  );
}

function WalletChartCard({ wallets, pieData, currency, t }: any) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-border min-h-[160px]">
      <p className="text-sm font-bold text-foreground mb-3">{t("dashboard.wallet_allocations")}</p>
      <div className="flex items-center gap-4">
        <div className="w-28 h-28 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={52} paddingAngle={2} dataKey="value" stroke="none">
                {pieData.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => `${currency}${Number(v).toFixed(0)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {wallets.slice(0, 4).map((w: any) => {
            const Icon = WALLET_ICONS[w.walletType] ?? Wallet;
            const pct = w.allocatedAmount > 0 ? ((w.currentBalance / w.allocatedAmount) * 100).toFixed(0) : 0;
            return (
              <div key={w.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: w.color }} />
                <span className="text-xs text-foreground flex-1">{w.label}</span>
                <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AIInsightsCard({ spendingPercent, wallets, currency, t }: any) {
  const topWallet = wallets.reduce((max: any, w: any) => (!max || w.allocatedAmount - w.currentBalance > max.allocatedAmount - max.currentBalance ? w : max), null);
  const spent = topWallet ? (topWallet.allocatedAmount - topWallet.currentBalance).toFixed(0) : 0;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-border min-h-[160px]">
      <p className="text-sm font-bold text-foreground mb-3">{t("dashboard.ai_insights")}</p>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          💡 {spendingPercent >= BUDGET.dashboardAlertPercent ? t("dashboard.budget_running_low") : spendingPercent >= BUDGET.dashboardWarningPercent ? t("dashboard.on_track") : t("dashboard.looking_great")}
        </p>
        <p className="text-xs text-muted-foreground">
          🎯 Your biggest spending category is <strong>{topWallet?.label}</strong> at {currency}{spent}.
        </p>
        <p className="text-xs text-muted-foreground">
          🔥 Keep up your streak! Log a transaction today to earn XP.
        </p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <AppLayout>
      <div className="px-4 pt-10 pb-4 space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </AppLayout>
  );
}
