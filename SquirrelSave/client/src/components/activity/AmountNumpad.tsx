import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;

export function AmountNumpad({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const press = (key: (typeof KEYS)[number]) => {
    if (key === "del") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (value.includes(".")) return;
      onChange(value === "" ? "0." : `${value}.`);
      return;
    }
    if (value === "0") {
      onChange(key);
      return;
    }
    const next = value + key;
    const parts = next.split(".");
    if (parts[1] && parts[1].length > 2) return;
    onChange(next);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          className={cn(
            "h-14 rounded-2xl text-xl font-semibold transition-colors active:scale-[0.98]",
            key === "del"
              ? "bg-muted text-muted-foreground"
              : "bg-white border border-border text-foreground shadow-sm"
          )}
        >
          {key === "del" ? <Delete size={22} className="mx-auto" /> : key}
        </button>
      ))}
    </div>
  );
}
