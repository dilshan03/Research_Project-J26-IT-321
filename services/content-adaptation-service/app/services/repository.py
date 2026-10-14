"""
In-memory blueprint repository.

Kept behind a small interface so it can be swapped for a MongoDB (motor)
implementation later without touching the routes.
"""
from threading import Lock
from typing import Dict, List, Optional

from app.schemas.api import BlueprintEnvelope


class BlueprintRepository:
    def __init__(self) -> None:
        self._items: Dict[str, BlueprintEnvelope] = {}
        self._lock = Lock()

    def save(self, env: BlueprintEnvelope) -> BlueprintEnvelope:
        with self._lock:
            self._items[env.blueprint.activity_id] = env
        return env

    def get(self, activity_id: str) -> Optional[BlueprintEnvelope]:
        return self._items.get(activity_id)

    def list(self, status: Optional[str] = None) -> List[BlueprintEnvelope]:
        items = list(self._items.values())
        if status:
            items = [e for e in items if e.blueprint.status == status]
        return items

    def set_status(self, activity_id: str, status: str) -> Optional[BlueprintEnvelope]:
        with self._lock:
            env = self._items.get(activity_id)
            if env is None:
                return None
            env.blueprint.status = status
            return env

    def clear(self) -> None:
        with self._lock:
            self._items.clear()


repository = BlueprintRepository()
