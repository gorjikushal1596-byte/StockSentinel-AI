"""
Scoring and Ranking Service for StockSentinel AI.

Ranks detected candidates per store and enforces the strict operational constraint:
Exactly no more than 20 items per store per day.
Ranking is 100% deterministic with documented tie-breakers.
"""

import json
import uuid
from backend.app.db.models import Finding
from backend.app.services.detection_service import DetectionCandidate


class ScoringRankingService:
    """Handles deterministic ranking and Finding entity construction."""

    @staticmethod
    def rank_store_candidates(
        candidates: list[DetectionCandidate],
        scan_id: str,
        max_per_store: int = 20,
        dataset_id: str | None = None,
    ) -> list[Finding]:
        """
        Rank candidates for a single store using a multi-key deterministic sort:
        1. Primary: Expected Dollar Velocity at risk (descending)
        2. Secondary: Anomaly Confidence Score (descending)
        3. Tertiary: Consecutive zero-sales days (descending)
        4. Tie-breaker: SKU ID alphabetical (ascending) - ensures 100% stable determinism!
        """
        if not candidates:
            return []

        sorted_candidates = sorted(
            candidates,
            key=lambda c: (
                -c.expected_dollar_velocity,
                -c.confidence_score,
                -c.consecutive_zero_days,
                c.sku_id,  # Stable tie-breaker
            ),
        )

        # Enforce budget cap
        top_candidates = sorted_candidates[:max_per_store]

        findings: list[Finding] = []
        for rank_idx, cand in enumerate(top_candidates, start=1):
            finding = Finding(
                finding_id=f"fnd_{uuid.uuid4().hex[:12]}",
                scan_id=scan_id,
                dataset_id=dataset_id,
                store_id=cand.store_id,
                sku_id=cand.sku_id,
                rank=rank_idx,
                evaluation_date=cand.evaluation_date,
                recorded_stock=cand.recorded_stock,
                consecutive_zero_days=cand.consecutive_zero_days,
                historical_daily_velocity=cand.historical_daily_velocity,
                confidence_score=cand.confidence_score,
                severity=cand.severity,
                anomaly_type=cand.anomaly_type,
                explanation=cand.explanation,
                status="pending",
                time_series_json=json.dumps({
                    "points": cand.time_series,
                    "signals": cand.signals,
                }),
            )
            findings.append(finding)

        return findings
