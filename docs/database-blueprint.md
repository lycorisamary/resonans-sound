# Database Blueprint

## 1. Current Physical Model

Database schema management is now owned by Alembic migrations only.
The application must not create or alter tables during startup.

The current implementation still centers the MVP around a few core tables:

- `users`
- `categories`
- `tracks`
- `track_play_events`
- `interactions`
- `playlists`
- `playlist_tracks`
- `admin_logs`
- `api_tokens`

The existing physical `playlists` and `playlist_tracks` tables are now active as
staff-managed collections. They are not user playlists: only staff roles manage
them, and public reads expose only published collections with approved tracks.

The active ORM runtime is split by context:

- `app.models.user`
- `app.models.category`
- `app.models.track`
- `app.models.track_play`
- `app.models.interaction`
- `app.models.collection`
- `app.models.admin`
- `app.models.token`

`app.models.future` intentionally remains a marker for planned tables that may
exist physically but are not active runtime entities.

## 2. The Main Source Of Truth

For the current MVP, the most important business record is still `tracks`.

The `tracks` row is the source of truth for:

- ownership
- metadata
- moderation state
- media readiness
- public/private visibility
- owner-facing rejection context
- denormalized play count

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
- listen-threshold play counters
- owner/private preview playback
- likes
- staff-managed collections

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

### Owner studio

Reads all owner tracks, including:

- `pending`
- `processing`
- `approved`
- `rejected`
- `deleted`

### Moderation area

Manual moderation is not currently the mandatory publication gate.
The active product flow now publishes tracks automatically after successful processing.

Staff post-publication control is active through `hidden` status. It is used to
remove a published or recently uploaded track from public surfaces without
deleting the row or adding a premoderation gate.

## 6. Current Play Counters In DB

`track_play_events` is an active MVP runtime table for listen-threshold play
counting. It stores:

- `track_id`
- nullable `user_id`
- salted `listener_hash`
- `created_at`

The backend never stores raw guest IP or user-agent in this table. For
authorized listeners the hash is based on `user_id`; for guests it is based on
client IP and user-agent, salted with the backend secret. `tracks.play_count`
remains the denormalized counter used by catalog cards and `sort=popular`.

Counting rules:

- only `approved` tracks can receive play events
- one listener/track pair is counted once per 6-hour dedupe window
- private preview, hidden tracks, deleted tracks, and processing failures do
  not increment `play_count`

## 7. Current Social Layer In DB

The first social loop is implemented through `interactions`.

Right now, the live product uses this table for:

- likes

Important details:

- the table already supports multiple interaction types
- likes are represented through `type='like'`
- removing a like uses soft state on the interaction row
- `tracks.like_count` is denormalized for fast catalog rendering
- active likes are protected by a partial unique index on
  `(user_id, track_id)` where `type='like'` and `is_deleted=false`

## 8. Current Collections In DB

`playlists` and `playlist_tracks` are active as staff-managed collections.

Runtime rules:

- only `admin` and `moderator` create or change collections
- public collection APIs return only `is_public=true` collections that still
  contain at least one `approved` track
- public collection track lists filter out `hidden`, `deleted`, `pending`,
  `processing`, and `rejected` tracks
- publishing an empty collection is rejected
- duplicate track links are blocked by `uq_playlist_tracks_playlist_track`
- `track_count` is maintained as a denormalized linked-track count for staff UI
- collection cover storage is explicit on `playlists` through
  `cover_storage_key` and `cover_content_type`; `cover_image_url` remains the
  backend URL exposed to clients

## 9. Current Moderation History In DB

`admin_logs` is already used by the live moderation flow.

It currently stores:

- moderation action type
- target type
- target id
- structured details such as status/rejection reason

This is enough for the current moderation history block in the frontend.

## 10. Data Ownership Rules

- PostgreSQL owns business truth
- MinIO stores binary files only
- Celery is execution infrastructure, not a system of record
- signed stream URLs are derived access artifacts, not persistent track state

## 11. Integrity Rules

- a track must not be playable publicly before `approved`
- a `hidden` track must stay out of the public catalog and public stream surface
- a deleted track must not re-enter the public catalog
- only the owner may upload or replace the source file
- owners may not republish `hidden` tracks by replacing media; only staff can restore them
- moderators/admins may still exercise extended delete rights
- owner/private playback must not depend on exposing MinIO object keys
- listen-threshold play counters must not store raw guest IP/user-agent values
- `hidden` and non-approved tracks must not increment `tracks.play_count`
- public collections must not expose non-approved tracks
- staff cannot publish a collection until it contains at least one approved track
- duplicate follows are prevented at the database index level for the physical
  `follows` table, even though follow APIs are still outside the active runtime
- common catalog, owner library, interaction, and token lookup paths have
  compound indexes matching the active query shape

Current compound indexes added after the baseline:

- `ix_tracks_status_created_at`
- `ix_tracks_category_status`
- `ix_tracks_user_created_at`
- `ix_interactions_track_type`
- `ix_interactions_user_type`
- `ix_api_tokens_user_type_revoked`
- `ix_track_play_events_track_listener_created`
- `ix_track_play_events_user_created`
- `uq_playlist_tracks_playlist_track`
- `ix_playlist_tracks_playlist_order`
- `ix_playlists_public_created_at`

## 12. Deferred Normalization

If the project grows beyond this MVP slice, the next normalized additions will
likely be:

- `track_media_revisions`
- `track_media_assets`
- `track_processing_jobs`
- `playlist_activity`
- `track_comments`

These are intentionally deferred. For the current production baseline, the
existing schema is still the right tradeoff between speed and stability.
