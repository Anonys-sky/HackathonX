import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Sparkles, ChevronLeft, ChevronRight, Trash2,
  AlertCircle, Loader2, Edit2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_META, PAGINATION, DEFAULTS } from "@shared/config";

const CATEGORIES = CATEGORY_META;
const CATEGORY_COLORS = Object.fromEntries(CATEGORY_META.map((c) => [c.value, c.colorClass]));

export default function Activity() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const showParser = location.includes("parse=1");

  const [activeTab, setActiveTab] = useState(showParser ? "parse" : "ledger");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const [deletingTxId, setDeletingTxId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const PAGE_SIZE = PAGINATION.activityPageSize;

  const profileQuery = trpc.profile.get.useQuery();
  const txQuery = trpc.transactions.list.useQuery({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  const walletsQuery = trpc.wallets.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      utils.profile.getStats.invalidate();
      utils.transactions.budgetAlerts.invalidate();
      toast.success(t("activity.transaction_deleted"));
    },
  });

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      utils.profile.getStats.invalidate();
      utils.transactions.budgetAlerts.invalidate();
      setShowEditModal(false);
      setEditingTx(null);
      toast.success(t("activity.transaction_updated"));
    },
  });

  if (txQuery.isLoading && page === 0) return <ActivitySkeleton />;

  const allTx = txQuery.data?.transactions ?? [];
  const filteredTx = filterCategory === "all" ? allTx : allTx.filter((t: (typeof allTx)[0]) => t.category === filterCategory);
  const total = txQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currency = profileQuery.data?.currency ?? DEFAULTS.currency;

  return (
    <AppLayout>
      <PageHeader
        title={t("activity.title")}
        subtitle={t("activity.subtitle")}
        right={
          <Button size="sm" onClick={() => setShowAddModal(true)} className="rounded-xl bg-primary text-white h-8 px-3">
            <Plus size={14} className="mr-1" /> {t("common.add")}
          </Button>
        }
      />

      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full rounded-2xl mb-4 bg-muted p-1">
            <TabsTrigger value="ledger" className="flex-1 rounded-xl text-sm font-semibold">
              {t("activity.ledger")}
            </TabsTrigger>
            <TabsTrigger value="parse" className="flex-1 rounded-xl text-sm font-semibold">
              {t("activity.parser")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ledger">
            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
              <button
                onClick={() => setFilterCategory("all")}
                className={cn("flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  filterCategory === "all" ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border"
                )}
              >
                {t("activity.all")}
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setFilterCategory(c.value)}
                  className={cn("flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    filterCategory === c.value ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border"
                  )}
                >
                  {c.emoji} {t(c.labelKey)}
                </button>
              ))}
            </div>

            {/* Transaction list */}
            <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden mb-4">
              {txQuery.isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                </div>
              ) : filteredTx.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-sm text-muted-foreground">{t("activity.no_transactions")}</p>
                  <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={() => setShowAddModal(true)}>
                    {t("activity.add_transaction")}
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredTx.map((tx: (typeof allTx)[0], i: number) => {
                    const cat = CATEGORIES.find((c) => c.value === tx.category);
                    return (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 px-4 py-3 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg flex-shrink-0">
                          {cat?.emoji ?? "📦"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground truncate">{tx.merchantName}</p>
                            {tx.needsVerification && (
                              <AlertCircle size={12} className="text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", CATEGORY_COLORS[tx.category])}>
                              {cat ? t(cat.labelKey) : tx.category}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(tx.transactedAt).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-bold", tx.type === "income" ? "text-[oklch(0.5_0.18_160)]" : "text-foreground")}>
                            {tx.type === "income" ? "+" : "-"}{currency}{tx.amount.toFixed(2)}
                          </span>
                          <button
                            onClick={() => {
                              setEditingTx(tx);
                              setShowEditModal(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                            title={t("activity.edit")}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingTxId(tx.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            title={t("activity.delete")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-xl"
                >
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("activity.page")} {page + 1} {t("activity.of")} {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-xl"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="parse">
            <AIParserTab wallets={walletsQuery.data ?? []} t={t} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Transaction Modal */}
      {editingTx && (
        <EditTransactionModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingTx(null);
          }}
          transaction={editingTx}
          wallets={walletsQuery.data ?? []}
          t={t}
          onUpdate={updateMutation}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingTxId !== null} onOpenChange={(open) => !open && setDeletingTxId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("activity.delete_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("activity.delete_confirm_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingTxId) {
                  deleteMutation.mutate({ txId: deletingTxId });
                  setDeletingTxId(null);
                }
              }}
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              {t("activity.delete")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        wallets={walletsQuery.data ?? []}
        t={t}
      />
    </AppLayout>
  );
}

function AIParserTab({ wallets, t }: { wallets: any[]; t: (key: string) => string }) {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const utils = trpc.useUtils();

  const parseMutation = trpc.transactions.parseRaw.useMutation({
    onSuccess: (data) => {
      setParsed(data.transactions);
      setSelected(new Set(data.transactions.map((_: any, i: number) => i)));
      const needsReview = data.transactions.some((tx: { needsVerification?: boolean }) => tx.needsVerification);
      toast.success(
        `${data.transactions.length} ${t("activity.parsed_count")} ${needsReview ? "🐿️" : "🤖"}`
      );
    },
    onError: (err) => toast.error(err.message || t("common.error")),
  });

  const addMutation = trpc.transactions.add.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      utils.profile.getStats.invalidate();
      utils.transactions.budgetAlerts.invalidate();
    },
  });

  async function handleSaveSelected() {
    const toSave = parsed.filter((_, i) => selected.has(i));
    let saved = 0;
    for (const tx of toSave) {
      try {
        await addMutation.mutateAsync({
          merchantName: tx.merchantName,
          category: tx.category,
          amount: tx.amount,
          type: tx.type,
          rawText,
          confidenceScore: tx.confidenceScore,
          needsVerification: tx.needsVerification,
          note: tx.note,
        });
        saved++;
      } catch {}
    }
    toast.success(`${t("common.success")} +${saved * 10} XP 🐿️`);
    setParsed([]);
    setRawText("");
  }

  const EXAMPLES = [
    "TNG*SHP MYR 15.50\nGRAB FOOD 23.80\nMBB PETRON 45.00",
    "Starbucks RM 18.90\nTOLL SMART 3.50\nNetflix MYR 54.90",
  ];

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-[oklch(0.95_0.05_295)] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-[oklch(0.5_0.2_295)]" />
          <p className="text-sm font-bold text-[oklch(0.3_0.15_295)]">{t("activity.parser_title")}</p>
        </div>
        <p className="text-xs text-[oklch(0.4_0.1_295)]">
          {t("activity.parser_desc")}
        </p>
      </div>

      <div>
        <Label className="text-sm font-semibold mb-2 block">{t("activity.paste_text")}</Label>
        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={"TNG*SHP MYR 15.50\nGRAB FOOD 23.80\nMBB PETRON 45.00"}
          className="rounded-2xl min-h-[120px] text-sm font-mono resize-none"
        />
        <div className="flex gap-2 mt-2">
          <p className="text-xs text-muted-foreground">{t("activity.try_example")}:</p>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setRawText(ex)}
              className="text-xs text-primary font-semibold underline"
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => parseMutation.mutate({ rawText })}
        disabled={!rawText.trim() || parseMutation.isPending}
        className="w-full rounded-2xl h-12 font-semibold bg-[oklch(0.62_0.2_295)] text-white"
      >
        {parseMutation.isPending ? (
          <><Loader2 size={16} className="mr-2 animate-spin" /> {t("activity.parsing")}</>
        ) : (
          <><Sparkles size={16} className="mr-2" /> {t("activity.parse_btn")}</>
        )}
      </Button>

      {/* Parsed results */}
      <AnimatePresence>
        {parsed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">{parsed.length} {t("activity.parsed_count")}</p>
              <div className="flex gap-2">
                <button onClick={() => setSelected(new Set(parsed.map((_, i) => i)))} className="text-xs text-primary font-semibold">
                  {t("activity.select_all")}
                </button>
                <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground font-semibold">
                  {t("activity.deselect_all")}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {parsed.map((tx, i) => {
                const cat = CATEGORIES.find((c) => c.value === tx.category);
                const isSelected = selected.has(i);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-xl p-3 border border-border cursor-pointer transition-all"
                    onClick={() => {
                      const newSet = new Set(selected);
                      if (isSelected) newSet.delete(i);
                      else newSet.add(i);
                      setSelected(newSet);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-1 w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{tx.merchantName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {cat ? t(cat.labelKey) : tx.category}
                          </span>
                          <span className="text-xs text-muted-foreground">{tx.confidenceScore}% {t("activity.confidence")}</span>
                          {tx.needsVerification && <AlertCircle size={12} className="text-yellow-500" />}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-foreground">RM{tx.amount.toFixed(2)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <Button
              onClick={handleSaveSelected}
              disabled={selected.size === 0 || addMutation.isPending}
              className="w-full rounded-2xl h-12 font-semibold bg-coral-gradient text-white"
            >
              {addMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              {t("activity.save_btn")} ({selected.size})
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditTransactionModal({ open, onClose, transaction, wallets, t, onUpdate }: { open: boolean; onClose: () => void; transaction: any; wallets: any[]; t: (key: string) => string; onUpdate: any }) {
  const [form, setForm] = useState({
    merchantName: transaction?.merchantName || "",
    category: transaction?.category || "food_beverage",
    amount: String(transaction?.amount || ""),
    type: transaction?.type || "expense",
    walletId: transaction?.walletId ? String(transaction.walletId) : "",
    note: transaction?.note || "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.merchantName || !form.amount) {
      toast.error(t("common.error"));
      return;
    }
    const validCategories = ["food_beverage", "transport", "shopping", "bills_utilities", "entertainment", "health", "education", "savings", "income", "other"] as const;
    const category = (validCategories.includes(form.category as any) ? form.category : "other") as typeof validCategories[number];
    await onUpdate.mutateAsync({
      txId: transaction.id,
      merchantName: form.merchantName,
      category,
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
          <DialogTitle>{t("activity.edit_modal_title")}</DialogTitle>
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
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
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
              <Select value={form.walletId} onValueChange={(v) => setForm((f) => ({ ...f, walletId: v }))}>
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
            disabled={onUpdate.isPending}
            className="w-full rounded-2xl h-12 font-semibold bg-coral-gradient text-white"
          >
            {onUpdate.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            {t("activity.update_btn")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddTransactionModal({ open, onClose, wallets, t }: { open: boolean; onClose: () => void; wallets: any[]; t: (key: string) => string }) {
  const [form, setForm] = useState({
    merchantName: "",
    category: "food_beverage",
    amount: "",
    type: "expense",
    walletId: "",
    note: "",
  });

  const addMutation = trpc.transactions.add.useMutation({
    onSuccess: () => {
      trpc.useUtils().transactions.list.invalidate();
      trpc.useUtils().profile.getStats.invalidate();
      trpc.useUtils().transactions.budgetAlerts.invalidate();
      toast.success(t("common.success"));
      onClose();
      setForm({ merchantName: "", category: "food_beverage", amount: "", type: "expense", walletId: "", note: "" });
    },
    onError: () => toast.error(t("common.error")),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.merchantName || !form.amount) {
      toast.error(t("common.error"));
      return;
    }
    const validCategories = ["food_beverage", "transport", "shopping", "bills_utilities", "entertainment", "health", "education", "savings", "income", "other"] as const;
    const category = (validCategories.includes(form.category as any) ? form.category : "other") as typeof validCategories[number];
    await addMutation.mutateAsync({
      merchantName: form.merchantName,
      category,
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
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
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
              <Select value={form.walletId} onValueChange={(v) => setForm((f) => ({ ...f, walletId: v }))}>
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

function ActivitySkeleton() {
  return (
    <AppLayout>
      <div className="px-4 pt-10 space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-10 w-full rounded-2xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      </div>
    </AppLayout>
  );
}
