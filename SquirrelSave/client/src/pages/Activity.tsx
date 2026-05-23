import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, Trash2, AlertCircle, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGINATION, DEFAULTS } from "@shared/config";
import { useTransactionCacheInvalidation } from "@/hooks/useTransactionCache";
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_COLORS,
} from "@/components/activity/constants";
import { AIParserTab } from "@/components/activity/AIParserTab";
import { AddTransactionModal } from "@/components/activity/AddTransactionModal";
import { EditTransactionModal } from "@/components/activity/EditTransactionModal";
import { ActivitySkeleton } from "@/components/activity/ActivitySkeleton";

const CATEGORIES = ACTIVITY_CATEGORIES;

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
  const invalidateTx = useTransactionCacheInvalidation();

  const deleteMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      invalidateTx();
      toast.success(t("activity.transaction_deleted"));
    },
  });

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      invalidateTx();
      setShowEditModal(false);
      setEditingTx(null);
      toast.success(t("activity.transaction_updated"));
    },
  });

  if (txQuery.isLoading && page === 0) return <ActivitySkeleton />;

  const allTx = txQuery.data?.transactions ?? [];
  const filteredTx =
    filterCategory === "all"
      ? allTx
      : allTx.filter((tx: (typeof allTx)[0]) => tx.category === filterCategory);
  const total = txQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currency = profileQuery.data?.currency ?? DEFAULTS.currency;

  return (
    <AppLayout>
      <PageHeader
        title={t("activity.title")}
        subtitle={t("activity.subtitle")}
        right={
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="rounded-xl bg-primary text-white h-8 px-3"
          >
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
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
              <button
                onClick={() => setFilterCategory("all")}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  filterCategory === "all"
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-foreground border-border"
                )}
              >
                {t("activity.all")}
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setFilterCategory(c.value)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    filterCategory === c.value
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-foreground border-border"
                  )}
                >
                  {c.emoji} {t(c.labelKey)}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden mb-4">
              {txQuery.isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : filteredTx.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-sm text-muted-foreground">{t("activity.no_transactions")}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 rounded-xl"
                    onClick={() => setShowAddModal(true)}
                  >
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
                            <p className="text-sm font-semibold text-foreground truncate">
                              {tx.merchantName}
                            </p>
                            {tx.needsVerification && (
                              <AlertCircle size={12} className="text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                CATEGORY_COLORS[tx.category]
                              )}
                            >
                              {cat ? t(cat.labelKey) : tx.category}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {tx.transactedAt
                                ? new Date(tx.transactedAt).toLocaleDateString("en-MY", {
                                    day: "numeric",
                                    month: "short",
                                  })
                                : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-bold",
                              tx.type === "income"
                                ? "text-[oklch(0.5_0.18_160)]"
                                : "text-foreground"
                            )}
                          >
                            {tx.type === "income" ? "+" : "-"}
                            {currency}
                            {tx.amount.toFixed(2)}
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

      <AlertDialog open={deletingTxId !== null} onOpenChange={(open) => !open && setDeletingTxId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("activity.delete_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("activity.delete_confirm_desc")}</AlertDialogDescription>
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

      <AddTransactionModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        wallets={walletsQuery.data ?? []}
        t={t}
      />
    </AppLayout>
  );
}
