from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models import User
from app.schemas import UserResponse


router = APIRouter()


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return the authenticated user profile."""
    return UserResponse.model_validate(current_user)
