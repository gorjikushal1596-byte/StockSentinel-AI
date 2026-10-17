"""Tests for core detection engine and Poisson false-positive protection."""

import pytest
from app.db.models import DailyRecord, SKU
from app.services.detection_service import AnomalyDetectionService


@pytest.fixture
def test_sku():
    return SKU(
        sku_id="SKU_TEST_01",
        name="Soundbar System",
        category="Electronics",
        price=189.99,
        shelf_bay="Aisle 4-B",
        status="active",
    )


def test_positive_stock_consecutive_zero_sales_detected(test_sku):
    """Flags anomaly when stock is positive and sales drop to zero for >= 3 days."""
    detector = AnomalyDetectionService(base_threshold_days=3)
    
    # 10 days of history: 5 days of normal sales (3 units/day), then 5 days of 0 sales with 6 units on hand
    records = []
    for d in range(1, 6):
        records.append(
            DailyRecord(
                store_id="STORE_01",
                sku_id=test_sku.sku_id,
                date=f"2026-10-{d:02d}",
                sales=3,
                on_hand_stock=6,
                is_promotion=False,
            )
        )
    for d in range(6, 11):
        records.append(
            DailyRecord(
                store_id="STORE_01",
                sku_id=test_sku.sku_id,
                date=f"2026-10-{d:02d}",
                sales=0,
                on_hand_stock=6,
                is_promotion=False,
            )
        )

    candidate = detector.evaluate_sku_store_history(
        store_id="STORE_01",
        sku=test_sku,
        records=records,
        evaluation_date="2026-10-10",
    )

    assert candidate is not None
    assert candidate.consecutive_zero_days == 5
    assert candidate.recorded_stock == 6
    assert candidate.confidence_score >= 85.0
    assert candidate.severity in ("CRITICAL", "HIGH")
    assert "Possible phantom stockout" in candidate.explanation or "verify shelf" in candidate.explanation


def test_below_threshold_not_flagged(test_sku):
    """Does not flag when consecutive zero sales days are below threshold."""
    detector = AnomalyDetectionService(base_threshold_days=3)

    records = [
        DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date=f"2026-10-{d:02d}", sales=3, on_hand_stock=6)
        for d in range(1, 9)
    ]
    # Only 2 days of zero sales
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-09", sales=0, on_hand_stock=6))
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-10", sales=0, on_hand_stock=6))

    candidate = detector.evaluate_sku_store_history(
        store_id="STORE_01",
        sku=test_sku,
        records=records,
        evaluation_date="2026-10-10",
    )

    assert candidate is None


def test_zero_stock_not_flagged_as_phantom(test_sku):
    """When on_hand_stock is 0, zero sales is expected out-of-stock, not phantom."""
    detector = AnomalyDetectionService(base_threshold_days=3)

    records = [
        DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date=f"2026-10-{d:02d}", sales=0, on_hand_stock=0)
        for d in range(1, 11)
    ]

    candidate = detector.evaluate_sku_store_history(
        store_id="STORE_01",
        sku=test_sku,
        records=records,
        evaluation_date="2026-10-10",
    )

    assert candidate is None


def test_slow_moving_sku_protection(test_sku):
    """Protects naturally slow-moving SKUs (e.g. 1 unit every 8-10 days) from false alarms on 3-day zeros."""
    detector = AnomalyDetectionService(base_threshold_days=3)

    # Slow mover: sells 1 unit every 8 days (velocity ~0.12 units/day)
    records = []
    for d in range(1, 20):
        sales = 1 if d in (1, 9, 16) else 0
        records.append(
            DailyRecord(
                store_id="STORE_01",
                sku_id=test_sku.sku_id,
                date=f"2026-09-{d:02d}",
                sales=sales,
                on_hand_stock=3,
            )
        )

    candidate = detector.evaluate_sku_store_history(
        store_id="STORE_01",
        sku=test_sku,
        records=records,
        evaluation_date="2026-09-19",
    )

    # Normal 3-day gap should not be flagged for slow movers
    assert candidate is None


def test_promotion_amplifies_suspicion(test_sku):
    """When an item is on promotion, zero sales makes the anomaly even more suspicious."""
    detector = AnomalyDetectionService(base_threshold_days=3)

    records = [
        DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date=f"2026-10-{d:02d}", sales=4, on_hand_stock=10, is_promotion=False)
        for d in range(1, 7)
    ]
    # 4 days of zero sales during an ACTIVE PROMOTION
    for d in range(7, 11):
        records.append(
            DailyRecord(
                store_id="STORE_01",
                sku_id=test_sku.sku_id,
                date=f"2026-10-{d:02d}",
                sales=0,
                on_hand_stock=10,
                is_promotion=True,
            )
        )

    candidate = detector.evaluate_sku_store_history(
        store_id="STORE_01",
        sku=test_sku,
        records=records,
        evaluation_date="2026-10-10",
    )

    assert candidate is not None
    assert candidate.confidence_score >= 95.0
    promo_signal = any(s["name"] == "Promotional Window" for s in candidate.signals)
    assert promo_signal is True


