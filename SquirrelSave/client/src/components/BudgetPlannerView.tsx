import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { SquirryMascot } from "@/components/SquirryMascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeeklyCalendarRibbon } from "@/components/wealth/WeeklyCalendarRibbon";
import {
  BUDGET_PLANNER_CATEGORIES,
  BUDGET_STORAGE_KEY,
  dateKey,
  emptyCategoryAmounts,
  sumDailyPlan,
  type BudgetCategoryId,
  type DailyBudgetPlan,
} from "@shared/budgetPlanner";

type ChatMsg = { role: "user" | "assistant"; content: string; id: string };

function loadPlans(): DailyBudgetPlan {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DailyBudgetPlan) : {};
  } catch {
    return {};
  }
}

function savePlans(plans: DailyBudgetPlan) {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(plans));
}

export function BudgetPlannerView() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [plans, setPlans] = useState<DailyBudgetPlan>(loadPlans);
  const [amounts, setAmounts] = useState<Record<BudgetCategoryId, number>>(emptyCategoryAmounts);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const statsQuery = trpc.profile.getStats.useQuery();
  const currency = statsQuery.data?.profile?.currency ?? "RM";
  const key = dateKey(selectedDate);

  const dayQuery = trpc.transactions.list.useQuery({
    limit: 50,
    offset: 0,
    fromDate: `${key}T00:00:00.000Z`,
    toDate: `${key}T23:59:59.999Z`,
  });

  const planMutation = trpc.coach.planBudget.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, id: `${Date.now()}-a` },
      ]);
      if (data.categories.length > 0) {
        setAmounts((prev) => {
          const next = { ...prev };
          for (const c of data.categories) {
            const id = c.id as BudgetCategoryId;
            next[id] = c.amount;
          }
          return next;
        });
        setPlans((prev) => {
          const mapped = data.categories.map((c) => ({
            id: c.id as BudgetCategoryId,
            amount: c.amount,
          }));
          const next = { ...prev, [key]: mergeAmounts(prev[key], mapped) };
          savePlans(next);
          return next;
        });
        toast.success(t("wealth.budget_filled"));
      }
    },
    onError: (err) => {
      toast.error(err.message || t("common.error"));
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const spentToday = useMemo(() => {
    const txs = dayQuery.data?.transactions ?? [];
    return txs
      .filter((tx: { type: string }) => tx.type === "expense")
      .reduce((s: number, tx: { amount: number }) => s + tx.amount, 0);
  }, [dayQuery.data]);

  const dailyTotal = sumDailyPlan(amounts);

  const categoryLines = useMemo(() => {
    return BUDGET_PLANNER_CATEGORIES.map((cat) => ({
      ...cat,
      label: t(cat.labelKey),
      amount: amounts[cat.id] ?? 0,
    }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [amounts, t]);

  useEffect(() => {
    const saved = plans[key];
    if (saved) {
      setAmounts({ ...emptyCategoryAmounts(), ...saved });
    } else {
      setAmounts(emptyCategoryAmounts());
    }
  }, [key, plans]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, planMutation.isPending]);

  function mergeAmounts(
    existing: Partial<Record<BudgetCategoryId, number>> | undefined,
    updates: Array<{ id: BudgetCategoryId; amount: number }>
  ) {
    const base = { ...emptyCategoryAmounts(), ...existing };
    for (const u of updates) base[u.id] = u.amount;
    return base;
  }

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || planMutation.isPending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg, id: `${Date.now()}-u` }]);
    planMutation.mutate({
      message: msg,
      selectedDate: key,
      categories: BUDGET_PLANNER_CATEGORIES.map((c) => ({
        id: c.id,
        amount: amounts[c.id] ?? 0,
      })),
    });
  }

  const quickPrompts = [
    t("wealth.budget_prompt_plan"),
    t("wealth.budget_prompt_food"),
    t("wealth.budget_prompt_cheap"),
  ];

  const dateLabel = selectedDate.toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex flex-col gap-3 pb-2">
      <WeeklyCalendarRibbon
        selected={selectedDate}
        onSelect={setSelectedDate}
        hasPlanForDate={(k) => {
          const p = plans[k];
          return !!p && sumDailyPlan(p) > 0;
        }}
      />

      <div className="rounded-2xl border border-[oklch(0.92_0.03_85)] bg-gradient-to-br from-[oklch(0.99_0.02_85)] to-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold text-muted-foreground">{dateLabel}</p>
        <div className="flex items-baseline justify-between gap-2 mt-1">
          <p className="text-sm font-bold text-foreground">{t("wealth.budget_daily_summary")}</p>
          <p className="text-2xl font-display text-[oklch(0.45_0.14_25)] tabular-nums">
            {currency}
            {dailyTotal.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
          </p>
        </div>
        {spentToday > 0 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {t("wealth.budget_spent_today")}: {currency}
            {spentToday.toFixed(0)}
          </p>
        )}

        {categoryLines.length > 0 ? (
          <ul className="mt-3 space-y-1.5 border-t border-[oklch(0.94_0.02_85)] pt-3">
            {categoryLines.map((line) => (
              <li key={line.id} className="flex items-center gap-2 text-xs">
                <span className="text-base w-5 shrink-0">{line.emoji}</span>
                <span className="flex-1 font-medium text-foreground truncate">{line.label}</span>
                <span className="font-bold text-foreground tabular-nums shrink-0">
                  {currency}
                  {line.amount.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-2">{t("wealth.budget_chat_empty")}</p>
        )}
      </div>

      <div className="flex flex-col rounded-2xl border border-[oklch(0.92_0.02_25)] bg-[oklch(0.99_0.01_25)] shadow-sm overflow-hidden min-h-[340px]">
        <div className="px-3 py-2.5 border-b border-[oklch(0.94_0.02_25)] bg-white flex items-center gap-2">
          <SquirryMascot mood="happy" size={32} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{t("wealth.budget_chat_title")}</p>
            <p className="text-[10px] text-muted-foreground truncate">{t("wealth.budget_chat_sub")}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[280px] bg-[oklch(0.97_0.008_25)]">
          {messages.length === 0 && (
            <div className="text-center py-6 px-2">
              <p className="text-xs text-muted-foreground leading-relaxed">{t("wealth.budget_page_hint")}</p>
            </div>
          )}
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm",
                    msg.role === "user"
                      ? "bg-[oklch(0.55_0.14_25)] text-white rounded-br-md"
                      : "bg-white text-foreground rounded-bl-md border border-border/60"
                  )}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {planMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-white border border-border/60 rounded-2xl rounded-bl-md px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 size={12} className="animate-spin text-primary" />
                {t("wealth.budget_thinking")}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-2.5 border-t border-[oklch(0.94_0.02_25)] bg-white space-y-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            {quickPrompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSend(p)}
                disabled={planMutation.isPending}
                className="shrink-0 text-[11px] font-semibold rounded-full px-3 py-1.5 bg-[oklch(0.96_0.04_85)] text-[oklch(0.4_0.1_85)] border border-[oklch(0.9_0.04_85)] hover:bg-[oklch(0.94_0.06_85)] disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-end">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={t("wealth.budget_chat_placeholder")}
              className="rounded-2xl text-sm h-10 bg-[oklch(0.97_0.008_25)] border-[oklch(0.92_0.02_25)]"
              disabled={planMutation.isPending}
            />
            <Button
              size="sm"
              onClick={() => handleSend()}
              disabled={!input.trim() || planMutation.isPending}
              className="rounded-2xl h-10 w-10 p-0 shrink-0"
            >
              {planMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
