import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SquirryMascot, type MascotMood } from "@/components/SquirryMascot";
import { useTranslation } from "@/hooks/useTranslation";
import {
  pickCoachNudge,
  pickDashboardCoachNudge,
  formatNudgeText,
  type CoachNudgeContext,
} from "@shared/coachNudges";
import { t as translate } from "@/lib/i18n";
import { X, Lightbulb, Star, CloudRain, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export type SquirryContextInsight = {
  message: string | null;
  kind?: "rain" | "exam" | "exam_soon";
  showAdjustedNote?: boolean;
};

type SquirryNudgeBubbleProps = {
  context: CoachNudgeContext;
  justUploadedTx: boolean;
  /** Dashboard: bottom-right, budget/save focus, no streak rotation */
  variant?: "default" | "dashboard";
  /** Weather / exam context shown below the main coach line */
  contextInsight?: SquirryContextInsight;
};

const DISMISS_KEY = {
  default: "squirry-nudge-dismissed",
  dashboard: "squirry-nudge-dashboard-dismissed",
};

export function SquirryNudgeBubble({
  context,
  justUploadedTx,
  variant = "default",
  contextInsight,
}: SquirryNudgeBubbleProps) {
  const { t, language } = useTranslation();
  const storageKey = DISMISS_KEY[variant];

  const [dismissed, setDismissed] = useState(
    () => typeof sessionStorage !== "undefined" && sessionStorage.getItem(storageKey) === "1"
  );
  const [rotateIdx, setRotateIdx] = useState(0);

  const nudge = useMemo(() => {
    if (variant === "dashboard") {
      return pickDashboardCoachNudge({ ...context, justUploadedTx });
    }
    return pickCoachNudge({ ...context, justUploadedTx });
  }, [context, justUploadedTx, variant]);

  const altNudges = useMemo(() => {
    if (variant === "dashboard") return [];
    const variants: CoachNudgeContext[] = [
      { ...context, justUploadedTx: false, hour: 10 },
      { ...context, justUploadedTx: false, spendingPercent: 85, hasBudgetAlert: true },
      { ...context, justUploadedTx: false, hour: 20, todayTxCount: 3, spendingPercent: 40 },
    ];
    return variants.map((v) => pickCoachNudge(v));
  }, [context, variant]);

  const displayNudge =
    variant === "dashboard" || !dismissed
      ? nudge
      : altNudges[rotateIdx % altNudges.length] ?? nudge;

  useEffect(() => {
    if (variant === "dashboard" || !dismissed) return;
    const id = setInterval(() => setRotateIdx((i) => i + 1), 12000);
    return () => clearInterval(id);
  }, [dismissed, variant]);

  useEffect(() => {
    if (justUploadedTx) {
      setDismissed(false);
      sessionStorage.removeItem(storageKey);
    }
  }, [justUploadedTx, storageKey]);

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(storageKey, "1");
  };

  const reopen = () => {
    setDismissed(false);
    sessionStorage.removeItem(storageKey);
  };

  if (!displayNudge) return null;

  const msg = formatNudgeText(translate(displayNudge.messageKey, language), displayNudge.params);
  const reminder = displayNudge.reminderKey
    ? formatNudgeText(translate(displayNudge.reminderKey, language), displayNudge.params)
    : null;
  const tip = displayNudge.tipKey
    ? formatNudgeText(translate(displayNudge.tipKey, language), displayNudge.params)
    : null;

  const isDashboard = variant === "dashboard";
  const fabPosition = "bottom-[calc(8.75rem+env(safe-area-inset-bottom))] right-3";

  const ContextIcon =
    contextInsight?.kind === "rain"
      ? CloudRain
      : contextInsight?.kind === "exam" || contextInsight?.kind === "exam_soon"
        ? GraduationCap
        : Lightbulb;

  return (
    <>
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className={cn(
              "fixed z-[55] pointer-events-auto",
              isDashboard
                ? `${fabPosition} w-[min(calc(100vw-1.5rem),17.5rem)]`
                : "bottom-[4.75rem] right-3 left-3 max-w-md ml-auto"
            )}
          >
            <div className={cn("flex items-end gap-2", isDashboard && "flex-row-reverse")}>
              <div className="shrink-0 mb-1">
                <SquirryMascot mood={displayNudge.mood as MascotMood} size={isDashboard ? 44 : 52} />
              </div>
              <div className="relative flex-1 min-w-0">
                <button
                  type="button"
                  onClick={dismiss}
                  className="absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full bg-white border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:bg-muted"
                  aria-label={t("nudge.dismiss")}
                >
                  <X size={12} />
                </button>
                <div
                  className={cn(
                    "rounded-2xl border shadow-lg px-3 py-2.5 pr-8",
                    isDashboard ? "rounded-br-sm" : "rounded-bl-sm",
                    displayNudge.mood === "worried" || displayNudge.mood === "alert"
                      ? "bg-amber-50 border-amber-200"
                      : displayNudge.mood === "celebrating"
                        ? "bg-[oklch(0.96_0.06_160)] border-green-200"
                        : "bg-white border-border"
                  )}
                >
                  {isDashboard && (
                    <p className="text-[9px] font-semibold text-primary uppercase tracking-wide mb-1">
                      {t("dashboard.ai_assistant_short")}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-foreground leading-snug">{msg}</p>
                  {isDashboard && contextInsight?.message && (
                    <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        {t("context.title")}
                      </p>
                      <p className="text-[11px] text-foreground leading-snug flex items-start gap-1.5">
                        <ContextIcon size={12} className="shrink-0 mt-0.5 text-primary" />
                        <span>{contextInsight.message}</span>
                      </p>
                      {contextInsight.showAdjustedNote && (
                        <p className="text-[10px] text-primary font-semibold pl-[18px]">
                          {t("context.adjusted")}
                        </p>
                      )}
                    </div>
                  )}
                  {reminder && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Star size={10} className="text-[oklch(0.78_0.18_85)] shrink-0" />
                      <span>{reminder}</span>
                    </p>
                  )}
                  {tip && !isDashboard && (
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-start gap-1">
                      <Lightbulb size={10} className="text-primary shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isDashboard && dismissed && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={reopen}
          className={cn(
            "fixed z-[55] pointer-events-auto rounded-full",
            "bg-white border-2 border-primary/30 shadow-lg p-1",
            "active:scale-95 transition-transform",
            fabPosition
          )}
          aria-label={t("nudge.show_coach")}
        >
          <SquirryMascot mood={displayNudge.mood as MascotMood} size={52} />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-white" />
        </motion.button>
      )}
    </>
  );
}
