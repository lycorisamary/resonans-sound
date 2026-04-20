# Upload Flow Blueprint

## Status

This document is no longer just a plan. The upload/media pipeline described
below is implemented in `main` and already used as the current production
baseline.

## Scope

The pipeline extends the already working track metadata flow with:

- real file upload
- MinIO object storage
- Celery media processing
- waveform generation
- moderation handoff
- public and private playback paths

The first production implementation still reuses the existing `tracks` row as
the main source of truth. No extra normalized media tables are required yet.

## End-to-End Lifecycle

1. An authenticated artist creates track metadata with `POST /api/v1/tracks`.
2. The artist uploads a source file with `POST /api/v1/tracks/upload`.
3. Backend validates ownership, extension, size, and content type.
4. Backend stores the original file in MinIO.
5. Backend moves the track to `processing` and enqueues a Celery job.
6. Celery downloads the original object from MinIO, extracts audio metadata,
   generates `128/320 mp3`, and builds waveform data.
7. Worker writes derived files back to MinIO and updates the `tracks` row.
8. On successful processing the track returns to `pending`, but now in
   “ready for moderation” state.
9. A moderator or admin explicitly approves or rejects the track.
10. If the track is `approved + is_public`, it becomes publicly visible and
    publicly streamable.
11. If the track remains private or not yet approved, owner/moderator preview
    still works through a signed stream URL.

## Current API Contract

### `POST /api/v1/tracks/upload`

Request:

- `multipart/form-data`
- `track_id`: integer, required
- `file`: audio file, required

Rules:

- the track must belong to the authenticated user
- allowed source states:
  - `pending`
  - `rejected`
- disallowed source states:
  - `processing`
  - `deleted`

Response:

- `202 Accepted`
- returns the updated owner-facing track payload

### `GET /api/v1/tracks/{id}/stream`

Returns the real audio bytes and supports:

- public playback
- owner preview
- moderator preview
- HTTP Range

### `GET /api/v1/tracks/{id}/stream-url`

Returns a browser-safe playback URL for the current access context.

Why it exists:

- the browser `<audio>` element does not automatically inject the normal Bearer
  token from frontend auth state
- private/non-approved playback therefore needs a short-lived signed URL

## Status Model

Current transitions:

- `pending`
  - metadata-only state before upload
  - or ready-for-moderation state after processing
- `processing`
  - original file is stored and worker is generating media assets
- `approved`
  - moderation passed
- `rejected`
  - worker or moderator rejected the track
- `deleted`
  - terminal soft-delete

## MinIO Object Layout

Bucket:

- `MINIO_BUCKET`

Object key layout:

- `tracks/{user_id}/{track_id}/original/{uuid}.{ext}`
- `tracks/{user_id}/{track_id}/derived/128.mp3`
- `tracks/{user_id}/{track_id}/derived/320.mp3`

Notes:

- original uploads are unique by object key
- derived files are stable per track and may be replaced by a later re-upload

## Source Of Truth In `tracks`

The current pipeline still treats the `tracks` row as the canonical record.

Important fields:

- `status`
- `original_url`
- `mp3_128_url`
- `mp3_320_url`
- `file_size_bytes`
- `duration_seconds`
- `waveform_data_json`
- `metadata_json`
- `rejection_reason`

## `metadata_json` Contract

The API and worker currently share this logical document:

```json
{
  "duration_seconds": 213,
  "file_size_bytes": 12450067,
  "bitrate": 320,
  "sample_rate": 44100,
  "channels": 2,
  "format": "wav",
  "upload": {
    "original_filename": "artist-demo.wav",
    "content_type": "audio/wav",
    "uploaded_at": "2026-04-19T20:11:30.120000+00:00"
  },
  "storage": {
    "bucket": "audio-tracks",
    "original_object_key": "tracks/7/21/original/abc123.wav",
    "processed_object_keys": {
      "128": "tracks/7/21/derived/128.mp3",
      "320": "tracks/7/21/derived/320.mp3"
    }
  },
  "processing": {
    "status": "processed",
    "task_id": "celery-task-id",
    "queued_at": "2026-04-19T20:11:30.220000+00:00",
    "started_at": "2026-04-19T20:11:31.001000+00:00",
    "completed_at": "2026-04-19T20:11:36.800000+00:00",
    "pipeline_version": 1
  }
}
```

The exact keys may grow, but this is the current shared logical structure.

## Failure Handling

- validation failure:
  request is rejected before MinIO write
- broker failure after original upload:
  backend restores previous state and removes the new object
- worker failure:
  track moves to `rejected` with `rejection_reason`
- re-upload after reject:
  the new upload replaces previous processing context and the track returns to
  `processing`

## What This Phase Already Covers

- upload API
- MinIO storage
- Celery processing
- waveform generation
- moderation handoff
- public stream
- owner/private preview stream

## Next Evolution Around This Blueprint

- play counters on real playback
- download rules for `is_downloadable`
- direct-to-MinIO presigned uploads
- upload revision history
- normalized media asset tables if the platform grows beyond MVP
