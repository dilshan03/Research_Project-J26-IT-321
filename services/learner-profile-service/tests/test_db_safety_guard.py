"""
Regression tests for the test-only MongoDB safety guard (tests/_db_safety.py, tests/conftest.py).
These tests never contact a database: unsafe targets are rejected before any network activity.
"""

import os
import pytest

from app import config
from app.db import mongodb
from tests._db_safety import (
    TEST_DB_NAME,
    TEST_URI_ENV_VAR,
    UnsafeTestDatabaseError,
    validate_test_mongodb_uri,
)

# Fictitious Atlas-style URI; not a real cluster or credential.
FAKE_ATLAS_URI = "mongodb+srv://example-user:example-secret@cluster0.example.mongodb.net/?appName=example"


class TestUriValidation:
    @pytest.mark.parametrize(
        "uri",
        [
            None,
            "",
            "   ",
            FAKE_ATLAS_URI,
            "mongodb+srv://localhost/mathquest_test",
            "mongodb://cluster0.example.mongodb.net:27017",
            "mongodb://203.0.113.10:27017",
            "mongodb://127.0.0.1:27017,db.example.com:27017",
            "mongodb://127.0.0.1:27017/mathquest_db",
            "mongodb://127.0.0.1:27017/mathquest_test_copy",
            "http://127.0.0.1:27017",
        ],
    )
    def test_unsafe_targets_are_rejected(self, uri):
        with pytest.raises(UnsafeTestDatabaseError):
            validate_test_mongodb_uri(uri)

    @pytest.mark.parametrize(
        "uri",
        [
            "mongodb://127.0.0.1:27017",
            "mongodb://localhost:27017/",
            "mongodb://localhost/mathquest_test",
            "mongodb://[::1]:27017/mathquest_test?serverSelectionTimeoutMS=2000",
            "mongodb://tester:pw@127.0.0.1:27017/mathquest_test?authSource=admin",
        ],
    )
    def test_local_test_targets_are_accepted(self, uri):
        assert validate_test_mongodb_uri(uri) == uri

    def test_error_messages_never_echo_credentials(self):
        with pytest.raises(UnsafeTestDatabaseError) as exc_info:
            validate_test_mongodb_uri(FAKE_ATLAS_URI)
        message = str(exc_info.value)
        assert "example-secret" not in message
        assert "example-user" not in message
        assert "mongodb.net" not in message


class TestApplicationIsolation:
    def test_application_uses_test_database_name(self):
        assert config.MONGODB_DB_NAME == TEST_DB_NAME
        assert mongodb.MONGODB_DB_NAME == TEST_DB_NAME

    def test_application_uri_is_empty_or_local(self):
        """The root .env and config.py fallback URI must never reach the test session."""
        assert not config.MONGODB_URI.startswith("mongodb+srv://")
        if config.MONGODB_URI:
            validate_test_mongodb_uri(config.MONGODB_URI)

    def test_application_client_rejects_remote_cluster(self):
        with pytest.raises(UnsafeTestDatabaseError):
            mongodb.AsyncMongoClient(FAKE_ATLAS_URI)

    def test_application_client_rejects_implicit_default_host(self):
        with pytest.raises(UnsafeTestDatabaseError):
            mongodb.AsyncMongoClient()

    async def test_guarded_client_limits_database_names(self):
        client = mongodb.AsyncMongoClient(
            "mongodb://127.0.0.1:27017/?serverSelectionTimeoutMS=100", connect=False
        )
        try:
            with pytest.raises(UnsafeTestDatabaseError):
                client["mathquest_db"]
            with pytest.raises(UnsafeTestDatabaseError):
                client.get_database("mathquest_db")
            assert client[TEST_DB_NAME].name == TEST_DB_NAME
        finally:
            await client.close()

    @pytest.mark.skipif(
        bool(os.environ.get(TEST_URI_ENV_VAR)),
        reason="Only meaningful when no local test database is configured.",
    )
    async def test_connect_without_test_configuration_fails_safely(self):
        with pytest.raises(ValueError):
            await mongodb.connect_to_database()
        assert mongodb._client is None
        assert mongodb._database is None
