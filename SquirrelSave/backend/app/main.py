"""SquirryCoach FastAPI backend — replaces Node/tRPC."""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import get_settings
from app.deps import get_current_user, user_uid
from app.gamification import compute_level, xp_to_next_level
from app.services import llm, llm_fallback
from app.services.spending import format_wallet_context, sync_mascot_mood, wallet_alerts
from app.store import get_store

app = FastAPI(title="SquirryCoach API", version="2.0.0")
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    store = get_store()
    store.ensure_demo_user()
    print(f"[SquirryCoach API] Data backend: {settings.data_backend}")
    print("[SquirryCoach API] Demo / without-login mode enabled")


# ── Models ───────────────────────────────────────────────────────────────────


class ProfileSetup(BaseModel):
    monthlyIncome: float = Field(gt=0)
    currency: str = "RM"


class WalletAllocation(BaseModel):
    walletType: str
    label: str
    allocationPercent: float
    color: str


class WalletSetup(BaseModel):
    monthlyIncome: float
    allocations: list[WalletAllocation]


class TransactionAdd(BaseModel):
    merchantName: str
    category: str
    amount: float = Field(gt=0)
    type: Literal["expense", "income"] = "expense"
    walletId: int | None = None
    note: str | None = None
    transactedAt: str | None = None
    rawText: str | None = None
    confidenceScore: float | None = None
    needsVerification: bool | None = None


class TransactionUpdate(BaseModel):
    merchantName: str | None = None
    category: str | None = None
    note: str | None = None
    needsVerification: bool | None = None
    amount: float | None = None
    type: Literal["income", "expense"] | None = None
    walletId: int | None = None


class GoalCreate(BaseModel):
    name: str
    targetAmount: float
    currentAmount: float = 0
    deadline: str | None = None
    category: str = "general"
    emoji: str = "🎯"


class GoalUpdate(BaseModel):
    goalId: int
    name: str | None = None
    targetAmount: float | None = None
    currentAmount: float | None = None
    deadline: str | None = None
    category: str | None = None
    emoji: str | None = None


class FriendAdd(BaseModel):
    friendName: str
    friendAvatar: str = "🐿️"
    initialStreak: int = 0


class DailyAction(BaseModel):
    action: Literal["logged_expense", "stayed_in_budget", "saved_to_goal"]


class CoachChat(BaseModel):
    message: str


class PlanBudget(BaseModel):
    message: str
    selectedDate: str
    categories: list[dict[str, Any]]


class ParseRaw(BaseModel):
    rawText: str


# ── Auth ─────────────────────────────────────────────────────────────────────


@app.get("/api/auth/me")
def auth_me(user: dict = Depends(get_current_user)):
    return user


@app.post("/api/auth/demo")
def auth_demo(user: dict = Depends(get_current_user)):
    """Explicit 'without login' — same as guest demo user."""
    return {"user": user, "mode": "demo"}


# ── Profile ──────────────────────────────────────────────────────────────────


