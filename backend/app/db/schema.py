from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.engine import Engine


def _alembic_config_path() -> Path:
    return Path(__file__).resolve().parents[2] / "alembic.ini"


def validate_schema_revision(engine: Engine) -> None:
    """Fail fast when the database is not migrated to the current Alembic head."""
    alembic_ini_path = _alembic_config_path()
    alembic_config = Config(str(alembic_ini_path))
    alembic_config.set_main_option("script_location", str(alembic_ini_path.parent / "alembic"))
    script = ScriptDirectory.from_config(alembic_config)
    expected_heads = set(script.get_heads())

    with engine.connect() as connection:
        version_table_exists = connection.exec_driver_sql(
            "SELECT to_regclass('public.alembic_version')"
        ).scalar_one()
        if version_table_exists is None:
            raise RuntimeError(
                "Database schema is not initialized with Alembic. Run `alembic upgrade head` before starting the app."
            )

        current_heads = {
            row[0]
            for row in connection.execute(text("SELECT version_num FROM alembic_version"))
            if row[0]
        }

    if current_heads != expected_heads:
        raise RuntimeError(
            "Database schema revision mismatch. "
            f"Current: {sorted(current_heads)}. Expected: {sorted(expected_heads)}. "
            "Run `alembic upgrade head` before starting the app."
        )
