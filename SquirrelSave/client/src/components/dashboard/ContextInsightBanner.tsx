import { CloudRain, GraduationCap, Sparkles } from "lucide-react";
import type { SpendingContext } from "@/lib/contextEngine";

export function ContextInsightBanner({
  ctx,
  message,
  t,
}: {
  ctx: SpendingContext;
  message: string;
  t: (key: string) => string;
}) {
  const isRain = !!ctx.weather?.isRaining;
  const isExam = !!ctx.exam;

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-[oklch(0.9_0.04_250)] bg-gradient-to-r from-[oklch(0.97_0.03_250)] to-white px-3 py-2.5 flex gap-2.5 shadow-sm">
      <div className="w-8 h-8 rounded-xl bg-white border border-border/50 flex items-center justify-center shrink-0">
        {isRain ? (
          <CloudRain size={16} className="text-[oklch(0.45_0.14_250)]" />
        ) : isExam ? (
          <GraduationCap size={16} className="text-[oklch(0.45_0.14_295)]" />
        ) : (
          <Sparkles size={16} className="text-primary" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
          {t("context.title")}
        </p>
        <p className="text-xs text-foreground leading-snug mt-0.5">{message}</p>
        {ctx.adjustedSafeDaily < ctx.baseSafeDaily && (
          <p className="text-[10px] text-primary font-semibold mt-1">{t("context.adjusted")}</p>
        )}
      </div>
    </div>
  );
}
