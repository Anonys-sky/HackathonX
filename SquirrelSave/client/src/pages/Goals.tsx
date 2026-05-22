import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Target, Trash2, Loader2, Coins } from "lucide-react";
import { GOAL_CATEGORIES, GOAL_EMOJIS, DEFAULTS } from "@shared/config";
import { cn } from "@/lib/utils";

export default function Goals() {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [addFundsGoalId, setAddFundsGoalId] = useState<number | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<number | null>(null);

  const profileQuery = trpc.profile.get.useQuery();
  const goalsQuery = trpc.goals.list.useQuery();
  const utils = trpc.useUtils();
  const deleteMutation = trpc.goals.delete.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      toast.success(t("common.success"));
      setDeleteGoalId(null);
    },
  });
  const currency = profileQuery.data?.currency ?? DEFAULTS.currency;

  if (goalsQuery.isLoading) return <GoalsSkeleton />;

  const goals = goalsQuery.data ?? [];

  return (
    <AppLayout>
      <PageHeader
        title={t("goals.title")}
        subtitle={t("goals.subtitle")}
        right={
          <Button size="sm" onClick={() => setShowCreate(true)} className="rounded-xl bg-primary text-white h-8 px-3">
            <Plus size={14} className="mr-1" /> {t("goals.create")}
          </Button>
        }
      />

      <div className="px-4 space-y-3 pb-6">
        {goalsQuery.isLoading ? (
          <Skeleton className="h-28 w-full rounded-2xl" />
        ) : goals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl p-8 text-center border border-dashed border-border"
          >
            <Target className="mx-auto mb-3 text-muted-foreground" size={40} />
            <p className="text-sm text-muted-foreground mb-4">{t("goals.empty")}</p>
            <Button onClick={() => setShowCreate(true)} className="rounded-2xl">
              {t("goals.create")}
            </Button>
          </motion.div>
        ) : (
          goals.map((goal, i) => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const complete = progress >= 100;
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-border"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{goal.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-foreground truncate">{goal.name}</p>
                      <button
                        type="button"
                        onClick={() => setDeleteGoalId(goal.id)}
                        className="text-muted-foreground hover:text-destructive p-1"
                        aria-label="Delete goal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">{goal.category}</p>
                    <Progress value={Math.min(100, progress)} className="h-2 mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {currency}
                      {goal.currentAmount.toFixed(0)} / {currency}
                      {goal.targetAmount.toFixed(0)}
                      {complete && ` · ${t("goals.complete")}`}
                    </p>
                    {goal.deadline && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(goal.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                {!complete && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 rounded-xl"
                    onClick={() => setAddFundsGoalId(goal.id)}
                  >
                    <Coins size={14} className="mr-1" /> {t("goals.add_funds")}
                  </Button>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      <CreateGoalModal open={showCreate} onClose={() => setShowCreate(false)} currency={currency} t={t} />
      {addFundsGoalId !== null && (
        <AddFundsModal
          goalId={addFundsGoalId}
          open
          onClose={() => setAddFundsGoalId(null)}
          currency={currency}
          t={t}
        />
      )}
      <AlertDialog open={deleteGoalId !== null} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent className="rounded-3xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("goals.delete_confirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("goals.delete_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel className="rounded-xl flex-1">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl flex-1 bg-destructive text-white"
              onClick={() => {
                if (deleteGoalId !== null) deleteMutation.mutate({ goalId: deleteGoalId });
              }}
              disabled={deleteMutation.isPending}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function CreateGoalModal({
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
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category] = useState<string>("general");
  const [emoji, setEmoji] = useState("🎯");
  const utils = trpc.useUtils();

  const createMutation = trpc.goals.create.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      toast.success(t("common.success"));
      onClose();
      setName("");
      setTarget("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("goals.create")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("goals.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("goals.name_placeholder")} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label>{t("goals.target")} ({currency})</Label>
            <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label>{t("goals.deadline")}</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label>{t("goals.emoji")}</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {GOAL_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "w-9 h-9 rounded-lg text-lg border-2",
                    emoji === e ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <Button
            className="w-full rounded-2xl h-11"
            disabled={!name || !target || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                name,
                targetAmount: parseFloat(target),
                deadline: deadline || undefined,
                category: category as (typeof GOAL_CATEGORIES)[number],
                emoji,
              })
            }
          >
            {createMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddFundsModal({
  goalId,
  open,
  onClose,
  currency,
  t,
}: {
  goalId: number;
  open: boolean;
  onClose: () => void;
  currency: string;
  t: (key: string) => string;
}) {
  const [amount, setAmount] = useState("");
  const utils = trpc.useUtils();
  const addMutation = trpc.goals.addFunds.useMutation({
    onSuccess: (data) => {
      utils.goals.list.invalidate();
      utils.profile.getStats.invalidate();
      toast.success(`+${data.xpAwarded} XP`);
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>{t("goals.add_funds")}</DialogTitle>
        </DialogHeader>
        <Label>{t("goals.amount")} ({currency})</Label>
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-xl mt-1 mb-4" />
        <Button
          className="w-full rounded-2xl"
          disabled={!amount || addMutation.isPending}
          onClick={() => addMutation.mutate({ goalId, amount: parseFloat(amount) })}
        >
          {addMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : t("common.save")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function GoalsSkeleton() {
  return (
    <AppLayout>
      <div className="px-4 pt-10 space-y-3">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </AppLayout>
  );
}
