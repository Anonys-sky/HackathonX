import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Sits above the 4rem bottom tab bar — must not use bottom-0 + z-50 or it hides navigation. */
const TAB_BAR_HEIGHT = "4rem";

export function LogTransactionFab({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 z-40 pointer-events-none"
      style={{ bottom: TAB_BAR_HEIGHT }}
      role="region"
      aria-label={label}
    >
      <div className="pointer-events-auto max-w-lg mx-auto px-4 py-3 bg-gradient-to-t from-[oklch(0.98_0.015_25)] via-[oklch(0.98_0.015_25)]/95 to-transparent">
        <Button
          type="button"
          size="lg"
          className="w-full h-14 rounded-2xl text-base font-bold shadow-xl border-2 border-primary/30 gap-2"
          onClick={onClick}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Plus size={22} strokeWidth={2.5} />
          </span>
          {label}
        </Button>
      </div>
    </div>
  );
}
