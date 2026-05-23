import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { SquirryMascot } from "@/components/SquirryMascot";
import { useTranslation } from "@/hooks/useTranslation";
import { trpc } from "@/lib/trpc";
import { Zap, Users, Brain, Shield, ChevronRight, Star, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@shared/brand";
import { apiClient } from "@/lib/api/client";

export default function Home() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const profileQuery = trpc.profile.get.useQuery();

  useEffect(() => {
    if (!profileQuery.isSuccess || profileQuery.data === undefined) return;
    const target = profileQuery.data?.onboardingComplete ? "/dashboard" : "/onboard";
    navigate(target);
  }, [profileQuery.isSuccess, profileQuery.data, navigate]);

  async function continueWithoutLogin() {
    await apiClient.auth.demo();
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    const profile = await apiClient.profile.get();
    navigate(profile?.onboardingComplete ? "/dashboard" : "/onboard");
  }

  if (profileQuery.isSuccess) {
    return null;
  }

  const FEATURES = [
    { icon: Brain, titleKey: "feature.ai_parser", descKey: "feature.ai_parser_desc", color: "bg-[oklch(0.95_0.05_295)]", iconColor: "text-[oklch(0.5_0.2_295)]" },
    { icon: Zap, titleKey: "feature.streaks", descKey: "feature.streaks_desc", color: "bg-[oklch(0.96_0.05_85)]", iconColor: "text-[oklch(0.55_0.18_85)]" },
    { icon: Users, titleKey: "feature.social", descKey: "feature.social_desc", color: "bg-[oklch(0.95_0.05_160)]", iconColor: "text-[oklch(0.45_0.18_160)]" },
    { icon: Shield, titleKey: "feature.wallets", descKey: "feature.wallets_desc", color: "bg-[oklch(0.95_0.05_25)]", iconColor: "text-primary" },
  ];

  const HOW_IT_WORKS = [
    { step: "1", titleKey: "onboard.income", descKey: "onboard.income_desc", emoji: "💰" },
    { step: "2", titleKey: "activity.parser_title", descKey: "activity.parser_desc", emoji: "🤖" },
    { step: "3", titleKey: "social.your_streak", descKey: "social.add_friend_desc", emoji: "🔥" },
    { step: "4", titleKey: "wealth.title", descKey: "wealth.subtitle", emoji: "📈" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[oklch(0.97_0.04_25)] via-background to-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-4 max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐿️</span>
          <span className="font-display text-xl text-foreground">{BRAND_NAME}</span>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full h-8 w-8 p-0">
                <Globe size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage("en")} className={cn(language === "en" && "bg-muted")}>
                {t("common.english")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("bm")} className={cn(language === "bm" && "bg-muted")}>
                {t("common.bahasa_malaysia")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => void continueWithoutLogin()}
          >
            {t("home.cta")}
          </Button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6">
        {/* Hero */}
        <div className="text-center py-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 150, damping: 12 }}
            className="flex justify-center mb-6"
          >
            <SquirryMascot mood="celebrating" size={160} level={5} />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-display text-foreground mb-3 leading-tight">
              {t("home.title")}
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed mb-6">
              {t("home.subtitle")}
            </p>

            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => navigate("/onboard")}
                className="w-full h-14 rounded-2xl text-base font-bold bg-coral-gradient text-white shadow-lg shadow-primary/30"
              >
                {t("home.cta")}
                <ChevronRight size={18} className="ml-1" />
              </Button>
            </motion.div>

            <p className="text-xs text-muted-foreground mt-3">{t("home.no_card")}</p>
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-around bg-white rounded-2xl p-4 shadow-sm border border-border mb-8"
        >
          {[
            { value: "10K+", labelKey: "home.stats.users" },
            { value: "RM2M+", labelKey: "home.stats.saved" },
            { value: "4.9★", labelKey: "home.stats.rating" },
          ].map((s) => (
            <div key={s.labelKey} className="text-center">
              <p className="text-xl font-display text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{t(s.labelKey)}</p>
            </div>
          ))}
        </motion.div>

        {/* Features */}
        <div className="mb-8">
          <h2 className="text-xl font-display text-foreground mb-4 text-center">{t("home.features.title")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.titleKey}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i + 0.5 }}
                  className={`rounded-2xl p-4 ${f.color}`}
                >
                  <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center mb-2 shadow-sm`}>
                    <Icon size={18} className={f.iconColor} />
                  </div>
                  <p className="text-sm font-bold text-foreground mb-1">{t(f.titleKey)}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{t(f.descKey)}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* How it works */}
        <div className="mb-8">
          <h2 className="text-xl font-display text-foreground mb-4 text-center">{t("home.how_it_works")}</h2>
          <div className="space-y-3">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i + 0.8 }}
                className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm border border-border"
              >
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{item.emoji} {t(item.titleKey)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(item.descKey)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-8">
          <h2 className="text-xl font-display text-foreground mb-4 text-center">{t("home.testimonials")}</h2>
          <div className="space-y-3">
            {[
              { name: "Aisha R.", text: "Finally a budgeting app I actually enjoy using! The squirrel mascot is adorable 🐿️", stars: 5 },
              { name: "Wei J.", text: "The AI parser saved me hours of manual entry. Game changer!", stars: 5 },
              { name: "Priya N.", text: "I've saved RM2,000 more this year thanks to the streak system!", stars: 5 },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i + 1.2 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-border"
              >
                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={12} className="text-[oklch(0.78_0.18_85)] fill-current" />
                  ))}
                </div>
                <p className="text-sm text-foreground mb-2">"{t.text}"</p>
                <p className="text-xs text-muted-foreground font-semibold">— {t.name}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="pb-16 text-center">
          <SquirryMascot mood="happy" size={80} />
          <h2 className="text-2xl font-display text-foreground mt-4 mb-2">{t("home.ready")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("home.join")}</p>
          <Button
            onClick={() => void continueWithoutLogin()}
            className="w-full h-14 rounded-2xl text-base font-bold bg-coral-gradient text-white shadow-lg"
          >
            {t("home.cta")}
          </Button>
          <Button
            variant="outline"
            onClick={() => void continueWithoutLogin()}
            className="w-full h-12 rounded-2xl text-sm font-semibold mt-3 border-2"
          >
            Continue without login
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2">
            For judges & demos — no account required
          </p>
        </div>
      </main>
    </div>
  );
}
