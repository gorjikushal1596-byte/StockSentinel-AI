"""Pydantic schemas for evaluation and benchmark scoring against hidden labels."""

from pydantic import BaseModel, Field


class StoreEvaluationMetric(BaseModel):
    store_id: str
    store_name: str | None = None
    top20_findings_count: int
    true_positives_in_top20: int
    precision_at_20: float = Field(..., description="True positives in top 20 / min(20, returned)")
    total_hidden_positives: int
    recall_at_20: float = Field(..., description="True positives in top 20 / total hidden positives")


class EvaluationResponse(BaseModel):
    available: bool
    evaluation_date: str | None = None
    message: str
    dataset_scope: str | None = None
    mean_precision_at_20: float | None = None
    overall_recall: float | None = None
    total_stores_evaluated: int = 0
    total_findings_evaluated: int = 0
    total_true_positives: int = 0
    total_ground_truth_positives: int = 0
    per_store_metrics: list[StoreEvaluationMetric] = []
    evaluation_rules: list[str] = [
        "Strictly evaluated on top-20 findings per store-day",
        "Precision@20 = TP_in_top20 / returned_in_top20 (denominator=20 for full lists)",
        "Recall = TP_in_top20 / total_eligible_ground_truth_positives",
        "Hidden labels held back and never leaked into detector features",
    ]
