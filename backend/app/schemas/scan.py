"""Pydantic schemas for scan requests, responses, and histories."""

from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from backend.app.schemas.finding import FindingResponse


class ScanRequest(BaseModel):
    evaluation_date: str = Field(..., description="Target date in YYYY-MM-DD format")
    dataset_id: str | None = Field(None, description="Optional dataset ID. If null, scans active/all dataset records.")
    store_id: str | None = Field(None, description="Optional store filter. If null, scans all stores.")
    threshold_days: int = Field(3, ge=1, le=30, description="Minimum consecutive zero-sales days threshold")
    confidence_cutoff: float = Field(50.0, ge=0.0, le=100.0, description="Minimum confidence cutoff")
    max_findings_per_store: int = Field(20, ge=1, le=50, description="Hard cap per store-day (PDF requires <= 20)")


class ScanSummary(BaseModel):
    scan_id: str
    dataset_id: str | None = None
    evaluation_date: str
    status: str
    threshold_days: int
    created_at: datetime
    total_evaluated: int
    flagged_count: int
    stores_covered: int
    model_config = ConfigDict(from_attributes=True)


class ScanResponse(ScanSummary):
    findings: list[FindingResponse] = []
