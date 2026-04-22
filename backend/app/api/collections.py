from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.exceptions import CollectionNotFoundError
from app.schemas import CollectionResponse, PaginatedResponse
from app.services.collections import build_public_collection_cover_response, get_public_collection, list_public_collections


router = APIRouter()


@router.get("", response_model=PaginatedResponse)
def get_collections(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Return public staff-curated collections with approved track previews."""
    return list_public_collections(db=db, page=page, size=size)


@router.get("/{collection_id}", response_model=CollectionResponse)
def get_collection(collection_id: int, db: Session = Depends(get_db)) -> CollectionResponse:
    """Return a public staff-curated collection with approved tracks."""
    collection = get_public_collection(db=db, collection_id=collection_id)
    if collection is None:
        raise CollectionNotFoundError()
    return collection


@router.get("/{collection_id}/cover")
def get_collection_cover(collection_id: int, db: Session = Depends(get_db)) -> StreamingResponse:
    """Return the public collection cover image when it exists."""
    return build_public_collection_cover_response(db=db, collection_id=collection_id)
