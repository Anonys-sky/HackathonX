import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useTransactionCacheInvalidation } from "@/hooks/useTransactionCache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_WALLET_MAP, type TransactionCategory } from "@shared/config";
import { AmountNumpad } from "./AmountNumpad";
import { guessMerchantCategory } from "@/lib/merchantCategory";
import { ACTIVITY_CATEGORIES } from "./constants";
import { normalizeTransactionCategory } from "./transactionCategories";

const EXPENSE_CATEGORIES = ACTIVITY_CATEGORIES.filter((c) => c.value !== "income");
const INCOME_CATEGORIES = ACTIVITY_CATEGORIES.filter((c) =>
  ["income", "savings"].includes(c.value)
);

const WALLET_LABEL_KEYS: Record<string, string> = {
  needs: "wallet.needs",
  wants: "wallet.wants",
  savings: "wallet.savings",
  emergency: "wallet.emergency",
  goals: "wallet.goals",
};

function defaultCategory(type: "expense" | "income"): TransactionCategory {
  return type === "income" ? "income" : "food_beverage";
}

export function AddTransactionSheet({
  open,
  onClose,
  currency,
  t,
}: {
  open: boolean;
  onClose: () => void;
  currency: string;
  t: (key: string) => string;
}) {
  const [amount, setAmount] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState<TransactionCategory>("food_beverage");
  const invalidateTx = useTransactionCacheInvalidation();

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const selectedMeta = ACTIVITY_CATEGORIES.find((c) => c.value === category);
  const walletType = CATEGORY_WALLET_MAP[category];
  const walletLabelKey = WALLET_LABEL_KEYS[walletType] ?? "wallet.wants";

  useEffect(() => {
    if (!open) {
      setAmount("");
      setMerchantName("");
      setType("expense");
      setCategory("food_beverage");
    }
  }, [open]);

  useEffect(() => {
    setCategory(defaultCategory(type));
  }, [type]);

  useEffect(() => {
    if (!merchantName.trim()) return;
    const guess = guessMerchantCategory(merchantName, type);
    if (categories.some((c) => c.value === guess)) {
      setCategory(guess);
    }
  }, [merchantName, type, categories]);

  const addMutation = trpc.transactions.add.useMutation({
    onSuccess: () => {
      invalidateTx();
      toast.success(t("common.success"));
      onClose();
    },
    onError: () => toast.error(t("common.error")),
  });

  const displayAmount = useMemo(() => {
    if (!amount) return "0.00";
    if (amount.endsWith(".")) return `${amount}00`.replace(/^\./, "0.");
    const n = parseFloat(amount);
    if (Number.isNaN(n)) return "0.00";
    if (amount.includes(".")) {
      const dec = amount.split(".")[1] ?? "";
      return n.toFixed(Math.min(2, dec.length));
    }
    return n.toFixed(2);
  }, [amount]);

  async function handleSave() {
    const num = parseFloat(amount);
    if (!merchantName.trim() || !num || num <= 0) {
      toast.error(t("activity.fill_merchant_amount"));
      return;
    }
    const cat = normalizeTransactionCategory(category);
    await addMutation.mutateAsync({
      merchantName: merchantName.trim(),
      category: cat,
      amount: num,
      type,
      needsVerification: false,
      confidenceScore: 1,
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-4 pt-2 max-h-[92vh] overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="text-center font-display">{t("activity.add_modal_title")}</SheetTitle>
        </SheetHeader>

        <div className="flex rounded-xl bg-muted p-1 mb-3">
          {(["expense", "income"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setType(opt)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-semibold transition-colors",
                type === opt ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
              )}
            >
              {opt === "expense" ? t("activity.expense") : t("activity.income")}
            </button>
          ))}
        </div>

        <p className="text-center text-3xl font-display text-foreground tabular-nums tracking-tight py-1">
          {currency}
          {displayAmount}
        </p>

        <AmountNumpad value={amount} onChange={setAmount} />

        <div className="mt-4 space-y-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              {t("activity.merchant")}
            </Label>
            <Input
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder={t("activity.merchant_placeholder")}
              className="h-11 rounded-xl text-base border-border bg-white"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
              {t("activity.pick_category")}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((c) => {
                const selected = category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-xl border text-center transition-colors min-h-[64px]",
                      selected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                        : "border-border bg-white"
                    )}
                  >
                    <span className="text-lg leading-none">{c.emoji}</span>
                    <span className="text-[10px] font-semibold text-foreground leading-tight line-clamp-2">
                      {t(c.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedMeta && (
            <p className="text-center text-xs text-muted-foreground bg-muted/80 rounded-xl py-2 px-3">
              {t("activity.goes_to_wallet").replace("{{wallet}}", t(walletLabelKey))}
            </p>
          )}
        </div>

        <Button
          type="button"
          disabled={addMutation.isPending}
          onClick={handleSave}
          className="w-full h-12 rounded-2xl text-base font-bold mt-5 shadow-lg sticky bottom-0"
        >
          {addMutation.isPending ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
          {t("activity.save")}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
