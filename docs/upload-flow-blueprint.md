# Upload Flow Blueprint

## Scope

This document defines the media pipeline that starts from the already working
track metadata flow and adds real file upload, object storage, background
processing, and status transitions without replacing the current production
baseline.

This phase intentionally reuses the existing `tracks` table. No new production
schema is required for the first working upload/media pipeline.

## End-to-End Lifecycle

1. The authenticated artist creates track metadata with `POST /api/v1/tracks`.
2. The artist uploads the source audio file with
   `POST /api/v1/tracks/upload` and passes `track_id + file`.
3. Backend validates ownership, size, extension, and MIME type.
4. Backend stores the original file in MinIO and attaches the storage pointer to
   the existing track row.
5. Backend switches the track to `processing` and enqueues a Celery job.
6. Celery downloads the original object from MinIO, extracts audio metadata,
   generates derived MP3 assets, builds waveform data, and writes the results
   back to MinIO.
7. Worker updates the `tracks` row and transitions the track to:
   `approved` on success
   `rejected` on failure
8. Frontend reads the owner-facing track state from `GET /api/v1/tracks/mine`
   and shows whether upload is still needed, processing is in flight, or media
   assets are ready.

## API Contract

### `POST /api/v1/tracks/upload`

Request:

- `multipart/form-data`
- `track_id`: integer, required
- `file`: audio file, required

Rules:

- The track must belong to the authenticated user.
- Allowed source states:
  - `pending`
  - `rejected`
- Rejected tracks may be re-uploaded and reprocessed.
- Disallowed source states:
  - `processing`
  - `approved`
  - `deleted`

Response:

- HTTP `202 Accepted`
- Returns the updated owner-facing track payload with storage URLs and the new
  `processing` status.

## Status Model

Status transitions for the upload pipeline:

- `pending`:
  - metadata exists
  - upload is missing or has not entered processing yet
- `processing`:
  - original file is stored
  - Celery worker is responsible for media processing
- `approved`:
  - derived assets are ready
  - track may appear in the public catalog when `is_public=true`
- `rejected`:
  - upload or processing failed validation/business rules
  - owner can inspect the rejection reason and re-upload
- `deleted`:
  - terminal soft-delete state

## MinIO Object Layout

Bucket:

- `MINIO_BUCKET`

Object key layout:

- `tracks/{user_id}/{track_id}/original/{uuid}.{ext}`
- `tracks/{user_id}/{track_id}/derived/128.mp3`
- `tracks/{user_id}/{track_id}/derived/320.mp3`

Notes:

- Original object names are unique, so repeated uploads do not collide before
  the new upload is accepted.
- Derived filenames are stable per track and may be replaced by the latest
  approved processing result.

## Source Of Truth In `tracks`

The first production upload pipeline keeps the `tracks` row as the single source
of truth.

Field mapping:

- `status`:
  current media state
- `original_url`:
  canonical future stream URL for the original asset
- `mp3_128_url`:
  canonical future stream URL for 128 kbps preview
- `mp3_320_url`:
  canonical future stream URL for 320 kbps asset
- `file_size_bytes`:
  original file size
- `duration_seconds`:
  audio duration after successful processing
- `waveform_data_json`:
  normalized waveform payload for frontend visualization
- `metadata_json`:
  upload, storage, and processing metadata
- `rejection_reason`:
  owner-facing failure reason for rejected uploads

## `metadata_json` Contract

The worker and API share the following structure inside `tracks.metadata_json`:

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
    "status": "approved",
    "task_id": "celery-task-id",
    "queued_at": "2026-04-19T20:11:30.220000+00:00",
    "started_at": "2026-04-19T20:11:31.001000+00:00",
    "completed_at": "2026-04-19T20:11:36.800000+00:00",
    "pipeline_version": 1
  }
}
```

Only a subset of these fields is required before processing completes.

## Backend Responsibilities

- validate upload input and ownership
- write the original file to MinIO
- preserve existing working metadata flow
- queue background processing safely
- return owner-facing upload state immediately
- keep cleanup best-effort and non-destructive

## Worker Responsibilities

- download the original file from MinIO
- decode supported audio formats
- extract audio metadata
- generate derived MP3 assets
- build waveform data
- update track state atomically enough for owner-facing consistency
- reject the track with a stored reason if processing fails

## Frontend Responsibilities

- keep metadata creation as the first step
- expose file upload only for owner tracks
- upload against an existing `track_id`
- surface the current track status and rejection reason
- refresh `GET /api/v1/tracks/mine` after a successful upload request

## Failure Handling

- Upload validation failure:
  backend rejects before MinIO write
- Broker failure after original upload:
  backend removes the new original object and restores previous track state
- Worker processing failure:
  track moves to `rejected`, stores `rejection_reason`, and keeps the original
  upload pointer for retry/debugging
- Re-upload after rejection:
  new original object replaces the old processing context, and the track moves
  back to `processing`

## Non-Goals Of This Phase

- public streaming endpoint implementation
- waveform player integration
- moderation UI
- presigned direct-to-MinIO browser uploads
- normalized media asset tables
