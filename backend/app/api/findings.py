"""Findings, verification queue status updates, and evidence endpoints."""

import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.repository import StockSentinelRepository
from app.schemas.finding import (
    FindingResponse,
    FindingStatusUpdate,
    EvidenceResponse,
    EvidenceSignal,
    ReasoningPlanResponse,
)
from app.schemas.inventory import TimeSeriesPoint

router = APIRouter(prefix="/findings", tags=["Findings"])


def _finding_to_response(f) -> FindingResponse:
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


@router.get("", response_model=list[FindingResponse])
def list_findings(
    scan_id: str | None = None,
    dataset_id: str | None = None,
    store_id: str | None = None,
    sku_id: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    evaluation_date: str | None = None,
    date: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Query findings with filtering by store, SKU, status, date, dataset, and severity.
    Returns findings in stable ranking order.
    """
    target_date = evaluation_date or date
    repo = StockSentinelRepository(db)
    findings = repo.get_findings(
        scan_id=scan_id,
        dataset_id=dataset_id,
        store_id=store_id,
        sku_id=sku_id,
        status=status,
        severity=severity,
        evaluation_date=target_date,
        limit=limit,
        offset=offset,
    )
    return [_finding_to_response(f) for f in findings]


@router.get("/{finding_id}", response_model=FindingResponse)
def get_single_finding(finding_id: str, db: Session = Depends(get_db)):
    """Retrieve details for a single anomaly finding."""
    repo = StockSentinelRepository(db)
    finding = repo.get_finding(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found.")
    return _finding_to_response(finding)


@router.patch("/{finding_id}/status", response_model=FindingResponse)
def update_finding_status(
    finding_id: str,
    update: FindingStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a finding's physical verification status:
    - pending: awaiting associate inspection
    - verified: associate confirmed empty shelf / phantom stock-out
    - false_positive: item found in stock and facing correctly
    - unresolved: inspection attempted but deferred
    """
    repo = StockSentinelRepository(db)
    finding = repo.get_finding(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found.")

    allowed_statuses = {"pending", "verified", "false_positive", "unresolved"}
    if update.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{update.status}'. Allowed: {', '.join(allowed_statuses)}",
        )

    updated_finding = repo.update_finding_status(finding_id, update.status)
    return _finding_to_response(updated_finding)


@router.get("/{finding_id}/evidence", response_model=EvidenceResponse)
def get_finding_evidence(finding_id: str, db: Session = Depends(get_db)):
    """Retrieve time-series evidence and explainability signals for a specific finding."""
    repo = StockSentinelRepository(db)
    finding = repo.get_finding(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found.")

    ts_points = []
    signals = []
    if finding.time_series_json:
        try:
            data = json.loads(finding.time_series_json)
            if isinstance(data, dict):
                ts_points = [TimeSeriesPoint(**p) for p in data.get("points", [])]
                signals = [EvidenceSignal(**s) for s in data.get("signals", [])]
        except Exception:
            pass

    return EvidenceResponse(
        finding_id=finding.finding_id,
        store_id=finding.store_id,
        store_name=finding.store.name if finding.store else None,
        sku_id=finding.sku_id,
        product_name=finding.sku.name if finding.sku else None,
        category=finding.sku.category if finding.sku else None,
        shelf_bay=finding.sku.shelf_bay if finding.sku else None,
        unit_price=finding.sku.price if finding.sku else None,
        evaluation_date=finding.evaluation_date,
        recorded_stock=finding.recorded_stock,
        consecutive_zero_days=finding.consecutive_zero_days,
        confidence_score=finding.confidence_score,
        severity=finding.severity,
        anomaly_type=finding.anomaly_type,
        explanation=finding.explanation,
        signals=signals,
        time_series=ts_points,
    )


@router.post("/{finding_id}/deep-reasoning", response_model=ReasoningPlanResponse)
async def generate_finding_reasoning(finding_id: str, db: Session = Depends(get_db)):
    """
    Generate deep qualitative root-cause reasoning and associate dispatch action plan
    via OmniRoute (gpt-oss-120b) with zero-crash deterministic fallback.
    """
    from app.services.reasoning_service import OmniRouteReasoningService

    repo = StockSentinelRepository(db)
    finding = repo.get_finding(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found.")

    service = OmniRouteReasoningService()
    plan = await service.generate_action_plan(
        finding=finding,
        store=finding.store,
        sku=finding.sku,
    )
    return ReasoningPlanResponse(**plan)
