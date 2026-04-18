from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import CategoryResponse
from app.services.catalog import get_public_category, list_public_categories


router = APIRouter()


@router.get("", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db)) -> list[CategoryResponse]:
    """Return active public categories for the catalog."""
    return list_public_categories(db)


@router.get("/{slug}", response_model=CategoryResponse)
def get_category(slug: str, db: Session = Depends(get_db)) -> CategoryResponse:
    """Return a single active public category."""
    category = get_public_category(db, slug)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category
