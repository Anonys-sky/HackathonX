import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGINATION, DEFAULTS } from "@shared/config";
import { useTransactionCacheInvalidation } from "@/hooks/useTransactionCache";
import { ACTIVITY_CATEGORIES } from "@/components/activity/constants";
import { SmartScanTab } from "@/components/activity/SmartScanTab";
import { AddTransactionSheet } from "@/components/activity/AddTransactionSheet";
import { EditTransactionModal } from "@/components/activity/EditTransactionModal";
import { TransactionFeed } from "@/components/activity/TransactionFeed";
import { ActivitySkeleton } from "@/components/activity/ActivitySkeleton";
import { groupTransactionsByDate, type GroupableTx } from "@/lib/groupTransactionsByDate";

const PAGE_SIZE = Math.max(PAGINATION.activityPageSize, 50);

export default function Activity() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const showScan = location.includes("parse=1");

  const [activeTab, setActiveTab] = useState<"manual" | "scan">(showScan ? "scan" : "manual");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTx, setEditingTx] = useState<GroupableTx | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string>("all");

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

  const allTx = txQuery.data?.transactions ?? [];
  const filteredTx = useMemo(
    () =>
      filterCategory === "all"
        ? allTx
        : allTx.filter((tx: { category: string }) => tx.category === filterCategory),
    [allTx, filterCategory]
  );

  const groups = useMemo(
    () =>
      groupTransactionsByDate(
        filteredTx,
        { today: t("activity.today"), yesterday: t("activity.yesterday") },
        language === "bm" ? "ms-MY" : "en-MY"
      ),
    [filteredTx, t, language]
  );

  if (txQuery.isLoading && page === 0) return <ActivitySkeleton />;

  const total = txQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currency = profileQuery.data?.currency ?? DEFAULTS.currency;

  return (
    <AppLayout>
      <div className="max-w-[430px] mx-auto w-full min-h-full pb-28 bg-[oklch(0.98_0.015_25)]">
        <header className="px-4 pt-4 pb-2">
          <h1 className="text-2xl font-display text-foreground">{t("activity.title")}</h1>
        </header>

        <div className="px-4 mb-4">
          <div className="flex rounded-2xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                activeTab === "manual" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
              )}
            >
              {t("activity.manual_log")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("scan")}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                activeTab === "scan" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
              )}
            >
              {t("activity.smart_scan")}
            </button>
          </div>
        </div>

        {activeTab === "manual" ? (
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                {filterCategory === "all"
                  ? t("activity.all")
                  : t(ACTIVITY_CATEGORIES.find((c) => c.value === filterCategory)?.labelKey ?? "activity.all")}
              </p>
              <button
                type="button"
                onClick={() => setShowFilterSheet(true)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                  filterCategory !== "all"
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-border text-foreground"
                )}
              >
                <Filter size={14} />
                {t("activity.filter")}
              </button>
            </div>

            {txQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredTx.length === 0 ? (
              <div className="bg-white rounded-2xl border border-border/80 p-10 text-center">
                <p className="text-sm text-muted-foreground">{t("activity.no_transactions")}</p>
                <Button
                  size="sm"
                  className="mt-4 rounded-xl"
                  onClick={() => setShowAddSheet(true)}
                >
                  {t("activity.add_transaction")}
                </Button>
              </div>
            ) : (
              <TransactionFeed
                groups={groups}
                currency={currency}
                t={t}
                onEdit={(tx) => {
                  setEditingTx(tx);
                  setShowEditModal(true);
                }}
                onDelete={setDeletingTxId}
              />
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-xl"
                >
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {page + 1} / {totalPages}
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
          </div>
        ) : (
          <div className="px-4">
            <SmartScanTab t={t} />
          </div>
        )}

        {activeTab === "manual" && (
          <button
            type="button"
            onClick={() => setShowAddSheet(true)}
            className="fixed right-4 z-[55] w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center bottom-[calc(4.5rem+env(safe-area-inset-bottom))] active:scale-95 transition-transform"
            aria-label={t("activity.add_transaction")}
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <Sheet open={showFilterSheet} onOpenChange={setShowFilterSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t("activity.filter")}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 mt-4 pb-4 max-h-[50vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setFilterCategory("all");
                setShowFilterSheet(false);
              }}
              className={cn(
                "py-3 rounded-xl text-sm font-semibold border",
                filterCategory === "all" ? "bg-primary text-white border-primary" : "bg-white border-border"
              )}
            >
              {t("activity.all")}
            </button>
            {ACTIVITY_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setFilterCategory(c.value);
                  setShowFilterSheet(false);
                }}
                className={cn(
                  "py-3 rounded-xl text-sm font-semibold border flex items-center justify-center gap-1",
                  filterCategory === c.value
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-border"
                )}
              >
                <span>{c.emoji}</span>
                {t(c.labelKey)}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

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
        <AlertDialogContent className="rounded-2xl max-w-[calc(100%-2rem)]">
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

      <AddTransactionSheet
        open={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        currency={currency}
        t={t}
      />
    </AppLayout>
  );
}
