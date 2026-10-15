"""Scan execution and history endpoints."""

import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.models import Finding
from backend.app.db.repository import StockSentinelRepository
from backend.app.schemas.scan import ScanRequest, ScanSummary, ScanResponse
from backend.app.schemas.finding import FindingResponse
from backend.app.schemas.inventory import TimeSeriesPoint
from backend.app.services.detection_service import AnomalyDetectionService
from backend.app.services.scoring_service import ScoringRankingService

router = APIRouter(prefix="/scans", tags=["Scans"])


def _finding_to_schema(f: Finding) -> FindingResponse:
    ts_points = []
    if f.time_series_json:
        try:
            data = json.loads(f.time_series_json)
            raw_points = data.get("points", []) if isinstance(data, dict) else []
            ts_points = [TimeSeriesPoint(**p) for p in raw_points]
        except Exception:
            pass

    return FindingResponse(
        finding_id=f.finding_id,
        scan_id=f.scan_id,
        dataset_id=f.dataset_id,
        store_id=f.store_id,
        store_name=f.store.name if f.store else None,
        sku_id=f.sku_id,
        product_name=f.sku.name if f.sku else None,
        category=f.sku.category if f.sku else None,
        shelf_bay=f.sku.shelf_bay if f.sku else None,
        unit_price=f.sku.price if f.sku else None,
        rank=f.rank,
        evaluation_date=f.evaluation_date,
        recorded_stock=f.recorded_stock,
        consecutive_zero_days=f.consecutive_zero_days,
        historical_daily_velocity=f.historical_daily_velocity,
        confidence_score=f.confidence_score,
        severity=f.severity,
        anomaly_type=f.anomaly_type,
        explanation=f.explanation,
        status=f.status,
        time_series=ts_points,
    )


@router.post("", response_model=ScanResponse)
def execute_scan(request: ScanRequest, db: Session = Depends(get_db)):
    """
    Execute detection scan across store inventory up to evaluation_date.
    Ranks top <=20 items per store and persists findings.
    """
    repo = StockSentinelRepository(db)

    # 1. Determine target stores
    if request.store_id:
        store = repo.get_store(request.store_id)
        if not store:
            raise HTTPException(status_code=404, detail=f"Store '{request.store_id}' not found.")
        target_store_ids = [request.store_id]
    else:
        target_store_ids = repo.get_stores_with_records(request.evaluation_date, dataset_id=request.dataset_id)
        if not target_store_ids:
            # Fallback to all existing stores in master
            all_stores = repo.get_all_stores(dataset_id=request.dataset_id)
            target_store_ids = [s.store_id for s in all_stores]

    if not target_store_ids:
        raise HTTPException(
            status_code=400,
            detail=f"No stores with inventory records found on or before {request.evaluation_date}. Please seed or ingest data first.",
        )

    scan_id = f"scan_{uuid.uuid4().hex[:12]}"
    detector = AnomalyDetectionService(base_threshold_days=request.threshold_days)

    total_evaluated = 0
    all_findings_to_save: list[Finding] = []

    # 2. Run detection per store
    for st_id in target_store_ids:
        grouped_records = repo.get_all_skus_for_store_history(
            store_id=st_id,
            end_date=request.evaluation_date,
            history_window_days=45,
            dataset_id=request.dataset_id,
        )
        
        candidates = []
        for sku_id, records in grouped_records.items():
            sku = repo.get_sku(sku_id)
            if not sku:
                continue
            total_evaluated += 1
            candidate = detector.evaluate_sku_store_history(
                store_id=st_id,
                sku=sku,
                records=records,
                evaluation_date=request.evaluation_date,
            )
            if candidate and candidate.confidence_score >= request.confidence_cutoff:
                candidates.append(candidate)

        # 3. Deterministically rank and enforce top-20 per store
        store_findings = ScoringRankingService.rank_store_candidates(
            candidates=candidates,
            scan_id=scan_id,
            max_per_store=request.max_findings_per_store,
            dataset_id=request.dataset_id,
        )
        all_findings_to_save.extend(store_findings)

    # 4. Persist scan and findings
    scan = repo.create_scan(
        scan_id=scan_id,
        evaluation_date=request.evaluation_date,
        threshold_days=request.threshold_days,
        total_evaluated=total_evaluated,
        flagged_count=len(all_findings_to_save),
        stores_covered=len(target_store_ids),
        dataset_id=request.dataset_id,
    )

    if all_findings_to_save:
        repo.save_findings(all_findings_to_save)

    saved_findings = repo.get_findings(scan_id=scan_id, limit=200)

    return ScanResponse(
        scan_id=scan.scan_id,
        dataset_id=scan.dataset_id,
        evaluation_date=scan.evaluation_date,
        status=scan.status,
        threshold_days=scan.threshold_days,
        created_at=scan.created_at,
        total_evaluated=scan.total_evaluated,
        flagged_count=scan.flagged_count,
        stores_covered=scan.stores_covered,
        findings=[_finding_to_schema(f) for f in saved_findings],
    )


@router.get("", response_model=list[ScanSummary])
def list_scans(
    dataset_id: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve paginated scan execution history."""
    repo = StockSentinelRepository(db)
    scans = repo.get_scans(dataset_id=dataset_id, limit=limit, offset=offset)
    return [
        ScanSummary(
            scan_id=s.scan_id,
            dataset_id=s.dataset_id,
            evaluation_date=s.evaluation_date,
            status=s.status,
            threshold_days=s.threshold_days,
            created_at=s.created_at,
            total_evaluated=s.total_evaluated,
            flagged_count=s.flagged_count,
            stores_covered=s.stores_covered,
        )
        for s in scans
    ]


@router.get("/{scan_id}", response_model=ScanResponse)
def get_scan_details(scan_id: str, db: Session = Depends(get_db)):
    """Retrieve scan details and its generated top-20 findings."""
    repo = StockSentinelRepository(db)
    scan = repo.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan '{scan_id}' not found.")

    findings = repo.get_findings(scan_id=scan_id, limit=200)

    return ScanResponse(
        scan_id=scan.scan_id,
        dataset_id=scan.dataset_id,
        evaluation_date=scan.evaluation_date,
        status=scan.status,
        threshold_days=scan.threshold_days,
        created_at=scan.created_at,
        total_evaluated=scan.total_evaluated,
        flagged_count=scan.flagged_count,
        stores_covered=scan.stores_covered,
        findings=[_finding_to_schema(f) for f in findings],
    )
