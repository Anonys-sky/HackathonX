import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SquirryMascot, type MascotMood } from "@/components/SquirryMascot";
import { useTranslation } from "@/hooks/useTranslation";
import { pickCoachNudge, formatNudgeText, type CoachNudgeContext } from "@shared/coachNudges";
import { t as translate } from "@/lib/i18n";
import { X, Lightbulb, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type SquirryNudgeBubbleProps = {
  context: CoachNudgeContext;
  justUploadedTx: boolean;
};

export function SquirryNudgeBubble({ context, justUploadedTx }: SquirryNudgeBubbleProps) {
  const { t, language } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [rotateIdx, setRotateIdx] = useState(0);

  const nudge = useMemo(
    () => pickCoachNudge({ ...context, justUploadedTx }),
    [context, justUploadedTx]
  );

  const altNudges = useMemo(() => {
    const variants: CoachNudgeContext[] = [
      { ...context, justUploadedTx: false, hour: 10 },
      { ...context, justUploadedTx: false, spendingPercent: 85, hasBudgetAlert: true },
      { ...context, justUploadedTx: false, hour: 20, todayTxCount: 3, spendingPercent: 40 },
    ];
    return variants.map((v) => pickCoachNudge(v));
  }, [context]);

  const displayNudge = dismissed ? altNudges[rotateIdx % altNudges.length] ?? nudge : nudge;

  useEffect(() => {
    if (!dismissed) return;
    const id = setInterval(() => setRotateIdx((i) => i + 1), 12000);
    return () => clearInterval(id);
  }, [dismissed]);

  useEffect(() => {
    if (justUploadedTx) setDismissed(false);
  }, [justUploadedTx]);

  const msg = formatNudgeText(translate(displayNudge.messageKey, language), displayNudge.params);
  const reminder = displayNudge.reminderKey
    ? formatNudgeText(translate(displayNudge.reminderKey, language), displayNudge.params)
    : null;
  const tip = displayNudge.tipKey
    ? formatNudgeText(translate(displayNudge.tipKey, language), displayNudge.params)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16 }}
        className="fixed bottom-[4.75rem] right-3 left-3 z-40 max-w-md ml-auto pointer-events-auto"
      >
        <div className="flex items-end gap-2">
          <div className="shrink-0 mb-1">
            <SquirryMascot mood={displayNudge.mood as MascotMood} size={52} />
          </div>
          <div className="relative flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:bg-background"
              aria-label={t("nudge.dismiss")}
            >
              <X size={12} />
            </button>
            <div
              className={cn(
                "rounded-2xl rounded-bl-sm border shadow-lg px-3 py-2.5 pr-8",
                displayNudge.mood === "worried" || displayNudge.mood === "alert"
                  ? "bg-amber-50 border-amber-200"
                  : displayNudge.mood === "celebrating"
                    ? "bg-[oklch(0.96_0.06_160)] border-green-200"
                    : "bg-white border-border"
              )}
            >
              <p className="text-sm font-semibold text-foreground leading-snug">{msg}</p>
              {reminder && (
                <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Star size={10} className="text-[oklch(0.78_0.18_85)] shrink-0" />
                  <span>{reminder}</span>
                </p>
              )}
              {tip && (
                <p className="text-[10px] text-muted-foreground mt-1 flex items-start gap-1">
                  <Lightbulb size={10} className="text-primary shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
