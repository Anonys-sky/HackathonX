import { describe, expect, it } from "vitest";
import {
  savingsContributionsFromTransactions,
  walletSavedTowardGoal,
  walletSpent,
} from "./budgetCycle";

describe("walletSavedTowardGoal", () => {
  it("counts balance filling from zero", () => {
    expect(walletSavedTowardGoal(360, 50)).toBe(50);
  });

  it("handles legacy full bucket plus deposits", () => {
    expect(walletSavedTowardGoal(360, 360)).toBe(0);
    expect(walletSavedTowardGoal(360, 410)).toBe(50);
  });
});

describe("walletSpent", () => {
  it("counts spending wallet usage", () => {
    expect(walletSpent(1440, 1285)).toBe(155);
  });
});

describe("savingsContributionsFromTransactions", () => {
  it("sums savings income rows", () => {
    const total = savingsContributionsFromTransactions([
      { type: "income", category: "savings", amount: 50 },
      { type: "expense", category: "food_beverage", amount: 10 },
      { type: "income", category: "income", amount: 100 },
    ]);
    expect(total).toBe(50);
  });
});
