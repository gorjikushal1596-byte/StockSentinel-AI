"""Data ingestion endpoints for synthetic seeding and official CSV imports."""

from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.data_generator import generate_and_seed_data
import csv
import io
from app.db.models import DailyRecord, GroundTruthLabel, Store, SKU

router = APIRouter(prefix="/ingest", tags=["Data Ingestion"])


@router.post("/seed")
def seed_development_dataset(
    num_stores: int = Query(5, ge=1, le=25),
    num_skus: int = Query(40, ge=5, le=800),
    days_history: int = Query(45, ge=7, le=120),
    clear_existing: bool = Query(False),
    db: Session = Depends(get_db),
):
    """
    Generate and seed realistic development/test telemetry adhering to the R1 problem statement:
    - Multi-store network
    - Fast and slow moving SKUs with Poisson demand
    - Realistic weekend & promo seasonality
    - ~3% hidden ground-truth labels for evaluation testing
    """
    stats = generate_and_seed_data(
        db=db,
        num_stores=num_stores,
        num_skus=num_skus,
        days_history=days_history,
        reference_date_str="2026-10-15",
        clear_existing=clear_existing,
    )
    return {
        "status": "success",
        "message": "Dataset generated successfully.",
        "counts": stats,
    }


@router.post("/csv/daily-records")
async def import_daily_records_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Import official sales and inventory CSV records.
    Expected CSV columns: store_id, sku_id, date, sales, on_hand_stock, is_promotion, is_holiday
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    records_to_insert = []
    row_count = 0
    for row in reader:
        row_count += 1
        try:
            records_to_insert.append(
                DailyRecord(
                    store_id=str(row["store_id"]).strip(),
                    sku_id=str(row["sku_id"]).strip(),
                    date=str(row["date"]).strip(),
                    sales=int(row.get("sales", 0)),
                    on_hand_stock=int(row.get("on_hand_stock", 0)),
                    is_promotion=str(row.get("is_promotion", "false")).lower() in ("true", "1", "yes"),
                    is_holiday=str(row.get("is_holiday", "false")).lower() in ("true", "1", "yes"),
                )
            )
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Row {row_count} format error: {exc}")

    if records_to_insert:
        db.bulk_save_objects(records_to_insert)
        db.commit()

    return {"status": "success", "imported_rows": len(records_to_insert)}


@router.post("/csv/hidden-labels")
async def import_hidden_labels_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Import hidden ground-truth evaluation labels.
    STRICTLY STORED IN ground_truth_labels FOR evaluate.py AND /api/evaluation ONLY.
    Expected CSV columns: store_id, sku_id, date, is_phantom_stockout, label_type
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    labels_to_insert = []
    row_count = 0
    for row in reader:
        row_count += 1
        try:
            labels_to_insert.append(
                GroundTruthLabel(
                    store_id=str(row["store_id"]).strip(),
                    sku_id=str(row["sku_id"]).strip(),
                    date=str(row["date"]).strip(),
                    is_phantom_stockout=str(row.get("is_phantom_stockout", "false")).lower() in ("true", "1", "yes"),
                    label_type=str(row.get("label_type", "phantom_stockout")).strip(),
                    source="official_csv_import",
                )
            )
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Row {row_count} format error: {exc}")

    if labels_to_insert:
        db.bulk_save_objects(labels_to_insert)
        db.commit()

    return {"status": "success", "imported_labels": len(labels_to_insert)}
