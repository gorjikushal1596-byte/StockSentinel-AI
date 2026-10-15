"""Evaluation benchmark endpoint."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.repository import StockSentinelRepository
from backend.app.schemas.evaluation import EvaluationResponse
from backend.app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])


@router.get("", response_model=EvaluationResponse)
def get_evaluation_metrics(
    evaluation_date: str = Query(..., description="Target date in YYYY-MM-DD format"),
    dataset_id: str | None = Query(None, description="Optional dataset ID filter"),
    db: Session = Depends(get_db),
):
    """
    Evaluate top-20 findings against hidden ground-truth labels for a given evaluation date and dataset.
    Returns Precision@20 per store-day and Recall on hidden labels.
    """
    repo = StockSentinelRepository(db)

    # 1. Fetch hidden ground truth labels (never used by detector)
    gt_labels = repo.get_ground_truth_for_date(evaluation_date, dataset_id=dataset_id)
    if not gt_labels:
        available_dates = repo.get_available_ground_truth_dates(dataset_id=dataset_id)
        msg = (
            f"No hidden ground-truth labels found for {evaluation_date}."
            if not available_dates
            else f"No ground-truth labels for {evaluation_date}. Available dates: {', '.join(available_dates[-5:])}"
        )
        return EvaluationResponse(
            available=False,
            evaluation_date=evaluation_date,
            message=msg,
            mean_precision_at_20=None,
            overall_recall=None,
        )

    # 2. Fetch findings for evaluation date
    findings = repo.get_findings(evaluation_date=evaluation_date, dataset_id=dataset_id, limit=500)
    if not findings:
        return EvaluationResponse(
            available=False,
            evaluation_date=evaluation_date,
            message=f"No scan findings exist for {evaluation_date}. Please run a scan on this date first.",
            mean_precision_at_20=None,
            overall_recall=None,
        )

    # Store names mapping
    all_stores = repo.get_all_stores(dataset_id=dataset_id)
    names_map = {s.store_id: s.name for s in all_stores}

    # 3. Calculate metrics
    return EvaluationService.evaluate_findings(
        findings=findings,
        ground_truth=gt_labels,
        evaluation_date=evaluation_date,
        store_names_map=names_map,
    )
