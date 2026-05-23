"""End-to-end API tests for all SquirryCoach features."""

from __future__ import annotations

import json
import os
import tempfile
from copy import deepcopy
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Isolated store per test session (closed handle — Windows-safe)
_fd, _store_path = tempfile.mkstemp(suffix=".json")
os.close(_fd)
os.environ["DATA_BACKEND"] = "local"
os.environ["LOCAL_DATA_PATH"] = _store_path
os.environ["LLM_FALLBACK_ENABLED"] = "true"
os.environ.pop("VERCEL", None)

from app.config import get_settings  # noqa: E402
from app.main import app  # noqa: E402
from app.store import get_store  # noqa: E402
from app.store.local_store import DEFAULT_STORE  # noqa: E402

get_settings.cache_clear()

client = TestClient(app)
H = {"X-Demo-Mode": "true"}


def _write_fresh_store() -> None:
    path = Path(os.environ["LOCAL_DATA_PATH"])
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(deepcopy(DEFAULT_STORE), f)


@pytest.fixture(autouse=True)
def _reset_store():
    _write_fresh_store()
    get_store().ensure_demo_user()
    yield


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_auth_and_profile_flow():
    r = client.post("/api/auth/demo", headers=H)
    assert r.status_code == 200
    assert r.json()["mode"] == "demo"

    r = client.post(
        "/api/profile/setup",
        headers=H,
        json={"monthlyIncome": 1700, "currency": "RM"},
    )
    assert r.status_code == 200
    assert r.json()["success"] is True

    r = client.get("/api/profile", headers=H)
    assert r.status_code == 200
    assert r.json()["monthlyIncome"] == 1700


def test_onboarding_wallets_and_complete():
    client.post(
        "/api/profile/setup",
        headers=H,
        json={"monthlyIncome": 1700, "currency": "RM"},
    )
    r = client.post(
        "/api/wallets/setup",
        headers=H,
        json={
            "monthlyIncome": 1700,
            "allocations": [
                {
                    "walletType": "needs",
                    "label": "Needs",
                    "allocationPercent": 50,
                    "color": "#4CAF50",
                },
                {
                    "walletType": "wants",
                    "label": "Wants",
                    "allocationPercent": 30,
                    "color": "#FF9800",
                },
                {
                    "walletType": "savings",
                    "label": "Savings",
                    "allocationPercent": 20,
                    "color": "#2196F3",
                },
            ],
        },
    )
    assert r.status_code == 200

    r = client.get("/api/wallets", headers=H)
    assert r.status_code == 200
    wallets = r.json()
    assert len(wallets) == 3

    r = client.post("/api/profile/complete-onboarding", headers=H)
    assert r.status_code == 200
    assert r.json()["success"] is True

    r = client.get("/api/profile/stats", headers=H)
    stats = r.json()
    assert stats["profile"]["onboardingComplete"] is True
    assert len(stats["wallets"]) == 3


def test_transactions_crud():
    _setup_onboarded()

    r = client.post(
        "/api/transactions",
        headers=H,
        json={
            "merchantName": "Grab Food",
            "category": "food_beverage",
            "amount": 25.5,
            "type": "expense",
        },
    )
    assert r.status_code == 200
    assert r.json()["xpAwarded"] > 0

    r = client.get("/api/transactions", headers=H)
    assert r.status_code == 200
    txs = r.json()["transactions"]
    assert len(txs) >= 1
    tx_id = txs[0]["id"]

    r = client.patch(
        f"/api/transactions/{tx_id}",
        headers=H,
        json={"merchantName": "Grab Updated"},
    )
    assert r.status_code == 200

    r = client.delete(f"/api/transactions/{tx_id}", headers=H)
    assert r.status_code == 200


def test_parse_raw():
    _setup_onboarded()
    r = client.post(
        "/api/transactions/parse-raw",
        headers=H,
        json={"rawText": "Grab RM 15.50 food\nSalary RM 3000"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "transactions" in data
    assert len(data["transactions"]) >= 1


def test_budget_alerts():
    _setup_onboarded()
    r = client.get("/api/transactions/budget-alerts", headers=H)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_goals():
    _setup_onboarded()
    r = client.post(
        "/api/goals",
        headers=H,
        json={
            "name": "New Laptop",
            "targetAmount": 3000,
            "currentAmount": 0,
            "emoji": "💻",
            "category": "gadgets",
        },
    )
    assert r.status_code == 200

    r = client.get("/api/goals", headers=H)
    goals = r.json()
    assert len(goals) >= 1
    gid = goals[0]["id"]

    r = client.post(f"/api/goals/{gid}/add-funds?amount=100", headers=H)
    assert r.status_code == 200
    assert r.json()["xpAwarded"] > 0

    r = client.delete(f"/api/goals/{gid}", headers=H)
    assert r.status_code == 200


def test_streaks():
    _setup_onboarded()
    r = client.post(
        "/api/streaks/friends",
        headers=H,
        json={"friendName": "Alice", "friendAvatar": "🐼", "initialStreak": 3},
    )
    assert r.status_code == 200

    r = client.get("/api/streaks", headers=H)
    streaks = r.json()
    assert len(streaks) >= 1
    sid = streaks[0]["id"]

    r = client.post(f"/api/streaks/{sid}/increment", headers=H)
    assert r.status_code == 200
    assert r.json()["xpAwarded"] > 0


def test_gamification():
    _setup_onboarded()
    r = client.post(
        "/api/gamification/daily-action",
        headers=H,
        json={"action": "logged_expense"},
    )
    assert r.status_code == 200

    r = client.get("/api/gamification/xp-history", headers=H)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_coach():
    _setup_onboarded()
    r = client.post(
        "/api/coach/chat",
        headers=H,
        json={"message": "How can I save more this month?"},
    )
    assert r.status_code == 200
    assert "reply" in r.json()

    r = client.get("/api/coach/history", headers=H)
    assert r.status_code == 200

    r = client.post(
        "/api/coach/plan-budget",
        headers=H,
        json={
            "message": "Plan RM 50 for food today",
            "selectedDate": "2026-05-23",
            "categories": [],
        },
    )
    assert r.status_code == 200
    plan = r.json()
    assert "reply" in plan
    assert "categories" in plan

    r = client.delete("/api/coach/history", headers=H)
    assert r.status_code == 200


def test_api_routes_not_html_when_static_built():
    """Ensure /api/* returns JSON even when dist/public exists (production mode)."""
    dist = Path(__file__).resolve().parents[2] / "dist" / "public"
    if not dist.is_dir():
        pytest.skip("dist/public not built")
    r = client.post(
        "/api/profile/setup",
        headers=H,
        json={"monthlyIncome": 500, "currency": "RM"},
    )
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("application/json")


def _setup_onboarded():
    client.post(
        "/api/profile/setup",
        headers=H,
        json={"monthlyIncome": 1700, "currency": "RM"},
    )
    client.post(
        "/api/wallets/setup",
        headers=H,
        json={
            "monthlyIncome": 1700,
            "allocations": [
                {
                    "walletType": "needs",
                    "label": "Needs",
                    "allocationPercent": 50,
                    "color": "#4CAF50",
                },
                {
                    "walletType": "wants",
                    "label": "Wants",
                    "allocationPercent": 30,
                    "color": "#FF9800",
                },
                {
                    "walletType": "savings",
                    "label": "Savings",
                    "allocationPercent": 20,
                    "color": "#2196F3",
                },
            ],
        },
    )
    client.post("/api/profile/complete-onboarding", headers=H)
