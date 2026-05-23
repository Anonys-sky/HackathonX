/** Rules for contextual Safe-to-Spend adjustments (exam buffer, rain hints). */

/** Demo campus — Universiti Sains Malaysia area (Gelugor, Penang). */
export const DEMO_CAMPUS = {
  name: "Gelugor",
  latitude: 5.3551,
  longitude: 100.3018,
} as const;

/** Finals-style periods (demo). Extend for real academic calendar sync later. */
export const EXAM_PERIODS: ReadonlyArray<{ label: string; start: string; end: string; bufferDays: number }> = [
  { label: "Finals week", start: "2026-05-15", end: "2026-05-29", bufferDays: 14 },
  { label: "Mid-semester exams", start: "2026-10-12", end: "2026-10-24", bufferDays: 10 },
];

export type ExamContext = {
  active: boolean;
  label: string;
  daysUntilStart: number;
  bufferFactor: number;
};

export function getExamContext(date = new Date()): ExamContext | null {
  const today = date.toISOString().slice(0, 10);

  for (const period of EXAM_PERIODS) {
    const start = new Date(period.start + "T00:00:00");
    const end = new Date(period.end + "T23:59:59");
    const now = date.getTime();

    if (now >= start.getTime() && now <= end.getTime()) {
      return {
        active: true,
        label: period.label,
        daysUntilStart: 0,
        bufferFactor: 0.85,
      };
    }

    const msUntil = start.getTime() - now;
    const daysUntil = Math.ceil(msUntil / 86400000);
    if (daysUntil > 0 && daysUntil <= period.bufferDays) {
      const tighten = 1 - (period.bufferDays - daysUntil) * 0.02;
      return {
        active: false,
        label: period.label,
        daysUntilStart: daysUntil,
        bufferFactor: Math.max(0.75, Math.min(0.95, tighten)),
      };
    }
  }

  if (today >= "2026-05-01" && today < "2026-05-15") {
    return {
      active: false,
      label: "Finals week",
      daysUntilStart: Math.ceil(
        (new Date("2026-05-15T00:00:00").getTime() - date.getTime()) / 86400000
      ),
      bufferFactor: 0.88,
    };
  }

  return null;
}

export function applyContextToSafeSpend(baseDaily: number, exam: ExamContext | null): number {
  if (baseDaily <= 0) return 0;
  if (!exam) return baseDaily;
  return baseDaily * exam.bufferFactor;
}
