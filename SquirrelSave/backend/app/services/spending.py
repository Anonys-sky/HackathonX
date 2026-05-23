from app.config import get_settings
from app.gamification import compute_mascot_mood, is_budget_alert
from app.store import get_store


def wallet_alerts(uid: str) -> list[dict]:
    store = get_store()
    settings = get_settings()
    alerts = []
    for w in store.list_wallets(uid):
        allocated = float(w.get("allocatedAmount") or 0)
        balance = float(w.get("currentBalance") or 0)
        spent_pct = round(((allocated - balance) / allocated) * 100) if allocated > 0 else 0
        alerts.append(
            {
                "walletId": w["id"],
                "walletLabel": w.get("label", ""),
                "spendingPercent": spent_pct,
                "isAlert": is_budget_alert(spent_pct, settings.budget_alert_threshold),
            }
        )
    return alerts


def spending_percent(uid: str) -> float:
    store = get_store()
    wallets = store.list_wallets(uid)
    total_allocated = sum(float(w.get("allocatedAmount") or 0) for w in wallets)
    total_spent = sum(
        float(w.get("allocatedAmount") or 0) - float(w.get("currentBalance") or 0) for w in wallets
    )
    return (total_spent / total_allocated) * 100 if total_allocated > 0 else 0.0


def sync_mascot_mood(uid: str) -> str:
    store = get_store()
    profile = store.get_profile(uid) or {}
    alerts = wallet_alerts(uid)
    has_alert = any(a["isAlert"] for a in alerts)
    pct = spending_percent(uid)
    mood = compute_mascot_mood(pct, int(profile.get("currentStreak") or 0), has_alert)
    store.update_profile(uid, {"mascotMood": mood})
    return mood


def format_wallet_context(uid: str, currency: str, compact: bool = False) -> str:
    store = get_store()
    parts = []
    for w in store.list_wallets(uid):
        label = w.get("label", "")
        bal = float(w.get("currentBalance") or 0)
        alloc = float(w.get("allocatedAmount") or 0)
        if compact:
            parts.append(f"{label}: {currency}{bal:.0f} left of {currency}{alloc:.0f}")
        else:
            parts.append(f"{label}: {currency}{bal:.2f} / {currency}{alloc:.2f}")
    return ", ".join(parts)
