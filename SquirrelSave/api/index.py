"""Vercel serverless handler — serves /api/* as FastAPI (Mangum)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

# Load SquirrelSave/.env on Vercel (LLM keys, etc.)
_env_file = ROOT / ".env"
if _env_file.is_file():
    from dotenv import load_dotenv

    load_dotenv(_env_file)

os.environ.setdefault("VERCEL", "1")
os.environ.setdefault("DATA_BACKEND", "local")

os.environ.setdefault("LOCAL_DATA_PATH", os.path.join("/tmp", "squirry-store.json"))

from mangum import Mangum  # noqa: E402
from app.main import app  # noqa: E402

handler = Mangum(app, lifespan="off")
