from fastapi import Header

from app.config import get_settings
from app.store import get_store


async def get_current_user(
    authorization: str | None = Header(default=None),
    x_demo_mode: str | None = Header(default=None),
) -> dict:
    """Firebase Auth optional — default demo guest for judges."""
    store = get_store()
    settings = get_settings()

    # Future: verify Firebase ID token from Authorization: Bearer <token>
  # if authorization and authorization.startswith("Bearer ") and not x_demo_mode:
  #     token = authorization[7:]
  #     ...

    user = store.ensure_demo_user()
    return user


def user_uid(user: dict) -> str:
    return user.get("openId") or get_settings().demo_user_id
