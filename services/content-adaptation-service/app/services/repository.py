"""
Blueprint repository backed by the service database (Atlas, or the local JSON store).

It used to be an in-memory dict, which emptied on every restart: approved games vanished
from the learner page and approving a game created before the restart returned 404.
"""
from typing import List, Optional

from app.schemas.api import BlueprintEnvelope
from app.services.db import db_service


def _envelope(doc: dict) -> BlueprintEnvelope:
    return BlueprintEnvelope(**{k: v for k, v in doc.items() if k != "_id"})


class BlueprintRepository:
    @staticmethod
    def _col():
        return db_service.get_game_blueprints()

    async def save(self, env: BlueprintEnvelope) -> BlueprintEnvelope:
        activity_id = env.blueprint.activity_id
        await self._col().update_one(
            {"activity_id": activity_id},
            {"$set": {"activity_id": activity_id, **env.model_dump()}},
            upsert=True,
        )
        return env

    async def get(self, activity_id: str) -> Optional[BlueprintEnvelope]:
        doc = await self._col().find_one({"activity_id": activity_id})
        return _envelope(doc) if doc else None

    async def list(self, status: Optional[str] = None) -> List[BlueprintEnvelope]:
        query = {"blueprint.status": status} if status else {}
        docs = await self._col().find(query).to_list(length=1000)
        envs = []
        for d in docs:
            try:
                envs.append(_envelope(d))
            except Exception:  # noqa: BLE001 - skip records written by an older schema
                continue
        return envs

    async def set_status(self, activity_id: str, status: str) -> Optional[BlueprintEnvelope]:
        env = await self.get(activity_id)
        if env is None:
            return None
        env.blueprint.status = status  # type: ignore[assignment]
        return await self.save(env)


repository = BlueprintRepository()
