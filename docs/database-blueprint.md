# Database Blueprint

## Current Physical Model

The upload/media phase is implemented on top of the existing production schema.
The important part is the `tracks` table:

```sql
CREATE TABLE tracks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    original_url TEXT,
    mp3_128_url TEXT,
    mp3_320_url TEXT,
    waveform_data_json JSONB,
    metadata_json JSONB,
    status track_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    is_downloadable BOOLEAN DEFAULT FALSE,
    license_type VARCHAR(50) DEFAULT 'all-rights-reserved',
    tags TEXT[],
    bpm INTEGER,
    key_signature VARCHAR(20),
    rejection_reason TEXT
);
```

## Why This Schema Is Enough For The First Media Pipeline

The current columns already cover the minimum viable upload flow:

- `status` handles lifecycle changes
- `original_url`, `mp3_128_url`, `mp3_320_url` hold canonical media URLs
- `metadata_json` stores internal upload/storage/processing metadata
- `waveform_data_json` stores frontend-ready waveform payload
- `duration_seconds` and `file_size_bytes` support catalog and studio views
- `rejection_reason` supports owner-facing recovery after a failed process

This lets backend, frontend, and worker share one contract without introducing a
new migration during the first production-safe media iteration.

## Logical Model On Top Of The Existing Schema

### Track

Represents the artist-owned logical track record and is the source of truth for:

- ownership
- metadata
- visibility
- moderation status
- media readiness

### Embedded Media State In `metadata_json`

`metadata_json` is the internal document used by the upload pipeline:

- upload details
- object storage keys
- processing timestamps
- audio analysis fields

This keeps the external relational model stable while the media pipeline is
still evolving.

## Query Rules

Public catalog:

- reads only `status='approved'`
- reads only public tracks

Owner studio:

- reads all owner tracks except physical deletes
- includes `pending`, `processing`, `approved`, `rejected`, `deleted`
- surfaces private media state such as original/derived URLs and rejection
  reasons

## Data Ownership Rules

- The application database is the canonical owner of track state.
- MinIO stores binary objects only.
- MinIO object keys are references, not business state.
- Celery is transient execution infrastructure, not a system of record.

## Integrity Rules

- A public track must never be considered playable until `status='approved'`.
- A deleted track must not re-enter the public catalog.
- Only the track owner may attach or replace the source upload.
- Rejected uploads must preserve enough failure context for retry.

## Deferred Future Normalization

If the project later needs multiple upload revisions, moderation history, or
multiple transcoding profiles, the next normalized extension can add:

- `track_media_revisions`
- `track_media_assets`
- `track_processing_jobs`

That is explicitly deferred. The current phase keeps the production model small
and compatible with the already deployed system.
