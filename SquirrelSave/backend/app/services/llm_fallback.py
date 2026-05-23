"""Grounded Squirry responses when remote LLM is off or unavailable — no API error text."""

from __future__ import annotations

import re

from app.config import get_settings
from app.constants import BUDGET_PLANNER_CATEGORIES, TRANSACTION_CATEGORIES

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "food_beverage": ["mcd", "kfc", "starbucks", "food", "restaurant", "cafe", "grab food", "foodpanda", "makan"],
    "transport": ["grab", "uber", "petrol", "fuel", "toll", "parking", "lrt", "mrt", "transit"],
    "shopping": ["shopee", "lazada", "amazon", "mall", "uniqlo", "grocery", "grocer", "pasar"],
    "bills_utilities": ["tnb", "electric", "water", "internet", "unifi", "maxis", "celcom", "bill"],
    "entertainment": ["netflix", "spotify", "cinema", "game", "steam"],
    "health": ["clinic", "hospital", "pharmacy", "guardian", "watson", "medical"],
    "education": ["course", "tuition", "book", "udemy", "school"],
    "savings": ["epf", "asb", "fixed deposit", "transfer to savings"],
    "income": ["salary", "payroll", "received", "credit", "refund", "cashback"],
    "other": [],
}

VALID_BUDGET_IDS = set(BUDGET_PLANNER_CATEGORIES)


def guess_category(text: str) -> str:
    lower = text.lower()
    for cat in TRANSACTION_CATEGORIES:
        if cat == "other":
            continue
        if any(kw in lower for kw in CATEGORY_KEYWORDS.get(cat, [])):
            return cat
    if re.search(r"\b(salary|payroll|income|received)\b", lower):
        return "income"
    if re.search(r"\b(food|lunch|dinner|breakfast|makan)\b", lower):
        return "food_beverage"
    return "other"


def parse_transactions_heuristic(raw_text: str) -> dict:
    transactions = []
    for line in [ln.strip() for ln in raw_text.split("\n") if ln.strip()]:
        m = re.search(r"(?:RM\s*)?(-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)", line, re.I) or re.search(
            r"(-?\d+(?:\.\d{1,2})?)", line
        )
        if not m:
            continue
        raw_amount = float(m.group(1).replace(",", ""))
        if raw_amount == 0:
            continue
        amount = abs(raw_amount)
        lower = line.lower()
        is_income = (
            raw_amount > 0
            and re.search(r"\b(salary|payroll|income|received|credit|refund)\b", lower)
            and not re.search(r"\b(debit|paid|payment|purchase)\b", lower)
        )
        merchant = re.sub(m.group(0), "", line).replace("RM", "").strip()
        merchant = re.sub(r"^[-–—•*]+\s*", "", merchant).strip() or "Transaction"
        category = guess_category(f"{merchant} {line}")
        tx_type = "income" if category == "income" or is_income else "expense"
        transactions.append(
            {
                "merchantName": merchant[:80],
                "category": category,
                "amount": amount,
                "type": tx_type,
                "confidenceScore": 0.72,
                "needsVerification": category == "other" or amount > 500,
                "note": None,
            }
        )
    return {"transactions": transactions}


def coach_fallback_reply(message: str, ctx: dict) -> str:
    settings = get_settings()
    coach = settings.coach_name
    currency = ctx.get("currency", "RM")
    income = float(ctx.get("monthlyIncome") or 0)
    streak = int(ctx.get("currentStreak") or 0)
    level = int(ctx.get("level") or 1)
    xp = int(ctx.get("xpPoints") or 0)
    wallets = ctx.get("walletContext") or "your wallets"
    lower = message.lower()
    safe = ctx.get("safeToSpend")
    spending_pct = ctx.get("spendingPercent")

    if re.search(r"\b(invest|stock|etf|crypto|portfolio|bitcoin)\b", lower):
        return (
            f"{coach} here 🐿️ Build a 3–6 month emergency fund first "
            f"({currency}{round(income * 3):,}–{currency}{round(income * 6):,} at your income), "
            "then look at low-cost diversified options. General education only — not personal advice."
        )

    if re.search(r"\b(emergency|rainy day|rainy)\b", lower):
        target = round(income * 4) if income else 3000
        return (
            f"Great question! Aim for about {currency}{target:,} in an emergency buffer "
            f"based on your {currency}{income:,.0f} monthly income. Top up your savings wallet a little each week 🌰"
        )

    if re.search(r"\b(debt|loan|credit card|pinjaman)\b", lower):
        return (
            "Hit high-interest debt first, then keep minimums on the rest. "
            f"Even {currency}50 extra per week adds up — Squirry's cheering you on! 🐿️"
        )

    if re.search(r"\b(budget|50/30/20|allocate|split|peruntuk)\b", lower):
        return (
            "A solid starting point: 50% needs, 30% wants, 20% savings. "
            f"Right now: {wallets}. Adjust sliders in onboarding if life doesn't fit the default split."
        )

    if re.search(r"\b(overspend|over budget|spent too much|habis)\b", lower):
        return (
            f"Let's slow wants spending today 🐿️ Check Activity for today's total, "
            f"then stick to what's left in your Wants wallet. Small wins beat perfect months!"
        )

    if re.search(r"\b(save|saving|simpan|tabung)\b", lower):
        return (
            f"You're level {level} with {xp} XP and a {streak}-day streak — nice! "
            "Move a fixed amount to savings every payday, even if it's small. Goals tab tracks your targets 🎯"
        )

    if re.search(r"\b(streak|xp|level|gamification)\b", lower):
        return (
            f"You're on a {streak}-day streak at level {level} ({xp} XP). "
            "Log expenses in Activity and hit daily actions on Wealth to keep momentum 🔥"
        )

    if re.search(r"\b(grab|food|makan|lunch|dinner|eating out)\b", lower):
        return (
            f"Food & drink adds up fast in Malaysia 🍜 Try a daily food cap in Wealth → Budget, "
            f"or paste your Grab/e-wallet lines in Activity → AI Parser to see the real total."
        )

    if re.search(r"\b(friend|social|compete|leaderboard|kawan)\b", lower):
        return (
            f"Head to Social to cheer on streaks with friends 🐿️ You're at {streak} days — "
            "tap a friend to extend a streak and earn bonus XP."
        )

    if re.search(r"\b(dashboard|wallet|balance|left|baki)\b", lower):
        extra = ""
        if safe is not None:
            extra = f" Safe-to-spend in Wants is about {currency}{round(float(safe))}."
        if spending_pct is not None and float(spending_pct) >= 75:
            extra += " You're getting close to your budget — favour needs over wants today."
        return f"Dashboard shows Saving vs Spending in {currency}.{extra} Tap a wallet slice for details."

    if re.search(r"\b(goal|target|laptop|holiday|vacation)\b", lower):
        return (
            "Open Goals to set a target amount and deadline. "
            "Add funds when you can — each contribution earns XP and moves Squirry closer to celebrating with you 🎉"
        )

    if re.search(r"\b(hello|hi|hey|help|hai|tolong)\b", lower):
        return (
            f"Hi! I'm {coach} 🐿️ Ask about budgeting, saving, debt, or your wallets ({wallets}). "
            f"Income: {currency}{income:,.0f}/month · streak: {streak} days."
        )

    snippet = message.strip()[:80] + ("…" if len(message) > 80 else "")
    return (
        f"On \"{snippet}\" — log it in Activity, check your wallet split on Dashboard, "
        f"and use Wealth → Budget to plan today's {currency} spending. "
        f"You've got {streak} streak days — keep going! 🐿️"
    )


