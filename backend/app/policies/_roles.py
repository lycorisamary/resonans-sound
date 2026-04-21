from typing import Any

from app.models import UserRole


STAFF_ROLE_VALUES = {UserRole.admin.value, UserRole.moderator.value}


def role_value(user: Any | None) -> str | None:
    role = getattr(user, "role", None)
    if role is None:
        return None
    return getattr(role, "value", role)


def is_staff(user: Any | None) -> bool:
    return role_value(user) in STAFF_ROLE_VALUES


def is_owner(track: Any, user: Any | None) -> bool:
    return user is not None and getattr(user, "id", None) == getattr(track, "user_id", None)
