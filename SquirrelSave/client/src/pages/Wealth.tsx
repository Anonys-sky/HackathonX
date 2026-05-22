import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SquirryMascot } from "@/components/SquirryMascot";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import {
  Send, Trash2, Zap, Trophy, Flame, Star, Crown, TrendingUp,
  BookOpen, ExternalLink, Loader2, MessageCircle, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS_KEYS = [
  "wealth.prompt_1",
  "wealth.prompt_2",
  "wealth.prompt_3",
  "wealth.prompt_4",
  "wealth.prompt_5",
  "wealth.prompt_6",
];

const PARTNER_CARDS = [
  {
    name: "StashAway",
    type: "Robo-Advisor",
    descKey: "wealth.partner_stashaway",
    emoji: "📈",
    color: "bg-blue-50 border-blue-200",
    textColor: "text-blue-700",
    minInvest: "RM0",
  },
  {
    name: "Versa",
    type: "Cash Management",
    descKey: "wealth.partner_versa",
    emoji: "💰",
    color: "bg-green-50 border-green-200",
    textColor: "text-green-700",
    minInvest: "RM1",
  },
  {
    name: "Wahed Invest",
    type: "Islamic Investing",
    descKey: "wealth.partner_wahed",
    emoji: "🌙",
    color: "bg-purple-50 border-purple-200",
    textColor: "text-purple-700",
    minInvest: "RM100",
  },
  {
    name: "Luno",
    type: "Digital Assets",
    descKey: "wealth.partner_luno",
    emoji: "₿",
    color: "bg-orange-50 border-orange-200",
    textColor: "text-orange-700",
    minInvest: "RM10",
  },
];

const LEVEL_TITLES: Record<number, string> = {
  1: "Squirry Saver",
  2: "Budget Apprentice",
  3: "Wallet Wizard",
  4: "Finance Hero",
  5: "Money Master",
  6: "Wealth Champion",
  7: "Investment Sage",
  8: "Financial Legend",
  9: "Millionaire Mindset",
  10: "Squirry Billionaire",
};

function getLevelTitle(level: number) {
  return LEVEL_TITLES[Math.min(level, 10)] ?? "Squirry Billionaire";
}

export default function Wealth() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("coach");

  return (
    <AppLayout>
      <PageHeader title={t("wealth.title")} subtitle={t("wealth.subtitle")} />

      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full rounded-2xl mb-4 bg-muted p-1">
            <TabsTrigger value="coach" className="flex-1 rounded-xl text-sm font-semibold">
              {t("wealth.coach_tab")}
            </TabsTrigger>
            <TabsTrigger value="gamification" className="flex-1 rounded-xl text-sm font-semibold">
              {t("wealth.progress_tab")}
            </TabsTrigger>
            <TabsTrigger value="partners" className="flex-1 rounded-xl text-sm font-semibold">
              {t("wealth.invest_tab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="coach">
            <CoachTab t={t} />
          </TabsContent>

          <TabsContent value="gamification">
            <GamificationTab t={t} />
          </TabsContent>

          <TabsContent value="partners">
            <PartnersTab t={t} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function CoachTab({ t }: { t: (key: string) => string }) {
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<{ role: "user" | "assistant"; content: string; id: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const historyQuery = trpc.coach.history.useQuery();
  const chatMutation = trpc.coach.chat.useMutation({
    onSuccess: (data) => {
      setLocalMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || t("wealth.coach_error"), id: Date.now().toString() },
      ]);
      if (data.usedFallback) {
        toast.info(t("wealth.coach_fallback_hint"));
      }
    },
    onError: (error) => {
      toast.error(error.message || t("common.error"));
      setLocalMessages((prev) => prev.slice(0, -1));
    },
  });
  const clearMutation = trpc.coach.clearHistory.useMutation({
    onSuccess: () => {
      utils.coach.history.invalidate();
      setLocalMessages([]);
      toast.success(t("wealth.history_cleared"));
    },
  });

  const dbMessages = historyQuery.data ?? [];
  const allMessages = dbMessages.length > 0 ? dbMessages : localMessages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, localMessages]);

  function handleSend() {
    if (!input.trim() || chatMutation.isPending) return;
    const msg = input.trim();
    setInput("");
    setLocalMessages((prev) => [
      ...prev,
      { role: "user", content: msg, id: Date.now().toString() },
    ]);
    chatMutation.mutate({ message: msg });
    setTimeout(() => utils.coach.history.invalidate(), 1500);
  }

  function handleQuickPrompt(prompt: string) {
    setInput(prompt);
  }

  const displayMessages = allMessages.length > 0 ? allMessages : localMessages;
  const quickPrompts = QUICK_PROMPTS_KEYS.map(key => t(key));

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
      <div className="flex-1 overflow-y-auto space-y-3 pb-3">
        {displayMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center py-4"
          >
            <SquirryMascot mood="happy" size={80} />
            <h3 className="text-base font-display mt-3 mb-1">{t("wealth.coach_greeting")}</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t("wealth.coach_desc")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleQuickPrompt(p)}
                  className="text-xs bg-white border border-border rounded-full px-3 py-1.5 text-foreground font-medium hover:border-primary hover:text-primary transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {displayMessages.map((msg: { role: string; content: string; id?: string }, i: number) => (
            <motion.div
              key={(msg as any).id ?? i}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-[oklch(0.95_0.05_25)] flex items-center justify-center flex-shrink-0 mt-1">
                  🐿️
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-white rounded-tr-sm"
                    : "bg-white border border-border text-foreground rounded-tl-sm shadow-sm"
                )}
              >
                {msg.role === "assistant" ? (
                  <Streamdown className="text-sm leading-relaxed prose prose-sm max-w-none">{msg.content}</Streamdown>
                ) : (
                  <p className="leading-relaxed">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {chatMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 items-center"
          >
            <div className="w-8 h-8 rounded-full bg-[oklch(0.95_0.05_25)] flex items-center justify-center">🐿️</div>
            <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {displayMessages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {quickPrompts.slice(0, 3).map((p) => (
            <button
              key={p}
              onClick={() => handleQuickPrompt(p)}
              className="flex-shrink-0 text-xs bg-white border border-border rounded-full px-3 py-1.5 text-foreground font-medium hover:border-primary hover:text-primary transition-all"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-2 pb-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={t("wealth.coach_placeholder")}
          className="rounded-2xl flex-1 bg-white"
          disabled={chatMutation.isPending}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || chatMutation.isPending}
          className="rounded-2xl w-11 h-11 p-0 bg-primary text-white flex-shrink-0"
        >
          {chatMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
        {displayMessages.length > 0 && (
          <Button
            variant="outline"
            onClick={() => clearMutation.mutate()}
            className="rounded-2xl w-11 h-11 p-0 flex-shrink-0"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}

function GamificationTab({ t }: { t: (key: string) => string }) {
  const statsQuery = trpc.profile.getStats.useQuery();
  const xpQuery = trpc.gamification.xpHistory.useQuery();
  const logAction = trpc.gamification.logDailyAction.useMutation({
    onSuccess: (data) => {
      toast.success(`+${data.xpAwarded} XP ${t("common.earned")} 🐿️`);
      statsQuery.refetch();
      xpQuery.refetch();
    },
  });

  const profile = statsQuery.data?.profile;
  const level = profile?.level ?? 1;
  const xp = profile?.xpPoints ?? 0;
  const streak = profile?.currentStreak ?? 0;
  const xpInLevel = xp % 500;
  const xpToNext = 500 - xpInLevel;
  const xpHistory = xpQuery.data ?? [];

  const dailyActions = [
    { action: "logged_expense" as const, labelKey: "wealth.action_log", xp: 10, emoji: "📝" },
    { action: "stayed_in_budget" as const, labelKey: "wealth.action_budget", xp: 20, emoji: "✅" },
    { action: "saved_to_goal" as const, labelKey: "wealth.action_save", xp: 30, emoji: "🎯" },
  ];

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-[oklch(0.22_0.08_260)] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <SquirryMascot
            mood={streak >= 7 ? "celebrating" : "happy"}
            size={80}
            level={level}
          />
          <div className="flex-1">
            <p className="text-white/70 text-xs font-medium">{t("wealth.current_level")}</p>
            <p className="text-3xl font-display text-[oklch(0.78_0.18_85)]">{t("wealth.level")} {level}</p>
            <p className="text-white/80 text-sm font-semibold">{getLevelTitle(level)}</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>{xpInLevel} XP</span>
                <span>{xpToNext} {t("wealth.to_next")}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full xp-bar-shimmer"
                  initial={{ width: 0 }}
                  animate={{ width: `${(xpInLevel / 500) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { labelKey: "wealth.total_xp", value: xp.toLocaleString(), icon: <Zap size={16} />, color: "text-[oklch(0.78_0.18_85)]", bg: "bg-[oklch(0.96_0.05_85)]" },
          { labelKey: "wealth.day_streak", value: streak, icon: <Flame size={16} />, color: "text-primary", bg: "bg-[oklch(0.95_0.05_25)]" },
          { labelKey: "wealth.level_label", value: level, icon: <Crown size={16} />, color: "text-[oklch(0.5_0.2_295)]", bg: "bg-[oklch(0.95_0.05_295)]" },
        ].map((s) => (
          <div key={s.labelKey} className="bg-white rounded-2xl p-3 shadow-sm border border-border text-center">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5", s.bg, s.color)}>
              {s.icon}
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{t(s.labelKey)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-border">
        <p className="text-sm font-bold text-foreground mb-3">{t("wealth.daily_actions")}</p>
        <div className="space-y-2">
          {dailyActions.map((item) => (
            <div key={item.action} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
              <span className="text-xl">{item.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{t(item.labelKey)}</p>
                <p className="text-xs text-muted-foreground">+{item.xp} XP</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-8 text-xs font-semibold"
                onClick={() => logAction.mutate({ action: item.action })}
                disabled={logAction.isPending}
              >
                {logAction.isPending ? <Loader2 size={12} className="animate-spin" /> : `+${item.xp} XP`}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {xpHistory.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <BarChart3 size={14} className="text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">{t("wealth.xp_history")}</p>
          </div>
          <div className="divide-y divide-border">
            {xpHistory.slice(0, 8).map((event: NonNullable<typeof xpHistory>[0], i: number) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <div className="w-8 h-8 rounded-xl bg-[oklch(0.96_0.05_85)] flex items-center justify-center">
                  <Zap size={14} className="text-[oklch(0.65_0.18_85)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{event.description}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(event.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className="text-sm font-bold text-[oklch(0.65_0.18_85)]">+{event.xpAwarded}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PartnersTab({ t }: { t: (key: string) => string }) {
  return (
    <div className="space-y-4 pb-6">
      <div className="bg-[oklch(0.95_0.05_160)] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={16} className="text-[oklch(0.45_0.18_160)]" />
          <p className="text-sm font-bold text-[oklch(0.3_0.15_160)]">{t("wealth.disclaimer_title")}</p>
        </div>
        <p className="text-xs text-[oklch(0.4_0.12_160)] leading-relaxed">
          {t("wealth.disclaimer_text")}
        </p>
      </div>

      <p className="text-sm font-bold text-foreground">{t("wealth.explore_platforms")}</p>

      <div className="space-y-3">
        {PARTNER_CARDS.map((card, i) => (
          <motion.div
            key={card.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={cn("rounded-2xl p-4 border-2 card-hover", card.color)}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-sm">
                {card.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{card.name}</p>
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white", card.textColor)}>
                    {card.type}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{t(card.descKey)}</p>
                <p className="text-xs font-semibold text-foreground mt-1">{t("wealth.min")}: {card.minInvest}</p>
              </div>
              <button
                onClick={() => toast.info(`${t("wealth.opening")} ${card.name}...`)}
                className={cn("w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm", card.textColor)}
              >
                <ExternalLink size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-[oklch(0.95_0.05_25)] rounded-2xl p-4">
        <p className="text-sm font-bold text-[oklch(0.45_0.18_25)] mb-2">{t("wealth.squirry_tip")}</p>
        <p className="text-xs text-[oklch(0.4_0.15_25)] leading-relaxed">
          {t("wealth.tip_text")}
        </p>
      </div>
    </div>
  );
}

function WealthSkeleton() {
  return (
    <AppLayout>
      <div className="px-4 pt-10 space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-10 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </AppLayout>
  );
}
