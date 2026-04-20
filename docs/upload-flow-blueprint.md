# Upload Flow Blueprint

## Status

The upload/media pipeline described below is implemented in `main` and is part
of the current production baseline.

## Scope

The current flow covers:

- metadata creation
- source upload
- cover upload
- MinIO object storage
- Celery audio processing
- waveform generation
- automatic publication after successful processing

## End-to-End Lifecycle

1. The user creates track metadata with `POST /api/v1/tracks`.
2. The user may upload a cover with `POST /api/v1/tracks/{id}/cover`.
3. The user uploads the source audio with `POST /api/v1/tracks/upload`.
4. Backend validates ownership, size, extension, and content type.
5. Backend stores the original file in MinIO and moves the track to `processing`.
6. Celery downloads the original object from MinIO.
7. Worker generates `128/320 mp3` and waveform data.
8. Worker writes derived files back to MinIO.
9. On success the track becomes `approved` automatically.
10. The published track appears in the shared catalog and is playable through the public player flow.

## Current API Contract

### `POST /api/v1/tracks/upload`

- request: `multipart/form-data`
- fields:
  - `track_id`
  - `file`
- allowed source states:
  - `pending`
  - `rejected`
  - `approved`
- disallowed source states:
  - `processing`
  - `deleted`

### `POST /api/v1/tracks/{id}/cover`

- request: `multipart/form-data`
- field:
  - `file`
- supported formats:
  - `jpg`
  - `jpeg`
  - `png`
  - `webp`

### `GET /api/v1/tracks/{id}/stream`

- returns audio bytes
- supports HTTP Range
- published tracks are publicly playable

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
- `cover`
- audio technical metadata such as `duration_seconds`, `bitrate`, `sample_rate`

## Failure Handling

- validation failure:
  request is rejected before MinIO write
- broker failure after original upload:
  backend restores previous state and removes the new object
- worker failure:
  track moves to `rejected`
- re-upload after reject:
  the new upload replaces the previous processing context and restarts the flow
