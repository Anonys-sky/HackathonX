import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useTransactionCacheInvalidation } from "@/hooks/useTransactionCache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ACTIVITY_CATEGORIES } from "./constants";
import { normalizeTransactionCategory } from "./transactionCategories";

type Wallet = { id: number; label: string };

export function AddTransactionModal({
  open,
  onClose,
  wallets,
  t,
}: {
  open: boolean;
  onClose: () => void;
  wallets: Wallet[];
  t: (key: string) => string;
}) {
  const [form, setForm] = useState({
    merchantName: "",
    category: "food_beverage",
    amount: "",
    type: "expense",
    walletId: "",
    note: "",
  });
  const invalidateTx = useTransactionCacheInvalidation();

  const addMutation = trpc.transactions.add.useMutation({
    onSuccess: () => {
      invalidateTx();
      toast.success(t("common.success"));
      onClose();
      setForm({
        merchantName: "",
        category: "food_beverage",
        amount: "",
        type: "expense",
        walletId: "",
        note: "",
      });
    },
    onError: () => toast.error(t("common.error")),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.merchantName || !form.amount) {
      toast.error(t("common.error"));
      return;
    }
    await addMutation.mutateAsync({
      merchantName: form.merchantName,
      category: normalizeTransactionCategory(form.category),
      amount: parseFloat(form.amount),
      type: form.type as "income" | "expense",
      walletId: form.walletId ? parseInt(form.walletId) : undefined,
      note: form.note,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("activity.add_modal_title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">{t("activity.merchant")}</Label>
            <Input
              value={form.merchantName}
              onChange={(e) => setForm((f) => ({ ...f, merchantName: e.target.value }))}
              placeholder={t("activity.merchant_placeholder")}
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">{t("activity.amount")}</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">{t("activity.type")}</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">{t("activity.expense")}</SelectItem>
                  <SelectItem value="income">{t("activity.income")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">{t("activity.category")}</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.emoji} {t(c.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {wallets.length > 0 && (
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">{t("activity.wallet")}</Label>
              <Select
                value={form.walletId}
                onValueChange={(v) => setForm((f) => ({ ...f, walletId: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t("activity.select_wallet")} />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">{t("activity.note")}</Label>
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder={t("activity.note_placeholder")}
              className="rounded-xl"
            />
          </div>
          <Button
            type="submit"
            disabled={addMutation.isPending}
            className="w-full rounded-2xl h-12 font-semibold bg-coral-gradient text-white"
          >
            {addMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            {t("activity.add_btn")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
