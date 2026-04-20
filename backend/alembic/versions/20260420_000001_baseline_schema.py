"""Baseline schema for the current production data model.

Revision ID: 20260420_000001
Revises:
Create Date: 2026-04-20 15:30:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260420_000001"
down_revision = None
branch_labels = None
depends_on = None


user_role_enum = sa.Enum("user", "moderator", "admin", name="user_role")
user_status_enum = sa.Enum("active", "inactive", "banned", name="user_status")
track_status_enum = sa.Enum("pending", "processing", "approved", "rejected", "deleted", name="track_status")
interaction_type_enum = sa.Enum("like", "comment", "repost", "follow", name="interaction_type")

user_role_enum_ref = sa.Enum("user", "moderator", "admin", name="user_role", create_type=False)
user_status_enum_ref = sa.Enum("active", "inactive", "banned", name="user_status", create_type=False)
track_status_enum_ref = sa.Enum("pending", "processing", "approved", "rejected", "deleted", name="track_status", create_type=False)
interaction_type_enum_ref = sa.Enum("like", "comment", "repost", "follow", name="interaction_type", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)
    user_status_enum.create(bind, checkfirst=True)
    track_status_enum.create(bind, checkfirst=True)
    interaction_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("role", user_role_enum_ref, nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", user_status_enum_ref, nullable=True),
        sa.Column("email_verified", sa.Boolean(), nullable=True),
        sa.Column("verification_token", sa.String(length=255), nullable=True),
        sa.Column("reset_token", sa.String(length=255), nullable=True),
        sa.Column("reset_token_expires", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("username"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_index("ix_users_username", "users", ["username"], unique=False)
    op.create_index("ix_users_status", "users", ["status"], unique=False)

    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_categories_id", "categories", ["id"], unique=False)
    op.create_index("ix_categories_slug", "categories", ["slug"], unique=False)
    op.create_index("ix_categories_is_active", "categories", ["is_active"], unique=False)
    op.execute(
        """
        INSERT INTO categories (name, slug, description, sort_order)
        VALUES
            ('Beats', 'beats', 'Instrumental beats and instrumentals', 1),
            ('Songs', 'songs', 'Complete songs with vocals', 2),
            ('Hip-Hop', 'hip-hop', 'Hip-hop and rap tracks', 3),
            ('Electronic', 'electronic', 'Electronic dance music', 4),
            ('Rock', 'rock', 'Rock and alternative music', 5),
            ('Pop', 'pop', 'Pop music tracks', 6),
            ('R&B', 'rnb', 'R&B and soul music', 7),
            ('Jazz', 'jazz', 'Jazz and blues tracks', 8),
            ('Classical', 'classical', 'Classical music compositions', 9),
            ('Ambient', 'ambient', 'Ambient and atmospheric music', 10)
        """
    )

    op.create_table(
        "tracks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("genre", sa.String(length=100), nullable=True),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("original_url", sa.Text(), nullable=True),
        sa.Column("mp3_128_url", sa.Text(), nullable=True),
        sa.Column("mp3_320_url", sa.Text(), nullable=True),
        sa.Column("cover_image_url", sa.Text(), nullable=True),
        sa.Column("waveform_data_json", sa.JSON(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("status", track_status_enum_ref, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("play_count", sa.Integer(), nullable=True),
        sa.Column("like_count", sa.Integer(), nullable=True),
        sa.Column("comment_count", sa.Integer(), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=True),
        sa.Column("is_downloadable", sa.Boolean(), nullable=True),
        sa.Column("license_type", sa.String(length=50), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("bpm", sa.Integer(), nullable=True),
        sa.Column("key_signature", sa.String(length=20), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
    )
    op.create_index("ix_tracks_id", "tracks", ["id"], unique=False)
    op.create_index("ix_tracks_user_id", "tracks", ["user_id"], unique=False)
    op.create_index("ix_tracks_category_id", "tracks", ["category_id"], unique=False)
    op.create_index("ix_tracks_status", "tracks", ["status"], unique=False)
    op.create_index("ix_tracks_created_at", "tracks", ["created_at"], unique=False)
    op.create_index("ix_tracks_play_count", "tracks", ["play_count"], unique=False)
    op.create_index("ix_tracks_like_count", "tracks", ["like_count"], unique=False)
    op.create_index("ix_tracks_is_public", "tracks", ["is_public"], unique=False)

    op.create_table(
        "playlists",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cover_image_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=True),
        sa.Column("track_count", sa.Integer(), nullable=True),
    )
    op.create_index("ix_playlists_id", "playlists", ["id"], unique=False)
    op.create_index("ix_playlists_user_id", "playlists", ["user_id"], unique=False)

    op.create_table(
        "playlist_tracks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("playlist_id", sa.Integer(), sa.ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False),
        sa.Column("track_id", sa.Integer(), sa.ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
    )
    op.create_index("ix_playlist_tracks_id", "playlist_tracks", ["id"], unique=False)
    op.create_index("ix_playlist_tracks_playlist_id", "playlist_tracks", ["playlist_id"], unique=False)
    op.create_index("ix_playlist_tracks_track_id", "playlist_tracks", ["track_id"], unique=False)

    op.create_table(
        "interactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("track_id", sa.Integer(), sa.ForeignKey("tracks.id", ondelete="CASCADE"), nullable=True),
        sa.Column("target_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("type", interaction_type_enum_ref, nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("interactions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=True),
    )
    op.create_index("ix_interactions_id", "interactions", ["id"], unique=False)
    op.create_index("ix_interactions_user_id", "interactions", ["user_id"], unique=False)
    op.create_index("ix_interactions_track_id", "interactions", ["track_id"], unique=False)
    op.create_index("ix_interactions_target_user_id", "interactions", ["target_user_id"], unique=False)
    op.create_index("ix_interactions_type", "interactions", ["type"], unique=False)
    op.create_index("ix_interactions_created_at", "interactions", ["created_at"], unique=False)

    op.create_table(
        "follows",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("follower_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("following_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
    )
    op.create_index("ix_follows_id", "follows", ["id"], unique=False)
    op.create_index("ix_follows_follower_id", "follows", ["follower_id"], unique=False)
    op.create_index("ix_follows_following_id", "follows", ["following_id"], unique=False)

    op.create_table(
        "admin_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("target_type", sa.String(length=50), nullable=True),
        sa.Column("target_id", sa.Integer(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
    )
    op.create_index("ix_admin_logs_id", "admin_logs", ["id"], unique=False)
    op.create_index("ix_admin_logs_admin_id", "admin_logs", ["admin_id"], unique=False)
    op.create_index("ix_admin_logs_timestamp", "admin_logs", ["timestamp"], unique=False)

    op.create_table(
        "api_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("token_type", sa.String(length=50), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_revoked", sa.Boolean(), nullable=True),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("permissions", sa.JSON(), nullable=True),
    )
    op.create_index("ix_api_tokens_id", "api_tokens", ["id"], unique=False)
    op.create_index("ix_api_tokens_user_id", "api_tokens", ["user_id"], unique=False)
    op.create_index("ix_api_tokens_token_hash", "api_tokens", ["token_hash"], unique=False)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("related_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("related_track_id", sa.Integer(), sa.ForeignKey("tracks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("related_interaction_id", sa.Integer(), sa.ForeignKey("interactions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
    )
    op.create_index("ix_notifications_id", "notifications", ["id"], unique=False)
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"], unique=False)
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"], unique=False)

    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reporter_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("track_id", sa.Integer(), sa.ForeignKey("tracks.id", ondelete="CASCADE"), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("moderator_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
    )
    op.create_index("ix_reports_id", "reports", ["id"], unique=False)
    op.create_index("ix_reports_status", "reports", ["status"], unique=False)

    op.create_table(
        "analytics_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("track_id", sa.Integer(), sa.ForeignKey("tracks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_data", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
    )
    op.create_index("ix_analytics_events_id", "analytics_events", ["id"], unique=False)
    op.create_index("ix_analytics_events_event_type", "analytics_events", ["event_type"], unique=False)
    op.create_index("ix_analytics_events_created_at", "analytics_events", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_analytics_events_created_at", table_name="analytics_events")
    op.drop_index("ix_analytics_events_event_type", table_name="analytics_events")
    op.drop_index("ix_analytics_events_id", table_name="analytics_events")
    op.drop_table("analytics_events")

    op.drop_index("ix_reports_status", table_name="reports")
    op.drop_index("ix_reports_id", table_name="reports")
    op.drop_table("reports")

    op.drop_index("ix_notifications_is_read", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_index("ix_notifications_id", table_name="notifications")
    op.drop_table("notifications")

    op.drop_index("ix_api_tokens_token_hash", table_name="api_tokens")
    op.drop_index("ix_api_tokens_user_id", table_name="api_tokens")
    op.drop_index("ix_api_tokens_id", table_name="api_tokens")
    op.drop_table("api_tokens")

    op.drop_index("ix_admin_logs_timestamp", table_name="admin_logs")
    op.drop_index("ix_admin_logs_admin_id", table_name="admin_logs")
    op.drop_index("ix_admin_logs_id", table_name="admin_logs")
    op.drop_table("admin_logs")

    op.drop_index("ix_follows_following_id", table_name="follows")
    op.drop_index("ix_follows_follower_id", table_name="follows")
    op.drop_index("ix_follows_id", table_name="follows")
    op.drop_table("follows")

    op.drop_index("ix_interactions_created_at", table_name="interactions")
    op.drop_index("ix_interactions_type", table_name="interactions")
    op.drop_index("ix_interactions_target_user_id", table_name="interactions")
    op.drop_index("ix_interactions_track_id", table_name="interactions")
    op.drop_index("ix_interactions_user_id", table_name="interactions")
    op.drop_index("ix_interactions_id", table_name="interactions")
    op.drop_table("interactions")

    op.drop_index("ix_playlist_tracks_track_id", table_name="playlist_tracks")
    op.drop_index("ix_playlist_tracks_playlist_id", table_name="playlist_tracks")
    op.drop_index("ix_playlist_tracks_id", table_name="playlist_tracks")
    op.drop_table("playlist_tracks")

    op.drop_index("ix_playlists_user_id", table_name="playlists")
    op.drop_index("ix_playlists_id", table_name="playlists")
    op.drop_table("playlists")

    op.drop_index("ix_tracks_is_public", table_name="tracks")
    op.drop_index("ix_tracks_like_count", table_name="tracks")
    op.drop_index("ix_tracks_play_count", table_name="tracks")
    op.drop_index("ix_tracks_created_at", table_name="tracks")
    op.drop_index("ix_tracks_status", table_name="tracks")
    op.drop_index("ix_tracks_category_id", table_name="tracks")
    op.drop_index("ix_tracks_user_id", table_name="tracks")
    op.drop_index("ix_tracks_id", table_name="tracks")
    op.drop_table("tracks")

    op.drop_index("ix_categories_is_active", table_name="categories")
    op.drop_index("ix_categories_slug", table_name="categories")
    op.drop_index("ix_categories_id", table_name="categories")
    op.drop_table("categories")

    op.drop_index("ix_users_status", table_name="users")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")

    interaction_type_enum.drop(bind=op.get_bind(), checkfirst=True)
    track_status_enum.drop(bind=op.get_bind(), checkfirst=True)
    user_status_enum.drop(bind=op.get_bind(), checkfirst=True)
    user_role_enum.drop(bind=op.get_bind(), checkfirst=True)
