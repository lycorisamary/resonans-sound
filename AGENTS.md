# AGENTS.md

## Purpose

This file is the persistent working context for Codex and any future coding
agents operating inside `resonans-sound`.

Before substantial work:

1. Read this file.
2. Treat the current production state as the baseline.
3. Check whether the repository and docs still match reality.
4. If the project state changed during the current iteration, update this file
   and the relevant docs before finishing.

## Project Baseline

- Repository: `https://github.com/lycorisamary/resonans-sound`
- Main branch: `main`
- Production is the working source of truth for the deployed system
- Domain: `https://resonance-sound.ru`
- Server: `91.230.94.22`
- Server user: `root`

## Production Topology

- Host Nginx terminates HTTPS
- `/` proxies to frontend on `127.0.0.1:3000`
- `/api/` proxies to backend on `127.0.0.1:8000`
- Frontend must remain a production static build, never a dev server
- Production runtime configuration source of truth: `/root/resonans-sound/infra/.env`
- Real secrets must not be committed to the repository

## Current Product Rules

These rules should be treated as the active product contract unless the user
explicitly changes direction.

- Auth works through JWT access + refresh tokens
- Track metadata can be created and edited by the owner
- Frontend Studio shows the metadata form directly and can upload selected
  audio/cover files immediately after metadata creation
- Frontend home route `/` is a discovery-led landing with curated sections,
  artist spotlight, recent/popular blocks, and the shared catalog embedded
  below the hero surface; Studio lives on `/studio` and inside `/me`, not as
  the first block on the home route
- The frontend player is a single global compact bottom `PlayerPanel` mounted
  outside `Routes`; do not move its `<audio>` element back into route-local
  screens or playback will stop on navigation
- Audio upload goes to MinIO and is processed by Celery
- After successful processing, tracks are auto-published
- Manual moderation is currently not part of the main product flow
- Staff post-publication control is active: `admin` and `moderator` can hide,
  restore, and delete tracks without adding a premoderation gate
- All published tracks are visible in the shared catalog
- Published track play counters increment only after a real listen threshold:
  30 seconds or 50% of duration, whichever is earlier
- Owners can delete their own tracks
- `admin` and `moderator` roles can delete any track
- Track covers are uploaded separately and stored in MinIO
- Upload validation checks extension, server-side file signatures, size, and
  track state before writing to MinIO
- Users have a separate liked-tracks view
- Authenticated users can submit post-publication track reports; staff reviews
  open reports in `/admin` and can hide the linked track without adding a
  premoderation gate
- User accounts and artist profiles are separate runtime concepts: a registered
  user can listen/like, but must create an artist profile before creating or
  uploading tracks
- Public artist profiles are active runtime through `artists`: guests can browse
  `/artists`, open `/artists/:slug`, and see only approved tracks for active
  artists owned by active users
- Artist discovery supports search plus genre, location and sort filters over
  active public artist profiles
- Authenticated users can create and edit their own artist profile text fields
  and upload profile avatar/banner images through backend-owned MinIO delivery
  URLs
- Staff-managed collections are active runtime: guests can view public
  collections, while only `admin` and `moderator` can create, publish,
  unpublish, delete, add approved tracks, remove tracks, reorder them, and
  upload collection covers
- Public collection playback is queue-based: pressing collection play starts
  approved tracks in collection order and advances automatically
- Track BPM and key signature are not part of the active runtime surface; track
  metadata uses the supported genre list plus free-form tags

## Current Technical Notes

- Database schema is managed through Alembic migrations only
- Backend startup must fail fast if the DB schema revision does not match the
  repository Alembic head
- Media storage currently uses the `tracks` row as the main source of truth
- Cover objects should be accessed through backend URLs, not direct MinIO keys
- Collection covers are stored in MinIO with explicit `playlists`
  storage metadata and served through `/api/v1/collections/{id}/cover`
- Artist avatar/banner objects are stored in MinIO under `profiles/...`; public
  clients receive `/api/v1/artists/{slug}/avatar` and
  `/api/v1/artists/{slug}/banner`, never object keys
- Active ORM models are split by context under `backend/app/models/`
- Existing physical `playlists` / `playlist_tracks` tables are now active as
  staff-managed `Collection` / `CollectionTrack` runtime models; they are not
  user playlists or a general social playlist feature
- Existing physical `reports` is now active as the staff-reviewed track report
  surface; comments/follows remain planned-only
- Track access, streaming, deletion, and upload rules live in
  `backend/app/policies/`
- `hidden` tracks are staff-controlled: they are not public, owners cannot
  re-publish them by replacing media, and staff can inspect them through admin
  APIs
- Play events are active runtime data in `track_play_events`; listener identity
  is hashed, guest IP/user-agent values are not stored raw, and duplicate
  listener/track plays are suppressed for 6 hours
- New domain errors should use the stable `code` / `message` / `request_id`
  response contract
- Critical auth, upload, stream-url, and stream routes are protected by
  configurable fixed-window rate limits backed by Redis in production
- API responses include `X-Request-ID`; source upload passes that request id
  into Celery processing metadata/logs as a correlation id
- Prometheus metrics cover HTTP traffic, auth failures, rate limit hits, upload
  outcomes, processing outcomes/latency, stream errors, and play-event outcomes
- Grafana is intended to stay bound to server localhost and be viewed through an
  SSH tunnel, not exposed directly to the public internet
- Backend and frontend responses should keep the current security headers and
  production CORS must not include wildcard or localhost origins
- Frontend is split into `features/`, `entities/`, `shared/`, and `hooks/`
- Frontend routing uses React Router routes `/`, `/login`, `/studio`, `/me`,
  `/tracks/:id`, `/artists`, `/artists/:username`, `/collections`,
  `/collections/:id`, and `/admin`
- Frontend shared state uses Zustand; Redux is not part of the active runtime
- Frontend API client lives in `shared/api/` and is typed against the active
  backend API
- Staff collection track add uses searchable approved-track lookup in the
  admin feature module, not a static all-track select

## Working Rules For Agents

- Do not reset or roll back the current working baseline unless the user
  explicitly asks for that
- Do not reintroduce a frontend dev server into production
- Do not change the host Nginx / reverse-proxy scheme unless truly necessary
- Prefer incremental changes over rewrites when the current system already
  works
- After changing live behavior, update the relevant docs so they stay aligned
  with the real implementation
- If production logic changes materially, update this file in the same
  iteration

## Documentation To Check

- [`README.md`](README.md)
- [`docs/index.md`](docs/index.md)
- [`docs/project-status-ru.md`](docs/project-status-ru.md)
- [`docs/manual-test-checklist-ru.md`](docs/manual-test-checklist-ru.md)
- [`docs/frontend-structure-ru.md`](docs/frontend-structure-ru.md)
- [`docs/upload-flow-blueprint.md`](docs/upload-flow-blueprint.md)
- [`docs/database-blueprint.md`](docs/database-blueprint.md)
- [`docs/minio-storage-ru.md`](docs/minio-storage-ru.md)
- [`docs/operations-hardening-runbook.md`](docs/operations-hardening-runbook.md)

## Deployment Reminder

The desired release flow is:

1. Commit a finished logical slice.
2. Push to `origin/main`.
3. Deploy on the server carefully.
4. Re-test the changed flows on production.
