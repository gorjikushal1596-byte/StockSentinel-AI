"""Revenue recovery & business impact estimation endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.schemas.recovery import (
    RecoveryEstimateRequest,
    RecoveryEstimateResponse,
    PersistAssumptionsRequest,
)
from backend.app.services.recovery_service import RecoveryCalculationService

router = APIRouter(prefix="/recovery-estimate", tags=["ROI & Recovery"])


@router.get("", response_model=RecoveryEstimateResponse)
def get_revenue_recovery_estimate(
    dataset_id: str | None = Query(None, description="Optional target dataset ID"),
    scan_id: str | None = Query(None, description="Optional target scan ID"),
    evaluation_date: str | None = Query(None, description="Target evaluation date in YYYY-MM-DD"),
    date: str | None = Query(None, description="Alias for evaluation_date"),
    store_count: int | None = Query(None, ge=1, le=1000, description="Total stores in network"),
    avg_price_inr: float | None = Query(None, gt=0, description="Average retail price in INR"),
    incidents_per_store_month: int | None = Query(None, ge=1, le=100, description="Monthly phantom incidents / store"),
    days_saved_per_incident: float | None = Query(None, ge=0.5, le=30.0, description="Audit lead-time days saved"),
    days_saved: float | None = Query(None, ge=0.5, le=30.0, description="Alias for days_saved_per_incident"),
    daily_sales_velocity: float | None = Query(None, gt=0, le=50.0, description="Average daily sales velocity"),
    daily_velocity: float | None = Query(None, gt=0, le=50.0, description="Alias for daily_sales_velocity"),
    recovery_capture_rate: float | None = Query(None, ge=1.0, le=100.0, description="Customer restock purchase capture %"),
    capture_rate_percent: float | None = Query(None, ge=1.0, le=100.0, description="Alias for recovery_capture_rate"),
    gross_margin_percent: float | None = Query(None, ge=1.0, le=100.0, description="Retail gross margin %"),
    unverified_conversion_rate: float | None = Query(None, ge=0.0, le=100.0, description="Conversion % for uninspected alerts"),
    annualization_enabled: bool = Query(True, description="Enable annualized projections"),
    db: Session = Depends(get_db),
):
    """
    Calculate empirical business impact and annual revenue recovery in INR (₹).
    Automatically derives measured values from currently selected dataset and scan findings,
    while visibly separating measured data, mathematical estimates, and user assumptions.
    """
    target_date = evaluation_date or date
    resolved_days = days_saved_per_incident if days_saved_per_incident is not None else days_saved
    resolved_velocity = daily_sales_velocity if daily_sales_velocity is not None else daily_velocity
    resolved_capture = recovery_capture_rate if recovery_capture_rate is not None else capture_rate_percent

    params = RecoveryEstimateRequest(
        dataset_id=dataset_id,
        scan_id=scan_id,
        evaluation_date=target_date,
        store_count=store_count,
        avg_price_inr=avg_price_inr,
        incidents_per_store_month=incidents_per_store_month,
        days_saved_per_incident=resolved_days,
        daily_sales_velocity=resolved_velocity,
        recovery_capture_rate=resolved_capture,
        gross_margin_percent=gross_margin_percent,
        unverified_conversion_rate=unverified_conversion_rate,
        annualization_enabled=annualization_enabled,
    )
    return RecoveryCalculationService.calculate_impact(db=db, params=params)


@router.post("/calculate", response_model=RecoveryEstimateResponse)
def calculate_recovery_with_body(
    payload: RecoveryEstimateRequest,
    db: Session = Depends(get_db),
):
    """POST endpoint to calculate impact with full JSON payload."""
    return RecoveryCalculationService.calculate_impact(db=db, params=payload)


@router.post("/persist")
def persist_assumptions_endpoint(
    payload: PersistAssumptionsRequest,
    db: Session = Depends(get_db),
):
    """Persists user assumptions tied to a dataset and scan."""
    return RecoveryCalculationService.persist_assumptions(db=db, payload=payload)
