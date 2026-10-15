"""End-to-end API route tests using FastAPI TestClient."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db, SessionLocal
from backend.app.services.data_generator import generate_and_seed_data

client = TestClient(app)


def test_api_full_workflow():
    init_db()
    db = SessionLocal()
    try:
        generate_and_seed_data(
            db=db,
            num_stores=5,
            num_skus=30,
            days_history=30,
            reference_date_str="2026-10-15",
            clear_existing=True,
        )
    finally:
        db.close()

    # 1. Health check
    res_health = client.get("/api/health")
    assert res_health.status_code == 200

    # 2. Trigger detection scan on seeded date
    scan_payload = {
        "evaluation_date": "2026-10-15",
        "threshold_days": 3,
        "confidence_cutoff": 40.0,
        "max_findings_per_store": 20,
    }
    res_scan = client.post("/api/scans", json=scan_payload)
    assert res_scan.status_code == 200
    scan_data = res_scan.json()
    assert "scan_id" in scan_data
    assert scan_data["status"] == "completed"
    assert scan_data["stores_covered"] > 0
    assert len(scan_data["findings"]) > 0

    scan_id = scan_data["scan_id"]
    first_finding = scan_data["findings"][0]
    finding_id = first_finding["finding_id"]

    # 3. Retrieve scan history
    res_history = client.get("/api/scans")
    assert res_history.status_code == 200
    assert len(res_history.json()) >= 1

    # 4. Retrieve specific scan details
    res_scan_detail = client.get(f"/api/scans/{scan_id}")
    assert res_scan_detail.status_code == 200
    assert res_scan_detail.json()["scan_id"] == scan_id

    # 5. Query findings list with filters
    res_findings = client.get(f"/api/findings?store_id={first_finding['store_id']}")
    assert res_findings.status_code == 200
    assert len(res_findings.json()) >= 1

    # 6. Retrieve finding evidence & time-series
    res_evidence = client.get(f"/api/findings/{finding_id}/evidence")
    assert res_evidence.status_code == 200
    evidence_data = res_evidence.json()
    assert evidence_data["finding_id"] == finding_id
    assert "signals" in evidence_data
    assert "time_series" in evidence_data
    assert len(evidence_data["signals"]) > 0

    # 7. Update verification status
    res_patch = client.patch(
        f"/api/findings/{finding_id}/status",
        json={"status": "verified", "notes": "Shelf Bay inspected; unit missing from shelf."},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["status"] == "verified"

    # Verify invalid status transition fails with 400
    res_patch_invalid = client.patch(
        f"/api/findings/{finding_id}/status",
        json={"status": "invalid_status_code"},
    )
    assert res_patch_invalid.status_code == 422 or res_patch_invalid.status_code == 400

    # 8. Test evaluation against ground-truth labels
    res_eval = client.get("/api/evaluation?evaluation_date=2026-10-15")
    assert res_eval.status_code == 200
    eval_data = res_eval.json()
    assert eval_data["available"] is True
    assert eval_data["mean_precision_at_20"] is not None
    assert eval_data["overall_recall"] is not None

    # 9. Test recovery estimate
    res_recovery = client.get(
        "/api/recovery-estimate?store_count=25&avg_price_inr=500&incidents_per_store_month=16&days_saved_per_incident=9"
    )
    assert res_recovery.status_code == 200
    rec_data = res_recovery.json()
    assert rec_data["currency"] == "INR"
    assert rec_data["annual_revenue_protected_inr"] > 0
    assert "arithmetic" in rec_data
    assert rec_data["arithmetic"]["step_3_annual_incidents"] == 25 * 16 * 12
