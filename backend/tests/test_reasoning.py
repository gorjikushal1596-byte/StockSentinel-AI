"""Unit and integration tests for OmniRoute reasoning service and endpoint."""

import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db, SessionLocal
from app.services.data_generator import generate_and_seed_data
from app.services.reasoning_service import OmniRouteReasoningService
from app.db.repository import StockSentinelRepository

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_data():
    init_db()
    db = SessionLocal()
    try:
        from app.services.dataset_service import DatasetService
        svc = DatasetService(db)
        datasets = svc.list_datasets()
        target_ds = next((d for d in datasets if (d.dataset_id.startswith("DS_SAFFRON") or d.dataset_id.startswith("DS_SYNTHETIC")) and d.status == "imported"), None)
        if not target_ds:
            svc.load_synthetic_dataset()
    finally:
        db.close()


def test_deep_reasoning_fallback_when_omniroute_disabled():
    """Verify that when OmniRoute is offline or unconfigured, fallback returns cleanly."""
    findings = client.get("/api/findings").json()
    if not findings:
        client.post("/api/scans", json={"evaluation_date": "2026-07-01", "threshold_days": 3})
        findings = client.get("/api/findings").json()
    assert len(findings) > 0
    target_finding_id = findings[0]["finding_id"]

    with patch.dict("os.environ", {"OMNIROUTE_ENABLED": "false"}):
        res = client.post(f"/api/findings/{target_finding_id}/deep-reasoning")
        assert res.status_code == 200
        data = res.json()
        assert data["finding_id"] == target_finding_id
        assert data["source"] == "deterministic_fallback"
        assert len(data["associate_checklist"]) == 3
        assert len(data["root_cause_diagnosis"]) > 0


@pytest.mark.anyio
async def test_reasoning_service_live_mock():
    """Verify that when OmniRoute returns 200, parsed response matches expected schema."""
    db = SessionLocal()
    try:
        repo = StockSentinelRepository(db)
        findings = repo.get_findings(limit=1)
        assert len(findings) > 0
        finding = findings[0]

        mock_llm_json = {
            "root_cause_diagnosis": "High likelihood of shelf tag displacement in bay 4-B.",
            "confidence_rationale": "Consecutive zero sales across high-velocity days contradicts positive ledger.",
            "associate_checklist": [
                "Verify bay 4-B shelf tag.",
                "Check rear restocking carts.",
                "Scan item at cash register.",
            ],
            "shrinkage_risk_level": "CRITICAL",
            "estimated_recovery_action": "Audit bay 4-B and trigger cycle count.",
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": f"```json\n{json.dumps(mock_llm_json)}\n```"}}]
        }

        service = OmniRouteReasoningService()
        service.api_key = "test-key"
        service.enabled = True

        with patch("httpx.AsyncClient.post", return_value=mock_response):
            result = await service.generate_action_plan(finding, finding.store, finding.sku)
            assert result["source"] == "omniroute_live"
            assert result["root_cause_diagnosis"] == mock_llm_json["root_cause_diagnosis"]
            assert len(result["associate_checklist"]) == 3
    finally:
        db.close()
