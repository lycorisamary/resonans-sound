# Database Blueprint

## 1. Current Physical Model

The current implementation still centers the MVP around a few core tables:

- `users`
- `categories`
- `tracks`
- `interactions`
- `admin_logs`
- `api_tokens`

Other tables such as `playlists` already exist in the schema, but they are not
yet part of the active product flow.

## 2. The Main Source Of Truth

For the current MVP, the most important business record is still `tracks`.

The `tracks` row is the source of truth for:

- ownership
- metadata
- moderation state
- media readiness
- public/private visibility
- owner-facing rejection context

Current important columns:

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

## 3. Why This Schema Is Still Enough

The current schema already covers the active MVP slice:

- metadata CRUD
- upload/media lifecycle
- moderation
- public catalog
- waveform rendering
- public playback
- owner/private preview playback
- likes

That is why the project still does not need a separate normalized media-assets
subsystem for the current stage.

## 4. Embedded Media State In `metadata_json`

`metadata_json` is still the evolving internal document for:

- upload metadata
- storage object keys
- processing timestamps
- technical audio metadata

This keeps the relational model stable while the media pipeline is still
changing.

## 5. Current Query Rules

### Public catalog

Reads only tracks where:

- `status='approved'`
- `is_public=true`

### Owner studio

Reads all owner tracks, including:

- `pending`
- `processing`
- `approved`
- `rejected`
- `deleted`

### Moderation area

Reads tracks that are:

- `status='pending'`
- already have uploaded/processed media

That effectively means “ready for moderation”.

## 6. Current Social Layer In DB

The first social loop is implemented through `interactions`.

Right now, the live product uses this table for:

- likes

Important details:

- the table already supports multiple interaction types
- likes are represented through `type='like'`
- removing a like uses soft state on the interaction row
- `tracks.like_count` is denormalized for fast catalog rendering

## 7. Current Moderation History In DB

`admin_logs` is already used by the live moderation flow.

It currently stores:

- moderation action type
- target type
- target id
- structured details such as status/rejection reason

This is enough for the current moderation history block in the frontend.

## 8. Data Ownership Rules

- PostgreSQL owns business truth
- MinIO stores binary files only
- Celery is execution infrastructure, not a system of record
- signed stream URLs are derived access artifacts, not persistent track state

## 9. Integrity Rules

- a public track must not be playable publicly before `approved + is_public`
- a deleted track must not re-enter the public catalog
- only the owner may upload or replace the source file
- moderators/admins may preview non-public tracks for review
- owner/private playback must not depend on exposing MinIO object keys

## 10. Deferred Normalization

If the project grows beyond this MVP slice, the next normalized additions will
likely be:

- `track_media_revisions`
- `track_media_assets`
- `track_processing_jobs`
- `playlist_activity`
- `track_comments`

These are intentionally deferred. For the current production baseline, the
existing schema is still the right tradeoff between speed and stability.
