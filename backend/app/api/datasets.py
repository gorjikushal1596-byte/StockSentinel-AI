"""FastAPI API routes for dataset upload, column mapping, validation, profiling, and ingestion."""

import json
from pathlib import Path
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import GroundTruthLabel
from app.schemas.dataset import (
    DatasetResponse,
    DatasetProfile,
    ColumnMappingRequest,
    DatasetActionRequest,
    ValidationReport,
    ImportResult,
    DatasetFileItem,
)
from app.services.dataset_service import DatasetService
from app.services.ingestion_service import profile_raw_dataset

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    files: list[UploadFile] = File(...),
    name: str | None = Form(None),
    db: Session = Depends(get_db),
):
    """
    Accepts one or more dataset files (CSV, XLSX, JSON, Parquet).
    Stores them securely, detects schema, and generates initial column mappings.
    """
    if not files:
        raise HTTPException(status_code=400, detail="At least one file is required.")

    service = DatasetService(db)
    try:
        dataset = await service.save_uploaded_dataset(files=files, dataset_name=name)
        confirmed_mapping = json.loads(dataset.confirmed_mapping_json) if dataset.confirmed_mapping_json else None
        
        file_items = [
            DatasetFileItem(
                filename=df.filename,
                file_format=df.file_format,
                file_size_bytes=df.file_size_bytes,
                row_count=df.row_count,
                detected_role=df.detected_role,
            )
            for df in dataset.files
        ]

        profile = profile_raw_dataset(Path(dataset.file_path))
        profile.dataset_id = dataset.dataset_id
        profile.name = dataset.name

        return DatasetResponse(
            dataset_id=dataset.dataset_id,
            name=dataset.name,
            file_format=dataset.file_format,
            status=dataset.status,
            row_count=dataset.row_count,
            column_count=dataset.column_count,
            file_size_bytes=dataset.file_size_bytes,
            created_at=dataset.created_at,
            imported_at=dataset.imported_at,
            confirmed_mapping=confirmed_mapping,
            files=file_items,
            validation_summary=None,
            profile=profile,
            total_records=dataset.row_count,
            stores_count=profile.store_count,
            skus_count=profile.sku_count,
            start_date=profile.date_range[0] if profile.date_range else None,
            end_date=profile.date_range[1] if profile.date_range else None,
            has_ground_truth=False,
        )
    except Exception as ex:
        raise HTTPException(status_code=400, detail=str(ex))


@router.get("", response_model=list[DatasetResponse])
def list_datasets(db: Session = Depends(get_db)):
    """Lists all uploaded and imported datasets with version tracking."""
    service = DatasetService(db)
    datasets = service.list_datasets()
    
    result = []
    for d in datasets:
        confirmed_mapping = json.loads(d.confirmed_mapping_json) if d.confirmed_mapping_json else None
        validation_summary = json.loads(d.validation_report_json) if d.validation_report_json else None
        schema_summary = json.loads(d.detected_schema_json) if d.detected_schema_json else {}

        file_items = [
            DatasetFileItem(
                filename=df.filename,
                file_format=df.file_format,
                file_size_bytes=df.file_size_bytes,
                row_count=df.row_count,
                detected_role=df.detected_role,
            )
            for df in d.files
        ]

        stores_c = validation_summary.get("unique_stores_count") if validation_summary else schema_summary.get("store_count", 0)
        skus_c = validation_summary.get("unique_skus_count") if validation_summary else schema_summary.get("sku_count", 0)
        start_d = validation_summary.get("date_range_start") if validation_summary else (schema_summary.get("date_range") or [None])[0]
        end_d = validation_summary.get("date_range_end") if validation_summary else (schema_summary.get("date_range") or [None, None])[-1]
        gt_count = db.query(GroundTruthLabel).filter(GroundTruthLabel.dataset_id == d.dataset_id).count()
        has_gt = gt_count > 0 or bool(validation_summary.get("has_ground_truth") if validation_summary else any("ground_truth" in (df.detected_role or "") for df in d.files))

        result.append(
            DatasetResponse(
                dataset_id=d.dataset_id,
                name=d.name,
                file_format=d.file_format,
                status=d.status,
                row_count=d.row_count,
                column_count=d.column_count,
                file_size_bytes=d.file_size_bytes,
                created_at=d.created_at,
                imported_at=d.imported_at,
                confirmed_mapping=confirmed_mapping,
                files=file_items,
                validation_summary=validation_summary,
                total_records=d.row_count,
                stores_count=stores_c or 0,
                skus_count=skus_c or 0,
                start_date=start_d,
                end_date=end_d,
                has_ground_truth=has_gt,
            )
        )
    return result


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    """Retrieves a single dataset's status, files, and mapping configuration."""
    service = DatasetService(db)
    d = service.get_dataset(dataset_id)
    if not d:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found.")

    confirmed_mapping = json.loads(d.confirmed_mapping_json) if d.confirmed_mapping_json else None
    validation_summary = json.loads(d.validation_report_json) if d.validation_report_json else None
    schema_summary = json.loads(d.detected_schema_json) if d.detected_schema_json else {}

    file_items = [
        DatasetFileItem(
            filename=df.filename,
            file_format=df.file_format,
            file_size_bytes=df.file_size_bytes,
            row_count=df.row_count,
            detected_role=df.detected_role,
        )
        for df in d.files
    ]

    stores_c = validation_summary.get("unique_stores_count") if validation_summary else schema_summary.get("store_count", 0)
    skus_c = validation_summary.get("unique_skus_count") if validation_summary else schema_summary.get("sku_count", 0)
    start_d = validation_summary.get("date_range_start") if validation_summary else (schema_summary.get("date_range") or [None])[0]
    end_d = validation_summary.get("date_range_end") if validation_summary else (schema_summary.get("date_range") or [None, None])[-1]
    has_gt = bool(validation_summary.get("has_ground_truth") if validation_summary else any("ground_truth" in df.detected_role for df in d.files))

    return DatasetResponse(
        dataset_id=d.dataset_id,
        name=d.name,
        file_format=d.file_format,
        status=d.status,
        row_count=d.row_count,
        column_count=d.column_count,
        file_size_bytes=d.file_size_bytes,
        created_at=d.created_at,
        imported_at=d.imported_at,
        confirmed_mapping=confirmed_mapping,
        files=file_items,
        validation_summary=validation_summary,
        total_records=d.row_count,
        stores_count=stores_c or 0,
        skus_count=skus_c or 0,
        start_date=start_d,
        end_date=end_d,
        has_ground_truth=has_gt,
    )


