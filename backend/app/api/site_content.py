from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import SiteContentResponse
from app.services.site_content import get_public_site_content


router = APIRouter()


@router.get("", response_model=SiteContentResponse)
def site_content(db: Session = Depends(get_db)) -> SiteContentResponse:
    """Return public footer contact data and active FAQ items."""
    return get_public_site_content(db)
