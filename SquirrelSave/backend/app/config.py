import json
import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))


@lru_cache
def get_settings():
    return Settings()


class Settings:
    demo_user_id: str = os.getenv("DEMO_USER_ID", "guest-demo-judge")
    demo_user_name: str = os.getenv("DEMO_USER_NAME", "Guest Judge")
    demo_user_email: str = os.getenv("DEMO_USER_EMAIL", "guest@localhost")

    # firebase | local
    data_backend: str = os.getenv("DATA_BACKEND", "local").lower()

    firebase_project_id: str | None = os.getenv("FIREBASE_PROJECT_ID") or os.getenv(
        "VITE_FIREBASE_PROJECT_ID"
    )
    firebase_service_account_json: str | None = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

    llm_api_url: str = (
        os.getenv("LLM_API_URL")
        or os.getenv("BUILT_IN_FORGE_API_URL")
        or "https://api.openai.com/v1"
    ).rstrip("/")
    llm_api_key: str | None = os.getenv("LLM_API_KEY") or os.getenv("BUILT_IN_FORGE_API_KEY")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    llm_fallback_enabled: bool = os.getenv("LLM_FALLBACK_ENABLED", "true").lower() != "false"
    # Skip remote LLM — use Squirry scenario replies only (good for demos without API credits)
    llm_local_only: bool = os.getenv("LLM_LOCAL_ONLY", "true").lower() != "false"
    llm_parser_confidence_threshold: float = float(
        os.getenv("LLM_PARSER_CONFIDENCE_THRESHOLD", "0.8")
    )

    default_currency: str = os.getenv("DEFAULT_CURRENCY", "RM")
    coach_name: str = os.getenv("COACH_NAME", "SquirryCoach")

    xp_per_level: int = int(os.getenv("XP_PER_LEVEL", "500"))
    xp_onboarding: int = int(os.getenv("XP_ONBOARDING", "100"))
    xp_transaction: int = int(os.getenv("XP_TRANSACTION", "10"))
    xp_streak: int = int(os.getenv("XP_STREAK", "25"))
    budget_alert_threshold: int = int(os.getenv("BUDGET_ALERT_THRESHOLD_PERCENT", "80"))

    cors_origins: list[str] = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
        if o.strip()
    ]

    local_data_path: str = os.getenv(
        "LOCAL_DATA_PATH",
        os.path.join(os.path.dirname(__file__), "..", "data", "store.json"),
    )

    def firebase_credentials_dict(self) -> dict | None:
        raw = self.firebase_service_account_json
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            path = raw.strip()
            if os.path.isfile(path):
                with open(path, encoding="utf-8") as f:
                    return json.load(f)
        return None
