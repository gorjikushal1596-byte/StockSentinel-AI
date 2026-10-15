"""Store and SKU catalog endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.repository import StockSentinelRepository
from backend.app.schemas.inventory import StoreResponse, SKUResponse

router = APIRouter(tags=["Catalog"])


@router.get("/stores", response_model=list[StoreResponse])
def get_stores(
    dataset_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Retrieve all monitored store locations."""
    repo = StockSentinelRepository(db)
    return repo.get_all_stores(dataset_id=dataset_id)


@router.get("/skus", response_model=list[SKUResponse])
def get_skus(
    dataset_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Retrieve SKU catalog master list."""
    repo = StockSentinelRepository(db)
    return repo.get_all_skus(dataset_id=dataset_id)
