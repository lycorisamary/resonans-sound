import os
from pydantic_settings import BaseSettings
from typing import Optional
from datetime import timedelta


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Audio Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"
    
    # Database
    # Defaults below are intended for local development only.
    DATABASE_URL: str = "postgresql://audioplatform:password@localhost:5432/audio_platform"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # RabbitMQ
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672//"
    
    # MinIO/S3 Storage
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "audioplatform"
    MINIO_SECRET_KEY: str = "password"
    MINIO_BUCKET: str = "audio-tracks"
    MINIO_SECURE: bool = False
    
    # Security & Authentication
    SECRET_KEY: str = "change_me_application_secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    STREAM_TOKEN_EXPIRE_MINUTES: int = 120
    
    # File Upload Limits
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100 MB
    ALLOWED_AUDIO_FORMATS: list = [
        "audio/mpeg",
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/vnd.wave",
    ]
    ALLOWED_EXTENSIONS: list = [".mp3", ".wav"]
    MAX_COVER_IMAGE_SIZE: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_FORMATS: list = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ]
    ALLOWED_IMAGE_EXTENSIONS: list = [".jpg", ".jpeg", ".png", ".webp"]
    
    # Audio Processing
    AUDIO_BITRATES: list = [128, 320]  # kbps
    WAVEFORM_SAMPLES: int = 1000
    
    # Rate Limiting
    RATE_LIMIT_PER_SECOND: int = 100
    UPLOAD_RATE_LIMIT_PER_HOUR: int = 10
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
    ]
    
    # Email (for future use)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: Optional[str] = None
    
    # Monitoring
    PROMETHEUS_ENABLED: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
