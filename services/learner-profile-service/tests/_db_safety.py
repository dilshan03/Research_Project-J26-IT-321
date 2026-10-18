"""
Test-only MongoDB safety guard for the Learner Profile Service.

Database-backed tests may only reach a LOCAL MongoDB database named
'mathquest_test'. The target must be opted into explicitly through the
MATHQUEST_TEST_MONGODB_URI environment variable. The application's own
MONGODB_URI, the root .env file and the config.py fallback are never used
by the test suite.

Error messages never echo the rejected URI, because it may contain credentials.
"""

from typing import Any, List, Optional, Tuple
from urllib.parse import unquote

TEST_URI_ENV_VAR = "MATHQUEST_TEST_MONGODB_URI"
TEST_DB_NAME = "mathquest_test"
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}

# Test modules that seed and clean records through a real MongoDB connection.
DB_BACKED_TEST_MODULES = {
    "test_elpx_api.py",
    "test_learner_archive_and_deletion.py",
    "test_learners_api.py",
    "test_onboarding_api.py",
}


class UnsafeTestDatabaseError(RuntimeError):
    """Raised when a test attempts to use a non-local or non-test MongoDB target."""


def _split_uri(uri: str) -> Tuple[List[str], str]:
    """Returns (hostnames, database path) for a plain mongodb:// URI."""
    rest = uri[len("mongodb://"):]
    cut_points = [i for i in (rest.find("/"), rest.find("?")) if i != -1]
    end = min(cut_points) if cut_points else len(rest)
    authority, remainder = rest[:end], rest[end:]

    host_list = authority.rsplit("@", 1)[-1]
    hosts: List[str] = []
    for entry in host_list.split(","):
        entry = entry.strip()
        if entry.startswith("["):
            closing = entry.find("]")
            hosts.append(entry[1:closing] if closing != -1 else entry)
        else:
            hosts.append(entry.split(":", 1)[0])

    db_path = unquote(remainder.split("?", 1)[0].lstrip("/"))
    return hosts, db_path


def validate_test_mongodb_uri(uri: Any) -> str:
    """
    Accepts only plain mongodb:// URIs whose hosts are all loopback addresses
    and whose optional database path is exactly 'mathquest_test'.
    SRV (mongodb+srv://) URIs are always rejected, so Atlas clusters can never match.
    """
    if not isinstance(uri, str) or not uri.strip():
        raise UnsafeTestDatabaseError(
            "No explicit local test MongoDB URI was provided."
        )

    uri = uri.strip()
    if not uri.startswith("mongodb://"):
        raise UnsafeTestDatabaseError(
            "Test MongoDB URI must use the plain 'mongodb://' scheme on localhost; "
            "SRV/Atlas and other schemes are refused."
        )

    hosts, db_path = _split_uri(uri)
    if not hosts or any(not h or h.lower() not in LOCAL_HOSTS for h in hosts):
        raise UnsafeTestDatabaseError(
            "Test MongoDB URI must only reference localhost, 127.0.0.1 or ::1."
        )

    if db_path and db_path != TEST_DB_NAME:
        raise UnsafeTestDatabaseError(
            f"Test MongoDB URI may only name the '{TEST_DB_NAME}' database."
        )

    return uri


def require_test_database_name(name: Optional[str]) -> None:
    if name != TEST_DB_NAME:
        raise UnsafeTestDatabaseError(
            f"Tests may only access the '{TEST_DB_NAME}' database."
        )


def make_guarded_client_class(base_client_class: type) -> type:
    """
    Wraps a PyMongo client class so that construction validates the URI before
    any DNS lookup or network activity, and database access is limited to
    'mathquest_test' ('admin' is permitted via get_database for driver commands).
    """

    class GuardedTestMongoClient(base_client_class):  # type: ignore[misc, valid-type]
        def __init__(self, host: Any = None, *args: Any, **kwargs: Any) -> None:
            validate_test_mongodb_uri(host)
            super().__init__(host, *args, **kwargs)

        def __getitem__(self, name: str) -> Any:
            require_test_database_name(name)
            return super().__getitem__(name)

        def get_database(self, name: Optional[str] = None, *args: Any, **kwargs: Any) -> Any:
            if name != "admin":
                require_test_database_name(name)
            return super().get_database(name, *args, **kwargs)

    GuardedTestMongoClient.__name__ = f"GuardedTest{base_client_class.__name__}"
    GuardedTestMongoClient.__qualname__ = GuardedTestMongoClient.__name__
    return GuardedTestMongoClient
