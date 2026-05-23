import json
import re
from typing import Any

import httpx

from app.config import get_settings
from app.constants import BUDGET_PLANNER_CATEGORIES, TRANSACTION_CATEGORIES
from app.services import llm_fallback


def _headers() -> dict[str, str]:
    settings = get_settings()
    if not settings.llm_api_key:
        raise ValueError("LLM_API_KEY is not configured")
    return {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }


def _chat_completions_url() -> str:
    base = get_settings().llm_api_url.rstrip("/")
    if base.endswith("/v1"):
        return f"{base}/chat/completions"
    return f"{base}/v1/chat/completions"


async def invoke_llm(
    messages: list[dict[str, str]],
    *,
    response_format: dict | None = None,
) -> tuple[str, bool, str | None]:
    """Returns (content, used_fallback, provider_error_hint)."""
    settings = get_settings()
    if settings.llm_local_only:
        return "", True, None
    body: dict[str, Any] = {
        "model": settings.llm_model,
        "messages": messages,
        "temperature": 0.7,
    }
    if response_format:
        body["response_format"] = response_format

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(_chat_completions_url(), headers=_headers(), json=body)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return (content if isinstance(content, str) else json.dumps(content)), False, None
    except Exception as exc:
        if settings.llm_fallback_enabled and llm_fallback.is_recoverable_llm_error(exc):
            return "", True, last_llm_error_detail(exc)
        raise


def last_llm_error_detail(exc: Exception) -> str:
    """Short user-facing hint from the last provider error."""
    if isinstance(exc, httpx.HTTPStatusError) and exc.response is not None:
        try:
            data = exc.response.json()
            msg = data.get("error", {}).get("message") or data.get("detail")
            if isinstance(msg, str) and msg.strip():
                return msg.strip()[:200]
        except Exception:
            pass
        return f"HTTP {exc.response.status_code}"
    return str(exc)[:200]


def build_parser_prompt() -> str:
    cats = ", ".join(TRANSACTION_CATEGORIES)
    settings = get_settings()
    return f"""You are a financial transaction parser for Southeast Asia.
Return JSON: {{ "transactions": [{{ "merchantName", "category" (one of [{cats}]), "amount", "type" ("expense"|"income"), "confidenceScore" (0-1), "needsVerification", "note" }}] }}
Mark needsVerification true if confidence < {settings.llm_parser_confidence_threshold}."""


def build_coach_prompt(ctx: dict) -> str:
    settings = get_settings()
    return f"""You are {settings.coach_name}, a friendly AI financial coach 🐿️.
Income: {ctx['currency']}{ctx['monthlyIncome']}, streak: {ctx['currentStreak']} days, level {ctx['level']}, XP {ctx['xpPoints']}.
Wallets: {ctx.get('walletContext') or 'not set up'}.
Be concise (2-4 sentences), encouraging, no specific investment advice."""


def build_budget_prompt(ctx: dict) -> str:
    settings = get_settings()
    cats = ", ".join(BUDGET_PLANNER_CATEGORIES)
    return f"""You are {settings.coach_name}, planning a daily budget in {ctx['currency']}.
Date: {ctx['selectedDate']}, income: {ctx['currency']}{ctx['monthlyIncome']}, wallets: {ctx.get('walletContext')}.
Return JSON only: {{ "reply", "categories": [{{"id", "amount"}}], "dailyTotal" }}.
Valid ids: {cats}."""


def parse_budget_response(raw: str) -> dict | None:
    m = re.search(r"\{[\s\S]*\}", raw.strip())
    if not m:
        return None
    try:
        parsed = json.loads(m.group(0))
        valid = set(BUDGET_PLANNER_CATEGORIES)
        categories = [
            {"id": c["id"], "amount": max(0, float(c["amount"]))}
            for c in parsed.get("categories", [])
            if c.get("id") in valid
        ]
        daily_total = parsed.get("dailyTotal") or sum(c["amount"] for c in categories)
        return {
            "reply": parsed.get("reply") or "Here's your budget plan! 🐿️",
            "categories": categories,
            "dailyTotal": daily_total,
        }
    except (json.JSONDecodeError, TypeError, ValueError):
        return None
