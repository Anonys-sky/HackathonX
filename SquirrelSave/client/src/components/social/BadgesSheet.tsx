import { GAMIFICATION } from "@shared/config";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function BadgesSheet({
  open,
  onClose,
  myStreak,
  t,
}: {
  open: boolean;
  onClose: () => void;
  myStreak: number;
  t: (key: string) => string;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("social.streak_badges")}</SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground mb-4">{t("social.badges_hint")}</p>
        <div className="grid grid-cols-3 gap-3 pb-6">
          {GAMIFICATION.streakBadges.map((badge) => {
            const earned = myStreak >= badge.days;
            return (
              <div
                key={badge.days}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-2xl border-2",
                  earned ? `${badge.color} border-current` : "bg-muted/60 border-transparent opacity-45"
                )}
              >
                <span className="text-2xl">{badge.emoji}</span>
                <span className="text-[10px] font-bold text-center leading-tight">{t(badge.labelKey)}</span>
                <span className="text-[10px] opacity-70">{badge.days}d</span>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
