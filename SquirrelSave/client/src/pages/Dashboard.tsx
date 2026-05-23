import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { SquirryNudgeBubble } from "@/components/SquirryNudgeBubble";
import { dateKey } from "@shared/budgetPlanner";
import { AppLayout } from "@/components/AppLayout";
import { type MascotMood } from "@/components/SquirryMascot";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";
import {
  daysLeftInMonth,
  formatBudgetMonth,
  monthDateRange,
  safeToSpendDaily,
  savingsContributionsFromTransactions,
  walletSavedTowardGoal,
  walletSpent,
} from "@/lib/budgetCycle";
import { MonthlyIncomeCard } from "@/components/dashboard/MonthlyIncomeCard";
import { ProgressDonutCard } from "@/components/dashboard/ProgressDonutCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardGamificationBar } from "@/components/dashboard/DashboardGamificationBar";
import { SafeToSpendCard } from "@/components/dashboard/SafeToSpendCard";
import { contextMessageKeys, loadSpendingContext } from "@/lib/contextEngine";
import type { SquirryContextInsight } from "@/components/SquirryNudgeBubble";
import { LogTransactionFab } from "@/components/dashboard/LogTransactionFab";
import { CATEGORY_META } from "@shared/config";
import { ChevronRight, Bell, Coins, Wallet, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGINATION } from "@shared/config";
import { Progress } from "@/components/ui/progress";

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

