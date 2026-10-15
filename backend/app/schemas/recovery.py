"""Pydantic schemas for empirical revenue recovery and business impact calculations."""

from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class MetricSourceType(str, Enum):
    MEASURED = "MEASURED"
    ESTIMATED = "ESTIMATED"
    ASSUMED = "ASSUMED"


class VisibleFormulaStep(BaseModel):
    step_number: int
    title: str
    formula: str
    substituted: str
    result_text: str
    source_type: MetricSourceType = MetricSourceType.ESTIMATED
    note: str


class MissingInputPrompt(BaseModel):
    field_key: str
    label: str
    question: str
    default_assumption: float | str
    current_value: float | str | None
    unit: str
    why_needed: str


class RecoveryEstimateRequest(BaseModel):
    # Optional selectors to derive values from actual database scan & dataset
    dataset_id: str | None = Field(None, description="Target dataset ID")
    scan_id: str | None = Field(None, description="Target scan ID")
    evaluation_date: str | None = Field(None, description="Evaluation date in YYYY-MM-DD format")

    # Editable operational assumptions
    store_count: int | None = Field(None, ge=1, le=1000, description="Total stores in retail network (auto-detected if None)")
    avg_price_inr: float | None = Field(None, gt=0, description="Average unit retail price in INR (auto-detected if None)")
    incidents_per_store_month: int | None = Field(None, ge=1, le=100, description="Expected monthly phantom stockout incidents per store")
    days_saved_per_incident: float | None = Field(None, ge=0.5, le=30.0, description="Days saved (standard audit 11d vs Sentinel detection in 2d = 9d)")
    daily_sales_velocity: float | None = Field(None, gt=0, le=50.0, description="Average daily sales velocity of affected items (auto-detected if None)")
    recovery_capture_rate: float | None = Field(None, ge=1.0, le=100.0, description="Percentage of potential demand captured upon physical restock")
    gross_margin_percent: float | None = Field(None, ge=1.0, le=100.0, description="User-supplied gross margin % if cost is unmapped")
    unverified_conversion_rate: float | None = Field(None, ge=0.0, le=100.0, description="Assumed precision/conversion % for pending unverified findings")
    annualization_enabled: bool = Field(True, description="Whether to compute annualized estimates based on network incident rate")


class RecoveryArithmeticBreakdown(BaseModel):
    step_1_formula: str = "Recoverable Units / Incident = Days_Saved * Daily_Velocity * (Capture_Rate / 100)"
    step_1_units_per_incident: float
    step_2_formula: str = "Gross Revenue / Incident = Recoverable_Units * Avg_Price_INR"
    step_2_revenue_per_incident_inr: float
    step_3_formula: str = "Total Annual Incidents = Store_Count * Incidents_Per_Store_Month * 12"
    step_3_annual_incidents: int
    step_4_formula: str = "Annual Revenue Protected = Total_Annual_Incidents * Gross_Revenue_Per_Incident"
    step_4_annual_revenue_protected_inr: float
    step_5_formula: str = "Estimated Gross Margin Saved = Annual_Revenue_Protected * (Gross_Margin / 100)"
    step_5_annual_margin_saved_inr: float
    per_store_annual_revenue_inr: float


