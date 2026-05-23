"""Firestore backend — set DATA_BACKEND=firebase and FIREBASE_SERVICE_ACCOUNT_JSON."""

from __future__ import annotations

import firebase_admin
from firebase_admin import credentials, firestore

from app.config import get_settings
from app.store.local_store import LocalStore


class FirestoreStore(LocalStore):
    """Firestore implementation delegating to same API as LocalStore.

    Uses a JSON mirror in local path for complex queries until full Firestore queries are added.
    On init, syncs from Firestore collections into local cache file.
    """

    def __init__(self):
        settings = get_settings()
        cred_dict = settings.firebase_credentials_dict()
        if not cred_dict:
            raise ValueError("FIREBASE_SERVICE_ACCOUNT_JSON required for firebase backend")

        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(
                cred,
                {"projectId": settings.firebase_project_id or cred_dict.get("project_id")},
            )
        self.db = firestore.client()
        self.uid_field = "userId"
        super().__init__(settings.local_data_path.replace("store.json", "firestore-cache.json"))
        self._pull_from_firestore()

    def _col(self, name: str):
        return self.db.collection(name)

    def _pull_from_firestore(self):
        """Hydrate local cache from Firestore (simple full read on startup)."""
        data = self._load()
        for col, key in [
            ("users", "users"),
            ("profiles", "profiles"),
            ("wallets", "wallets"),
            ("transactions", "transactions"),
            ("goals", "goals"),
            ("streaks", "streaks"),
            ("xp_events", "xp_events"),
            ("chat_messages", "chat_messages"),
        ]:
            docs = self._col(col).stream()
            bucket = {}
            for doc in docs:
                payload = doc.to_dict() or {}
                doc_id = str(payload.get("id") or doc.id)
                bucket[doc_id] = payload
            if bucket:
                data[key] = bucket
        self._save(data)

    def _push_doc(self, collection: str, doc_id: str, payload: dict) -> None:
        self._col(collection).document(doc_id).set(payload, merge=True)

    def upsert_profile(self, uid: str, fields: dict) -> dict:
        result = super().upsert_profile(uid, fields)
        self._push_doc("profiles", uid, result)
        return result

    def create_transaction(self, uid: str, fields: dict) -> dict:
        result = super().create_transaction(uid, fields)
        self._push_doc("transactions", str(result["id"]), result)
        return result
