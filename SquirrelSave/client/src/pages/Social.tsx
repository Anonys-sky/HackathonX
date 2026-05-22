import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SquirryMascot } from "@/components/SquirryMascot";
import { toast } from "sonner";
import { Plus, Target, Star, Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAMIFICATION, SOCIAL } from "@shared/config";

const AVATARS = SOCIAL.friendAvatars;
const STREAK_BADGES = GAMIFICATION.streakBadges;

function getStreakBadge(streak: number) {
  return [...STREAK_BADGES].reverse().find((b) => streak >= b.days);
}

export default function Social() {
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);

  const streaksQuery = trpc.streaks.list.useQuery();
  const profileQuery = trpc.profile.getStats.useQuery();
  const utils = trpc.useUtils();

  const incrementMutation = trpc.streaks.incrementStreak.useMutation({
    onSuccess: (data) => {
      utils.streaks.list.invalidate();
      utils.profile.getStats.invalidate();
      toast.success(`${t("social.streak_extended")} +${data.xpAwarded} XP 🔥`);
    },
  });

  if (profileQuery.isLoading) return <SocialSkeleton />;

  const userStreaks = streaksQuery.data ?? [];
  const profile = profileQuery.data?.profile;
  const myStreak = profile?.currentStreak ?? 0;
  const myLevel = profile?.level ?? 1;
  const myXp = profile?.xpPoints ?? 0;

  const allStreaks = [
    { id: "me", friendName: `${t("social.you")} 🐿️`, friendAvatar: "🐿️", currentStreak: myStreak, isActive: true, isMe: true },
    ...userStreaks.map((s, idx) => ({ ...s, id: `user-${s.id}-${idx}`, isMe: false })),
  ].sort((a, b) => b.currentStreak - a.currentStreak);

  const weeklyGoal = GAMIFICATION.weeklyChallengeDays;
  const weeklyProgress = Math.min(myStreak, weeklyGoal);

  return (
    <AppLayout>
      <PageHeader
        title={t("social.title")}
        subtitle={t("social.subtitle")}
        right={
          <Button size="sm" onClick={() => setShowAddModal(true)} className="rounded-xl bg-primary text-white h-8 px-3">
            <Plus size={14} className="mr-1" /> {t("common.add")}
          </Button>
        }
      />

      <div className="px-4 space-y-4 pb-6">
        {/* My streak card */}
        <div className="bg-[oklch(0.22_0.08_260)] rounded-2xl p-4 text-white">
          <div className="flex items-center gap-4">
            <div className="relative">
              <SquirryMascot mood={myStreak >= 7 ? "celebrating" : myStreak > 0 ? "happy" : "sleeping"} size={70} level={myLevel} />
            </div>
            <div className="flex-1">
              <p className="text-white/70 text-xs font-medium mb-1">{t("social.your_streak")}</p>
              <div className="flex items-center gap-2">
                <span className="flame-animate text-2xl">🔥</span>
                <span className="text-3xl font-display text-white">{myStreak}</span>
                <span className="text-white/60 text-sm">{t("social.days")}</span>
              </div>
              {getStreakBadge(myStreak) && (
                <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mt-1", getStreakBadge(myStreak)!.color)}>
                  {getStreakBadge(myStreak)!.emoji} {t(getStreakBadge(myStreak)!.labelKey)}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs">{t("social.level")}</p>
              <p className="text-2xl font-display text-[oklch(0.78_0.18_85)]">{myLevel}</p>
              <p className="text-white/60 text-xs">{myXp} XP</p>
            </div>
          </div>
        </div>

        {/* Weekly Challenge */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-primary" />
            <p className="text-sm font-bold text-foreground">{t("social.weekly_challenge")}</p>
            <span className="ml-auto text-xs text-muted-foreground">{weeklyProgress}/{weeklyGoal} {t("social.days")}</span>
          </div>
          <div className="flex gap-1.5 mb-2">
            {Array.from({ length: weeklyGoal }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "flex-1 h-8 rounded-xl flex items-center justify-center text-sm transition-all",
                  i < weeklyProgress
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i < weeklyProgress ? "🔥" : (i + 1)}
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {weeklyProgress >= weeklyGoal
              ? t("social.challenge_complete")
              : `${weeklyGoal - weeklyProgress} ${t("social.more_days")}`}
          </p>
        </div>

        {/* Streak Badges */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-[oklch(0.78_0.18_85)]" />
            <p className="text-sm font-bold text-foreground">{t("social.streak_badges")}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {STREAK_BADGES.map((badge) => {
              const earned = myStreak >= badge.days;
              return (
                <div
                  key={badge.days}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-2xl border-2 transition-all",
                    earned ? `${badge.color} border-current` : "bg-muted text-muted-foreground border-transparent opacity-50"
                  )}
                >
                  <span className="text-xl">{badge.emoji}</span>
                  <span className="text-[10px] font-bold text-center leading-tight">{t(badge.labelKey)}</span>
                  <span className="text-[10px] opacity-70">{badge.days}d</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Trophy size={16} className="text-[oklch(0.78_0.18_85)]" />
            <p className="text-sm font-bold text-foreground">{t("social.leaderboard")}</p>
          </div>
          <div className="divide-y divide-border">
            {allStreaks.map((entry, rank) => {
              const badge = getStreakBadge(entry.currentStreak);
              const isTop3 = rank < 3;
              const rankEmoji = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : null;

              return (
                <motion.div
                  key={`${entry.id}-${rank}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rank * 0.04 }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    (entry as any).isMe && "bg-[oklch(0.97_0.03_25)]"
                  )}
                >
                  <div className="w-7 text-center">
                    {rankEmoji ? (
                      <span className="text-lg">{rankEmoji}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{rank + 1}</span>
                    )}
                  </div>

                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-xl",
                    isTop3 ? "bg-[oklch(0.96_0.05_85)] shadow-sm" : "bg-muted"
                  )}>
                    {entry.friendAvatar}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-semibold truncate", (entry as any).isMe ? "text-primary" : "text-foreground")}>
                        {entry.friendName}
                      </p>
                      {(entry as any).isMe && <span className="text-xs text-primary font-bold">({t("social.you")})</span>}
                    </div>
                    {badge && (
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", badge.color)}>
                        {badge.emoji} {t(badge.labelKey)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className={cn("text-sm", entry.isActive ? "flame-animate" : "")}>🔥</span>
                    <span className="text-sm font-bold text-foreground">{entry.currentStreak}</span>
                  </div>

                  {!(entry as any).isMe && typeof entry.id === 'string' && entry.id.startsWith('user-') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl h-7 px-2 text-xs"
                      onClick={() => {
                        const streakId = parseInt(entry.id.split('-')[1]);
                        incrementMutation.mutate({ streakId });
                      }}
                      disabled={incrementMutation.isPending}
                    >
                      {incrementMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : `🔥 ${t("social.nudge")}`}
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Add friend prompt */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddModal(true)}
          className="bg-[oklch(0.95_0.05_160)] rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 border-dashed border-[oklch(0.72_0.18_160)]"
        >
          <div className="w-10 h-10 rounded-full bg-[oklch(0.72_0.18_160)] flex items-center justify-center">
            <Plus size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[oklch(0.35_0.15_160)]">{t("social.add_friend")}</p>
            <p className="text-xs text-[oklch(0.45_0.12_160)]">{t("social.add_friend_desc")}</p>
          </div>
        </motion.div>
      </div>

      <AddFriendModal open={showAddModal} onClose={() => setShowAddModal(false)} t={t} />
    </AppLayout>
  );
}

function AddFriendModal({ open, onClose, t }: { open: boolean; onClose: () => void; t: (key: string) => string }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🐿️");
  const utils = trpc.useUtils();

  const addMutation = trpc.streaks.addFriend.useMutation({
    onSuccess: () => {
      utils.streaks.list.invalidate();
      toast.success(`${t("common.success")} 🔥`);
      onClose();
      setName("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("social.add_friend_modal")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-2 block">{t("social.friend_name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("social.enter_name")}
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-2 block">{t("social.choose_avatar")}</Label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition-all",
                    avatar === a ? "border-primary bg-primary/10" : "border-border bg-muted"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={() => addMutation.mutate({ friendName: name, friendAvatar: avatar })}
            disabled={!name || addMutation.isPending}
            className="w-full rounded-2xl h-12 font-semibold bg-coral-gradient text-white"
          >
            {addMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            {t("social.add_friend_btn")} 🔥
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SocialSkeleton() {
  return (
    <AppLayout>
      <div className="px-4 pt-10 space-y-4 pb-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </AppLayout>
  );
}
