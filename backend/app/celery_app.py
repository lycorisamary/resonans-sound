from celery import Celery
from celery.signals import worker_ready
from prometheus_client import start_http_server
import structlog

from app.core.config import settings
from app.core.logging import configure_structured_logging


configure_structured_logging()
logger = structlog.get_logger(__name__)
_metrics_server_started = False


app = Celery(
    "resonans_sound",
    broker=settings.RABBITMQ_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"],
)

app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
)

celery_app = app


@worker_ready.connect
def start_metrics_server(**kwargs) -> None:
    global _metrics_server_started
    if _metrics_server_started or not settings.PROMETHEUS_ENABLED or settings.CELERY_METRICS_PORT <= 0:
        return

    try:
        start_http_server(settings.CELERY_METRICS_PORT)
    except OSError:
        logger.warning("celery_metrics_server_unavailable", port=settings.CELERY_METRICS_PORT)
        return

    _metrics_server_started = True
    logger.info("celery_metrics_server_started", port=settings.CELERY_METRICS_PORT)
