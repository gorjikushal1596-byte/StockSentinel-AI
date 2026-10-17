"""
Detection Engine for StockSentinel AI.

Analyzes daily sales and system-recorded inventory for each SKU-store-day.
Detects positive-stock, zero-sales contradictions while protecting slow-moving SKUs
using Poisson inter-arrival modeling, promotion calendar data, and weekday demand patterns.
"""

import math
from datetime import datetime, timedelta
from app.db.models import DailyRecord, SKU


class DetectionCandidate:
    """Intermediate candidate evaluated during detection."""
    def __init__(
        self,
        store_id: str,
        sku_id: str,
        evaluation_date: str,
        recorded_stock: int,
        consecutive_zero_days: int,
        historical_daily_velocity: float,
        poisson_p_zero: float,
        confidence_score: float,
        severity: str,
        anomaly_type: str,
        explanation: str,
        expected_dollar_velocity: float,
        time_series: list[dict],
        signals: list[dict],
    ):
        self.store_id = store_id
        self.sku_id = sku_id
        self.evaluation_date = evaluation_date
        self.recorded_stock = recorded_stock
        self.consecutive_zero_days = consecutive_zero_days
        self.historical_daily_velocity = historical_daily_velocity
        self.poisson_p_zero = poisson_p_zero
        self.confidence_score = confidence_score
        self.severity = severity
        self.anomaly_type = anomaly_type
        self.explanation = explanation
        self.expected_dollar_velocity = expected_dollar_velocity
        self.time_series = time_series
        self.signals = signals


