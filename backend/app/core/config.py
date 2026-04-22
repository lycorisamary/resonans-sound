import os

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_env_file() -> str:
    explicit_env_file = os.getenv("APP_ENV_FILE")
    if explicit_env_file:
        return explicit_env_file

    environment = os.getenv("ENV", "development").strip().lower()
    if environment == "production":
        return ".env.prod"
    if environment == "test":
        return ".env.test"
    return ".env.dev"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    APP_NAME: str = "Audio Platform"
    APP_VERSION: str = "1.0.0"
    ENV: str = "development"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    REDIS_URL: str = "redis://localhost:6379/0"
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672//"
    CELERY_METRICS_PORT: int = 9102

    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "audioplatform"
    MINIO_SECRET_KEY: str
    MINIO_BUCKET: str = "audio-tracks"
    MINIO_SECURE: bool = False

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    STREAM_TOKEN_EXPIRE_MINUTES: int = 120

    MAX_FILE_SIZE: int = 512 * 1024 * 1024
    ALLOWED_AUDIO_FORMATS: list[str] = [
        "audio/mpeg",
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/vnd.wave",
    ]
    ALLOWED_EXTENSIONS: list[str] = [".mp3", ".wav"]
    MAX_COVER_IMAGE_SIZE: int = 5 * 1024 * 1024
    ALLOWED_IMAGE_FORMATS: list[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ]
    ALLOWED_IMAGE_EXTENSIONS: list[str] = [".jpg", ".jpeg", ".png", ".webp"]

    AUDIO_BITRATES: list[int] = [128, 320]
    WAVEFORM_SAMPLES: int = 1000

    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REDIS_URL: str | None = None
    RATE_LIMIT_PER_SECOND: int = 100
    AUTH_LOGIN_RATE_LIMIT_PER_MINUTE: int = 10
    AUTH_REGISTER_RATE_LIMIT_PER_HOUR: int = 5
    AUTH_REFRESH_RATE_LIMIT_PER_MINUTE: int = 30
    UPLOAD_RATE_LIMIT_PER_HOUR: int = 20
    COVER_UPLOAD_RATE_LIMIT_PER_HOUR: int = 30
    STREAM_URL_RATE_LIMIT_PER_MINUTE: int = 60
    STREAM_RATE_LIMIT_PER_MINUTE: int = 300
    PLAY_EVENT_RATE_LIMIT_PER_MINUTE: int = 120
    REPORT_RATE_LIMIT_PER_HOUR: int = 20

    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
    ]

    SMTP_HOST: str | None = None
    SMTP_PORT: int | None = None
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    EMAIL_FROM: str | None = None

    PROMETHEUS_ENABLED: bool = True

    model_config = SettingsConfigDict(
        env_file=_default_env_file(),
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("ENV")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        normalized = value.strip().lower()
        allowed = {"development", "production", "test"}
        if normalized not in allowed:
            raise ValueError(f"ENV must be one of: {', '.join(sorted(allowed))}")
        return normalized

    @field_validator("DATABASE_URL", "MINIO_SECRET_KEY", "SECRET_KEY")
    @classmethod
    def require_non_empty_secret_values(cls, value: str, info) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError(f"{info.field_name} must not be empty")
        return normalized

    @model_validator(mode="after")
    def validate_environment_rules(self) -> "Settings":
        if self.ENV == "production" and self.DEBUG:
            raise ValueError("DEBUG must be False when ENV=production")
        if self.ENV == "production":
            forbidden_origins = {
                "*",
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:8080",
            }
            configured_origins = {origin.strip() for origin in self.CORS_ORIGINS}
            if configured_origins.intersection(forbidden_origins):
                raise ValueError("Production CORS_ORIGINS must not include wildcard or localhost origins")
        return self


settings = Settings()
