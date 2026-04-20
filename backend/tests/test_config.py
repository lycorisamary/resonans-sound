import pytest

from app.core.config import Settings


def test_production_debug_combination_is_rejected():
    with pytest.raises(ValueError, match="DEBUG must be False"):
        Settings(
            _env_file=None,
            ENV="production",
            DEBUG=True,
            DATABASE_URL="sqlite:///./test.db",
            MINIO_SECRET_KEY="test-minio-secret",
            SECRET_KEY="test-secret-key",
        )


def test_required_runtime_secrets_must_be_non_empty():
    with pytest.raises(ValueError, match="SECRET_KEY must not be empty"):
        Settings(
            _env_file=None,
            ENV="development",
            DEBUG=True,
            DATABASE_URL="sqlite:///./test.db",
            MINIO_SECRET_KEY="test-minio-secret",
            SECRET_KEY="   ",
        )
