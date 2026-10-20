import asyncio
import io
import json
import os
import uuid
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from dotenv import load_dotenv

# Load root .env
load_dotenv(Path(__file__).resolve().parents[3] / ".env")
load_dotenv()

# CONTENT_FORCE_LOCAL_DB=1 keeps everything in the local JSON store (used by the test suite so
# it never writes to the shared Atlas database); CONTENT_DATA_DIR relocates that store.
MONGODB_URI = "" if os.getenv("CONTENT_FORCE_LOCAL_DB") == "1" else os.getenv("MONGODB_URI", "")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "mathquest_db")
DATA_DIR = Path(os.getenv("CONTENT_DATA_DIR") or Path(__file__).resolve().parents[1] / "data" / "db_store")
DATA_DIR.mkdir(parents=True, exist_ok=True)
GRIDFS_DIR = DATA_DIR / "gridfs"
GRIDFS_DIR.mkdir(parents=True, exist_ok=True)


class AsyncCursorWrapper:
    """Async iterator and helper mimicking Motor's AsyncIOMotorCursor."""
    def __init__(self, items: List[Dict[str, Any]]):
        self._items = items
        self._iter = iter(items)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration

    def sort(self, key_or_list: Any, direction: int = 1):
        if isinstance(key_or_list, str):
            reverse = direction == -1
            self._items.sort(key=lambda d: d.get(key_or_list, ""), reverse=reverse)
        elif isinstance(key_or_list, list):
            for k, d in reversed(key_or_list):
                self._items.sort(key=lambda doc: doc.get(k, ""), reverse=(d == -1))
        self._iter = iter(self._items)
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        if length is None:
            return list(self._items)
        return list(self._items[:length])


