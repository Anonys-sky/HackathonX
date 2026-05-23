"""Weekly streak pot — XP stakes only (gamified accountability, no real money)."""

from __future__ import annotations

from datetime import datetime, timezone

from app.store import get_store


def _week_key(dt: datetime | None = None) -> str:
    d = dt or datetime.now(timezone.utc)
    iso = d.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def _today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def compute_daily_safe_limit(uid: str) -> float:
    store = get_store()
    wallets = store.list_wallets(uid)
    spending_types = {"needs", "wants"}
    remaining = sum(
        float(w.get("currentBalance") or 0)
        for w in wallets
        if w.get("walletType") in spending_types
    )
    if remaining <= 0:
        return 0.0
    import calendar

    now = datetime.now(timezone.utc)
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    days_left = max(1, days_in_month - now.day + 1)
    return remaining / days_left


def today_expense_total(uid: str) -> float:
    store = get_store()
    today = _today_key()
    txs = store.list_transactions(uid, limit=200, offset=0)
    total = 0.0
    for tx in txs:
        if tx.get("type") != "expense":
            continue
        raw = tx.get("transactedAt") or tx.get("createdAt") or ""
        if raw[:10] == today:
            total += float(tx.get("amount") or 0)
    return total


def user_breached_today(uid: str) -> bool:
    limit = compute_daily_safe_limit(uid)
    if limit <= 0:
        return False
    spent = today_expense_total(uid)
    return spent > limit * 1.05


def evaluate_pot_for_user(uid: str, pot: dict) -> dict:
    """Update member breach flags for today (NPCs simulated)."""
    today = _today_key()
    breached = user_breached_today(uid)
    members = []
    for m in pot.get("members", []):
        copy = dict(m)
        if m.get("uid") == uid:
            copy["breachedToday"] = breached
            copy["todayCheckedAt"] = today
        elif m.get("isNpc"):
            copy.setdefault("breachedToday", False)
            copy["todayCheckedAt"] = today
        members.append(copy)
    pot = {**pot, "members": members}
    return pot
