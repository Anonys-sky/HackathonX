import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SquirryMascot } from "@/components/SquirryMascot";
import { toast } from "sonner";
import { Trophy, UserPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SOCIAL } from "@shared/config";
import { BadgesSheet } from "@/components/social/BadgesSheet";
import { LeagueLeaderboard, type LeagueRow } from "@/components/social/LeagueLeaderboard";
import { StreakPotCard } from "@/components/social/StreakPotCard";
import { CAMPUS_LEAGUE } from "@/components/social/campusLeague";

const AVATARS = SOCIAL.friendAvatars;

type LeagueTab = "friends" | "campus";

function budgetEfficiency(spendingPercent: number): number {
  return Math.max(0, Math.min(100, 100 - Math.round(spendingPercent)));
}

export default function Social() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<LeagueTab>("friends");
  const [showBadges, setShowBadges] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [pokingId, setPokingId] = useState<number | null>(null);

  const streaksQuery = trpc.streaks.list.useQuery();
  const profileQuery = trpc.profile.getStats.useQuery();
  const utils = trpc.useUtils();

  const incrementMutation = trpc.streaks.incrementStreak.useMutation({
    onSuccess: (data, vars) => {
      utils.streaks.list.invalidate();
      utils.profile.getStats.invalidate();
      const friend = (streaksQuery.data ?? []).find((s) => s.id === vars.streakId);
      toast.success(
        t("social.poke_sent").replace("{{name}}", friend?.friendName ?? t("social.friend"))
      );
      setPokingId(null);
    },
    onError: () => {
      setPokingId(null);
      toast.error(t("common.error"));
    },
  });

  const myStreak = profileQuery.data?.profile?.currentStreak ?? 0;
  const myLevel = profileQuery.data?.profile?.level ?? 1;
  const spendingPercent = profileQuery.data?.spendingPercent ?? 0;
  const efficiency = budgetEfficiency(spendingPercent);

  const friendEntries: LeagueRow[] = useMemo(() => {
    const me: LeagueRow = {
      id: "me",
      friendName: t("social.you"),
      friendAvatar: "🐿️",
      currentStreak: myStreak,
      isActive: myStreak > 0,
      isMe: true,
    };
    const friends = (streaksQuery.data ?? []).map((s) => ({
      id: `friend-${s.id}`,
      streakId: s.id,
      friendName: s.friendName,
      friendAvatar: s.friendAvatar ?? SOCIAL.defaultFriendAvatar,
      currentStreak: s.currentStreak,
      isActive: s.isActive ?? false,
      isMe: false,
    }));
    return [me, ...friends].sort((a, b) => b.currentStreak - a.currentStreak);
  }, [streaksQuery.data, myStreak, t]);

  const campusEntries: LeagueRow[] = useMemo(() => {
    const me: LeagueRow = {
      id: "me",
      friendName: t("social.you"),
      friendAvatar: "🐿️",
      currentStreak: myStreak,
      isActive: myStreak > 0,
      isMe: true,
    };
    const campus = CAMPUS_LEAGUE.map((c) => ({
      id: c.id,
      friendName: c.friendName,
      friendAvatar: c.friendAvatar,
      currentStreak: c.currentStreak,
      isActive: c.isActive,
      isMe: false,
    }));
    return [me, ...campus].sort((a, b) => b.currentStreak - a.currentStreak);
  }, [myStreak, t]);

  const entries = tab === "friends" ? friendEntries : campusEntries;
  const myRank = Math.max(1, entries.findIndex((e) => e.isMe) + 1);

  function handlePoke(entry: LeagueRow) {
    if (entry.streakId == null) return;
    setPokingId(entry.streakId);
    incrementMutation.mutate({ streakId: entry.streakId });
  }

  if (profileQuery.isLoading) return <SocialSkeleton />;

  return (
    <AppLayout>
      <div className="max-w-[430px] mx-auto w-full min-h-full pb-24 bg-[oklch(0.98_0.015_25)]">
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h1 className="text-2xl font-display text-foreground">{t("social.league_title")}</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t("social.rank_by_streak")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBadges(true)}
              className="w-10 h-10 rounded-full bg-white border border-border/80 shadow-sm flex items-center justify-center"
              aria-label={t("social.view_badges")}
            >
              <Trophy size={18} className="text-[oklch(0.72_0.16_85)]" />
            </button>
            <button
              type="button"
              onClick={() => setShowAddFriend(true)}
              className="w-10 h-10 rounded-full bg-primary text-white shadow-md flex items-center justify-center"
              aria-label={t("social.add_friend")}
            >
              <UserPlus size={18} />
            </button>
          </div>
        </header>

        <div className="px-4 mt-2">
          <StreakPotCard t={t} />

          <div className="flex rounded-2xl bg-muted p-1 mb-4">
            <button
              type="button"
              onClick={() => setTab("friends")}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                tab === "friends" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
              )}
            >
              {t("social.friends_tab")}
            </button>
            <button
              type="button"
              onClick={() => setTab("campus")}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                tab === "campus" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
              )}
            >
              {t("social.campus_tab")}
            </button>
          </div>

          {/* You highlight */}
          <div className="rounded-2xl border-2 border-primary/25 bg-white shadow-md p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-2xl bg-[oklch(0.97_0.03_25)] p-1.5">
                <SquirryMascot
                  mood={myStreak >= 7 ? "celebrating" : myStreak > 0 ? "happy" : "sleeping"}
                  size={52}
                  level={myLevel}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("social.your_rank").replace("{{rank}}", String(myRank))}
                </p>
                <p className="text-lg font-display text-foreground mt-0.5">
                  {t("social.streak_metric").replace("{{n}}", String(myStreak))}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-primary tabular-nums">{efficiency}%</p>
                <p className="text-[10px] text-muted-foreground leading-tight max-w-[72px]">
                  {t("social.efficiency_label")}
                </p>
              </div>
            </div>
          </div>

          {tab === "campus" && (
            <p className="text-[10px] text-center text-muted-foreground mb-3">
              {t("social.campus_demo")}
            </p>
          )}

          {entries.length <= 1 && tab === "friends" ? (
            <div className="bg-white rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">{t("social.add_friend_desc")}</p>
              <Button size="sm" className="rounded-xl" onClick={() => setShowAddFriend(true)}>
                <UserPlus size={16} className="mr-1" />
                {t("social.add_friend")}
              </Button>
            </div>
          ) : (
            <LeagueLeaderboard
              entries={entries}
              t={t}
              onPoke={tab === "friends" ? handlePoke : undefined}
              pokingId={pokingId}
            />
          )}
        </div>
      </div>

      <BadgesSheet open={showBadges} onClose={() => setShowBadges(false)} myStreak={myStreak} t={t} />

      <AddFriendModal open={showAddFriend} onClose={() => setShowAddFriend(false)} t={t} />
    </AppLayout>
  );
}

function AddFriendModal({
  open,
  onClose,
  t,
}: {
  open: boolean;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🐿️");
  const utils = trpc.useUtils();

  const addMutation = trpc.streaks.addFriend.useMutation({
    onSuccess: () => {
      utils.streaks.list.invalidate();
      toast.success(t("common.success"));
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
                  type="button"
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
            className="w-full rounded-2xl h-12 font-semibold"
          >
            {addMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            {t("social.add_friend_btn")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SocialSkeleton() {
  return (
    <AppLayout>
      <div className="max-w-[430px] mx-auto px-4 pt-4 space-y-4 pb-24">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-11 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </AppLayout>
  );
}
