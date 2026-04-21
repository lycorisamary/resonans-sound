from typing import Any

from app.models import TrackStatus
from app.policies._roles import is_owner, is_staff


class TrackAccessPolicy:
    @staticmethod
    def can_view(track: Any, current_user: Any | None = None) -> bool:
        if track.status == TrackStatus.approved:
            return True

        if track.status == TrackStatus.deleted:
            return False

        return is_owner(track, current_user) or is_staff(current_user)

    @staticmethod
    def can_view_private(track: Any, current_user: Any | None = None) -> bool:
        if track.status == TrackStatus.deleted:
            return False
        return is_owner(track, current_user) or is_staff(current_user)
