from __future__ import annotations

from pathlib import Path
import sys

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


BACKEND_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings


REQUIRED_LEGACY_TABLES = {"users", "categories", "tracks", "interactions"}


def build_alembic_config() -> Config:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    return config


def main() -> None:
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    if "alembic_version" in table_names:
        print("Alembic is already bootstrapped for this database.")
        return

    missing_tables = REQUIRED_LEGACY_TABLES - table_names
    if missing_tables:
        missing = ", ".join(sorted(missing_tables))
        raise RuntimeError(
            "Cannot stamp Alembic on a partially initialized schema. "
            f"Missing tables: {missing}"
        )

    command.stamp(build_alembic_config(), "head")
    print("Alembic baseline stamp completed.")


if __name__ == "__main__":
    main()
