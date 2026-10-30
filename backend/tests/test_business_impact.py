"""Automated tests for dataset-driven business impact, revenue recovery, and ROI modeling."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal, init_db
from app.services.dataset_service import DatasetService
from app.schemas.scan import ScanRequest
from app.api.scans import execute_scan

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_benchmark_dataset():
    """Initializes tables and ensures synthetic benchmark dataset is loaded."""
    init_db()
    db = SessionLocal()
    try:
        svc = DatasetService(db)
        existing = svc.list_datasets()
        ds = next((d for d in existing if (d.dataset_id.startswith("DS_SAFFRON") or d.dataset_id.startswith("DS_SYNTHETIC")) and d.status == "imported"), None)
        has_records = False
        if ds:
            from app.db.models import DailyRecord
            has_records = db.query(DailyRecord).filter(DailyRecord.dataset_id == ds.dataset_id).count() > 0
        if not ds or not has_records:
            ds, _ = svc.load_synthetic_dataset()

        # Run scan for benchmark date 2026-07-01
        scan_res = execute_scan(
            ScanRequest(
                evaluation_date="2026-07-01",
                threshold_days=3,
                dataset_id=ds.dataset_id,
            ),
            db=db,
        )
        yield ds.dataset_id, scan_res.scan_id
    finally:
        db.close()


def test_business_impact_derives_values_from_scan_and_dataset(setup_benchmark_dataset):
    """
    Test 1: Values are dynamically derived from active dataset and scan findings.
    Verifies selling price, cost, inventory quantities, and findings counts are measured.
    """
    dataset_id, scan_id = setup_benchmark_dataset

    res = client.get(f"/api/recovery-estimate?dataset_id={dataset_id}&scan_id={scan_id}")
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["dataset_id"] == dataset_id
    assert data["scan_id"] == scan_id
    assert data["currency"] == "INR"

    # 1. Number of findings measured
    assert data["total_findings_count"] > 0
    assert data["pending_verification_count"] >= 0
    assert data["total_ledger_units_flagged"] > 0

    # Master data detection: Prices and costs
    assert data["has_price_data"] is True
    assert data["detected_avg_selling_price"] > 0

    # SKU costs were mapped from sku_master.csv
    assert data["has_cost_data"] is True
    assert data["detected_avg_unit_cost"] is not None
    assert data["detected_avg_unit_cost"] > 0
    assert data["detected_gross_margin_percent"] is not None
    assert data["margin_source"] == "MEASURED"


def test_business_impact_distinguishes_flagged_vs_verified(setup_benchmark_dataset):
    """
    Test 2: Flags are NOT equated with confirmed recoveries.
    Unverified items use discount conversion weight, verified items use 100%, false positives use 0%.
    """
    dataset_id, scan_id = setup_benchmark_dataset

    # Query with default 60% unverified conversion assumption
    res = client.get(
        f"/api/recovery-estimate?dataset_id={dataset_id}&scan_id={scan_id}&unverified_conversion_rate=60.0"
    )
    assert res.status_code == 200
    data = res.json()

    # Recoverable units must be strictly less than potential units at risk
    # because not all flagged items are assumed recoverable
    assert data["estimated_recoverable_units"] < data["potential_units_at_risk"]
    assert data["estimated_recoverable_revenue"] < data["potential_revenue_at_risk"]

    # When conversion rate is lowered to 20%, recoverable revenue must decrease proportionally
    res_lower = client.get(
        f"/api/recovery-estimate?dataset_id={dataset_id}&scan_id={scan_id}&unverified_conversion_rate=20.0"
    )
    assert res_lower.status_code == 200
    data_lower = res_lower.json()
    assert data_lower["estimated_recoverable_revenue"] < data["estimated_recoverable_revenue"]


def test_recoverable_units_bounded_by_ledger_stock(setup_benchmark_dataset):
    """
    Test 3: Recoverable units are strictly bounded by recorded ledger stock on hand.
    """
    dataset_id, scan_id = setup_benchmark_dataset

    # Even with an exaggerated days_saved = 30 and capture_rate = 100%,
    # recoverable units cannot exceed total ledger units flagged
    res = client.get(
        f"/api/recovery-estimate?dataset_id={dataset_id}&scan_id={scan_id}&days_saved_per_incident=30&recovery_capture_rate=100&unverified_conversion_rate=100"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["estimated_recoverable_units"] <= data["total_ledger_units_flagged"]


def test_profit_impact_calculated_when_cost_available(setup_benchmark_dataset):
    """
    Test 4: Profit impact is calculated from unit cost data and distinguished from top-line revenue.
    """
    dataset_id, scan_id = setup_benchmark_dataset

    res = client.get(f"/api/recovery-estimate?dataset_id={dataset_id}&scan_id={scan_id}")
    assert res.status_code == 200
    data = res.json()

    assert data["has_profit_impact"] is True
    assert data["estimated_profit_impact"] is not None
    assert data["estimated_profit_impact"] > 0
    # Profit must be less than gross recoverable revenue
    assert data["estimated_profit_impact"] < data["estimated_recoverable_revenue"]


def test_annualized_estimates_justified_with_visible_formulas(setup_benchmark_dataset):
    """
    Test 5: Annualized estimates are justified with documented network multipliers and visible arithmetic.
    """
    dataset_id, scan_id = setup_benchmark_dataset

    res = client.get(
        f"/api/recovery-estimate?dataset_id={dataset_id}&scan_id={scan_id}&store_count=5&incidents_per_store_month=16"
    )
    assert res.status_code == 200
    data = res.json()

    assert data["can_annualize"] is True
    assert data["annualized_total_incidents"] == 5 * 16 * 12
    assert data["annualized_recoverable_revenue"] is not None
    assert data["annualized_recoverable_revenue"] > 0
    assert "network" in data["annualization_basis"].lower()

    # Verify visible formula steps with substituted text
    steps = data["visible_formula_steps"]
    assert len(steps) >= 5
    step_titles = [s["title"].lower() for s in steps]
    assert any("recoverable units" in t for t in step_titles)
    assert any("risk" in t for t in step_titles)
    assert any("recoverable revenue" in t for t in step_titles)
    assert any("profit" in t for t in step_titles)
    assert any("annual" in t for t in step_titles)

    for step in steps:
        assert step["formula"] != ""
        assert step["substituted"] != ""
        assert step["result_text"] != ""


def test_persist_assumptions_tied_to_dataset_and_scan(setup_benchmark_dataset):
    """
    Test 6: User assumptions can be persisted and remain tied to dataset and scan.
    """
    dataset_id, scan_id = setup_benchmark_dataset

    persist_payload = {
        "dataset_id": dataset_id,
        "scan_id": scan_id,
        "evaluation_date": "2026-07-01",
        "days_saved_per_incident": 12.0,
        "recovery_capture_rate": 75.0,
        "gross_margin_percent": 35.0,
        "unverified_conversion_rate": 80.0,
        "incidents_per_store_month": 20,
    }

    res_post = client.post("/api/recovery-estimate/persist", json=persist_payload)
    assert res_post.status_code == 200
    post_data = res_post.json()
    assert post_data["status"] in ("created", "updated")

    # Fetching without query parameters should now load the persisted assumptions
    res_get = client.get(f"/api/recovery-estimate?dataset_id={dataset_id}&scan_id={scan_id}")
    assert res_get.status_code == 200
    get_data = res_get.json()
    assert get_data["assumptions_applied"]["days_saved_per_incident"] == 12.0
    assert get_data["assumptions_applied"]["recovery_capture_rate"] == 75.0
    assert get_data["assumptions_applied"]["unverified_conversion_rate"] == 80.0