def test_sales_resuming_resets_streak(test_sku):
    """If sales resume yesterday, the consecutive zero counter is reset."""
    detector = AnomalyDetectionService(base_threshold_days=3)

    records = [
        DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date=f"2026-10-{d:02d}", sales=0, on_hand_stock=5)
        for d in range(1, 9)
    ]
    # Yesterday had 2 sales!
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-09", sales=2, on_hand_stock=5))
    # Today had 0 sales
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-10", sales=0, on_hand_stock=5))

    candidate = detector.evaluate_sku_store_history(
        store_id="STORE_01",
        sku=test_sku,
        records=records,
        evaluation_date="2026-10-10",
    )

    # Streak is only 1 day, so should be None
    assert candidate is None


def test_nonconsecutive_calendar_dates_terminates_streak(test_sku):
    """A calendar gap in records terminates the contiguous zero streak, preventing false alarms."""
    detector = AnomalyDetectionService(base_threshold_days=3)

    records = [
        DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date=f"2026-10-{d:02d}", sales=3, on_hand_stock=8)
        for d in range(1, 6)
    ]
    # Gapped dates: 2026-10-06 (0 sales), then missing 07 & 08, then 2026-10-09 (0 sales), 2026-10-10 (0 sales)
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-06", sales=0, on_hand_stock=8))
    # Gap: 07 and 08 missing
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-09", sales=0, on_hand_stock=8))
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-10", sales=0, on_hand_stock=8))

    candidate = detector.evaluate_sku_store_history(
        store_id="STORE_01",
        sku=test_sku,
        records=records,
        evaluation_date="2026-10-10",
    )

    # Streak backward from 10-10 is only 2 calendar days (10-10 and 10-09), then gap to 10-06 breaks it!
    # Since 2 < 3, candidate must be None
    assert candidate is None


def test_zero_stock_during_streak_breaks_phantom_detection(test_sku):
    """If stock drops to 0 during the streak, zero sales is explained by legitimate stockout."""
    detector = AnomalyDetectionService(base_threshold_days=3)

    records = [
        DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date=f"2026-10-{d:02d}", sales=4, on_hand_stock=10)
        for d in range(1, 7)
    ]
    # 10-07 had 0 stock, so 0 sales was legitimate OOS
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-07", sales=0, on_hand_stock=0))
    # 10-08, 10-09, 10-10 had positive stock and 0 sales (only 2 days contiguous phantom)
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-08", sales=0, on_hand_stock=5))
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-09", sales=0, on_hand_stock=5))
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-10", sales=0, on_hand_stock=5))

    candidate = detector.evaluate_sku_store_history(
        store_id="STORE_01",
        sku=test_sku,
        records=records,
        evaluation_date="2026-10-10",
    )

    # Contiguous positive-stock zero-sales days: 10-10, 10-09, 10-08 = 3 days, but 10-07 breaks streak.
    # Exactly 3 days detected:
    assert candidate is not None
    assert candidate.consecutive_zero_days == 3


def test_holiday_false_positive_protection(test_sku):
    """Recognized holiday closures during zero streak prevent false positive alarms."""
    detector = AnomalyDetectionService(base_threshold_days=3)

    records = [
        DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date=f"2026-10-{d:02d}", sales=3, on_hand_stock=6)
        for d in range(1, 8)
    ]
    # 3 consecutive calendar zero-sales days, BUT 10-08 and 10-09 were holiday store closures!
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-08", sales=0, on_hand_stock=6, is_holiday=True))
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-09", sales=0, on_hand_stock=6, is_holiday=True))
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-10", sales=0, on_hand_stock=6, is_holiday=False))

    candidate = detector.evaluate_sku_store_history(
        store_id="STORE_01",
        sku=test_sku,
        records=records,
        evaluation_date="2026-10-10",
    )

    # Only 1 active trading zero-sales day (10-10); holidays discounted to protect against false alarms
    assert candidate is None


def test_holiday_with_sufficient_trading_days_flagged_with_signal(test_sku):
    """When sufficient active trading days exist despite holidays, anomaly is flagged with Holiday Factor signal."""
    detector = AnomalyDetectionService(base_threshold_days=3)

    records = [
        DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date=f"2026-10-{d:02d}", sales=3, on_hand_stock=6)
        for d in range(1, 6)
    ]
    # 5 zero days: 4 normal trading days + 1 holiday = 4 trading days >= 3 threshold
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-06", sales=0, on_hand_stock=6, is_holiday=False))
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-07", sales=0, on_hand_stock=6, is_holiday=False))
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-08", sales=0, on_hand_stock=6, is_holiday=True))
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-09", sales=0, on_hand_stock=6, is_holiday=False))
    records.append(DailyRecord(store_id="STORE_01", sku_id=test_sku.sku_id, date="2026-10-10", sales=0, on_hand_stock=6, is_holiday=False))

    candidate = detector.evaluate_sku_store_history(
        store_id="STORE_01",
        sku=test_sku,
        records=records,
        evaluation_date="2026-10-10",
    )

    assert candidate is not None
    assert candidate.consecutive_zero_days == 5
    holiday_signals = [s for s in candidate.signals if s["name"] == "Holiday Factor"]
    assert len(holiday_signals) == 1
    assert "1 Holiday Day(s)" in holiday_signals[0]["value"]
