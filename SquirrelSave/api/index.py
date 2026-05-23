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

_vercel_store = os.path.join("/tmp", "squirry-store.json")
os.environ.setdefault("LOCAL_DATA_PATH", _vercel_store)

# Vercel serverless /tmp is ephemeral (cold starts, new instances). Seed from bundled
# demo data so refresh still lands on an onboarded dashboard for judges.
_seed = ROOT / "backend" / "data" / "store.json"
if _seed.is_file() and not os.path.isfile(_vercel_store):
    import shutil

    os.makedirs(os.path.dirname(_vercel_store) or ".", exist_ok=True)
    shutil.copy(_seed, _vercel_store)

from mangum import Mangum  # noqa: E402
from app.main import app  # noqa: E402

handler = Mangum(app, lifespan="off")
