from app.celery import app


@app.task(name="app.tasks.smoke_check")
def smoke_check() -> dict[str, str]:
    """Minimal task so the worker can be started and verified safely."""
    return {
        "status": "ok",
        "broker": "rabbitmq",
        "result_backend": "redis",
    }