class RecoveryEstimateResponse(BaseModel):
    currency: str = "INR"
    currency_symbol: str = "₹"

    # Context & Association
    dataset_id: str | None = None
    dataset_name: str | None = None
    scan_id: str | None = None
    evaluation_date: str | None = None

    # 1. Findings and Verified Findings Breakdown [MEASURED]
    total_findings_count: int = 0
    verified_findings_count: int = 0
    false_positive_count: int = 0
    pending_verification_count: int = 0
    inspected_count: int = 0
    measured_verification_rate_percent: float | None = None
    effective_conversion_rate_percent: float = 60.0
    is_conversion_rate_assumed: bool = True

    # Master Data Detection Status [MEASURED]
    has_cost_data: bool = False
    has_price_data: bool = True
    detected_avg_selling_price: float = 0.0
    detected_avg_unit_cost: float | None = None
    detected_gross_margin_percent: float | None = None
    margin_source: MetricSourceType = MetricSourceType.ASSUMED

    # 2. Estimated Recoverable Units [ESTIMATED via Documented Method]
    total_ledger_units_flagged: int = 0
    estimated_recoverable_units: float = 0.0
    recoverable_units_method: str = (
        "Sum of Weight_i * min(Stock_i, Days_Saved * Velocity_i * (Capture_Rate / 100)) "
        "where Weight = 1.0 for verified, 0.0 for false positives, and conversion rate for pending."
    )

    # 3. Potential Revenue at Risk [ESTIMATED]
    potential_units_at_risk: float = 0.0
    potential_revenue_at_risk: float = 0.0
    revenue_at_risk_method: str = (
        "Sum of min(Stock_i, Days_Saved * Velocity_i) * Unit_Price_i across all flagged findings."
    )

    # 4. Estimated Recoverable Revenue [ESTIMATED]
    estimated_recoverable_revenue: float = 0.0
    recoverable_revenue_method: str = (
        "Sum of Estimated_Recoverable_Units_i * Unit_Price_i across findings."
    )

    # 5. Estimated Profit Impact [ESTIMATED, only when cost or margin data is available]
    has_profit_impact: bool = False
    estimated_profit_impact: float | None = None
    profit_impact_method: str = (
        "If unit cost is mapped: Sum of Recoverable_Units_i * (Price_i - Cost_i). "
        "Else if margin is assumed: Recoverable_Revenue * (Gross_Margin_Percent / 100)."
    )
    missing_cost_note: str | None = None

    # 6. Annualized Estimates [only when observation period and assumptions justify]
    can_annualize: bool = False
    annualization_basis: str = ""
    annualization_multiplier: float = 0.0
    annualized_recoverable_revenue: float | None = None
    annualized_profit_impact: float | None = None
    annualized_total_incidents: int | None = None
    annualized_methodology: str = ""

    # Substituted Step-by-Step Visible Formulas
    visible_formula_steps: list[VisibleFormulaStep] = []

    # Missing Input Prompts & Assumptions
    missing_input_prompts: list[MissingInputPrompt] = []
    assumptions_applied: dict[str, Any] = {}
    persisted_assumptions: dict[str, Any] = {}

    # Observation window & Scope
    stores_count: int = 1
    observation_period_days: int | None = None
    observation_start_date: str | None = None
    observation_end_date: str | None = None

    # Legacy & Compatibility Fields
    annual_revenue_protected_inr: float = 0.0
    annual_margin_saved_inr: float = 0.0
    per_store_annual_recovery_inr: float = 0.0
    total_annual_rupees_recovered: float | None = None
    per_store_annual_recovery: float | None = None
    total_annual_incidents: int | None = None
    units_saved_per_incident: float | None = None
    rupees_recovered_per_incident: float | None = None
    arithmetic_steps: list[str] = []
    assumptions: dict[str, Any] = {}
    arithmetic: RecoveryArithmeticBreakdown
    distinction_notes: list[str] = [
        "Measured values are drawn directly from the active dataset, store catalog, and scan findings.",
        "Estimated recoverable units are bounded by ledger stock and discounted by customer capture rate.",
        "Profit impact is derived directly from SKU unit costs when present, or explicitly marked as assumed margin.",
        "Annualization is projected from network store count and historical monthly incident frequencies.",
    ]
    methodology_notes: list[str] = [
        "Flagged anomalies are never equated with confirmed recoveries; uninspected items use a distinct conversion weight.",
        "Negative quantities are excluded from recoverable calculations.",
        "Poisson inter-arrival rates prevent slow-moving false alarms from exaggerating potential revenue.",
    ]


class PersistAssumptionsRequest(BaseModel):
    dataset_id: str | None = None
    scan_id: str | None = None
    evaluation_date: str
    days_saved_per_incident: float | None = None
    recovery_capture_rate: float | None = None
    gross_margin_percent: float | None = None
    unverified_conversion_rate: float | None = None
    incidents_per_store_month: int | None = None
