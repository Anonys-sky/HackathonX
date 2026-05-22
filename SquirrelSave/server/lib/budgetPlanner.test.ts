import { describe, expect, it } from "vitest";
import { budgetPlannerFallback, parseBudgetPlanResponse } from "./budgetPlanner";

describe("budgetPlanner", () => {
  it("parses JSON budget response", () => {
    const raw = `{"reply":"Here you go!","categories":[{"id":"food_beverage","amount":25}],"dailyTotal":25}`;
    const plan = parseBudgetPlanResponse(raw);
    expect(plan?.categories[0].amount).toBe(25);
  });

  it("fallback fills from message", () => {
    const plan = budgetPlannerFallback("Plan my budget for today", {
      currency: "RM",
      monthlyIncome: 3000,
      currentPlan: { selectedDate: "2026-05-23", categories: [] },
    });
    expect(plan.dailyTotal).toBeGreaterThan(0);
  });
});
