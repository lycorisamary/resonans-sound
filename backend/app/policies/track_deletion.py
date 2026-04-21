from typing import Any

from app.models import TrackStatus
from app.policies._roles import is_owner, is_staff


class TrackDeletionPolicy:
    @staticmethod
    def can_delete(track: Any, current_user: Any) -> bool:
        if track.status == TrackStatus.deleted:
            return False
        return is_owner(track, current_user) or is_staff(current_user)
