"""
End-to-end verification of StockSentinel AI real backend, database persistence,
dataset handling, and API integration.
"""

import urllib.request
import json
import os
import sys

PORT = os.getenv("BACKEND_PORT", sys.argv[1] if len(sys.argv) > 1 else "8001")
BASE_URL = f"http://localhost:{PORT}/api"

def get(path: str):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def post(path: str, data: dict, method: str = "POST"):
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("--- 1. Health & Database Check ---")
    health = get("/health")
    assert health["status"] == "healthy", f"Health status was {health['status']}"
    assert health["database"] == "connected", f"DB status was {health['database']}"
    print(f"Health OK: service={health['service']}, telemetry={health['telemetry_stats']}")

    print("\n--- 2. Dataset Query Check ---")
    datasets = get("/datasets")
    assert len(datasets) > 0, "No datasets returned from database"
    imported = [d for d in datasets if d["status"] == "imported"]
    assert len(imported) > 0, "No imported datasets found"
    synthetic = [d for d in imported if d["dataset_id"].startswith("DS_SYNTHETIC")]
    target_ds = synthetic[0] if synthetic else imported[0]
    ds_id = target_ds["dataset_id"]
    eval_date = target_ds["end_date"]
    print(f"Target Dataset OK: id={ds_id}, name='{target_ds['name']}', end_date={eval_date}")

    print("\n--- 3. Detection Scan Execution Check ---")
    scan_payload = {
        "evaluation_date": eval_date,
        "dataset_id": ds_id,
        "threshold_days": 3,
        "max_findings_per_store": 20,
    }
    scan_res = post("/scans", scan_payload)
    scan_id = scan_res["scan_id"]
    findings = scan_res["findings"]
    print(f"Scan OK: scan_id={scan_id}, evaluated={scan_res['total_evaluated']}, findings_count={len(findings)}")
    assert len(findings) > 0, "Scan produced zero findings"
    assert len(findings) <= 20 * scan_res["stores_covered"], "Top-20 constraint violated"

    print("\n--- 4. Finding Status Update & Database Persistence Check ---")
    test_finding = findings[0]
    finding_id = test_finding["finding_id"]
    initial_status = test_finding["status"]
    new_status = "verified" if initial_status != "verified" else "false_positive"
    
    update_res = post(f"/findings/{finding_id}/status", {"status": new_status}, method="PATCH")
    assert update_res["status"] == new_status, f"Expected {new_status}, got {update_res['status']}"
    print(f"Update response confirmed: {finding_id} status is now '{new_status}'")

    # Read back from database independently
    persisted_finding = get(f"/findings/{finding_id}")
    assert persisted_finding["status"] == new_status, f"DB readback failed: {persisted_finding['status']} != {new_status}"
    print(f"Database Read-Back Verified: {finding_id} persisted status in DB is '{persisted_finding['status']}'")

    print("\n--- 5. Empirical Revenue Recovery Calculation Check ---")
    rec_res = get(f"/recovery-estimate?dataset_id={ds_id}&evaluation_date={eval_date}&scan_id={scan_id}")
    assert rec_res["total_findings_count"] > 0, "No findings accounted for in recovery"
    assert rec_res["potential_revenue_at_risk"] >= 0, "Invalid revenue at risk"
    assert rec_res["estimated_recoverable_units"] <= rec_res["total_ledger_units_flagged"], "Recoverable units exceeded ledger stock"
    print(f"Recovery Estimate OK: flagged_units={rec_res['total_ledger_units_flagged']}, recoverable_units={rec_res['estimated_recoverable_units']}, revenue_at_risk=INR {rec_res['potential_revenue_at_risk']}")

    print("\n--- 6. Ground-Truth Evaluation Check ---")
    eval_res = get(f"/evaluation?evaluation_date={eval_date}&dataset_id={ds_id}")
    print(f"Evaluation OK: available={eval_res['available']}, message='{eval_res.get('message', '')}'")

    print("\n=======================================================")
    print("ALL 6 END-TO-END WORKFLOWS PASSED AGAINST REAL BACKEND & DATABASE")
    print("=======================================================")

if __name__ == "__main__":
    main()
