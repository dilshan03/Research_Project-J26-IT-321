"""
Regression tests for database credential handling in app/config.py.
Each configuration scenario runs in a fresh subprocess so the conftest database
guard of this session is unaffected. No database connection is made, the root
.env file is never read, and no connection string is printed.
"""

import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

SERVICE_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = SERVICE_ROOT / "app" / "config.py"

# Runs app.config with python-dotenv disabled, then reports only safe facts.
_PROBE = """
import dotenv
dotenv.load_dotenv = lambda *args, **kwargs: False
from app import config
uri = config.MONGODB_URI
print("EMPTY" if uri == "" else "SET")
print("MATCHES_EXPECTED" if uri == __import__("os").environ.get("EXPECTED_URI", "") else "DIFFERENT")
"""


def _run_config_probe(mongodb_uri):
    env = {k: v for k, v in os.environ.items() if k not in ("MONGODB_URI", "EXPECTED_URI")}
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    if mongodb_uri is not None:
        env["MONGODB_URI"] = mongodb_uri
        env["EXPECTED_URI"] = mongodb_uri
    result = subprocess.run(
        [sys.executable, "-c", _PROBE],
        cwd=SERVICE_ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, "config probe failed to import app.config"
    return result.stdout.split()


def test_config_source_contains_no_connection_string():
    source = CONFIG_PATH.read_text(encoding="utf-8")
    assert not re.search(r"mongodb(\+srv)?://", source)


def test_missing_uri_has_no_fallback():
    assert _run_config_probe(None) == ["EMPTY", "MATCHES_EXPECTED"]


@pytest.mark.parametrize(
    "uri",
    [
        "mongodb://127.0.0.1:27017",
        "mongodb+srv://placeholder-user:placeholder-pass@cluster0.example.mongodb.net/?appName=example",
    ],
)
def test_supplied_uri_is_used_unchanged(uri):
    assert _run_config_probe(uri) == ["SET", "MATCHES_EXPECTED"]
