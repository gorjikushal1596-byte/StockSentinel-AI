"""Pydantic schemas for findings, evidence, and status updates."""

from typing import Literal
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.inventory import TimeSeriesPoint

SeverityType = Literal["CRITICAL", "HIGH", "ROUTINE"]
FindingStatusType = Literal["pending", "verified", "false_positive", "unresolved"]
AnomalyType = Literal["phantom_stockout", "misplaced", "delisted", "unclassified"]


class FindingResponse(BaseModel):
    finding_id: str
    scan_id: str
    dataset_id: str | None = None
    store_id: str
    store_name: str | None = None
    sku_id: str
    product_name: str | None = None
    category: str | None = None
    shelf_bay: str | None = None
    unit_price: float | None = None
    rank: int
    evaluation_date: str
    recorded_stock: int
    consecutive_zero_days: int
    historical_daily_velocity: float
    confidence_score: float = Field(..., ge=0, le=100)
    severity: SeverityType
    anomaly_type: AnomalyType
    explanation: str
    status: FindingStatusType
    time_series: list[TimeSeriesPoint] = []
    model_config = ConfigDict(from_attributes=True)


class FindingStatusUpdate(BaseModel):
    status: FindingStatusType = Field(..., description="New verification status")
    notes: str | None = Field(None, description="Optional operational notes from store audit")


class EvidenceSignal(BaseModel):
    name: str
    value: str
    status: Literal["alert", "normal", "info"]
    detail: str


class EvidenceResponse(BaseModel):
    finding_id: str
    store_id: str
    store_name: str | None = None
    sku_id: str
    product_name: str | None = None
    category: str | None = None
    shelf_bay: str | None = None
    unit_price: float | None = None
    evaluation_date: str
    recorded_stock: int
    consecutive_zero_days: int
    confidence_score: float
    severity: SeverityType
    anomaly_type: AnomalyType
    explanation: str
    signals: list[EvidenceSignal]
    time_series: list[TimeSeriesPoint]
    detection_algorithm: str = "Poisson-Bayes Velocity Collapse Engine v1.2"
    ranking_formula: str = "Rank = Unit_Price * Historical_Daily_Velocity * Confidence"