@router.get("/{dataset_id}/profile", response_model=DatasetProfile)
def get_dataset_profile(dataset_id: str, db: Session = Depends(get_db)):
    """Returns the deep statistical profile and sample rows of the uploaded dataset."""
    service = DatasetService(db)
    d = service.get_dataset(dataset_id)
    if not d:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found.")

    file_path = Path(d.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dataset file missing on disk.")

    return profile_raw_dataset(file_path)


@router.post("/{dataset_id}/mapping")
def update_mapping(
    dataset_id: str,
    payload: ColumnMappingRequest,
    db: Session = Depends(get_db),
):
    """Sets or adjusts the confirmed semantic column mapping for the dataset."""
    service = DatasetService(db)
    try:
        service.update_mapping(dataset_id, payload)
        return {"status": "success", "message": "Column mapping updated successfully.", "mappings": payload.mappings}
    except ValueError as ex:
        raise HTTPException(status_code=400, detail=str(ex))


@router.post("/{dataset_id}/validate", response_model=ValidationReport)
def validate_dataset(
    dataset_id: str,
    payload: DatasetActionRequest | None = None,
    duplicate_policy: str = Query("keep_first", pattern="^(error|keep_first|keep_last|aggregate_sum)$"),
    date_format: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """
    Executes the data quality and validation pipeline.
    Identifies errors, warnings, duplicate keys, and missing date records.
    """
    policy = (payload.duplicate_policy if payload and payload.duplicate_policy else duplicate_policy) or "keep_first"
    fmt = payload.date_format if payload and payload.date_format else date_format
    service = DatasetService(db)
    try:
        report = service.validate_dataset(dataset_id, policy, fmt)
        return report
    except ValueError as ex:
        raise HTTPException(status_code=400, detail=str(ex))


@router.post("/{dataset_id}/import", response_model=ImportResult)
def import_dataset(
    dataset_id: str,
    payload: DatasetActionRequest | None = None,
    duplicate_policy: str = Query("keep_first", pattern="^(error|keep_first|keep_last|aggregate_sum)$"),
    date_format: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """
    Executes transaction-safe chunked batch ingestion of validated records
    into the database, associating all records with this dataset_id.
    """
    policy = (payload.duplicate_policy if payload and payload.duplicate_policy else duplicate_policy) or "keep_first"
    fmt = payload.date_format if payload and payload.date_format else date_format
    service = DatasetService(db)
    try:
        result = service.import_dataset(dataset_id, policy, fmt)
        return result
    except ValueError as ex:
        raise HTTPException(status_code=400, detail=str(ex))


@router.get("/{dataset_id}/import-report")
def get_import_report(dataset_id: str, db: Session = Depends(get_db)):
    """Returns the detailed post-import report and row-level issues."""
    service = DatasetService(db)
    d = service.get_dataset(dataset_id)
    if not d:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found.")

    if not d.validation_report_json:
        return {
            "dataset_id": dataset_id,
            "status": d.status,
            "message": "Dataset has not been validated or imported yet.",
            "report": None,
        }

    return {
        "dataset_id": dataset_id,
        "status": d.status,
        "row_count": d.row_count,
        "imported_at": d.imported_at,
        "report": json.loads(d.validation_report_json),
    }


@router.post("/load-synthetic-test", response_model=ImportResult)
def load_synthetic_test_dataset(db: Session = Depends(get_db)):
    """
    Convenience endpoint for judges and testers: directly loads, validates,
    and ingests the supplied StockSentinel AI synthetic test dataset.
    """
    service = DatasetService(db)
    try:
        _, import_result = service.load_synthetic_dataset()
        return import_result
    except Exception as ex:
        raise HTTPException(status_code=400, detail=str(ex))
