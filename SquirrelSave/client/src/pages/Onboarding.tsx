import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SquirryMascot } from "@/components/SquirryMascot";
import { useTranslation } from "@/hooks/useTranslation";
import { trpc } from "@/lib/trpc";
import { apiClient } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Wallet, Coins, Shield, Sparkles, RotateCcw } from "lucide-react";
import {
  DEFAULT_WALLET_ALLOCATIONS,
  DEFAULTS,
  RECOMMENDED_SPLIT,
  type WalletType,
} from "@shared/config";
import { cn } from "@/lib/utils";

const WALLET_ICONS = { needs: Wallet, wants: Sparkles, savings: Coins, emergency: Shield, goals: Coins } as const;

type WalletAllocation = {
  type: WalletType;
  labelKey: string;
  icon: typeof Wallet;
  color: string;
  descKey: string;
  defaultPct: number;
  percent: number;
};

function buildInitialAllocations(): WalletAllocation[] {
  return DEFAULT_WALLET_ALLOCATIONS.map((w) => ({
    type: w.type,
    labelKey: w.labelKey,
    icon: WALLET_ICONS[w.type] ?? Wallet,
    color: w.color,
    descKey: "onboard.allocations_desc",
    defaultPct: w.defaultPercent,
    percent: w.defaultPercent,
  }));
}

