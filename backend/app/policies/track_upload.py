from typing import Any

from app.models import TrackStatus
from app.policies._roles import is_owner


class TrackUploadPolicy:
    SOURCE_UPLOAD_STATUSES = {
        TrackStatus.pending,
        TrackStatus.rejected,
        TrackStatus.approved,
    }

    @staticmethod
    def can_upload_source(track: Any, current_user: Any) -> bool:
        return is_owner(track, current_user) and track.status in TrackUploadPolicy.SOURCE_UPLOAD_STATUSES

    @staticmethod
    def can_replace_source(track: Any, current_user: Any) -> bool:
        return is_owner(track, current_user) and track.status in {TrackStatus.rejected, TrackStatus.approved}

    @staticmethod
    def can_upload_cover(track: Any, current_user: Any) -> bool:
        return is_owner(track, current_user) and track.status != TrackStatus.deleted
