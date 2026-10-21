"""
Minimal in-memory stand-in for the PyMongo async collection methods used by the
learner-profile services. Test-only; supports equality filters plus $gt / $in / $ne,
find_one(sort=...), find().sort().to_list(), insert_one and update_one with
$set / $setOnInsert / $addToSet and upsert.
"""

from typing import Any, Dict, List, Optional

from bson import ObjectId


def _matches(doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
    for key, expected in query.items():
        actual = doc.get(key)
        if isinstance(expected, dict) and any(k.startswith("$") for k in expected):
            for op, value in expected.items():
                if op == "$gt" and not (actual is not None and actual > value):
                    return False
                if op == "$in" and actual not in value:
                    return False
                if op == "$ne" and actual == value:
                    return False
        elif actual != expected:
            return False
    return True


def _sorted(docs: List[Dict[str, Any]], key: str, direction: int) -> List[Dict[str, Any]]:
    present = [d for d in docs if d.get(key) is not None]
    missing = [d for d in docs if d.get(key) is None]
    return sorted(present, key=lambda d: d[key], reverse=direction == -1) + missing


class _FakeCursor:
    def __init__(self, docs: List[Dict[str, Any]]):
        self._docs = docs

    def sort(self, key: str, direction: int = 1) -> "_FakeCursor":
        self._docs = _sorted(self._docs, key, direction)
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        return list(self._docs[:length] if length else self._docs)


class _InsertResult:
    """Mirrors PyMongo's InsertOneResult.inserted_id."""

    def __init__(self, inserted_id: Any):
        self.inserted_id = inserted_id


class FakeCollection:
    def __init__(self, docs: Optional[List[Dict[str, Any]]] = None):
        self.docs: List[Dict[str, Any]] = [dict(d) for d in (docs or [])]
        self.find_one_calls = 0
        self.inserted: List[Dict[str, Any]] = []

    async def find_one(self, query: Dict[str, Any], sort: Optional[List[Any]] = None, **kwargs: Any):
        self.find_one_calls += 1
        docs = [d for d in self.docs if _matches(d, query)]
        if sort:
            key, direction = sort[0]
            docs = _sorted(docs, key, direction)
        return dict(docs[0]) if docs else None

    def find(self, query: Dict[str, Any], *args: Any, **kwargs: Any) -> _FakeCursor:
        return _FakeCursor([dict(d) for d in self.docs if _matches(d, query)])

    async def count_documents(self, query: Dict[str, Any]) -> int:
        return sum(1 for d in self.docs if _matches(d, query))

    async def insert_one(self, doc: Dict[str, Any]) -> "_InsertResult":
        doc.setdefault("_id", ObjectId())
        stored = dict(doc)
        self.docs.append(stored)
        self.inserted.append(stored)
        return _InsertResult(stored["_id"])

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False) -> None:
        target = next((d for d in self.docs if _matches(d, query)), None)
        if target is None:
            if not upsert:
                return
            target = {k: v for k, v in query.items() if not isinstance(v, dict)}
            target.update(update.get("$setOnInsert", {}))
            self.docs.append(target)
        target.update(update.get("$set", {}))
        for key, value in update.get("$addToSet", {}).items():
            values = target.setdefault(key, [])
            if value not in values:
                values.append(value)
        for key, value in update.get("$push", {}).items():
            values = target.setdefault(key, [])
            values.extend(value["$each"] if isinstance(value, dict) and "$each" in value else [value])
