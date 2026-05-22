import { describe, expect, it } from "vitest";
import { pickCoachNudge } from "./coachNudges";

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
