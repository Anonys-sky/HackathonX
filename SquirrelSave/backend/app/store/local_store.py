"""JSON file store — works without Firebase (default for local dev / demos)."""

from __future__ import annotations

import json
import os
import threading
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.config import get_settings
from app.constants import CATEGORY_WALLET_MAP


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


DEFAULT_STORE: dict[str, Any] = {
    "counters": {
        "user": 1,
        "wallet": 0,
        "transaction": 0,
        "goal": 0,
        "streak": 0,
        "xp": 0,
        "chat": 0,
        "streak_pot": 0,
    },
    "users": {},
    "profiles": {},
    "wallets": {},
    "transactions": {},
    "goals": {},
    "streaks": {},
    "xp_events": {},
    "chat_messages": {},
    "streak_pots": {},
}


class LocalStore:
    def __init__(self, path: str):
        self.path = path
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        if not os.path.isfile(path):
            self._save(deepcopy(DEFAULT_STORE))

    def _load(self) -> dict[str, Any]:
        with open(self.path, encoding="utf-8") as f:
            return json.load(f)

    def _save(self, data: dict[str, Any]) -> None:
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)

    def _mutate(self, fn):
        with self._lock:
            data = self._load()
            result = fn(data)
            self._save(data)
            return result

    def _next_id(self, data: dict, key: str) -> int:
        data["counters"][key] = int(data["counters"].get(key, 0)) + 1
        return data["counters"][key]

    # ── Users ─────────────────────────────────────────────────────────────

    def ensure_demo_user(self) -> dict:
        settings = get_settings()
        uid = settings.demo_user_id

        def work(data):
            if uid not in data["users"]:
                num_id = self._next_id(data, "user")
                data["users"][uid] = {
                    "id": num_id,
                    "openId": uid,
                    "name": settings.demo_user_name,
                    "email": settings.demo_user_email,
                    "loginMethod": "guest",
                    "role": "user",
                    "createdAt": _now_iso(),
                    "updatedAt": _now_iso(),
                    "lastSignedIn": _now_iso(),
                }
            else:
                data["users"][uid]["lastSignedIn"] = _now_iso()
            return data["users"][uid]

        return self._mutate(work)

    def get_user(self, uid: str) -> dict | None:
        data = self._load()
        return data["users"].get(uid)

    # ── Profile ───────────────────────────────────────────────────────────

    def get_profile(self, uid: str) -> dict | None:
        data = self._load()
        return data["profiles"].get(uid)

    def upsert_profile(self, uid: str, fields: dict) -> dict:
        def work(data):
            existing = data["profiles"].get(uid, {})
            merged = {
                **existing,
                **fields,
                "userId": uid,
                "updatedAt": _now_iso(),
            }
            if uid not in data["profiles"]:
                merged["createdAt"] = _now_iso()
                merged.setdefault("xpPoints", 0)
                merged.setdefault("level", 1)
                merged.setdefault("currentStreak", 0)
                merged.setdefault("longestStreak", 0)
                merged.setdefault("mascotMood", "happy")
                merged.setdefault("onboardingComplete", False)
                merged.setdefault("monthlyIncome", 0)
                merged.setdefault("currency", get_settings().default_currency)
            data["profiles"][uid] = merged
            return merged

        return self._mutate(work)

    def update_profile(self, uid: str, fields: dict) -> None:
        self.upsert_profile(uid, fields)

    # ── Wallets ───────────────────────────────────────────────────────────

    def list_wallets(self, uid: str) -> list[dict]:
        data = self._load()
        return [w for w in data["wallets"].values() if w.get("userId") == uid]

    def delete_wallets(self, uid: str) -> None:
        def work(data):
            data["wallets"] = {
                k: v for k, v in data["wallets"].items() if v.get("userId") != uid
            }

        self._mutate(work)

    def create_wallets(self, uid: str, items: list[dict]) -> None:
        def work(data):
            for item in items:
                wid = self._next_id(data, "wallet")
                data["wallets"][str(wid)] = {
                    "id": wid,
                    "userId": uid,
                    "createdAt": _now_iso(),
                    "updatedAt": _now_iso(),
                    **item,
                }

        self._mutate(work)

    def update_wallet(self, wallet_id: int, fields: dict) -> None:
        def work(data):
            key = str(wallet_id)
            if key in data["wallets"]:
                data["wallets"][key].update(fields)
                data["wallets"][key]["updatedAt"] = _now_iso()

        self._mutate(work)

    def get_wallet(self, wallet_id: int) -> dict | None:
        data = self._load()
        return data["wallets"].get(str(wallet_id))

    def get_wallet_by_type(self, uid: str, wallet_type: str) -> dict | None:
        for w in self.list_wallets(uid):
            if w.get("walletType") == wallet_type:
                return w
        return None

    # ── Transactions ──────────────────────────────────────────────────────

    def list_transactions(
        self,
        uid: str,
        *,
        limit: int = 20,
        offset: int = 0,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> list[dict]:
        txs = [t for t in self._load()["transactions"].values() if t.get("userId") == uid]

        def parse_dt(tx):
            return tx.get("transactedAt") or tx.get("createdAt") or ""

        if from_date:
            txs = [t for t in txs if parse_dt(t) >= from_date]
        if to_date:
            txs = [t for t in txs if parse_dt(t) <= to_date]

        txs.sort(key=parse_dt, reverse=True)
        return txs[offset : offset + limit]

    def count_transactions(self, uid: str) -> int:
        return len([t for t in self._load()["transactions"].values() if t.get("userId") == uid])

    def create_transaction(self, uid: str, fields: dict) -> dict:
        def work(data):
            tid = self._next_id(data, "transaction")
            tx = {
                "id": tid,
                "userId": uid,
                "createdAt": _now_iso(),
                "transactedAt": fields.get("transactedAt") or _now_iso(),
                **fields,
            }
            data["transactions"][str(tid)] = tx
            return tx

        return self._mutate(work)

    def get_transaction(self, tx_id: int) -> dict | None:
        return self._load()["transactions"].get(str(tx_id))

    def update_transaction(self, tx_id: int, fields: dict) -> None:
        def work(data):
            key = str(tx_id)
            if key in data["transactions"]:
                data["transactions"][key].update({k: v for k, v in fields.items() if v is not None})

        self._mutate(work)

    def delete_transaction(self, tx_id: int) -> None:
        def work(data):
            data["transactions"].pop(str(tx_id), None)

        self._mutate(work)

    def deduct_wallet(self, wallet_id: int, amount: float) -> None:
        w = self.get_wallet(wallet_id)
        if w:
            self.update_wallet(wallet_id, {"currentBalance": max(0, w["currentBalance"] - amount)})

    def add_wallet_balance(self, wallet_id: int, amount: float) -> None:
        w = self.get_wallet(wallet_id)
        if w:
            self.update_wallet(wallet_id, {"currentBalance": w["currentBalance"] + amount})

    @staticmethod
    def category_wallet_type(category: str) -> str:
        return CATEGORY_WALLET_MAP.get(category, "wants")

    # ── Goals ─────────────────────────────────────────────────────────────

    def list_goals(self, uid: str, limit: int | None = None) -> list[dict]:
        goals = [g for g in self._load()["goals"].values() if g.get("userId") == uid]
        goals.sort(key=lambda g: g.get("updatedAt", ""), reverse=True)
        return goals[:limit] if limit else goals

    def get_goal(self, goal_id: int, uid: str) -> dict | None:
        g = self._load()["goals"].get(str(goal_id))
        if g and g.get("userId") == uid:
            return g
        return None

    def create_goal(self, uid: str, fields: dict) -> None:
        def work(data):
            gid = self._next_id(data, "goal")
            data["goals"][str(gid)] = {
                "id": gid,
                "userId": uid,
                "createdAt": _now_iso(),
                "updatedAt": _now_iso(),
                **fields,
            }

        self._mutate(work)

    def update_goal(self, goal_id: int, uid: str, fields: dict) -> None:
        def work(data):
            key = str(goal_id)
            if key in data["goals"] and data["goals"][key].get("userId") == uid:
                data["goals"][key].update({k: v for k, v in fields.items() if v is not None})
                data["goals"][key]["updatedAt"] = _now_iso()

        self._mutate(work)

    def delete_goal(self, goal_id: int, uid: str) -> None:
        def work(data):
            key = str(goal_id)
            if key in data["goals"] and data["goals"][key].get("userId") == uid:
                del data["goals"][key]

        self._mutate(work)

    # ── Streaks ───────────────────────────────────────────────────────────

    def list_streaks(self, uid: str) -> list[dict]:
        streaks = [s for s in self._load()["streaks"].values() if s.get("userId") == uid]
        streaks.sort(key=lambda s: s.get("currentStreak", 0), reverse=True)
        return streaks

    def create_streak(self, uid: str, fields: dict) -> None:
        def work(data):
            sid = self._next_id(data, "streak")
            data["streaks"][str(sid)] = {
                "id": sid,
                "userId": uid,
                "createdAt": _now_iso(),
                "updatedAt": _now_iso(),
                **fields,
            }

        self._mutate(work)

    def update_streak(self, streak_id: int, fields: dict) -> None:
        def work(data):
            key = str(streak_id)
            if key in data["streaks"]:
                data["streaks"][key].update(fields)
                data["streaks"][key]["updatedAt"] = _now_iso()

        self._mutate(work)

    # ── XP ────────────────────────────────────────────────────────────────

    def create_xp_event(self, uid: str, event_type: str, xp: int, description: str) -> None:
        def work(data):
            eid = self._next_id(data, "xp")
            data["xp_events"][str(eid)] = {
                "id": eid,
                "userId": uid,
                "eventType": event_type,
                "xpAwarded": xp,
                "description": description,
                "createdAt": _now_iso(),
            }

        self._mutate(work)

    def list_xp_events(self, uid: str, limit: int = 20) -> list[dict]:
        events = [e for e in self._load()["xp_events"].values() if e.get("userId") == uid]
        events.sort(key=lambda e: e.get("createdAt", ""), reverse=True)
        return events[:limit]

    # ── Chat ──────────────────────────────────────────────────────────────

    def list_chat(self, uid: str, limit: int = 50) -> list[dict]:
        msgs = [m for m in self._load()["chat_messages"].values() if m.get("userId") == uid]
        msgs.sort(key=lambda m: m.get("createdAt", ""), reverse=True)
        return list(reversed(msgs[-limit:]))

    def save_chat(self, uid: str, role: str, content: str) -> None:
        def work(data):
            mid = self._next_id(data, "chat")
            data["chat_messages"][str(mid)] = {
                "id": mid,
                "userId": uid,
                "role": role,
                "content": content,
                "createdAt": _now_iso(),
            }

        self._mutate(work)

    def clear_chat(self, uid: str) -> None:
        def work(data):
            data["chat_messages"] = {
                k: v for k, v in data["chat_messages"].items() if v.get("userId") != uid
            }

        self._mutate(work)

    # ── Streak pots (simulated staking) ───────────────────────────────────

    def _ensure_pots_bucket(self, data: dict) -> None:
        data.setdefault("streak_pots", {})
        data["counters"].setdefault("streak_pot", 0)

    def list_streak_pots(self, uid: str) -> list[dict]:
        def work(data):
            self._ensure_pots_bucket(data)
            pots = []
            for p in data["streak_pots"].values():
                if any(m.get("uid") == uid for m in p.get("members", [])):
                    pots.append(p)
            pots.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
            return pots

        return self._mutate(work)

    def create_streak_pot(self, uid: str, creator_name: str, stake_xp: int) -> dict:
        from app.services.streak_pot import _week_key

        def work(data):
            self._ensure_pots_bucket(data)
            pid = self._next_id(data, "streak_pot")
            week = _week_key()
            stake = int(stake_xp)
            member_base = {
                "staked": True,
                "breachedToday": False,
                "forfeitedXp": 0,
                "wonXp": 0,
            }
            pot = {
                "id": pid,
                "name": f"Weekly XP pot · {week}",
                "weekKey": week,
                "stakeXp": stake,
                "rewardType": "xp",
                "potTotalXp": stake * 3,
                "createdAt": _now_iso(),
                "members": [
                    {
                        **member_base,
                        "uid": uid,
                        "displayName": creator_name or "You",
                        "avatar": "🐿️",
                        "isNpc": False,
                    },
                    {
                        **member_base,
                        "uid": "npc-danial",
                        "displayName": "Danial",
                        "avatar": "🧑",
                        "isNpc": True,
                    },
                    {
                        **member_base,
                        "uid": "npc-aiman",
                        "displayName": "Aiman",
                        "avatar": "👨",
                        "isNpc": True,
                    },
                ],
            }
            data["streak_pots"][str(pid)] = pot
            return pot

        return self._mutate(work)

    def get_streak_pot(self, pot_id: int) -> dict | None:
        return self._load().get("streak_pots", {}).get(str(pot_id))

    def update_streak_pot(self, pot_id: int, fields: dict) -> dict | None:
        def work(data):
            self._ensure_pots_bucket(data)
            key = str(pot_id)
            if key not in data["streak_pots"]:
                return None
            data["streak_pots"][key].update(fields)
            return data["streak_pots"][key]

        return self._mutate(work)

    def settle_streak_pot(self, pot_id: int, uid: str) -> dict | None:
        """Weekly settlement: breachers forfeit XP stake; winners earn XP (no real money)."""
        from app.config import get_settings
        from app.gamification import compute_level

        def work(data):
            self._ensure_pots_bucket(data)
            key = str(pot_id)
            pot = data["streak_pots"].get(key)
            if not pot:
                return None

            stake = int(pot.get("stakeXp") or pot.get("stakeAmount") or 50)
            members = []
            losers = []
            winners = []

            for m in pot.get("members", []):
                breached = bool(m.get("breachedToday"))
                if m.get("isNpc"):
                    breached = False
                copy = dict(m)
                if breached:
                    copy["forfeitedXp"] = int(copy.get("forfeitedXp") or copy.get("forfeited") or 0) + stake
                    losers.append(copy)
                else:
                    winners.append(copy)
                members.append(copy)

            share_xp = 0
            if losers and winners:
                share_xp = int((len(losers) * stake) / len(winners))
                s = get_settings()
                for w in winners:
                    w["wonXp"] = int(w.get("wonXp") or w.get("won") or 0) + share_xp
                    if not w.get("isNpc") and w.get("uid"):
                        winner_uid = w["uid"]
                        prof = data["profiles"].get(winner_uid) or {}
                        if prof:
                            new_xp = int(prof.get("xpPoints") or 0) + share_xp
                            prof["xpPoints"] = new_xp
                            prof["level"] = compute_level(new_xp, s.xp_per_level)
                            data["profiles"][winner_uid] = prof
                            eid = self._next_id(data, "xp")
                            data["xp_events"][str(eid)] = {
                                "id": eid,
                                "userId": winner_uid,
                                "eventType": "streak_pot_win",
                                "xpAwarded": share_xp,
                                "description": f"Won {share_xp} XP from Streak Pot 🏆",
                                "createdAt": _now_iso(),
                            }
                members = winners + losers

            pot = {
                **pot,
                "members": members,
                "lastSettledAt": _now_iso(),
                "settlement": {
                    "losers": [x["displayName"] for x in losers],
                    "winners": [x["displayName"] for x in winners],
                    "shareXpEach": share_xp,
                },
            }
            data["streak_pots"][key] = pot
            return pot

        return self._mutate(work)
