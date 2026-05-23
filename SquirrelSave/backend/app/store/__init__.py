from app.config import get_settings
from app.store.local_store import LocalStore

_store = None


def get_store() -> LocalStore:
    global _store
    if _store is None:
        settings = get_settings()
        if settings.data_backend == "firebase":
            try:
                from app.store.firestore_store import FirestoreStore

                _store = FirestoreStore()
            except Exception as exc:
                print(f"[Store] Firebase init failed ({exc}), using local JSON store")
                _store = LocalStore(settings.local_data_path)
        else:
            _store = LocalStore(settings.local_data_path)
    return _store
