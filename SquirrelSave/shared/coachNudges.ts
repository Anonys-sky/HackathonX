import type { MascotMood } from "./config";

export type CoachNudgeKind =
  | "upload_celebration"
  | "goal_reached_evening"
  | "overspend_warning"
  | "low_spend_today"
  | "save_reminder"
  | "streak_nudge"
  | "careful_spending"
  | "friendly_checkin";

export type CoachNudge = {
  kind: CoachNudgeKind;
  mood: MascotMood;
  messageKey: string;
  reminderKey?: string;
  tipKey?: string;
  params: Record<string, string | number>;
};

export type CoachNudgeContext = {
  userName: string;
  currency: string;
  todayExpenseTotal: number;
  todayTxCount: number;
  spendingPercent: number;
  safeToSpend: number;
  monthlyIncome: number;
  hasBudgetAlert: boolean;
  streak: number;
  hour: number;
  justUploadedTx: boolean;
};

/** Dashboard bubble: budget warnings and saving tips only (no streak spam). */
export function pickDashboardCoachNudge(ctx: CoachNudgeContext): CoachNudge | null {
  const name = ctx.userName || "there";
  const params: Record<string, string | number> = {
    name,
    currency: ctx.currency,
    amount: Math.round(ctx.todayExpenseTotal),
    streak: ctx.streak,
    safe: Math.round(ctx.safeToSpend),
    percent: Math.round(ctx.spendingPercent),
  };

  if (ctx.justUploadedTx && ctx.spendingPercent < 75 && !ctx.hasBudgetAlert) {
    return {
      kind: "upload_celebration",
      mood: "celebrating",
      messageKey: "nudge.upload_celebration",
      reminderKey: "nudge.reminder_saving",
      params,
    };
  }

  if (ctx.hasBudgetAlert || ctx.spendingPercent >= 80) {
    return {
      kind: "overspend_warning",
      mood: "alert",
      messageKey: "nudge.overspend",
      reminderKey: "nudge.reminder_overspend",
      tipKey: "nudge.tip_adjust",
      params,
    };
  }

  if (ctx.spendingPercent >= 65) {
    return {
      kind: "overspend_warning",
      mood: "worried",
      messageKey: "nudge.budget_slow_down",
      reminderKey: "nudge.reminder_overspend",
      tipKey: "nudge.tip_adjust",
      params,
    };
  }

  if (ctx.safeToSpend >= 0 && ctx.safeToSpend < 30) {
    return {
      kind: "careful_spending",
      mood: "worried",
      messageKey: "nudge.careful",
      reminderKey: "nudge.reminder_overspend",
      tipKey: "nudge.tip_adjust",
      params,
    };
  }

  if (ctx.todayExpenseTotal > 0 && ctx.todayExpenseTotal > Math.max(40, ctx.monthlyIncome / 25)) {
    return {
      kind: "careful_spending",
      mood: "alert",
      messageKey: "nudge.heavy_day",
      reminderKey: "nudge.reminder_overspend",
      params,
    };
  }

  if (ctx.spendingPercent < 55) {
    return {
      kind: "save_reminder",
      mood: "happy",
      messageKey: "nudge.save_reminder",
      reminderKey: "nudge.reminder_saving",
      tipKey: "nudge.tip_adjust",
      params,
    };
  }

  return {
    kind: "friendly_checkin",
    mood: "happy",
    messageKey: "nudge.checkin",
    reminderKey: "nudge.reminder_saving",
    tipKey: "nudge.tip_adjust",
    params,
  };
}

export function pickCoachNudge(ctx: CoachNudgeContext): CoachNudge {
  const name = ctx.userName || "there";
  const amount = Math.round(ctx.todayExpenseTotal);
  const params: Record<string, string | number> = {
    name,
    currency: ctx.currency,
    amount,
    streak: ctx.streak,
    safe: Math.round(ctx.safeToSpend),
    percent: Math.round(ctx.spendingPercent),
  };

  if (ctx.justUploadedTx && ctx.spendingPercent < 75) {
    return {
      kind: "upload_celebration",
      mood: "celebrating",
      messageKey: "nudge.upload_celebration",
      reminderKey: "nudge.reminder_logged",
      tipKey: "nudge.tip_keep_streak",
      params,
    };
  }

  if (ctx.hasBudgetAlert || ctx.spendingPercent >= 80) {
    return {
      kind: "overspend_warning",
      mood: "worried",
      messageKey: "nudge.overspend",
      reminderKey: "nudge.reminder_overspend",
      tipKey: "nudge.tip_adjust",
      params,
    };
  }

  if (ctx.hour >= 18 && ctx.todayTxCount > 0 && ctx.spendingPercent < 65) {
    return {
      kind: "goal_reached_evening",
      mood: "celebrating",
      messageKey: "nudge.evening_win",
      reminderKey: "nudge.reminder_goal",
      tipKey: "nudge.tip_adjust",
      params,
    };
  }

  if (ctx.todayExpenseTotal > 0 && ctx.todayExpenseTotal <= Math.max(30, ctx.monthlyIncome / 40)) {
    return {
      kind: "low_spend_today",
      mood: "happy",
      messageKey: "nudge.low_spend",
      reminderKey: "nudge.reminder_saving",
      tipKey: "nudge.tip_adjust",
      params,
    };
  }

  if (ctx.hour < 15 && ctx.streak >= 1) {
    return {
      kind: "save_reminder",
      mood: "happy",
      messageKey: "nudge.save_reminder",
      reminderKey: "nudge.reminder_saving",
      tipKey: "nudge.tip_adjust",
      params,
    };
  }

  if (ctx.streak === 0 && ctx.hour >= 12) {
    return {
      kind: "streak_nudge",
      mood: "happy",
      messageKey: "nudge.streak",
      reminderKey: "nudge.reminder_logged",
      tipKey: "nudge.tip_keep_streak",
      params,
    };
  }

  if (ctx.safeToSpend < 20 && ctx.safeToSpend >= 0) {
    return {
      kind: "careful_spending",
      mood: "alert",
      messageKey: "nudge.careful",
      reminderKey: "nudge.reminder_overspend",
      tipKey: "nudge.tip_adjust",
      params,
    };
  }

  return {
    kind: "friendly_checkin",
    mood: "happy",
    messageKey: "nudge.checkin",
    reminderKey: "nudge.reminder_saving",
    tipKey: "nudge.tip_adjust",
    params,
  };
}

export function formatNudgeText(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(params[key] ?? ""));
}
