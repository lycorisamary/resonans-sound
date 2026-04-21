# Operations Hardening Runbook

This document tracks the production-hardening layer added during iteration 4.
Real secrets and the live `.env` values remain only on the production server.

## Rate Limiting

The backend uses fixed-window rate limiting with Redis storage in production
and in-memory fallback when Redis is unavailable.

Current protected routes:

- `POST /api/v1/auth/login`: by client IP, default `10/minute`
- `POST /api/v1/auth/register`: by client IP, default `5/hour`
- `POST /api/v1/auth/refresh`: by refresh token fingerprint, default `30/minute`
- `POST /api/v1/tracks/upload`: by user, default `20/hour`
- `POST /api/v1/tracks/{id}/cover`: by user, default `30/hour`
- `GET /api/v1/tracks/{id}/stream-url`: by user or IP, default `60/minute`
- `GET /api/v1/tracks/{id}/stream`: by user or IP, default `300/minute`

429 responses use the stable backend error contract:

```json
{
  "code": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later.",
  "request_id": "..."
}
```

The response also includes `Retry-After`.

## Request And Correlation IDs

- Every API request receives an `X-Request-ID` response header.
- If the client sends `X-Request-ID`, the backend keeps it.
- Source upload passes the same request id into the Celery processing task.
- Track processing metadata stores `processing.request_id` when available.
- Backend and worker logs include the request id through structlog context.

## Metrics

Prometheus scrapes:

- backend: `backend:8000/metrics`
- Celery worker: `celery_worker:9102/metrics`

Key metric families:

- `http_requests_total`
- `http_request_duration_seconds`
- `auth_failures_total`
- `rate_limit_hits_total`
- `track_upload_events_total`
- `track_processing_events_total`
- `track_processing_duration_seconds`
- `track_stream_errors_total`

## Grafana

Grafana is bound only to server localhost:

- server-side URL: `http://127.0.0.1:3001`
- dashboard: `Resonans Sound / Resonans Sound Overview`

Recommended access from an operator machine:

```bash
ssh -L 3001:127.0.0.1:3001 root@91.230.94.22
```

Then open:

```text
http://127.0.0.1:3001
```

Credentials come from the private production file:

```text
/root/resonans-sound/infra/.env
```

The dashboard and Prometheus datasource are provisioned from:

- `infra/grafana/provisioning/datasources/prometheus.yml`
- `infra/grafana/provisioning/dashboards/dashboards.yml`
- `infra/grafana/dashboards/resonans-overview.json`

## Security Headers

The backend and frontend static Nginx add:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`

Production CORS validation rejects wildcard and localhost origins.

## Deploy Checklist

Before deploy:

- confirm no real secrets are staged
- confirm migrations are present if schema changed
- ensure the production `/root/resonans-sound/infra/.env` has current secrets
- create a backup before risky schema or storage changes

Deploy:

```bash
cd /root/resonans-sound
git pull --ff-only origin main
cd backend
ENV=production APP_ENV_FILE=../infra/.env alembic upgrade head
cd ../infra
docker compose build backend celery_worker frontend
docker compose up -d backend celery_worker frontend prometheus grafana
docker compose ps
```

Post-deploy smoke:

```bash
curl -i https://resonance-sound.ru/api/v1/health
curl -I https://resonance-sound.ru/
docker compose logs backend --tail=100
docker compose logs celery_worker --tail=100
```

## Rollback Plan

If containers fail after a code-only deploy:

```bash
cd /root/resonans-sound
git log --oneline -5
git checkout <previous-good-commit>
cd infra
docker compose build backend celery_worker frontend
docker compose up -d backend celery_worker frontend
```

If a migration was applied:

- check whether the Alembic migration has a safe downgrade
- if yes, run `alembic downgrade <revision>`
- if no, restore from the latest verified Postgres backup
- restore MinIO objects if media state and object storage diverged

After rollback:

```bash
curl https://resonance-sound.ru/api/v1/health
curl -I https://resonance-sound.ru/
```

## Backup/Restore Status

Backup automation and a verified restore drill are still the next hardening
block. Until that is finished, take manual backups before risky deploys.
