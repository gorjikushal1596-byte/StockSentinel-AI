"""Tests for precision@20 and recall evaluation service."""

from backend.app.db.models import Finding, GroundTruthLabel
from backend.app.services.evaluation_service import EvaluationService


def test_hand_checkable_precision_at_20_and_recall():
    """
    Hand-checkable test case:
    Store 1:
      - Returns 10 top-20 findings (SKU_1 to SKU_10).
      - Ground truth has 8 positives (SKU_1 to SKU_8) plus 2 other positives (SKU_99, SKU_100).
      - Expected True Positives in top-20 = 8
      - Expected Precision@20 = 8 / 10 = 80.0%
      - Total ground truth positives = 10
      - Expected Recall = 8 / 10 = 80.0%
    """
    findings = [
        Finding(
            finding_id=f"f_{i}",
            scan_id="s1",
            store_id="STORE_01",
            sku_id=f"SKU_{i}",
            rank=i,
            evaluation_date="2026-10-15",
            recorded_stock=5,
            consecutive_zero_days=4,
            historical_daily_velocity=2.0,
            confidence_score=90.0,
            severity="CRITICAL",
            anomaly_type="phantom_stockout",
            explanation="test",
            status="pending",
            time_series_json="",
        )
        for i in range(1, 11)
    ]

    # Ground truth labels: SKU_1 to SKU_8 are phantom stockouts. SKU_99, SKU_100 are also phantom.
    ground_truth = [
        GroundTruthLabel(
            store_id="STORE_01",
            sku_id=f"SKU_{i}",
            date="2026-10-15",
            is_phantom_stockout=True,
            label_type="phantom_stockout",
        )
        for i in range(1, 9)
    ]
    ground_truth.append(
        GroundTruthLabel(store_id="STORE_01", sku_id="SKU_99", date="2026-10-15", is_phantom_stockout=True)
    )
    ground_truth.append(
        GroundTruthLabel(store_id="STORE_01", sku_id="SKU_100", date="2026-10-15", is_phantom_stockout=True)
    )
    # Non-anomalous row
    ground_truth.append(
        GroundTruthLabel(store_id="STORE_01", sku_id="SKU_9", date="2026-10-15", is_phantom_stockout=False)
    )

    eval_result = EvaluationService.evaluate_findings(
        findings=findings,
        ground_truth=ground_truth,
        evaluation_date="2026-10-15",
    )

    assert eval_result.available is True
    assert eval_result.mean_precision_at_20 == 80.0
    assert eval_result.overall_recall == 80.0
    assert eval_result.total_true_positives == 8
    assert eval_result.total_findings_evaluated == 10
    assert eval_result.total_ground_truth_positives == 10


def test_empty_findings_handled_cleanly():
    """When no findings are returned for a store with zero anomalies, precision should be 100%."""
    ground_truth = [
        GroundTruthLabel(store_id="STORE_01", sku_id="SKU_1", date="2026-10-15", is_phantom_stockout=False)
    ]

    eval_result = EvaluationService.evaluate_findings(
        findings=[],
        ground_truth=ground_truth,
        evaluation_date="2026-10-15",
    )

    assert eval_result.available is True
    assert eval_result.total_true_positives == 0
    assert eval_result.mean_precision_at_20 == 100.0
