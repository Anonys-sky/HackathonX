import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { SquirryMascot } from "@/components/SquirryMascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
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
            next[c.id] = c.amount;
          }
          return next;
        });
        setPlans((prev) => {
          const next = { ...prev, [key]: mergeAmounts(prev[key], data.categories) };
          savePlans(next);
          return next;
        });
        toast.success(t("wealth.budget_filled"));
      }
      if (data.usedFallback) toast.info(t("wealth.coach_fallback_hint"));
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

  function persistAmounts(next: Record<BudgetCategoryId, number>) {
    setPlans((prev) => {
      const updated = { ...prev, [key]: next };
      savePlans(updated);
      return updated;
    });
  }

  function handleAmountChange(id: BudgetCategoryId, value: string) {
    const num = parseFloat(value) || 0;
    setAmounts((prev) => {
      const next = { ...prev, [id]: num };
      persistAmounts(next);
      return next;
    });
  }

  function handleSend() {
    if (!input.trim() || planMutation.isPending) return;
    const msg = input.trim();
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

  return (
    <div className="pb-4">
      <p className="text-xs text-muted-foreground mb-3 text-center">{t("wealth.budget_page_hint")}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[520px]">
        {/* AI chat — friend helps fill the form */}
        <div className="flex flex-col bg-white rounded-2xl border border-border shadow-sm overflow-hidden min-h-[320px] lg:min-h-[480px]">
          <div className="px-3 py-2 border-b border-border bg-[oklch(0.97_0.04_25)] flex items-center gap-2">
            <SquirryMascot mood="happy" size={36} />
            <div>
              <p className="text-sm font-bold text-foreground">{t("wealth.budget_chat_title")}</p>
              <p className="text-[10px] text-muted-foreground">{t("wealth.budget_chat_sub")}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[280px] lg:max-h-none">
            {messages.length === 0 && (
              <div className="text-center py-4 px-2">
                <p className="text-sm text-muted-foreground">{t("wealth.budget_chat_empty")}</p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                  {quickPrompts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setInput(p)}
                      className="text-[10px] bg-muted rounded-full px-2.5 py-1 font-medium hover:bg-primary/10 hover:text-primary"
                    >
                      {p}
                    </button>
                  ))}
                </div>
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
                      "max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-white rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {planMutation.isPending && (
              <div className="flex gap-2 items-center">
                <span className="text-lg">🐿️</span>
                <div className="bg-muted rounded-2xl px-3 py-2 text-xs text-muted-foreground">
                  {t("wealth.budget_thinking")}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-2 border-t border-border flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={t("wealth.budget_chat_placeholder")}
              className="rounded-xl text-sm h-9"
              disabled={planMutation.isPending}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!input.trim() || planMutation.isPending}
              className="rounded-xl h-9 w-9 p-0 shrink-0"
            >
              {planMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </Button>
          </div>
        </div>

        {/* Budget sheet — calendar + categories */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 flex flex-col">
          <p className="text-sm font-bold text-foreground mb-1 flex items-center gap-1">
            <Sparkles size={14} className="text-primary" />
            {t("wealth.budget_sheet_title")}
          </p>
          <p className="text-[10px] text-muted-foreground mb-3">{t("wealth.budget_sheet_sub")}</p>

          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-foreground">
              {selectedDate.toLocaleDateString("en-MY", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>

            <div className="flex flex-col items-center w-full">
              <div className="w-full max-w-[280px]">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  className="w-full rounded-xl border border-border [--cell-size:2.5rem]"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">{t("wealth.budget_click_day")}</p>
            </div>

            <div className="space-y-2">
              {BUDGET_PLANNER_CATEGORIES.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="text-base w-6 shrink-0">{cat.emoji}</span>
                  <label className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">
                    {t(cat.labelKey)}
                  </label>
                  <div className="flex items-center gap-1 w-28 shrink-0">
                    <span className="text-xs text-muted-foreground">{currency}</span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={amounts[cat.id] || ""}
                      onChange={(e) => handleAmountChange(cat.id, e.target.value)}
                      className="h-8 text-xs rounded-lg text-right font-semibold"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-[oklch(0.96_0.04_25)] border border-primary/20">
              <p className="text-xs text-muted-foreground">{t("wealth.budget_daily_summary")}</p>
              <p className="text-2xl font-display text-primary">
                {currency}
                {dailyTotal.toLocaleString("en-MY", { maximumFractionDigits: 0 })}
              </p>
              {spentToday > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t("wealth.budget_spent_today")}: {currency}
                  {spentToday.toFixed(0)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
