"""
Test session database safety configuration.

Pytest loads this file before importing any test module, so everything below runs
before the application (app.config / app.db.mongodb) is imported or any fixture
can connect.

Database-backed tests run ONLY when MATHQUEST_TEST_MONGODB_URI names a reachable
local MongoDB; they always use the 'mathquest_test' database. Otherwise they are
skipped. An unsafe MATHQUEST_TEST_MONGODB_URI aborts the whole run.

Example (local MongoDB only):
    MATHQUEST_TEST_MONGODB_URI=mongodb://127.0.0.1:27017 python -m pytest
"""

import os
import sys

import pytest

# Several .pyc files are tracked in git; test runs must not rewrite them.
sys.dont_write_bytecode = True

from tests._db_safety import (  # noqa: E402
    DB_BACKED_TEST_MODULES,
    TEST_DB_NAME,
    TEST_URI_ENV_VAR,
    UnsafeTestDatabaseError,
    make_guarded_client_class,
    validate_test_mongodb_uri,
)

# 1. The guard must run before the application reads its database settings.
if any(name == "app" or name.startswith("app.") for name in sys.modules):
    pytest.exit(
        "Refusing to run tests: the application was imported before the test database guard.",
        returncode=4,
    )

# 2. Resolve the explicit local test target. Never fall back to MONGODB_URI or .env.
#    An unsafe value leaves the empty (blocked) URI in place and aborts in pytest_configure.
_requested_uri = os.environ.get(TEST_URI_ENV_VAR, "").strip()
TEST_MONGODB_URI = None
UNSAFE_CONFIG_ERROR = None
if _requested_uri:
    try:
        TEST_MONGODB_URI = validate_test_mongodb_uri(_requested_uri)
    except UnsafeTestDatabaseError as exc:
        UNSAFE_CONFIG_ERROR = f"Refusing to run tests: {TEST_URI_ENV_VAR} is unsafe. {exc}"

# 3. Override the application's settings before app.config loads the root .env.
#    python-dotenv never overrides variables that are already set (even to ""),
#    so an empty MONGODB_URI also disables the config.py fallback URI.
os.environ["MONGODB_URI"] = TEST_MONGODB_URI or ""
os.environ["MONGODB_DB_NAME"] = TEST_DB_NAME

# 4. Replace PyMongo clients with guarded versions before the app binds to them.
import pymongo  # noqa: E402

_UnguardedMongoClient = pymongo.MongoClient
pymongo.AsyncMongoClient = make_guarded_client_class(pymongo.AsyncMongoClient)
pymongo.MongoClient = make_guarded_client_class(pymongo.MongoClient)

from app import config as _app_config  # noqa: E402
from app.db import mongodb as _app_mongodb  # noqa: E402

if (
    _app_config.MONGODB_URI != os.environ["MONGODB_URI"]
    or _app_config.MONGODB_DB_NAME != TEST_DB_NAME
    or _app_mongodb.MONGODB_DB_NAME != TEST_DB_NAME
    or _app_mongodb.AsyncMongoClient is not pymongo.AsyncMongoClient
):
    pytest.exit(
        "Refusing to run tests: the application database settings were not isolated.",
        returncode=4,
    )

# 5. Database-backed tests run only if the validated local server answers.
DB_TESTS_ENABLED = False
DB_SKIP_REASON = (
    f"Database-backed test skipped: set {TEST_URI_ENV_VAR} to a local MongoDB "
    f"(e.g. mongodb://127.0.0.1:27017) to run it against '{TEST_DB_NAME}'."
)
if TEST_MONGODB_URI:
    _probe = _UnguardedMongoClient(
        TEST_MONGODB_URI, serverSelectionTimeoutMS=2000, connectTimeoutMS=2000
    )
    try:
        _probe.admin.command("ping")
        DB_TESTS_ENABLED = True
    except Exception:
        DB_SKIP_REASON = (
            f"Database-backed test skipped: no local MongoDB answered at the URI in "
            f"{TEST_URI_ENV_VAR}."
        )
    finally:
        _probe.close()


def pytest_configure(config):
    if UNSAFE_CONFIG_ERROR:
        pytest.exit(UNSAFE_CONFIG_ERROR, returncode=4)


def pytest_report_header(config):
    if DB_TESTS_ENABLED:
        return f"MongoDB tests: ENABLED against local database '{TEST_DB_NAME}'"
    return "MongoDB tests: DISABLED (no reachable local test database); live database access is blocked"


def pytest_collection_modifyitems(config, items):
    if DB_TESTS_ENABLED:
        return
    skip_marker = pytest.mark.skip(reason=DB_SKIP_REASON)
    for item in items:
        if item.path.name in DB_BACKED_TEST_MODULES:
            item.add_marker(skip_marker)