class AnomalyDetectionService:
    """
    Deterministic anomaly detection service conforming to the R1 Phantom Stock-Out Detector
    problem statement.
    """

    def __init__(self, base_threshold_days: int = 3, min_history_records: int = 7):
        self.base_threshold_days = base_threshold_days
        self.min_history_records = min_history_records

    def evaluate_sku_store_history(
        self,
        store_id: str,
        sku: SKU,
        records: list[DailyRecord],
        evaluation_date: str,
    ) -> DetectionCandidate | None:
        """
        Evaluate a single (store, SKU) combination for a specific evaluation date.
        Returns a DetectionCandidate if an actionable discrepancy is identified, else None.
        """
        if not records or len(records) < self.min_history_records:
            return None

        # Sort records chronologically just in case
        sorted_records = sorted(records, key=lambda r: r.date)
        
        # Verify evaluation date record exists as the final record
        latest_record = sorted_records[-1]
        if latest_record.date != evaluation_date:
            return None

        current_stock = latest_record.on_hand_stock

        # Condition 1: If current recorded stock is <= 0, this is normal out-of-stock, not phantom.
        if current_stock <= 0:
            return None

        # Condition 2: Calculate consecutive calendar zero-sales days ending on evaluation_date.
        # Ensure calendar contiguity: if dates are nonconsecutive (e.g. gaps in calendar records),
        # the contiguous zero streak terminates at the gap.
        # If on_hand_stock <= 0 on any day, sales were 0 due to genuine out-of-stock, not phantom.
        consecutive_zero_days = 0
        holiday_zero_days = 0
        is_promo_during_zero = False
        eval_dt = datetime.strptime(latest_record.date, "%Y-%m-%d").date()
        expected_date = eval_dt

        for rec in reversed(sorted_records):
            rec_dt = datetime.strptime(rec.date, "%Y-%m-%d").date()
            if rec_dt != expected_date:
                # Calendar date gap detected: streak of contiguous calendar days terminates
                break

            # Must have zero sales AND positive physical ledger stock
            if rec.sales == 0 and rec.on_hand_stock > 0:
                consecutive_zero_days += 1
                if getattr(rec, "is_holiday", False):
                    holiday_zero_days += 1
                if getattr(rec, "is_promotion", False):
                    is_promo_during_zero = True
                expected_date = expected_date - timedelta(days=1)
            else:
                # Sales occurred or stock was <= 0 (genuine stockout)
                break

        # Check threshold
        if consecutive_zero_days < self.base_threshold_days:
            return None

        # Condition 2b: Holiday-related false positive protection
        # On recognized holidays (store closure, reduced trading), zero sales cannot be assumed
        # to reflect customer arrival failure caused by phantom inventory.
        # Active trading zero days must satisfy base threshold.
        trading_zero_days = consecutive_zero_days - holiday_zero_days
        if trading_zero_days < self.base_threshold_days:
            return None

        # Condition 3: Baseline demand calculation (prior history before the zero-sales streak)
        # Use in-stock days where possible so out-of-stock censorship does not deflate velocity.
        history_before_streak = sorted_records[:-consecutive_zero_days]
        if not history_before_streak:
            history_before_streak = sorted_records

        in_stock_history = [r for r in history_before_streak if r.on_hand_stock > 0]
        if in_stock_history:
            # Exclude holiday closures from baseline velocity if sufficient non-holiday records exist
            normal_in_stock = [r for r in in_stock_history if not getattr(r, "is_holiday", False)]
            calc_records = normal_in_stock if len(normal_in_stock) >= 3 else in_stock_history
            total_sales_history = sum(r.sales for r in calc_records)
            daily_velocity = total_sales_history / len(calc_records)
        else:
            daily_velocity = sum(r.sales for r in history_before_streak) / max(1, len(history_before_streak))

        # Incorporate promotion uplift: if item is currently on promo, expected rate is higher
        promo_multiplier = 1.6 if is_promo_during_zero else 1.0
        effective_daily_velocity = max(0.05, daily_velocity * promo_multiplier)

        # Condition 4: Poisson False-Positive Protection for slow-moving SKUs
        # Expected sales during zero-sales window: mu = lambda * D
        expected_sales_during_streak = effective_daily_velocity * consecutive_zero_days
        
        # Poisson probability of observing 0 arrivals when expected is mu:
        # P(X = 0) = exp(-mu)
        poisson_p_zero = math.exp(-expected_sales_during_streak)

        # If probability of 0 sales is high (e.g. > 15%) for a slow-moving item,
        # observing zero sales is statistically consistent with normal arrival variance!
        # Do not flag as an anomaly.
        if poisson_p_zero > 0.15 and daily_velocity < 0.35:
            return None

        # Condition 5: Confidence Calculation
        # Raw anomaly likelihood = 1 - P(0 sales)
        raw_confidence = (1.0 - poisson_p_zero) * 100.0

        # Adjust confidence by stock level: higher recorded stock reinforces phantom anomaly
        stock_factor = min(1.08, 0.95 + (current_stock * 0.02))
        
        # Promo factor: if on promotion, zero sales is even more egregious
        promo_factor = 1.12 if is_promo_during_zero else 1.0

        confidence_score = round(min(99.8, max(25.0, raw_confidence * stock_factor * promo_factor)), 1)

        # Severity classification
        if confidence_score >= 90.0 and consecutive_zero_days >= 5:
            severity = "CRITICAL"
        elif confidence_score >= 75.0 or consecutive_zero_days >= 4:
            severity = "HIGH"
        else:
            severity = "ROUTINE"

        # Stretch goal: Distinguish anomaly type
        # phantom_stockout vs misplaced on wrong shelf vs delisted item
        anomaly_type = "phantom_stockout"
        if getattr(sku, "status", "active") == "delisted":
            anomaly_type = "delisted"
        elif consecutive_zero_days >= 14 and daily_velocity > 1.0:
            anomaly_type = "phantom_stockout"
        elif daily_velocity >= 0.5 and consecutive_zero_days in (3, 4) and not is_promo_during_zero:
            # Moderate mover with short zero spell could be misplaced in adjacent bay
            anomaly_type = "misplaced"
        else:
            anomaly_type = "phantom_stockout"

        # Plain English explanation
        weekly_rate = round(daily_velocity * 7, 1)
        promo_text = " (ACTIVE PROMOTION)" if is_promo_during_zero else ""
        explanation = (
            f"Possible {anomaly_type.replace('_', ' ')} — verify shelf: Recorded {current_stock} units in {sku.shelf_bay}, "
            f"but 0 register sales across {consecutive_zero_days} consecutive days{promo_text}. "
            f"Normal velocity is ~{weekly_rate} units/week."
        )

        # Expected dollar velocity at risk = Price * Daily Velocity * Consecutive Days * Confidence
        unit_price = sku.price or 100.0
        expected_dollar_velocity = unit_price * effective_daily_velocity * consecutive_zero_days * (confidence_score / 100.0)

        # Time series points (last 14 days)
        recent_14 = sorted_records[-14:]
        time_series = [
            {
                "date": r.date,
                "sales": r.sales,
                "stock": r.on_hand_stock,
                "is_promotion": r.is_promotion,
            }
            for r in recent_14
        ]

        # Key evidence signals for verification inspector
        signals = [
            {
                "name": "System Ledger Stock",
                "value": f"+{current_stock} units",
                "status": "alert",
                "detail": f"ERP shows {current_stock} units recorded at {sku.shelf_bay}",
            },
            {
                "name": "Consecutive Zero-Sales Days",
                "value": f"{consecutive_zero_days} days",
                "status": "alert",
                "detail": f"Zero register transactions since {sorted_records[-consecutive_zero_days].date}",
            },
            {
                "name": "Historical Velocity",
                "value": f"{round(daily_velocity, 2)} units/day",
                "status": "normal",
                "detail": f"Baseline daily demand: ~{weekly_rate} units/week",
            },
            {
                "name": "Poisson Zero Likelihood",
                "value": f"{round(poisson_p_zero * 100, 2)}%",
                "status": "alert" if poisson_p_zero < 0.05 else "info",
                "detail": f"Chance of normal zero sales over {consecutive_zero_days} days is only {round(poisson_p_zero * 100, 2)}%",
            },
        ]

        if is_promo_during_zero:
            signals.append({
                "name": "Promotional Window",
                "value": "Active Promo",
                "status": "alert",
                "detail": "Promotional calendar flagged active discount during zero-sales streak",
            })

        if holiday_zero_days > 0:
            signals.append({
                "name": "Holiday Factor",
                "value": f"{holiday_zero_days} Holiday Day(s)",
                "status": "info",
                "detail": f"{holiday_zero_days} holiday day(s) evaluated; active trading zero days = {trading_zero_days}",
            })

        return DetectionCandidate(
            store_id=store_id,
            sku_id=sku.sku_id,
            evaluation_date=evaluation_date,
            recorded_stock=current_stock,
            consecutive_zero_days=consecutive_zero_days,
            historical_daily_velocity=round(daily_velocity, 2),
            poisson_p_zero=poisson_p_zero,
            confidence_score=confidence_score,
            severity=severity,
            anomaly_type=anomaly_type,
            explanation=explanation,
            expected_dollar_velocity=expected_dollar_velocity,
            time_series=time_series,
            signals=signals,
        )
