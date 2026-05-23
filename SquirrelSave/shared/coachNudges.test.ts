import { describe, expect, it } from "vitest";
import { pickCoachNudge, pickDashboardCoachNudge } from "./coachNudges";

describe("pickCoachNudge", () => {
  const base = {
    userName: "Ali",
    currency: "RM",
    todayExpenseTotal: 12,
    todayTxCount: 2,
    spendingPercent: 30,
    safeToSpend: 200,
    monthlyIncome: 1500,
    hasBudgetAlert: false,
    streak: 3,
    hour: 14,
    justUploadedTx: false,
  };

  it("celebrates after upload", () => {
    const n = pickCoachNudge({ ...base, justUploadedTx: true });
    expect(n.kind).toBe("upload_celebration");
  });

  it("warns on overspend", () => {
    const n = pickCoachNudge({ ...base, spendingPercent: 90, hasBudgetAlert: true });
    expect(n.kind).toBe("overspend_warning");
  });
});

describe("pickDashboardCoachNudge", () => {
  const base = {
    userName: "Ali",
    currency: "RM",
    todayExpenseTotal: 12,
    todayTxCount: 2,
    spendingPercent: 30,
    safeToSpend: 200,
    monthlyIncome: 1500,
    hasBudgetAlert: false,
    streak: 0,
    hour: 14,
    justUploadedTx: false,
  };

  it("never returns streak nudge at zero streak", () => {
    const n = pickDashboardCoachNudge({ ...base, streak: 0, hour: 14 });
    expect(n?.kind).not.toBe("streak_nudge");
  });

  it("warns when budget is mostly used", () => {
    const n = pickDashboardCoachNudge({ ...base, spendingPercent: 85, hasBudgetAlert: true });
    expect(n?.kind).toBe("overspend_warning");
  });

  it("reminds to save when spending is low", () => {
    const n = pickDashboardCoachNudge({ ...base, spendingPercent: 20 });
    expect(n?.kind).toBe("save_reminder");
  });
});
