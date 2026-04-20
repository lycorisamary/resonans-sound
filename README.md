# Resonans Sound

`resonans-sound` is an early MVP audio platform with a live production baseline.
The project already runs with a real backend, object storage, media processing,
automatic track publication, cover uploads, and a connected frontend on `https://resonance-sound.ru`.

## Current State

Implemented in `main` right now:

- JWT auth: register, login, refresh rotation, logout, `GET /users/me`
- public catalog with categories
- track metadata CRUD for owners
- source upload to MinIO
- track cover upload
- Celery media processing
- derived `128/320 mp3` generation
- waveform generation
- automatic publication after successful processing
- public playback and owner preview where needed
- basic discovery: text search, category filter, sort
- likes plus a dedicated liked-tracks view
- backend tests for critical upload/stream security paths

## Production Baseline

Current production topology:

- domain: `https://resonance-sound.ru`
- host Nginx terminates HTTPS
- `/` proxies to frontend on `127.0.0.1:3000`
- `/api/` proxies to backend on `127.0.0.1:8000`
- production source of truth for runtime config: `/root/resonans-sound/infra/.env`
- frontend is served as a static production build, not a dev server

## Live API Surface

Currently active routes in `main`:

- `GET /`
- `GET /api/v1/health`
- `GET /metrics`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
- `GET /api/v1/categories`
- `GET /api/v1/categories/{slug}`
- `GET /api/v1/tracks`
- `GET /api/v1/tracks/mine`
- `POST /api/v1/tracks`
- `POST /api/v1/tracks/upload`
- `POST /api/v1/tracks/{id}/cover`
- `GET /api/v1/tracks/{id}`
- `GET /api/v1/tracks/{id}/cover`
- `GET /api/v1/tracks/{id}/stream`
- `GET /api/v1/tracks/{id}/stream-url`
- `PUT /api/v1/tracks/{id}`
- `DELETE /api/v1/tracks/{id}`
- `GET /api/v1/interactions/likes/mine`
- `GET /api/v1/interactions/likes/mine/tracks`
- `POST /api/v1/interactions/like`
- `DELETE /api/v1/interactions/like`
- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/moderation`
- `GET /api/v1/admin/logs`
- `POST /api/v1/admin/moderate/{track_id}`

## Documentation

The documentation map is now centered in [`docs/index.md`](docs/index.md).

Key documents:

- [`docs/project-status-ru.md`](docs/project-status-ru.md) — current project state, MVP readiness, manual checks, next plan
- [`docs/manual-test-checklist-ru.md`](docs/manual-test-checklist-ru.md) — exact manual QA checklist for the current iteration
- [`docs/staff-access-ru.md`](docs/staff-access-ru.md) — admin login and moderator access instructions
- [`docs/minio-storage-ru.md`](docs/minio-storage-ru.md) — how MinIO works in this project
- [`docs/upload-flow-blueprint.md`](docs/upload-flow-blueprint.md) — source of truth for the current upload/media lifecycle
- [`docs/database-blueprint.md`](docs/database-blueprint.md) — current data model and logical rules
- [`docs/local-setup-ru.md`](docs/local-setup-ru.md) — detailed local setup guide in Russian
- [`docs/quick-start-ru.md`](docs/quick-start-ru.md) — short Russian quick start
- [`docs/quickstart.md`](docs/quickstart.md) — short English quick start
- [`docs/server-diagnostics-ru.md`](docs/server-diagnostics-ru.md) — production diagnostics and deploy checks

## Local Run

Recommended local flow:

```bash
cd infra
cp .env.example .env
docker compose up -d --build
docker compose ps
```

Local entry points:

- frontend: `http://127.0.0.1:3000`
- backend health: `http://127.0.0.1:8000/api/v1/health`
- API docs: `http://127.0.0.1:8000/api/docs`

## Production Update Flow

```bash
cd /root/resonans-sound
git pull --ff-only origin main
cd infra
docker compose build backend celery_worker frontend
docker compose run --rm backend pytest -q tests
docker compose up -d backend celery_worker frontend
docker compose ps
curl https://resonance-sound.ru/api/v1/health
```

## What Is Still Missing Before A Fuller MVP

- play counters on real listen thresholds
- download rules for original/derived assets
- richer library/discovery views
- playlists and comments
- frontend tests
- operational backup/rate-limit hardening
