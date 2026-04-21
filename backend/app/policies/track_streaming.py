from typing import Any

from app.models import TrackStatus
from app.policies._roles import is_owner, is_staff


class TrackStreamingPolicy:
    OWNER_PREVIEW_STATUSES = {
        TrackStatus.pending,
        TrackStatus.processing,
        TrackStatus.approved,
        TrackStatus.rejected,
    }

    @staticmethod
    def can_stream(track: Any, current_user: Any | None = None) -> bool:
        if track.status == TrackStatus.approved:
            return True

        if current_user is None or track.status == TrackStatus.deleted:
            return False

        if is_staff(current_user):
            return True

        return is_owner(track, current_user) and track.status in TrackStreamingPolicy.OWNER_PREVIEW_STATUSES

    @staticmethod
    def is_public_stream(track: Any) -> bool:
        return track.status == TrackStatus.approved
