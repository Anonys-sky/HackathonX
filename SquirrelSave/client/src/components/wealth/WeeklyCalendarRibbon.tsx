import { cn } from "@/lib/utils";
import { dateKey } from "@shared/budgetPlanner";

function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offset);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function getWeekDaysAround(anchor: Date): Date[] {
  const monday = startOfWeekMonday(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

type Props = {
  selected: Date;
  onSelect: (d: Date) => void;
  hasPlanForDate?: (key: string) => boolean;
};

export function WeeklyCalendarRibbon({ selected, onSelect, hasPlanForDate }: Props) {
  const days = getWeekDaysAround(selected);
  const selectedKey = dateKey(selected);
  const todayKey = dateKey(new Date());

  return (
    <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
      <div className="flex gap-2 min-w-max pb-1">
        {days.map((day) => {
          const key = dateKey(day);
          const isSelected = key === selectedKey;
          const isToday = key === todayKey;
          const hasPlan = hasPlanForDate?.(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                "flex flex-col items-center justify-center w-[52px] h-[64px] rounded-2xl border transition-all shrink-0",
                isSelected
                  ? "bg-[oklch(0.55_0.14_25)] border-[oklch(0.5_0.14_25)] text-white shadow-md"
                  : "bg-white/90 border-[oklch(0.92_0.02_25)] text-foreground hover:border-primary/30"
              )}
            >
              <span className={cn("text-[10px] font-semibold uppercase", isSelected ? "text-white/85" : "text-muted-foreground")}>
                {day.toLocaleDateString("en-MY", { weekday: "short" })}
              </span>
              <span className="text-lg font-bold leading-none mt-0.5">{day.getDate()}</span>
              {isToday && !isSelected && (
                <span className="text-[9px] font-bold text-primary mt-0.5">Today</span>
              )}
              {hasPlan && (
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mt-1",
                    isSelected ? "bg-white" : "bg-[oklch(0.65_0.16_85)]"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