def budget_planner_fallback(message: str, ctx: dict) -> dict:
    currency = ctx.get("currency", "RM")
    income = float(ctx.get("monthlyIncome") or 0) or 3000
    daily_budget = income / 30 if income else 50
    lower = message.lower()
    amounts: dict[str, float] = {}

    current = ctx.get("currentPlan") or {}
    for c in current.get("categories") or []:
        cid = c.get("id")
        if cid in VALID_BUDGET_IDS:
            amounts[cid] = float(c.get("amount") or 0)

    patterns: list[tuple[re.Pattern[str], str]] = [
        (re.compile(r"(?:food|drink|makan|lunch|dinner|breakfast|coffee)[^\d]*(?:rm\s*)?(\d+(?:\.\d+)?)", re.I), "food_beverage"),
        (re.compile(r"(?:grocer|grocery|market|pasar)[^\d]*(?:rm\s*)?(\d+(?:\.\d+)?)", re.I), "shopping"),
        (re.compile(r"(?:grab|uber|petrol|transport)[^\d]*(?:rm\s*)?(\d+(?:\.\d+)?)", re.I), "transport"),
        (re.compile(r"(?:bill|utilit|electric|internet)[^\d]*(?:rm\s*)?(\d+(?:\.\d+)?)", re.I), "bills_utilities"),
        (re.compile(r"(?:fun|entertain|netflix|game)[^\d]*(?:rm\s*)?(\d+(?:\.\d+)?)", re.I), "entertainment"),
        (re.compile(r"(?:rm\s*)?(\d+(?:\.\d+)?)\s*(?:on\s+)?(?:food|makan)", re.I), "food_beverage"),
        (re.compile(r"(?:rm\s*)?(\d+(?:\.\d+)?)\s*(?:on\s+)?(?:grocer)", re.I), "shopping"),
    ]

    for pat, cat_id in patterns:
        m = pat.search(lower) or pat.search(message)
        if m and m.lastindex and m.group(1):
            amounts[cat_id] = float(m.group(1))

    if not any(amounts.values()) and re.search(r"\b(plan|budget|fill|help|suggest|today|hari|cheap|murah)\b", lower):
        amounts = {
            "food_beverage": round(daily_budget * 0.25, 2),
            "shopping": round(daily_budget * 0.35, 2),
            "transport": round(daily_budget * 0.15, 2),
            "entertainment": round(daily_budget * 0.1, 2),
            "other": round(daily_budget * 0.15, 2),
        }

    categories = [{"id": cid, "amount": amt} for cid, amt in amounts.items() if amt > 0 and cid in VALID_BUDGET_IDS]
    daily_total = sum(c["amount"] for c in categories)

    if daily_total > 0:
        reply = f"Done! I filled about {currency}{daily_total:.0f} for the day — tweak any line you like 🐿️"
    elif re.search(r"\b(cheap|murah|low)\b", lower):
        reply = (
            f"For a lean day, try food {currency}{round(daily_budget * 0.2):.0f}, "
            f"transport {currency}{round(daily_budget * 0.15):.0f}, and skip fun spend 🐿️"
        )
    else:
        reply = 'Tell me like "food RM30, groceries RM80" and I\'ll fill the sheet for you! 🐿️'

    return {"reply": reply, "categories": categories, "dailyTotal": daily_total}


def is_recoverable_llm_error(err: Exception) -> bool:
    msg = str(err).lower()
    return bool(
        re.search(r"429|quota|rate.?limit|insufficient|depleted|exhausted", msg)
        or re.search(r"401|403|invalid.*key", msg)
        or re.search(r"500|502|503|timeout|connection", msg)
    )
