# Upload Flow Blueprint

## Status

The upload/media pipeline described below is implemented in `main` and is part
of the current production baseline.

Database precondition for this flow:

- the backend must already be running against the current Alembic head
- startup should fail instead of attempting runtime schema fixes

## Scope

The current flow covers:

- metadata creation
- source upload
- cover upload
- MinIO object storage
- Celery audio processing
- waveform generation
- automatic publication after successful processing
- listen-threshold play counters after public playback

## End-to-End Lifecycle

1. The user creates track metadata with `POST /api/v1/tracks`.
2. The user may upload a cover with `POST /api/v1/tracks/{id}/cover`.
3. The user uploads the source audio with `POST /api/v1/tracks/upload`.
4. Backend validates ownership, status, size, extension, and server-side file
   signatures before trusting the upload.
5. Backend applies user-scoped upload rate limits before accepting the upload.
6. Backend stores the original file in MinIO and moves the track to `processing`.
7. Backend passes the request id into the Celery task headers and processing metadata.
8. Celery downloads the original object from MinIO.
9. Worker generates `128/320 mp3` and waveform data.
10. Worker writes derived files back to MinIO.
11. On success the track becomes `approved` automatically.
12. The published track appears in the shared catalog and is playable through the public player flow.
13. The frontend reports a play after the earlier of 30 seconds or 50% of the
    track duration.
14. The backend deduplicates the listener/track pair for 6 hours before
    incrementing `tracks.play_count`.

## Current API Contract

### `POST /api/v1/tracks/upload`

- request: `multipart/form-data`
- fields:
  - `track_id`
  - `file`
- current default max audio upload size:
  - `512 MB`
- current default rate limit:
  - `20/hour` per user
- allowed source states:
  - `pending`
  - `rejected`
  - `approved`
- disallowed source states:
  - `processing`
  - `hidden`
  - `deleted`
- source files must pass server-side signature sniffing:
  - MP3: ID3 header or MPEG frame sync
  - WAV: RIFF/WAVE header

### `POST /api/v1/tracks/{id}/cover`

- request: `multipart/form-data`
- field:
  - `file`
- supported formats:
  - `jpg`
  - `jpeg`
  - `png`
  - `webp`
- cover files must pass server-side signature sniffing:
  - JPEG
  - PNG
  - WebP
- cover uploads are rejected for hidden or deleted tracks
- current default rate limit:
  - `30/hour` per user

### `GET /api/v1/tracks/{id}/stream`

- returns audio bytes
- supports HTTP Range
- published tracks are publicly playable
- current default rate limit:
  - `300/minute` per user or client IP

### `GET /api/v1/tracks/{id}/stream-url`

- returns a browser-safe stream URL for the current access context
- current default rate limit:
  - `60/minute` per user or client IP

### `POST /api/v1/interactions/play`

- request: JSON `{ "track_id": number }`
- available to guests and authenticated users
- only counts `approved` tracks
- current default rate limit:
  - `120/minute` per user or client IP
- backend stores a salted listener hash, not raw guest IP/user-agent values
- response includes:
  - `counted`
  - current `play_count`
  - `dedupe_window_seconds`

### `GET /api/v1/tracks/{id}/cover`

- returns cover image bytes
- used by the frontend for track artwork rendering

## Status Model

- `pending`
  - metadata exists, source upload still missing
- `processing`
  - worker is generating media assets
- `approved`
  - track is processed and published
- `rejected`
  - processing failed
- `hidden`
  - staff has removed the track from public surfaces without deleting it
- `deleted`
  - soft-delete

## MinIO Object Layout

- `tracks/{user_id}/{track_id}/original/{uuid}.{ext}`
- `tracks/{user_id}/{track_id}/derived/128.mp3`
- `tracks/{user_id}/{track_id}/derived/320.mp3`
- `tracks/{user_id}/{track_id}/cover/{uuid}.{ext}`

## Source Of Truth In `tracks`

Important fields:

- `status`
- `original_url`
- `mp3_128_url`
- `mp3_320_url`
- `cover_image_url`
- `file_size_bytes`
- `duration_seconds`
- `waveform_data_json`
- `metadata_json`
- `rejection_reason`

## `metadata_json` Structure

The current logical document may include:

- `upload`
- `storage`
- `processing`
  - may contain `request_id`, `task_id`, status timestamps, and worker error details
- `cover`
- audio technical metadata such as `duration_seconds`, `bitrate`, `sample_rate`

## Failure Handling

- validation failure:
  request is rejected before MinIO write with a stable `code` / `message` /
  `request_id` error payload
- broker failure after original upload:
  backend restores previous state and removes the new object
- worker failure:
  track moves to `rejected`
- re-upload after reject:
  the new upload replaces the previous processing context and restarts the flow
- staff hide during or after processing:
  track stays `hidden`, is not public, and the worker must not auto-promote it
  back to `approved`
- play counter reporting failure:
  playback continues; analytics/reporting errors do not break the audio player
