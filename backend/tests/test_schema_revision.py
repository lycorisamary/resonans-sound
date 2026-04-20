from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.db.schema import validate_schema_revision


class FakeResult:
    def __init__(self, scalar_value=None, rows=None):
        self.scalar_value = scalar_value
        self.rows = rows or []

    def scalar_one(self):
        return self.scalar_value

    def __iter__(self):
        return iter(self.rows)


class FakeConnection:
    def __init__(self, version_table_exists, current_heads):
        self.version_table_exists = version_table_exists
        self.current_heads = current_heads

    def exec_driver_sql(self, query):
        return FakeResult(scalar_value=self.version_table_exists)

    def execute(self, query):
        return FakeResult(rows=[(head,) for head in self.current_heads])

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class FakeEngine:
    def __init__(self, connection):
        self.connection = connection

    def connect(self):
        return self.connection


def test_validate_schema_revision_rejects_missing_alembic_history():
    engine = FakeEngine(FakeConnection(version_table_exists=None, current_heads=[]))

    with patch("app.db.schema.ScriptDirectory.from_config", return_value=SimpleNamespace(get_heads=lambda: ["head"])):
        with pytest.raises(RuntimeError, match="not initialized with Alembic"):
            validate_schema_revision(engine)


def test_validate_schema_revision_rejects_revision_mismatch():
    engine = FakeEngine(FakeConnection(version_table_exists="alembic_version", current_heads=["old_head"]))

    with patch("app.db.schema.ScriptDirectory.from_config", return_value=SimpleNamespace(get_heads=lambda: ["new_head"])):
        with pytest.raises(RuntimeError, match="revision mismatch"):
            validate_schema_revision(engine)
