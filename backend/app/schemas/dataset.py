"""Pydantic schemas for dataset upload, column mapping, validation, and profiling."""

from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field, ConfigDict

DuplicatePolicyType = Literal["error", "keep_first", "keep_last", "aggregate_sum"]
ValidationLevel = Literal["error", "warning", "info"]

TARGET_SEMANTIC_FIELDS = {
    "store_id": "Store Identifier (Required)",
    "sku_id": "SKU / Product Identifier (Required)",
    "date": "Business Date (Required, YYYY-MM-DD)",
    "sales": "Daily POS Units Sold (Required, non-negative)",
    "on_hand_stock": "Recorded Ledger Inventory (Required, positive)",
    "is_promotion": "Promotion Active Indicator (Optional)",
    "is_holiday": "Holiday Active Indicator (Optional)",
    "product_name": "Product Name / Title (Optional)",
    "category": "Merchandise Category (Optional)",
    "price": "Unit Retail Price in INR (Optional)",
    "cost": "Unit Cost Price in INR (Optional, for Profit Impact)",
    "shelf_bay": "Aisle / Shelf / Bay Planogram Location (Optional)",
    "store_name": "Store Name / Description (Optional)",
    "city_tier": "Store City Tier (Optional)",
    "is_phantom_stockout": "Hidden Ground-Truth Label (Optional, for evaluate.py only)",
}


class ColumnMetadata(BaseModel):
    name: str
    detected_type: str = "string"  # integer, float, date, boolean, string
    data_type: str = "string"  # alias for frontend
    null_count: int = 0
    null_percentage: float = 0.0
    sample_values: list[Any] = []
    inferred_target_field: str | None = None
    inferred_target: str | None = None  # alias
    mapping_confidence: float = 0.0
    confidence: float = 0.0  # alias
    is_required: bool = False
    model_config = ConfigDict(from_attributes=True)


class ColumnMappingRequest(BaseModel):
    """Payload to confirm or adjust semantic column mappings."""
    mappings: dict[str, str] = Field(
        ...,
        description="Dictionary mapping target semantic field to source column name. e.g. {'store_id': 'Store', 'sales': 'Units'}",
    )
    duplicate_policy: DuplicatePolicyType = Field(
        default="keep_first",
        description="Policy when identical (store_id, sku_id, date) tuples appear: error, keep_first, keep_last, aggregate_sum",
    )
    date_format: str | None = Field(
        default=None,
        description="Optional explicit strftime date format (e.g. '%Y-%m-%d', '%d/%m/%Y')",
    )


class DatasetActionRequest(BaseModel):
    """Payload for validation and import actions sent from frontend."""
    duplicate_policy: DuplicatePolicyType = "keep_first"
    date_format: str | None = None


class ValidationIssue(BaseModel):
    level: ValidationLevel = "info"
    severity: str = "info"  # alias for frontend (error, warning, info)
    category: str = "general"
    row_number: int | None = None
    row_index: int | None = None  # alias
    field: str | None = None
    column: str | None = None  # alias
    message: str
    raw_value: str | None = None
    details: dict[str, Any] | None = None


class DatasetProfile(BaseModel):
    dataset_id: str | None = None
    name: str | None = None
    row_count: int = 0
    total_raw_rows: int = 0  # alias for frontend
    column_count: int = 0
    file_count: int = 1
    columns: list[ColumnMetadata] = []
    files: list[dict[str, Any]] = []  # file wrappers with columns for frontend
    date_range: list[str] | None = None  # [min_date, max_date]
    store_count: int = 0
    sku_count: int = 0
    missing_value_summary: dict[str, float] = {}
    duplicate_rows_count: int = 0
    sales_summary: dict[str, float] | None = None
    inventory_summary: dict[str, float] | None = None
    sample_preview: list[dict[str, Any]] = []
    suggested_mappings: dict[str, str] = {}
    mapping_confidence: dict[str, float] = {}


class ValidationReport(BaseModel):
    dataset_id: str | None = None
    is_valid: bool = True
    valid: bool = True  # alias for frontend
    can_import: bool = True
    total_rows: int = 0
    valid_rows: int = 0
    error_rows: int = 0
    error_count: int = 0
    warning_count: int = 0
    info_count: int = 0
    duplicate_rows: int = 0
    missing_dates_count: int = 0
    date_range_start: str | None = None
    date_range_end: str | None = None
    unique_stores_count: int = 0
    unique_skus_count: int = 0
    issues: list[ValidationIssue] = []
    preview_sample: list[dict[str, Any]] = []
    has_ground_truth: bool = False
    profile: DatasetProfile | None = None
    confirmed_mapping: dict[str, str] = {}


class DatasetFileItem(BaseModel):
    filename: str
    file_format: str
    file_size_bytes: int
    row_count: int
    detected_role: str
    model_config = ConfigDict(from_attributes=True)


class DatasetResponse(BaseModel):
    dataset_id: str
    name: str
    file_format: str
    status: str
    row_count: int
    column_count: int
    file_size_bytes: int
    created_at: datetime
    imported_at: datetime | None = None
    confirmed_mapping: dict[str, str] | None = None
    files: list[DatasetFileItem] = []
    validation_summary: dict[str, Any] | None = None
    profile: DatasetProfile | None = None
    total_records: int = 0
    stores_count: int = 0
    skus_count: int = 0
    start_date: str | None = None
    end_date: str | None = None
    has_ground_truth: bool = False
    model_config = ConfigDict(from_attributes=True)


class ImportResult(BaseModel):
    dataset_id: str
    status: str
    records_imported: int = 0
    stores_imported: int = 0
    skus_imported: int = 0
    labels_imported: int = 0
    imported_records: int = 0  # alias for frontend
    imported_stores: int = 0  # alias for frontend
    imported_skus: int = 0  # alias for frontend
    imported_labels: int = 0  # alias for frontend
    warnings_count: int = 0
    date_range_start: str | None = None
    date_range_end: str | None = None
    message: str
