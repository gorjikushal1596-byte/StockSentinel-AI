"""Tests for Top-20 ranking determinism and strict budget capping."""

from app.services.detection_service import DetectionCandidate
from app.services.scoring_service import ScoringRankingService


def make_candidate(sku_id: str, velocity_risk: float, confidence: float, streak: int) -> DetectionCandidate:
    return DetectionCandidate(
        store_id="STORE_01",
        sku_id=sku_id,
        evaluation_date="2026-10-15",
        recorded_stock=10,
        consecutive_zero_days=streak,
        historical_daily_velocity=3.0,
        poisson_p_zero=0.001,
        confidence_score=confidence,
        severity="CRITICAL",
        anomaly_type="phantom_stockout",
        explanation="Test finding",
        expected_dollar_velocity=velocity_risk,
        time_series=[],
        signals=[],
    )


def test_strict_cap_at_20_findings():
    """Verifies that even if 50 items are flagged, exactly <= 20 are returned per store."""
    candidates = [
        make_candidate(f"SKU_{i:03d}", velocity_risk=100.0 + i, confidence=80.0, streak=4)
        for i in range(1, 51)
    ]

    findings = ScoringRankingService.rank_store_candidates(
        candidates=candidates,
        scan_id="scan_test",
        max_per_store=20,
    )

    assert len(findings) == 20
    assert findings[0].rank == 1
    assert findings[19].rank == 20


def test_ranking_determinism_and_tie_breaking():
    """Identical runs must produce identical ranks. Ties broken deterministically by SKU ID."""
    c1 = make_candidate("SKU_B", velocity_risk=500.0, confidence=90.0, streak=5)
    c2 = make_candidate("SKU_A", velocity_risk=500.0, confidence=90.0, streak=5)  # Identical risk & conf
    c3 = make_candidate("SKU_C", velocity_risk=800.0, confidence=95.0, streak=6)  # Highest risk

    findings = ScoringRankingService.rank_store_candidates([c1, c2, c3], scan_id="scan_test", max_per_store=20)

    # SKU_C should be #1 (highest risk)
    assert findings[0].sku_id == "SKU_C"
    assert findings[0].rank == 1

    # SKU_A should beat SKU_B on alphabetical tie-breaker
    assert findings[1].sku_id == "SKU_A"
    assert findings[1].rank == 2
    assert findings[2].sku_id == "SKU_B"
    assert findings[2].rank == 3


def test_top20_constraint_clamps_client_request_above_20():
    """Service strictly enforces <= 20 even if client passes max_per_store > 20."""
    candidates = [
        make_candidate(f"SKU_{i:03d}", velocity_risk=100.0 + i, confidence=80.0, streak=4)
        for i in range(1, 51)
    ]

    findings = ScoringRankingService.rank_store_candidates(
        candidates=candidates,
        scan_id="scan_test",
        max_per_store=50,  # Client attempts to request 50 findings
    )

    # Must be strictly clamped to <= 20
    assert len(findings) == 20
    assert max(f.rank for f in findings) == 20


def test_scan_request_schema_clamps_max_findings():
    """ScanRequest schema validator clamps any max_findings_per_store above 20."""
    from app.schemas.scan import ScanRequest

    req = ScanRequest(
        evaluation_date="2026-10-15",
        max_findings_per_store=50,
    )
    assert req.max_findings_per_store == 20
