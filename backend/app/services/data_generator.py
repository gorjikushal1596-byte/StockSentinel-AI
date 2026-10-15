"""
Synthetic Dataset Generator for StockSentinel AI.

Conforms to the specifications in R1 Phantom Stock-Out Detector PDF:
- 25 stores (size, format, city tier)
- Diverse SKUs with prices in INR
- Daily sales with realistic weekday seasonality & promotion spikes
- ~3% hidden ground-truth labels for evaluation testing
- Clearly labeled as SYNTHETIC DEMO DATA for development and validation.
"""

import math
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.app.db.models import Store, SKU, DailyRecord, GroundTruthLabel


def generate_and_seed_data(
    db: Session,
    num_stores: int = 5,
    num_skus: int = 40,
    days_history: int = 45,
    reference_date_str: str = "2026-10-15",
    clear_existing: bool = False,
) -> dict[str, int]:
    """
    Seeds a representative development and test dataset.
    Can be scaled up to 25 stores and 800 SKUs when needed.
    """
    if clear_existing:
        db.query(GroundTruthLabel).delete()
        db.query(DailyRecord).delete()
        db.query(SKU).delete()
        db.query(Store).delete()
        db.commit()

    existing_stores = db.query(Store).count()
    existing_records = db.query(DailyRecord).count()
    if not clear_existing and existing_stores >= num_stores and existing_records > 0:
        return {
            "stores": existing_stores,
            "skus": db.query(SKU).count(),
            "daily_records": existing_records,
            "ground_truth_labels": db.query(GroundTruthLabel).count(),
        }

    # Deterministic pseudo-random seed for stable development & test data
    rnd = random.Random(42)

    # 1. Seed Stores
    stores_data = [
        ("STORE_01", "Store #01 — Connaught Plaza Flagship", "Tier-1", "Hypermarket", 65000),
        ("STORE_02", "Store #02 — Bandra Kurla Boulevard", "Tier-1", "Supermarket", 48000),
        ("STORE_03", "Store #03 — Indiranagar High Street", "Tier-1", "Supermarket", 42000),
        ("STORE_04", "Store #04 — Sector 18 Galleria", "Tier-2", "Supermarket", 38000),
        ("STORE_05", "Store #05 — Koregaon Park Hub", "Tier-1", "Convenience", 22000),
        ("STORE_06", "Store #06 — Jubilee Hills Center", "Tier-1", "Supermarket", 52000),
        ("STORE_07", "Store #07 — Salt Lake City Mall", "Tier-2", "Hypermarket", 60000),
        ("STORE_08", "Store #08 — Civil Lines Superstore", "Tier-2", "Supermarket", 35000),
        ("STORE_09", "Store #09 — Alwarpet Retail Mart", "Tier-1", "Supermarket", 40000),
        ("STORE_10", "Store #10 — Gomti Nagar Point", "Tier-2", "Supermarket", 36000),
    ]

    stores_to_insert = stores_data[:num_stores]
    for s_id, s_name, tier, fmt, sqft in stores_to_insert:
        if not db.get(Store, s_id):
            db.add(Store(store_id=s_id, name=s_name, city_tier=tier, format=fmt, size_sqft=sqft))
    db.commit()

    # 2. Seed SKUs
    categories = ["Electronics", "Personal Care", "Packaged Foods", "Home Care", "Beverages"]
    skus_to_insert = []
    for i in range(1, num_skus + 1):
        sku_id = f"SKU_{i:04d}"
        category = categories[(i - 1) % len(categories)]
        bay = f"Aisle {((i - 1) % 8) + 1}-{chr(65 + ((i - 1) % 4))}"
        price = round(rnd.uniform(85.0, 3499.0), 2)
        name = f"{category} Premium Item #{i}"
        status = "delisted" if i == num_skus else "active"
        if not db.get(SKU, sku_id):
            db.add(SKU(sku_id=sku_id, name=name, category=category, price=price, shelf_bay=bay, status=status))
            skus_to_insert.append(sku_id)
    db.commit()

    all_sku_ids = [s.sku_id for s in db.query(SKU).all()]
    all_store_ids = [s.store_id for s in db.query(Store).all()]

    # 3. Generate Historical Daily Records
    ref_date = datetime.strptime(reference_date_str, "%Y-%m-%d").date()
    dates = [(ref_date - timedelta(days=d)).strftime("%Y-%m-%d") for d in range(days_history, -1, -1)]

    # Pick specific (store, SKU) pairs to inject intentional anomalies
    # ~3% phantom stockout anomalies as described in official PDF
    intentional_anomalies: set[tuple[str, str]] = set()
    for s_idx, st_id in enumerate(all_store_ids):
        # Pick 2-3 SKUs per store to exhibit realistic phantom stock-out behavior
        for k_idx in range(min(3, len(all_sku_ids))):
            target_sku = all_sku_ids[(s_idx * 3 + k_idx) % len(all_sku_ids)]
            intentional_anomalies.add((st_id, target_sku))

    daily_records_batch = []
    ground_truth_batch = []

    for st_id in all_store_ids:
        for k_idx, sk_id in enumerate(all_sku_ids):
            # Base velocity: mix of fast movers (3-7 units/day) and slow movers (0.1-0.4 units/day)
            is_slow_mover = (k_idx % 4 == 0)
            base_lambda = rnd.uniform(0.12, 0.35) if is_slow_mover else rnd.uniform(1.8, 5.5)
            is_anomaly_target = (st_id, sk_id) in intentional_anomalies

            # Running inventory
            on_hand = rnd.randint(8, 25)

            for d_idx, date_str in enumerate(dates):
                # Day of week seasonality: Friday-Sunday higher demand
                d_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
                is_weekend = d_obj.weekday() in (4, 5, 6)
                is_promo = (k_idx % 7 == 0 and d_idx % 14 in (0, 1, 2, 3))
                
                day_multiplier = 1.4 if is_weekend else 0.85
                if is_promo:
                    day_multiplier *= 1.6

                effective_lambda = base_lambda * day_multiplier

                # If this is an anomaly target in the last 6 days of the window:
                days_from_end = (ref_date - d_obj).days
                if is_anomaly_target and days_from_end <= 6:
                    # Positive stock, ZERO register sales!
                    sales = 0
                    on_hand = max(4, on_hand)
                    # Create ground-truth label for evaluation
                    ground_truth_batch.append(
                        GroundTruthLabel(
                            store_id=st_id,
                            sku_id=sk_id,
                            date=date_str,
                            is_phantom_stockout=True,
                            label_type="phantom_stockout",
                            source="synthetic_ground_truth_generator",
                        )
                    )
                else:
                    # Normal Poisson-distributed sales
                    # Knuth's algorithm for Poisson random variate
                    L = math.exp(-effective_lambda)
                    k = 0
                    p = 1.0
                    while p > L:
                        k += 1
                        p *= rnd.random()
                    sales = min(on_hand, max(0, k - 1))
                    
                    # Periodic replenishment
                    if on_hand <= 4:
                        on_hand += rnd.randint(12, 30)
                    else:
                        on_hand = max(0, on_hand - sales)

                    # Mark non-anomalous ground truth for reference date
                    if days_from_end == 0:
                        ground_truth_batch.append(
                            GroundTruthLabel(
                                store_id=st_id,
                                sku_id=sk_id,
                                date=date_str,
                                is_phantom_stockout=False,
                                label_type="normal",
                                source="synthetic_ground_truth_generator",
                            )
                        )

                daily_records_batch.append(
                    DailyRecord(
                        store_id=st_id,
                        sku_id=sk_id,
                        date=date_str,
                        sales=sales,
                        on_hand_stock=on_hand,
                        is_promotion=is_promo,
                        is_holiday=is_weekend,
                    )
                )

    db.bulk_save_objects(daily_records_batch)
    db.bulk_save_objects(ground_truth_batch)
    db.commit()

    return {
        "stores": db.query(Store).count(),
        "skus": db.query(SKU).count(),
        "daily_records": db.query(DailyRecord).count(),
        "ground_truth_labels": db.query(GroundTruthLabel).count(),
    }
