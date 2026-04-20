# Resonans Sound Quick Start

## Prerequisites

- Docker with Compose support
- Git

## Local Startup

```bash
cd infra
cp .env.example .env
docker compose up -d --build
docker compose ps
```

## Local Entry Points

- frontend: `http://127.0.0.1:3000`
- backend health: `http://127.0.0.1:8000/api/v1/health`
- API docs: `http://127.0.0.1:8000/api/docs`

## First Smoke Check

```bash
curl http://127.0.0.1:8000/api/v1/health
```

Then in the browser:

1. open the frontend
2. register a user
3. create track metadata
4. upload a WAV or MP3
5. wait for `processing -> pending`
6. test playback

## Useful Commands

```bash
cd infra
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f celery_worker
docker compose run --rm backend pytest -q tests
docker compose up -d --build backend celery_worker frontend
```

## Important Notes

- local Docker exposes only frontend `3000` and backend `8000`
- MinIO/RabbitMQ/Prometheus/Grafana are internal by default in the current compose
- production does not use a frontend dev server

## Next Reading

- [`index.md`](index.md)
- [`project-status-ru.md`](project-status-ru.md)
- [`manual-test-checklist-ru.md`](manual-test-checklist-ru.md)
