import { describe, expect, it } from "vitest";
import { coachFallbackReply, isRecoverableLlmError, parseTransactionsHeuristic } from "./llmFallback";

describe("llmFallback", () => {
  const ctx = {
    currency: "RM",
    monthlyIncome: 3000,
    currentStreak: 5,
    level: 2,
    xpPoints: 100,
    walletContext: "Needs: RM500 / RM1500",
  };

  it("detects quota errors as recoverable", () => {
    expect(isRecoverableLlmError(new Error("LLM invoke failed: 429 Too Many Requests – insufficient_quota"))).toBe(
      true
    );
  });

  it("parses heuristic transaction lines", () => {
    const { transactions } = parseTransactionsHeuristic(
      "Grab RM 15.50\nShopee -42.00\nSalary received RM 2500"
    );
    expect(transactions.length).toBeGreaterThanOrEqual(2);
    expect(transactions[0].merchantName).toBeTruthy();
    expect(transactions[0].amount).toBeGreaterThan(0);
  });

  it("returns coach reply for budget questions", () => {
    const reply = coachFallbackReply("How should I budget?", ctx);
    expect(reply).toMatch(/50%|needs/i);
  });
});
