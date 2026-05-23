from fastapi import Header

from app.config import get_settings
from app.store import get_store


async def get_current_user(
    authorization: str | None = Header(default=None),
    x_demo_mode: str | None = Header(default=None),
    x_visitor_id: str | None = Header(default=None, alias="X-Visitor-Id"),
) -> dict:
    """Firebase Auth optional — per-browser visitor id, or shared demo user for tests."""
    store = get_store()
    settings = get_settings()

    # Future: verify Firebase ID token from Authorization: Bearer <token>
    # if authorization and authorization.startswith("Bearer ") and not x_demo_mode:
    #     token = authorization[7:]
    #     ...

    visitor = (x_visitor_id or "").strip()
    if visitor and len(visitor) <= 128 and visitor.replace("-", "").replace("_", "").isalnum():
        suffix = visitor[-8:] if len(visitor) > 8 else visitor
        return store.ensure_user(
            visitor,
            name=f"Guest {suffix}",
            email=f"{suffix}@visitor.local",
        )

    return store.ensure_demo_user()


def user_uid(user: dict) -> str:
    return user.get("openId") or get_settings().demo_user_id
