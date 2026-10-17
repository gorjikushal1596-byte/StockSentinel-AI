"""Health check endpoint for StockSentinel AI backend."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.db.models import Store, SKU, DailyRecord, Finding

router = APIRouter(tags=["Health"])


@router.get("/health")
def get_health_status(db: Session = Depends(get_db)):
    """Return backend status, database connectivity, and record statistics."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"disconnected: {exc}"

    stores_count = 0
    skus_count = 0
    records_count = 0
    findings_count = 0

    if db_status == "connected":
        try:
            stores_count = db.query(Store).count()
            skus_count = db.query(SKU).count()
            records_count = db.query(DailyRecord).count()
            findings_count = db.query(Finding).count()
        except Exception:
            pass

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": "StockSentinel AI Backend",
        "version": "1.0.0",
        "database": db_status,
        "telemetry_stats": {
            "stores_count": stores_count,
            "skus_count": skus_count,
            "daily_records_count": records_count,
            "persisted_findings_count": findings_count,
        },
    }