function isRecommendedSplit(allocations: WalletAllocation[]): boolean {
  return (
    allocations.find((a) => a.type === "needs")?.percent === RECOMMENDED_SPLIT.needs &&
    allocations.find((a) => a.type === "wants")?.percent === RECOMMENDED_SPLIT.wants &&
    allocations.find((a) => a.type === "savings")?.percent === RECOMMENDED_SPLIT.savings &&
    (allocations.find((a) => a.type === "emergency")?.percent ?? 0) === RECOMMENDED_SPLIT.emergency
  );
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState("");
  const [currency, setCurrency] = useState(DEFAULTS.currency);
  const [allocations, setAllocations] = useState(buildInitialAllocations);

  // Ref to prevent the redirect useEffect from firing during handleFinish
  const isSubmittingRef = useRef(false);

  const queryClient = useQueryClient();
  const profileQuery = trpc.profile.get.useQuery();
  const setupProfile = trpc.profile.setup.useMutation();
  const setupWallets = trpc.wallets.setup.useMutation();
  const completeOnboarding = trpc.profile.completeOnboarding.useMutation();

  useEffect(() => {
    // Don't redirect if we're in the middle of submitting — handleFinish
    // will navigate on its own after properly seeding the cache.
    if (isSubmittingRef.current) return;
    if (profileQuery.isSuccess && profileQuery.data?.onboardingComplete) {
      navigate("/dashboard");
    }
  }, [profileQuery.isSuccess, profileQuery.data?.onboardingComplete, navigate]);

  const totalPercent = allocations.reduce((s, a) => s + a.percent, 0);
  const incomeNum = parseFloat(income) || 0;
  const usingRecommended = useMemo(() => isRecommendedSplit(allocations), [allocations]);

  const primaryWallets = allocations.filter((a) => a.type !== "emergency");
  const optionalWallets = allocations.filter((a) => a.type === "emergency");

  function updateAllocation(type: WalletType, val: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    setAllocations((prev) =>
      prev.map((a) => (a.type === type ? { ...a, percent: clamped } : a))
    );
  }

  function applyRecommended() {
    setAllocations((prev) =>
      prev.map((a) => ({
        ...a,
        percent: RECOMMENDED_SPLIT[a.type as keyof typeof RECOMMENDED_SPLIT] ?? a.defaultPct,
      }))
    );
  }

  async function handleFinish() {
    if (!incomeNum) {
      toast.error(t("common.error"));
      return;
    }
    if (totalPercent !== 100) {
      toast.error(t("onboard.over_100"));
      return;
    }

    // Block the useEffect redirect while we're finishing up
    isSubmittingRef.current = true;

    try {
      await setupProfile.mutateAsync({ monthlyIncome: incomeNum, currency });
      await setupWallets.mutateAsync({
        monthlyIncome: incomeNum,
        allocations: allocations
          .filter((a) => a.percent > 0)
          .map((a) => ({
            walletType: a.type,
            label: t(a.labelKey),
            allocationPercent: a.percent,
            color: a.color,
          })),
      });
      await completeOnboarding.mutateAsync();

      // Fetch fresh data from the server to seed the cache
      const [profile, stats] = await Promise.all([
        apiClient.profile.get(),
        apiClient.profile.getStats(),
      ]);

      if (!stats?.profile?.onboardingComplete) {
        throw new Error("Onboarding could not be saved. Check that the API is running.");
      }

      // Seed the react-query cache so Dashboard doesn't refetch stale data
      queryClient.setQueryData(["profile", "get"], profile);
      queryClient.setQueryData(["profile", "stats"], stats);

      // Invalidate all related queries so Dashboard shows fresh data
      // (without refetching — the setQueryData above is already fresh)
      await queryClient.invalidateQueries({
        queryKey: ["wallets"],
        refetchType: "none",
      });
      await queryClient.invalidateQueries({
        queryKey: ["transactions"],
        refetchType: "none",
      });
      await queryClient.invalidateQueries({
        queryKey: ["goals"],
        refetchType: "none",
      });

      toast.success(t("common.success"));
      navigate("/dashboard");
    } catch (err) {
      isSubmittingRef.current = false;
      console.error("[Onboarding]", err);
      const message = err instanceof Error ? err.message : t("common.error");
      toast.error(message || t("common.error"));
    }
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  const [direction, setDirection] = useState(1);

  function goNext() {
    setDirection(1);
    setStep((s) => s + 1);
  }
  function goPrev() {
    setDirection(-1);
    setStep((s) => s - 1);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[oklch(0.97_0.04_25)] via-background to-background flex flex-col">
      <div className="h-1 bg-border mt-0">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: `${((step + 1) / 4) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <motion.div
              key="welcome"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full text-center"
            >
              <motion.div className="flex justify-center mb-6">
                <SquirryMascot mood="celebrating" size={140} />
              </motion.div>
              <h1 className="text-3xl font-display text-foreground mb-3">{t("onboard.welcome")}</h1>
              <p className="text-muted-foreground mb-8">{t("onboard.welcome_desc")}</p>
              <Button onClick={goNext} className="w-full h-12 rounded-xl text-base font-bold bg-coral-gradient">
                {t("onboard.lets_go")}
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="income"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <h1 className="text-2xl font-display text-foreground mb-2 text-center">{t("onboard.income")}</h1>
              <p className="text-sm text-muted-foreground text-center mb-6">{t("onboard.income_desc")}</p>

              <div className="space-y-4 mb-6">
                <div>
                  <Label className="text-sm font-semibold">{t("onboard.currency")}</Label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full mt-2 px-4 py-2.5 border border-border rounded-xl bg-background text-foreground"
                  >
                    <option>RM</option>
                    <option>SGD</option>
                    <option>USD</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-semibold">{t("onboard.monthly_income")}</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder={DEFAULTS.defaultIncomePlaceholder}
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    className="mt-2 h-12 rounded-xl text-lg font-semibold"
                  />
                </div>

                {incomeNum > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[oklch(0.96_0.05_85)] border border-[oklch(0.88_0.06_85)] p-4 rounded-xl"
                  >
                    <p className="text-xs font-semibold text-foreground mb-1">
                      📊 {t("onboard.recommended_allocation")}
                    </p>
                    <p className="text-[11px] text-muted-foreground mb-3">{t("onboard.recommended_preview_note")}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {(
                        [
                          { type: "needs" as const, pct: RECOMMENDED_SPLIT.needs },
                          { type: "wants" as const, pct: RECOMMENDED_SPLIT.wants },
                          { type: "savings" as const, pct: RECOMMENDED_SPLIT.savings },
                        ] as const
                      ).map(({ type, pct }) => (
                        <div key={type} className="text-center bg-white/60 rounded-lg py-2 px-1">
                          <p className="font-bold text-foreground">
                            {currency} {((incomeNum * pct) / 100).toFixed(0)}
                          </p>
                          <p className="text-muted-foreground">{t(`wallet.${type}`)}</p>
                          <p className="text-[10px] text-primary font-semibold">{pct}%</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={goPrev} variant="outline" className="flex-1 h-12 rounded-xl">
                  <ChevronLeft size={18} />
                </Button>
                <Button
                  onClick={goNext}
                  disabled={!incomeNum}
                  className="flex-1 h-12 rounded-xl bg-coral-gradient text-white font-bold"
                >
                  {t("onboard.continue")}
                  <ChevronRight size={18} />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="allocations"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <h1 className="text-2xl font-display text-foreground mb-2 text-center">{t("onboard.allocations")}</h1>
              <p className="text-sm text-muted-foreground text-center mb-4">{t("onboard.custom_allocation_hint")}</p>

              <div className="flex items-center justify-between gap-2 mb-4 p-3 rounded-xl bg-[oklch(0.96_0.05_85)] border border-[oklch(0.88_0.06_85)]">
                <div>
                  <p className="text-xs font-bold text-foreground">{t("onboard.recommended_allocation")}</p>
                  <p className="text-[10px] text-muted-foreground">50% · 30% · 20%</p>
                </div>
                <Button
                  type="button"
                  variant={usingRecommended ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-lg h-8 text-xs shrink-0"
                  onClick={applyRecommended}
                >
                  <RotateCcw size={12} className="mr-1" />
                  {t("onboard.use_recommended")}
                </Button>
              </div>

              <div className="space-y-5 mb-4 max-h-[45vh] overflow-y-auto pr-1">
                {primaryWallets.map((wallet) => (
                  <AllocationRow
                    key={wallet.type}
                    wallet={wallet}
                    currency={currency}
                    incomeNum={incomeNum}
                    t={t}
                    onChange={(val) => updateAllocation(wallet.type, val)}
                  />
                ))}

                {optionalWallets.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-border">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-3">
                      {t("onboard.optional_wallets")}
                    </p>
                    {optionalWallets.map((wallet) => (
                      <AllocationRow
                        key={wallet.type}
                        wallet={wallet}
                        currency={currency}
                        incomeNum={incomeNum}
                        t={t}
                        onChange={(val) => updateAllocation(wallet.type, val)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <motion.div
                className={cn(
                  "p-4 rounded-xl mb-4 text-center text-sm font-semibold",
                  totalPercent === 100
                    ? "bg-[oklch(0.96_0.08_160)] text-[oklch(0.4_0.15_160)]"
                    : "bg-[oklch(0.96_0.08_25)] text-[oklch(0.5_0.18_25)]"
                )}
              >
                {totalPercent === 100
                  ? t("onboard.perfect")
                  : `${totalPercent}% — ${
                      totalPercent > 100 ? t("onboard.over_100") : `${100 - totalPercent}% ${t("onboard.remaining")}`
                    }`}
              </motion.div>

              <div className="flex gap-3">
                <Button onClick={goPrev} variant="outline" className="flex-1 h-12 rounded-xl">
                  <ChevronLeft size={18} />
                </Button>
                <Button
                  onClick={goNext}
                  disabled={totalPercent !== 100}
                  className="flex-1 h-12 rounded-xl bg-coral-gradient text-white font-bold"
                >
                  {t("onboard.continue")}
                  <ChevronRight size={18} />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="meet"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full text-center"
            >
              <motion.div className="flex justify-center mb-6">
                <SquirryMascot mood="happy" size={140} />
              </motion.div>
              <h1 className="text-2xl font-display text-foreground mb-3">{t("onboard.meet_squirry")}</h1>
              <p className="text-sm text-muted-foreground mb-6">{t("onboard.summary")}</p>

              <div className="bg-white rounded-2xl p-4 mb-6 space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("onboard.monthly_income_label")}</span>
                  <span className="text-sm font-bold text-foreground">
                    {currency} {incomeNum.toFixed(0)}
                  </span>
                </div>
                {allocations
                  .filter((w) => w.percent > 0)
                  .map((w) => (
                    <div key={w.type} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t(w.labelKey)}</span>
                      <span className="text-sm font-bold text-foreground">
                        {w.percent}% ({currency} {((incomeNum * w.percent) / 100).toFixed(0)})
                      </span>
                    </div>
                  ))}
                {!usingRecommended && (
                  <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border">
                    ✓ {t("onboard.custom_split_saved")}
                  </p>
                )}
              </div>

              <div className="bg-[oklch(0.96_0.05_25)] rounded-2xl p-4 mb-6">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t("onboard.squirry_says")}</p>
                <p className="text-sm text-foreground">{t("onboard.squirry_quote")}</p>
              </div>

              <div className="flex gap-3">
                <Button onClick={goPrev} variant="outline" className="flex-1 h-12 rounded-xl">
                  <ChevronLeft size={18} />
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={setupProfile.isPending || setupWallets.isPending || completeOnboarding.isPending}
                  className="flex-1 h-12 rounded-xl bg-coral-gradient text-white font-bold"
                >
                  {setupProfile.isPending ? t("common.loading") : t("onboard.lets_go")}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AllocationRow({
  wallet,
  currency,
  incomeNum,
  t,
  onChange,
}: {
  wallet: WalletAllocation;
  currency: string;
  incomeNum: number;
  t: (key: string) => string;
  onChange: (percent: number) => void;
}) {
  const Icon = wallet.icon;
  const amount = incomeNum > 0 ? ((incomeNum * wallet.percent) / 100).toFixed(0) : "—";
  const isDefault =
    wallet.percent === (RECOMMENDED_SPLIT[wallet.type as keyof typeof RECOMMENDED_SPLIT] ?? wallet.defaultPct);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: wallet.color }}
          >
            <Icon size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-foreground block truncate">{t(wallet.labelKey)}</span>
            {incomeNum > 0 && (
              <span className="text-xs text-muted-foreground">
                {currency} {amount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Label htmlFor={`pct-${wallet.type}`} className="sr-only">
            {t("onboard.your_percent")}
          </Label>
          <Input
            id={`pct-${wallet.type}`}
            type="number"
            min={0}
            max={100}
            value={wallet.percent}
            onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
            className="w-14 h-9 rounded-lg text-center text-sm font-bold px-1"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>
      <Slider
        value={[wallet.percent]}
        onValueChange={(val) => onChange(val[0])}
        min={0}
        max={100}
        step={1}
        className="w-full"
      />
      {isDefault && wallet.type !== "emergency" && (
        <p className="text-[10px] text-primary/80 font-medium">{t("onboard.recommended_allocation")}</p>
      )}
    </div>
  );
}