function sumWallets(wallets: WalletRow[], types: Set<string>, pick: (w: WalletRow) => number) {
  return wallets.filter((w) => types.has(w.walletType)).reduce((s, w) => s + pick(w), 0);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const monthRange = useMemo(() => monthDateRange(), []);
  const todayKey = dateKey(new Date());

  const statsQuery = trpc.profile.getStats.useQuery();
  const todayTxQuery = trpc.transactions.list.useQuery({
    limit: 100,
    offset: 0,
    fromDate: `${todayKey}T00:00:00.000Z`,
    toDate: `${todayKey}T23:59:59.999Z`,
  });
  const monthIncomeTxQuery = trpc.transactions.list.useQuery({
    limit: 200,
    offset: 0,
    fromDate: monthRange.from,
    toDate: monthRange.to,
  });
  const txQuery = trpc.transactions.list.useQuery({
    limit: PAGINATION.dashboardTxLimit,
    offset: 0,
  });
  const goalsQuery = trpc.goals.list.useQuery({ limit: PAGINATION.dashboardGoalsLimit });
  const alertsQuery = trpc.transactions.budgetAlerts.useQuery();

  const recentTransactions = txQuery.data?.transactions ?? [];
  const [justUploadedTx, setJustUploadedTx] = useState(false);

  const todayStats = useMemo(() => {
    const txs = todayTxQuery.data?.transactions ?? [];
    const expenses = txs.filter((tx: { type: string }) => tx.type === "expense");
    return {
      count: txs.length,
      expenseTotal: expenses.reduce((s: number, tx: { amount: number }) => s + tx.amount, 0),
    };
  }, [todayTxQuery.data]);

  useEffect(() => {
    const storageKey = `squirry-tx-count-${todayKey}`;
    const prev = parseInt(sessionStorage.getItem(storageKey) ?? "0", 10);
    if (todayStats.count > prev && todayStats.count > 0) {
      setJustUploadedTx(true);
      const timer = setTimeout(() => setJustUploadedTx(false), 10000);
      sessionStorage.setItem(storageKey, String(todayStats.count));
      return () => clearTimeout(timer);
    }
    if (todayStats.count !== prev) {
      sessionStorage.setItem(storageKey, String(todayStats.count));
    }
  }, [todayStats.count, todayKey]);

  const monthTransactions = monthIncomeTxQuery.data?.transactions ?? [];

  const incomeReceivedThisMonth = useMemo(() => {
    return monthTransactions
      .filter((tx: { type: string }) => tx.type === "income")
      .reduce((s: number, tx: { amount: number }) => s + tx.amount, 0);
  }, [monthTransactions]);

  const savingsSavedFromTx = useMemo(
    () => savingsContributionsFromTransactions(monthTransactions),
    [monthTransactions]
  );

  const monthLabel = formatBudgetMonth(new Date(), language === "bm" ? "ms-MY" : "en-MY");

  const stats = statsQuery.data;
  const profile = stats?.profile;
  const needsOnboarding =
    !statsQuery.isLoading &&
    statsQuery.isSuccess &&
    (!profile || !profile.onboardingComplete);

  useEffect(() => {
    if (needsOnboarding) navigate("/onboard");
  }, [needsOnboarding, navigate]);

  const walletsForHooks = (stats?.wallets ?? []) as WalletRow[];
  const spendingRemainingForHooks = useMemo(
    () => sumWallets(walletsForHooks, SPENDING_WALLET_TYPES, (w) => w.currentBalance),
    [stats?.wallets]
  );
  const safeToSpendToday = useMemo(
    () => safeToSpendDaily(spendingRemainingForHooks),
    [spendingRemainingForHooks]
  );

  const contextQuery = useQuery({
    queryKey: ["spending-context", Math.round(safeToSpendToday * 100)],
    queryFn: () => loadSpendingContext(safeToSpendToday),
    enabled: !statsQuery.isLoading && !needsOnboarding && safeToSpendToday > 0,
    staleTime: 15 * 60 * 1000,
  });

  if (statsQuery.isLoading) return <DashboardSkeleton />;
  if (needsOnboarding) return null;

  const wallets = walletsForHooks;
  const alerts = alertsQuery.data ?? [];
  const hasAlert = alerts.some((a) => a.isAlert);
  const mood: MascotMood = hasAlert
    ? "worried"
    : (["happy", "worried", "alert", "celebrating", "sleeping"] as const).includes(
          stats?.mascotMood as MascotMood
        )
      ? (stats!.mascotMood as MascotMood)
      : "happy";
  const xpToNext = stats?.xpToNextLevel ?? 500;
  const xpPoints = profile?.xpPoints ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.currentStreak ?? 0;
  const currency = profile?.currency ?? "RM";
  const monthlyIncome = profile?.monthlyIncome ?? 0;
  const spendingPercent = stats?.spendingPercent ?? 0;
  const userName =
    typeof user?.name === "string" ? user.name.split(" ")[0] : "Friend";

  const savingWallets = wallets.filter((w) => SAVING_WALLET_TYPES.has(w.walletType));

  const savingsGoal = sumWallets(wallets, SAVING_WALLET_TYPES, (w) => w.allocatedAmount);
  const savingsSavedFromWallets = sumWallets(wallets, SAVING_WALLET_TYPES, (w) =>
    walletSavedTowardGoal(w.allocatedAmount, w.currentBalance)
  );
  const savingsSaved = Math.min(
    savingsGoal,
    Math.max(savingsSavedFromWallets, savingsSavedFromTx)
  );

  const spendingLimit = sumWallets(wallets, SPENDING_WALLET_TYPES, (w) => w.allocatedAmount);
  const spendingSpent = sumWallets(wallets, SPENDING_WALLET_TYPES, (w) =>
    walletSpent(w.allocatedAmount, w.currentBalance)
  );
  const spendingRemaining = spendingRemainingForHooks;

  const daysLeft = daysLeftInMonth();
  const daysLeftLabel = t("dashboard.days_left_cycle").replace("{{days}}", String(daysLeft));

  const spendingCtx = contextQuery.data;
  const displaySafeToday = spendingCtx?.adjustedSafeDaily ?? safeToSpendToday;
  const ctxKeys = spendingCtx ? contextMessageKeys(spendingCtx) : null;
  const ctxMessage = ctxKeys
    ? t(ctxKeys.messageKey)
        .replace("{{campus}}", String(ctxKeys.params.campus ?? ""))
        .replace("{{surge}}", String(ctxKeys.params.surge ?? ""))
        .replace("{{runway}}", String(ctxKeys.params.runway ?? ""))
        .replace("{{days}}", String(ctxKeys.params.days ?? ""))
        .replace("{{label}}", String(ctxKeys.params.label ?? ""))
        .replace("{{percent}}", String(ctxKeys.params.percent ?? ""))
    : null;

  const contextInsight: SquirryContextInsight | undefined = spendingCtx
    ? {
        message: ctxMessage,
        kind: spendingCtx.weather?.isRaining
          ? "rain"
          : spendingCtx.exam?.active
            ? "exam"
            : spendingCtx.exam
              ? "exam_soon"
              : undefined,
        showAdjustedNote:
          spendingCtx.adjustedSafeDaily < spendingCtx.baseSafeDaily - 0.5,
      }
    : undefined;

  const streakTitle = t("dashboard.streak_finance_hint");

  return (
    <AppLayout>
      <div className="min-h-full pb-44 max-w-lg mx-auto w-full bg-[oklch(0.98_0.015_25)]">
        <div className="flex items-center justify-end px-4 pt-2">
          <button
            type="button"
            onClick={() => navigate("/wealth")}
            className="w-9 h-9 rounded-full bg-white border border-border/80 shadow-sm flex items-center justify-center"
            aria-label={t("alerts.title")}
          >
            <Bell size={16} className="text-muted-foreground" />
          </button>
        </div>

        <DashboardGamificationBar
          mood={mood}
          level={level}
          xpPoints={xpPoints}
          xpToNext={xpToNext}
          streak={streak}
          assistantLabel={t("dashboard.ai_assistant")}
          streakTitle={streakTitle}
        />

        <SafeToSpendCard
          amount={displaySafeToday}
          baseAmount={
            spendingCtx && spendingCtx.adjustedSafeDaily < spendingCtx.baseSafeDaily - 0.5
              ? spendingCtx.baseSafeDaily
              : undefined
          }
          currency={currency}
          label={t("dashboard.safe_to_spend")}
          daysLeft={daysLeft}
          daysLeftLabel={daysLeftLabel}
        />

        {monthlyIncome > 0 && (
          <MonthlyIncomeCard
            monthLabel={monthLabel}
            salary={monthlyIncome}
            currency={currency}
            title={t("dashboard.monthly_salary")}
            hint={t("dashboard.monthly_salary_hint")}
            receivedLabel={t("dashboard.income_received_month")}
            receivedAmount={incomeReceivedThisMonth}
            editLabel={t("dashboard.edit_income")}
            onEdit={() => navigate("/wealth")}
          />
        )}

        {hasAlert && alerts.length > 0 && (
          <div className="mx-4 mt-4 flex gap-2.5 rounded-2xl bg-red-50/90 border border-red-200/70 px-3 py-2.5 text-xs text-red-900">
            <AlertTriangle size={16} className="shrink-0 text-red-600 mt-0.5" />
            <p>
              <span className="font-semibold">{t("alerts.squirry_worried")}</span>
              {" — "}
              {alerts.filter((a) => a.isAlert).map((a) => a.walletLabel).join(", ")}
            </p>
          </div>
        )}

        <section className="px-4 mt-6">
          <h2 className="text-sm font-bold text-foreground mb-3">{t("dashboard.budget_health")}</h2>

          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 items-stretch">
            <ProgressDonutCard
              title={t("dashboard.saving")}
              icon={<Coins size={16} className="text-[oklch(0.5_0.18_160)]" />}
              current={savingsSaved}
              goal={savingsGoal}
              currency={currency}
              subtitle={t("dashboard.saved_label")}
              progressColor={savingWallets[0]?.color ?? "oklch(0.55 0.18 160)"}
              accentClass="border-green-200/70 bg-[oklch(0.97_0.03_160)]"
            />
            <ProgressDonutCard
              title={t("dashboard.spending")}
              icon={<Wallet size={16} className="text-[oklch(0.55_0.18_25)]" />}
              current={spendingSpent}
              goal={spendingLimit}
              currency={currency}
              subtitle={t("dashboard.spent_label")}
              progressColor="oklch(0.58 0.2 25)"
              accentClass="border-red-200/60 bg-[oklch(0.97_0.03_25)]"
            />
          </div>
        </section>

        <section className="px-4 mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-foreground">{t("dashboard.savings_goals")}</h2>
            <button
              type="button"
              onClick={() => navigate("/goals")}
              className="text-xs text-primary font-semibold flex items-center gap-0.5 min-h-[44px] px-1 -mr-1"
            >
              {t("dashboard.view_all_goals")} <ChevronRight size={14} />
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-border/80 p-4">
            {goalsQuery.isLoading ? (
              <Skeleton className="h-14 w-full rounded-xl" />
            ) : (goalsQuery.data ?? []).length === 0 ? (
              <button
                type="button"
                onClick={() => navigate("/goals")}
                className="w-full text-center text-sm text-muted-foreground py-3 hover:text-primary font-medium"
              >
                {t("dashboard.create_goal")} →
              </button>
            ) : (
              <div className="space-y-3">
                {(goalsQuery.data ?? []).map((goal) => {
                  const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between gap-2 text-xs mb-1.5">
                        <span className="font-semibold truncate">
                          {goal.emoji} {goal.name}
                        </span>
                        <span className="text-muted-foreground text-[10px] shrink-0 tabular-nums">
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
        </section>

        <section className="px-4 mt-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-foreground">{t("dashboard.recent_activity")}</h2>
            <button
              type="button"
              onClick={() => navigate("/activity")}
              className="text-xs text-primary font-semibold flex items-center gap-0.5 min-h-[44px] px-1 -mr-1"
            >
              {t("dashboard.see_all")} <ChevronRight size={14} />
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-border/80 overflow-hidden">
            {txQuery.isLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm text-muted-foreground">{t("dashboard.no_transactions")}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 rounded-xl h-10 text-xs px-6"
                  onClick={() => navigate("/activity")}
                >
                  {t("dashboard.add_first")}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/80">
                {recentTransactions.slice(0, 5).map((tx) => (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => navigate("/activity")}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-muted/40 transition-colors min-h-[56px]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted/80 flex items-center justify-center text-base shrink-0">
                      {CATEGORY_ICONS[tx.category] ?? "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{tx.merchantName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {tx.transactedAt
                          ? new Date(tx.transactedAt).toLocaleDateString("en-MY", {
                              day: "numeric",
                              month: "short",
                            })
                          : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-bold shrink-0 tabular-nums",
                        tx.type === "income" ? "text-[oklch(0.5_0.18_160)]" : "text-foreground"
                      )}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {currency}
                      {tx.amount.toFixed(0)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <LogTransactionFab label={t("dashboard.log_transaction")} onClick={() => navigate("/activity")} />

      <SquirryNudgeBubble
        variant="dashboard"
        justUploadedTx={justUploadedTx}
        contextInsight={contextInsight}
        context={{
          userName,
          currency,
          todayExpenseTotal: todayStats.expenseTotal,
          todayTxCount: todayStats.count,
          spendingPercent,
          safeToSpend: displaySafeToday,
          monthlyIncome,
          hasBudgetAlert: hasAlert,
          streak,
          hour: new Date().getHours(),
          justUploadedTx,
        }}
      />
    </AppLayout>
  );
}