class FallbackCollection:
    """Thread-safe, asynchronous in-memory collection with JSON file persistence."""
    def __init__(self, name: str, filepath: Path):
        self.name = name
        self.filepath = filepath
        self._data: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        self._load()

    def _load(self):
        if self.filepath.exists():
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    items = json.load(f)
                    if isinstance(items, list):
                        self._data = {item.get("_id", item.get("id", str(uuid.uuid4()))): item for item in items}
                    elif isinstance(items, dict):
                        self._data = items
            except Exception:
                self._data = {}

    def _save(self):
        try:
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(list(self._data.values()), f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    @staticmethod
    def _get(doc: Dict[str, Any], key: str) -> Any:
        """Mongo-style dotted lookup, e.g. "blueprint.status"."""
        value: Any = doc
        for part in key.split("."):
            if not isinstance(value, dict):
                return None
            value = value.get(part)
        return value

    def _matches(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for k, v in query.items():
            if k == "_id" and str(doc.get("_id", "")) != str(v) and str(doc.get("id", "")) != str(v):
                return False
            elif isinstance(v, dict):
                # Simple handling for $in operator
                if "$in" in v:
                    if self._get(doc, k) not in v["$in"]:
                        return False
            elif k != "_id" and self._get(doc, k) != v:
                return False
        return True

    def find(self, query: Optional[Dict[str, Any]] = None) -> AsyncCursorWrapper:
        query = query or {}
        matches = [dict(d) for d in self._data.values() if self._matches(d, query)]
        return AsyncCursorWrapper(matches)

    async def find_one(self, query: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        query = query or {}
        for d in self._data.values():
            if self._matches(d, query):
                return dict(d)
        return None

    async def insert_one(self, document: Dict[str, Any]):
        async with self._lock:
            doc = dict(document)
            doc_id = str(doc.get("_id") or doc.get("id") or doc.get("doc_id") or doc.get("problem_id") or doc.get("activity_id") or uuid.uuid4().hex)
            doc["_id"] = doc_id
            self._data[doc_id] = doc
            self._save()
            return type("InsertResult", (), {"inserted_id": doc_id})()

    async def insert_many(self, documents: List[Dict[str, Any]]):
        async with self._lock:
            inserted_ids = []
            for document in documents:
                doc = dict(document)
                doc_id = str(doc.get("_id") or doc.get("id") or doc.get("problem_id") or doc.get("doc_id") or uuid.uuid4().hex)
                doc["_id"] = doc_id
                self._data[doc_id] = doc
                inserted_ids.append(doc_id)
            self._save()
            return type("InsertManyResult", (), {"inserted_ids": inserted_ids})()

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        async with self._lock:
            for doc_id, doc in self._data.items():
                if self._matches(doc, query):
                    if "$set" in update:
                        doc.update(update["$set"])
                    else:
                        doc.update(update)
                    self._save()
                    return type("UpdateResult", (), {"matched_count": 1, "modified_count": 1})()
            if upsert:
                new_doc = dict(query)
                if "$set" in update:
                    new_doc.update(update["$set"])
                else:
                    new_doc.update(update)
                new_id = str(new_doc.get("_id") or uuid.uuid4().hex)
                new_doc["_id"] = new_id
                self._data[new_id] = new_doc
                self._save()
                return type("UpdateResult", (), {"matched_count": 0, "modified_count": 1, "upserted_id": new_id})()
            return type("UpdateResult", (), {"matched_count": 0, "modified_count": 0})()

    async def delete_one(self, query: Dict[str, Any]):
        async with self._lock:
            for doc_id, doc in list(self._data.items()):
                if self._matches(doc, query):
                    del self._data[doc_id]
                    self._save()
                    return type("DeleteResult", (), {"deleted_count": 1})()
            return type("DeleteResult", (), {"deleted_count": 0})()

    async def delete_many(self, query: Dict[str, Any]):
        async with self._lock:
            doomed = [doc_id for doc_id, doc in self._data.items() if self._matches(doc, query)]
            for doc_id in doomed:
                del self._data[doc_id]
            if doomed:
                self._save()
            return type("DeleteResult", (), {"deleted_count": len(doomed)})()

    async def count_documents(self, query: Optional[Dict[str, Any]] = None) -> int:
        query = query or {}
        return sum(1 for d in self._data.values() if self._matches(d, query))


class FallbackGridFSBucket:
    """Local disk-backed fallback for GridFS when MongoDB is unavailable."""
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.root_dir.mkdir(parents=True, exist_ok=True)

    async def upload_from_stream(self, filename: str, source: Any = None, source_bytes: bytes = b"", metadata: Optional[Dict[str, Any]] = None) -> str:
        data = source if source is not None else source_bytes
        if hasattr(data, "read"):
            data = data.read()
        file_id = f"fs_{uuid.uuid4().hex[:12]}"
        file_path = self.root_dir / f"{file_id}_{filename}"
        with open(file_path, "wb") as f:
            f.write(data)
        meta_path = self.root_dir / f"{file_id}.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump({
                "file_id": file_id,
                "filename": filename,
                "length": len(data),
                "metadata": metadata or {},
                "local_path": str(file_path),
            }, f, indent=2)
        return file_id

    async def open_download_stream(self, file_id: str) -> io.BytesIO:
        for p in self.root_dir.glob(f"{file_id}_*"):
            with open(p, "rb") as f:
                return io.BytesIO(f.read())
        raise FileNotFoundError(f"File not found in GridFS fallback: {file_id}")

    async def delete(self, file_id: str):
        for p in self.root_dir.glob(f"{file_id}*"):
            try:
                p.unlink()
            except Exception:
                pass


class DatabaseService:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.gridfs: Optional[Any] = None
        self.is_connected = False
        self._init_done = False

        # Fallback local stores
        self._fallback_docs = FallbackCollection("syllabus_documents", DATA_DIR / "syllabus_documents.json")
        self._fallback_problems = FallbackCollection("curriculum_problems", DATA_DIR / "curriculum_problems.json")
        self._fallback_blueprints = FallbackCollection("game_blueprints", DATA_DIR / "game_blueprints.json")
        self._fallback_gridfs = FallbackGridFSBucket(GRIDFS_DIR)

    def _ensure_active_client(self):
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        if self.is_connected and self.client is not None:
            try:
                io_loop = self.client.get_io_loop()
                if io_loop.is_closed() or io_loop != current_loop:
                    client = AsyncIOMotorClient(
                        MONGODB_URI,
                        serverSelectionTimeoutMS=2000,
                        connectTimeoutMS=2000,
                    )
                    self.client = client
                    self.db = client[MONGODB_DB_NAME]
                    self.gridfs = AsyncIOMotorGridFSBucket(self.db)
            except Exception:
                pass

    async def initialize(self):
        if self._init_done:
            self._ensure_active_client()
            return
        self._init_done = True
        if MONGODB_URI and "mongodb" in MONGODB_URI:
            try:
                # 10 s covers a slow Atlas DNS/TLS handshake. A 2 s limit made the service flip
                # between Atlas and the local store from one start to the next (different data).
                client = AsyncIOMotorClient(
                    MONGODB_URI,
                    serverSelectionTimeoutMS=10000,
                    connectTimeoutMS=10000,
                )
                await client.admin.command("ping")
                self.client = client
                self.db = client[MONGODB_DB_NAME]
                self.gridfs = AsyncIOMotorGridFSBucket(self.db)
                self.is_connected = True
                print(f"[DatabaseService] Connected to MongoDB Atlas: {MONGODB_DB_NAME}")
                return
            except Exception as e:
                print(
                    f"[DatabaseService] WARNING: MONGODB_URI is set but Atlas is unreachable ({type(e).__name__}). "
                    f"Using the LOCAL store in {DATA_DIR}; data written now will not appear in Atlas."
                )
                self.is_connected = False
        else:
            print("[DatabaseService] No MONGODB_URI configured. Running in local fallback mode.")

    def get_syllabus_documents(self):
        self._ensure_active_client()
        if self.is_connected and self.db is not None:
            return self.db["syllabus_documents"]
        return self._fallback_docs

    def get_curriculum_problems(self):
        self._ensure_active_client()
        if self.is_connected and self.db is not None:
            return self.db["curriculum_problems"]
        return self._fallback_problems

    def get_game_blueprints(self):
        self._ensure_active_client()
        if self.is_connected and self.db is not None:
            return self.db["game_blueprints"]
        return self._fallback_blueprints

    def get_gridfs(self):
        self._ensure_active_client()
        if self.is_connected and self.gridfs is not None:
            return self.gridfs
        return self._fallback_gridfs


db_service = DatabaseService()