@app.get("/api/profile")
def profile_get(user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    profile = get_store().get_profile(uid)
    return profile


@app.post("/api/profile/setup")
def profile_setup(body: ProfileSetup, user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    get_store().upsert_profile(
        uid,
        {
            "monthlyIncome": body.monthlyIncome,
            "currency": body.currency,
            "onboardingComplete": False,
        },
    )
    return {"success": True}


@app.post("/api/profile/complete-onboarding")
def profile_complete_onboarding(user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    store = get_store()
    s = get_settings()
    existing = store.get_profile(uid) or {}
    store.upsert_profile(
        uid,
        {
            "monthlyIncome": existing.get("monthlyIncome", 0),
            "currency": existing.get("currency", s.default_currency),
            "onboardingComplete": True,
            "xpPoints": int(existing.get("xpPoints") or 0) + s.xp_onboarding,
            "level": 1,
        },
    )
    store.create_xp_event(
        uid,
        "onboarding_complete",
        s.xp_onboarding,
        f"Completed onboarding! Welcome to {s.coach_name} 🐿️",
    )
    return {"success": True}


@app.get("/api/profile/stats")
def profile_stats(user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    store = get_store()
    s = get_settings()
    profile = store.get_profile(uid)
    wallets = store.list_wallets(uid)
    xp_list = store.list_xp_events(uid, 5)
    alerts = wallet_alerts(uid)
    has_alert = any(a["isAlert"] for a in alerts)
    pct = 0.0
    total_allocated = sum(float(w.get("allocatedAmount") or 0) for w in wallets)
    if total_allocated > 0:
        total_spent = sum(
            float(w.get("allocatedAmount") or 0) - float(w.get("currentBalance") or 0)
            for w in wallets
        )
        pct = (total_spent / total_allocated) * 100

    from app.gamification import compute_mascot_mood

    mood = compute_mascot_mood(pct, int((profile or {}).get("currentStreak") or 0), has_alert)
    if profile and profile.get("mascotMood") != mood:
        store.update_profile(uid, {"mascotMood": mood})

    xp = int((profile or {}).get("xpPoints") or 0)
    return {
        "profile": profile,
        "wallets": wallets,
        "recentXp": xp_list,
        "spendingPercent": pct,
        "xpToNextLevel": xp_to_next_level(xp, s.xp_per_level),
        "mascotMood": mood,
        "budgetAlerts": [a for a in alerts if a["isAlert"]],
    }


# ── Wallets ──────────────────────────────────────────────────────────────────


@app.get("/api/wallets")
def wallets_list(user: dict = Depends(get_current_user)):
    return get_store().list_wallets(user_uid(user))


@app.post("/api/wallets/setup")
def wallets_setup(body: WalletSetup, user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    store = get_store()
    store.delete_wallets(uid)
    items = []
    for a in body.allocations:
        amt = (a.allocationPercent / 100) * body.monthlyIncome
        items.append(
            {
                "walletType": a.walletType,
                "label": a.label,
                "allocationPercent": a.allocationPercent,
                "allocatedAmount": amt,
                "currentBalance": amt,
                "color": a.color,
            }
        )
    store.create_wallets(uid, items)
    return {"success": True}


@app.patch("/api/wallets/{wallet_id}")
def wallets_update(wallet_id: int, currentBalance: float, user: dict = Depends(get_current_user)):
    get_store().update_wallet(wallet_id, {"currentBalance": currentBalance})
    return {"success": True}


# ── Transactions ─────────────────────────────────────────────────────────────


@app.get("/api/transactions")
def transactions_list(
    limit: int = 20,
    offset: int = 0,
    fromDate: str | None = None,
    toDate: str | None = None,
    user: dict = Depends(get_current_user),
):
    uid = user_uid(user)
    store = get_store()
    txs = store.list_transactions(
        uid, limit=limit, offset=offset, from_date=fromDate, to_date=toDate
    )
    total = store.count_transactions(uid)
    return {"transactions": txs, "total": total}


@app.post("/api/transactions")
def transactions_add(body: TransactionAdd, user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    store = get_store()
    s = get_settings()

    tx = store.create_transaction(
        uid,
        {
            "merchantName": body.merchantName,
            "category": body.category,
            "amount": body.amount,
            "type": body.type,
            "walletId": body.walletId,
            "note": body.note,
            "rawText": body.rawText,
            "confidenceScore": body.confidenceScore if body.confidenceScore is not None else 1.0,
            "needsVerification": body.needsVerification or False,
            "transactedAt": body.transactedAt or datetime.now(timezone.utc).isoformat(),
        },
    )

    wallet_id = body.walletId
    if not wallet_id:
        w = store.get_wallet_by_type(uid, store.category_wallet_type(body.category))
        wallet_id = w["id"] if w else None

    if wallet_id:
        if body.type == "expense":
            store.deduct_wallet(wallet_id, body.amount)
        else:
            store.add_wallet_balance(wallet_id, body.amount)

    profile = store.get_profile(uid) or {}
    new_xp = int(profile.get("xpPoints") or 0) + s.xp_transaction
    store.update_profile(uid, {"xpPoints": new_xp, "level": compute_level(new_xp, s.xp_per_level)})
    store.create_xp_event(
        uid, "transaction_logged", s.xp_transaction, f"Logged transaction: {body.merchantName}"
    )
    sync_mascot_mood(uid)
    return {"success": True, "xpAwarded": s.xp_transaction}


@app.patch("/api/transactions/{tx_id}")
def transactions_update(
    tx_id: int, body: TransactionUpdate, user: dict = Depends(get_current_user)
):
    uid = user_uid(user)
    store = get_store()
    old = store.get_transaction(tx_id)
    if not old or old.get("userId") != uid:
        raise HTTPException(404, "Transaction not found")

    amount_changed = body.amount is not None and body.amount != old["amount"]
    type_changed = body.type is not None and body.type != old["type"]

    if amount_changed or type_changed:
        if old.get("walletId"):
            if old["type"] == "expense":
                store.add_wallet_balance(old["walletId"], old["amount"])
            else:
                store.deduct_wallet(old["walletId"], old["amount"])

        new_amount = body.amount if body.amount is not None else old["amount"]
        new_type = body.type if body.type is not None else old["type"]
        target = body.walletId or old.get("walletId")
        if not target:
            w = store.get_wallet_by_type(uid, store.category_wallet_type(old["category"]))
            target = w["id"] if w else None
        if target:
            if new_type == "expense":
                store.deduct_wallet(target, new_amount)
            else:
                store.add_wallet_balance(target, new_amount)

    store.update_transaction(
        tx_id,
        {
            "merchantName": body.merchantName,
            "category": body.category,
            "note": body.note,
            "needsVerification": body.needsVerification,
            "amount": body.amount,
            "type": body.type,
            "walletId": body.walletId,
        },
    )
    sync_mascot_mood(uid)
    return {"success": True}


@app.delete("/api/transactions/{tx_id}")
def transactions_delete(tx_id: int, user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    store = get_store()
    tx = store.get_transaction(tx_id)
    if not tx or tx.get("userId") != uid:
        raise HTTPException(404, "Transaction not found")
    if tx.get("walletId"):
        if tx["type"] == "expense":
            store.add_wallet_balance(tx["walletId"], tx["amount"])
        else:
            store.deduct_wallet(tx["walletId"], tx["amount"])
    store.delete_transaction(tx_id)
    sync_mascot_mood(uid)
    return {"success": True}


@app.get("/api/transactions/budget-alerts")
def transactions_budget_alerts(user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    sync_mascot_mood(uid)
    return wallet_alerts(uid)


@app.post("/api/transactions/parse-raw")
async def transactions_parse_raw(body: ParseRaw, user: dict = Depends(get_current_user)):
    s = get_settings()
    if s.llm_local_only:
        return llm_fallback.parse_transactions_heuristic(body.rawText)
    try:
        content, used_fallback, _ = await llm.invoke_llm(
            [
                {"role": "system", "content": llm.build_parser_prompt()},
                {"role": "user", "content": f"Parse these transactions:\n{body.rawText}"},
            ],
            response_format={"type": "json_object"},
        )
        if used_fallback or not content:
            return llm_fallback.parse_transactions_heuristic(body.rawText)
        parsed = json.loads(content)
        txs = parsed.get("transactions", parsed if isinstance(parsed, list) else [])
        if isinstance(parsed, dict) and "transactions" not in parsed and "merchantName" in parsed:
            txs = [parsed]
        for tx in txs:
            conf = float(tx.get("confidenceScore") or 1)
            tx["needsVerification"] = bool(tx.get("needsVerification")) or conf < s.llm_parser_confidence_threshold
        return {"transactions": txs}
    except Exception:
        return llm_fallback.parse_transactions_heuristic(body.rawText)


# ── Goals ────────────────────────────────────────────────────────────────────


@app.get("/api/goals")
def goals_list(limit: int | None = None, user: dict = Depends(get_current_user)):
    return get_store().list_goals(user_uid(user), limit)


@app.post("/api/goals")
def goals_create(body: GoalCreate, user: dict = Depends(get_current_user)):
    get_store().create_goal(
        user_uid(user),
        body.model_dump(),
    )
    return {"success": True}


@app.patch("/api/goals/{goal_id}")
def goals_update(goal_id: int, body: GoalUpdate, user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    if not get_store().get_goal(goal_id, uid):
        raise HTTPException(404, "Goal not found")
    fields = body.model_dump(exclude={"goalId"}, exclude_none=True)
    get_store().update_goal(goal_id, uid, fields)
    return {"success": True}


@app.delete("/api/goals/{goal_id}")
def goals_delete(goal_id: int, user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    if not get_store().get_goal(goal_id, uid):
        raise HTTPException(404, "Goal not found")
    get_store().delete_goal(goal_id, uid)
    return {"success": True}


@app.post("/api/goals/{goal_id}/add-funds")
def goals_add_funds(goal_id: int, amount: float, user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    store = get_store()
    updated = store.get_goal(goal_id, uid)
    if not updated:
        raise HTTPException(404, "Goal not found")
    new_amt = min(updated["currentAmount"] + amount, updated["targetAmount"])
    store.update_goal(goal_id, uid, {"currentAmount": new_amt})
    s = get_settings()
    profile = store.get_profile(uid) or {}
    xp = 30
    new_xp = int(profile.get("xpPoints") or 0) + xp
    store.update_profile(uid, {"xpPoints": new_xp, "level": compute_level(new_xp, s.xp_per_level)})
    store.create_xp_event(uid, "saved_to_goal", xp, f"Added to goal: {updated['name']}")
    return {"success": True, "currentAmount": new_amt, "xpAwarded": xp}


# ── Streaks ──────────────────────────────────────────────────────────────────


@app.get("/api/streaks")
def streaks_list(user: dict = Depends(get_current_user)):
    return get_store().list_streaks(user_uid(user))


@app.post("/api/streaks/friends")
def streaks_add_friend(body: FriendAdd, user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    friend_id = -(hash(f"{uid}-{body.friendName}-{time.time()}") % 10_000_000)
    get_store().create_streak(
        uid,
        {
            "friendId": friend_id,
            "friendName": body.friendName,
            "friendAvatar": body.friendAvatar,
            "currentStreak": body.initialStreak,
            "isActive": True,
        },
    )
    return {"success": True}


@app.post("/api/streaks/{streak_id}/increment")
def streaks_increment(streak_id: int, user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    store = get_store()
    streaks = store.list_streaks(uid)
    streak = next((s for s in streaks if s["id"] == streak_id), None)
    if not streak:
        raise HTTPException(404, "Streak not found")
    new_count = streak["currentStreak"] + 1
    store.update_streak(streak_id, {"currentStreak": new_count})
    s = get_settings()
    profile = store.get_profile(uid) or {}
    new_streak = int(profile.get("currentStreak") or 0) + 1
    new_xp = int(profile.get("xpPoints") or 0) + s.xp_streak
    store.update_profile(
        uid,
        {
            "currentStreak": new_streak,
            "longestStreak": max(new_streak, int(profile.get("longestStreak") or 0)),
            "xpPoints": new_xp,
            "level": compute_level(new_xp, s.xp_per_level),
            "lastStreakDate": datetime.now(timezone.utc).isoformat(),
        },
    )
    store.create_xp_event(
        uid,
        "streak_extended",
        s.xp_streak,
        f"Extended streak with {streak['friendName']} to {new_count} days!",
    )
    return {"success": True, "newStreak": new_count, "xpAwarded": s.xp_streak}


# ── Gamification ─────────────────────────────────────────────────────────────


@app.get("/api/gamification/xp-history")
def xp_history(user: dict = Depends(get_current_user)):
    return get_store().list_xp_events(user_uid(user), 20)


@app.post("/api/gamification/daily-action")
def daily_action(body: DailyAction, user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    store = get_store()
    s = get_settings()
    xp_map = {
        "logged_expense": 10,
        "stayed_in_budget": 20,
        "saved_to_goal": 30,
    }
    xp = xp_map[body.action]
    profile = store.get_profile(uid) or {}
    new_xp = int(profile.get("xpPoints") or 0) + xp
    new_level = compute_level(new_xp, s.xp_per_level)
    store.update_profile(uid, {"xpPoints": new_xp, "level": new_level})
    store.create_xp_event(uid, body.action, xp, f"Daily action: {body.action.replace('_', ' ')}")
    return {"success": True, "xpAwarded": xp, "newXp": new_xp, "newLevel": new_level}


# ── Coach ────────────────────────────────────────────────────────────────────


@app.get("/api/coach/history")
def coach_history(user: dict = Depends(get_current_user)):
    return get_store().list_chat(user_uid(user), 50)


@app.post("/api/coach/chat")
async def coach_chat(body: CoachChat, user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    store = get_store()
    store.save_chat(uid, "user", body.message)
    profile = store.get_profile(uid) or {}
    currency = profile.get("currency", settings.default_currency)
    wallets = store.list_wallets(uid)
    wants = next((w for w in wallets if w.get("walletType") == "wants"), None)
    total_alloc = sum(float(w.get("allocatedAmount") or 0) for w in wallets)
    total_spent = sum(
        float(w.get("allocatedAmount") or 0) - float(w.get("currentBalance") or 0) for w in wallets
    )
    spending_pct = (total_spent / total_alloc * 100) if total_alloc > 0 else 0.0
    ctx = {
        "currency": currency,
        "monthlyIncome": float(profile.get("monthlyIncome") or 0),
        "currentStreak": int(profile.get("currentStreak") or 0),
        "level": int(profile.get("level") or 1),
        "xpPoints": int(profile.get("xpPoints") or 0),
        "walletContext": format_wallet_context(uid, currency),
        "safeToSpend": float(wants.get("currentBalance") or 0) if wants else None,
        "spendingPercent": spending_pct,
    }
    try:
        content, used_fallback, _ = await llm.invoke_llm(
            [
                {"role": "system", "content": llm.build_coach_prompt(ctx)},
                {"role": "user", "content": body.message},
            ]
        )
        reply = (
            llm_fallback.coach_fallback_reply(body.message, ctx)
            if used_fallback or not content
            else content
        )
    except Exception as exc:
        if not settings.llm_fallback_enabled:
            raise HTTPException(500, str(exc)) from exc
        reply = llm_fallback.coach_fallback_reply(body.message, ctx)

    store.save_chat(uid, "assistant", reply)
    return {"reply": reply}


@app.delete("/api/coach/history")
def coach_clear(user: dict = Depends(get_current_user)):
    get_store().clear_chat(user_uid(user))
    return {"success": True}


@app.post("/api/coach/plan-budget")
async def coach_plan_budget(body: PlanBudget, user: dict = Depends(get_current_user)):
    uid = user_uid(user)
    store = get_store()
    store.save_chat(uid, "user", body.message)
    profile = store.get_profile(uid) or {}
    currency = profile.get("currency", settings.default_currency)
    ctx = {
        "currency": currency,
        "monthlyIncome": float(profile.get("monthlyIncome") or 0),
        "selectedDate": body.selectedDate,
        "walletContext": format_wallet_context(uid, currency, compact=True),
        "currentPlan": {"selectedDate": body.selectedDate, "categories": body.categories},
    }
    try:
        content, used_fallback, _ = await llm.invoke_llm(
            [
                {"role": "system", "content": llm.build_budget_prompt(ctx)},
                {
                    "role": "user",
                    "content": f"{body.message}\n\n[Planning date: {body.selectedDate}]",
                },
            ],
            response_format={"type": "json_object"},
        )
        plan = None
        if content and not used_fallback:
            plan = llm.parse_budget_response(content)
        if not plan:
            plan = llm_fallback.budget_planner_fallback(body.message, ctx)
    except Exception as exc:
        if not settings.llm_fallback_enabled:
            raise HTTPException(500, str(exc)) from exc
        plan = llm_fallback.budget_planner_fallback(body.message, ctx)

    store.save_chat(uid, "assistant", plan["reply"])
    return {
        "reply": plan["reply"],
        "categories": plan["categories"],
        "dailyTotal": plan["dailyTotal"],
    }


@app.get("/api/health")
def health():
    return {"ok": True, "service": "squirry-coach-api"}


# ── Static frontend (production) ─────────────────────────────────────────────

import os
from pathlib import Path

_static_dir = Path(__file__).resolve().parents[2] / "dist" / "public"
# Skip on Vercel serverless — static files served separately; API must stay JSON
if _static_dir.is_dir() and not os.getenv("VERCEL"):
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles

    assets_dir = _static_dir / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    async def spa_index():
        return FileResponse(_static_dir / "index.html")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(404, "Not found")
        candidate = _static_dir / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_static_dir / "index.html")
