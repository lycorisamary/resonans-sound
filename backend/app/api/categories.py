from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import CategoryResponse
from app.services.catalog import list_public_categories


router = APIRouter()


@router.get("", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db)) -> list[CategoryResponse]:
    """Return active public categories for the catalog."""
    return list_public_categories(db)
