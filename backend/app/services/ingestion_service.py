"""Dataset file ingestion, format detection, and semantic mapping service.

Supports CSV, Excel (.xlsx/.xls), JSON, and Parquet (.parquet).
Provides secure file handling, streaming parsing, column type inference,
and fuzzy semantic column mapping.
"""

import os
import re
import csv
import json
from pathlib import Path
from typing import Any
import pyarrow.parquet as pq
import openpyxl

from app.schemas.dataset import ColumnMetadata, DatasetProfile, TARGET_SEMANTIC_FIELDS

_backend_root = Path(__file__).resolve().parent.parent.parent
UPLOAD_BASE_DIR = _backend_root / "data" / "uploads"
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB per file limit
PREVIEW_ROW_LIMIT = 20

# Semantic aliases mapping target canonical field to common enterprise column names
SEMANTIC_ALIASES: dict[str, list[str]] = {
    "store_id": [
        "store_id", "store", "store_code", "store_num", "store_number",
        "location_id", "location", "outlet_id", "branch_id", "site_id",
        "store_no", "unit_id", "shop_id", "warehouse_id", "storeid"
    ],
    "sku_id": [
        "sku_id", "sku", "product_id", "product_code", "item_id", "item_code",
        "article_id", "upc", "ean", "product", "item_no", "material_id",
        "item_num", "sku_code", "skuid", "barcode"
    ],
    "date": [
        "date", "business_date", "transaction_date", "sales_date", "day",
        "dt", "trans_date", "report_date", "record_date", "calendar_date",
        "date_id", "timestamp"
    ],
    "sales": [
        "sales", "units_sold", "quantity_sold", "qty_sold", "pos_sales",
        "volume", "qty", "units", "sold_units", "daily_sales", "register_sales",
        "unitsold", "sales_qty", "sales_units", "sold_quantity"
    ],
    "on_hand_stock": [
        "on_hand_stock", "on_hand", "inventory", "stock", "recorded_stock",
        "system_stock", "stock_on_hand", "soh", "current_stock", "erp_stock",
        "ledger_stock", "onhand", "qoh", "quantity_on_hand", "stock_qty"
    ],
    "is_promotion": [
        "is_promotion", "promotion", "promo", "promo_flag", "is_promo",
        "on_promotion", "deal", "discount_active", "campaign", "promo_event"
    ],
    "is_holiday": [
        "is_holiday", "holiday", "holiday_flag", "bank_holiday", "public_holiday",
        "festival", "closed_day"
    ],
    "product_name": [
        "product_name", "item_name", "name", "description", "desc",
        "sku_name", "title", "product_desc", "item_description", "prod_name"
    ],
    "category": [
        "category", "department", "dept", "cat", "group", "class",
        "merchandise_group", "prod_category", "product_line"
    ],
    "price": [
        "price", "unit_price", "retail_price", "selling_price", "mrp",
        "rate", "regular_price", "unit_price_inr"
    ],
    "cost": [
        "cost", "unit_cost", "cost_price", "cogs", "wholesale_price",
        "purchase_cost", "unit_cost_inr", "landing_cost"
    ],
    "shelf_bay": [
        "shelf_bay", "aisle", "bay", "shelf", "location_bay", "bin",
        "planogram_loc", "shelf_location", "facing"
    ],
    "store_name": [
        "store_name", "branch_name", "outlet_name", "location_name", "store_desc"
    ],
    "city_tier": [
        "city_tier", "tier", "city", "region", "market_tier", "format_tier"
    ],
    "is_phantom_stockout": [
        "is_phantom_stockout", "phantom_stockout", "phantom", "ground_truth",
        "is_anomaly", "true_phantom", "label", "target", "verified_anomaly"
    ],
}


def sanitize_filename(filename: str) -> str:
    """Safely sanitizes a filename to prevent path traversal and shell injection."""
    cleaned = Path(filename).name
    # Keep only alphanumeric, dots, hyphens, and underscores
    sanitized = re.sub(r"[^a-zA-Z0-9_.-]", "_", cleaned)
    return sanitized or "uploaded_file.dat"


def get_dataset_storage_dir(dataset_id: str) -> Path:
    """Returns the dedicated secure directory for a dataset."""
    path = UPLOAD_BASE_DIR / dataset_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def infer_type_of_value(val: Any) -> str:
    """Classifies a Python value or string into a standard data type."""
    if val is None or val == "" or str(val).strip().lower() in ("nan", "null", "none"):
        return "null"
    if isinstance(val, bool):
        return "boolean"
    if isinstance(val, int):
        return "integer"
    if isinstance(val, float):
        return "float"

    s = str(val).strip()
    if s.lower() in ("true", "false", "yes", "no", "1", "0"):
        return "boolean"

    # Integer pattern
    if re.fullmatch(r"-?\d+", s):
        return "integer"

    # Float pattern
    if re.fullmatch(r"-?\d+\.\d+", s):
        return "float"

    # Date pattern (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY)
    if re.fullmatch(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}", s) or re.fullmatch(r"\d{1,2}[-/]\d{1,2}[-/]\d{4}", s):
        return "date"

    return "string"


def normalize_col_name(col: str) -> str:
    """Normalizes column names for semantic matching (lowercase, alphanumeric)."""
    return re.sub(r"[^a-z0-9]", "", col.lower())


def infer_semantic_mapping(columns: list[str]) -> dict[str, tuple[str | None, float]]:
    """
    Given a list of source columns, infers likely mappings to canonical target fields.
    Returns: dict { source_column: (target_field_name, confidence) }
    """
    mapping: dict[str, tuple[str | None, float]] = {}
    assigned_targets: set[str] = set()

    # Pass 1: Exact matches
    for col in columns:
        clean = normalize_col_name(col)
        for target, aliases in SEMANTIC_ALIASES.items():
            if target in assigned_targets:
                continue
            clean_aliases = [normalize_col_name(a) for a in aliases]
            if clean in clean_aliases:
                confidence = 1.0 if clean == normalize_col_name(target) else 0.95
                mapping[col] = (target, confidence)
                assigned_targets.add(target)
                break

    # Pass 2: Substring matches for unmapped columns
    for col in columns:
        if col in mapping:
            continue
        clean = normalize_col_name(col)
        best_target = None
        best_conf = 0.0

        for target, aliases in SEMANTIC_ALIASES.items():
            if target in assigned_targets:
                continue
            clean_aliases = [normalize_col_name(a) for a in aliases]
            for a in clean_aliases:
                if len(a) >= 3 and (a in clean or clean in a):
                    conf = 0.75 if a in clean else 0.6
                    if conf > best_conf:
                        best_conf = conf
                        best_target = target

        if best_target and best_conf >= 0.6:
            mapping[col] = (best_target, best_conf)
            assigned_targets.add(best_target)
        else:
            mapping[col] = (None, 0.0)

    return mapping


def read_file_records(
    file_path: Path,
    max_rows: int | None = None,
) -> tuple[list[str], list[dict[str, Any]], int]:
    """
    Reads records from CSV, XLSX, JSON, or Parquet.
    Returns: (columns_list, list_of_row_dicts, total_row_count)
    """
    suffix = file_path.suffix.lower()

    if suffix in (".csv", ".txt", ".tsv"):
        return _read_csv(file_path, max_rows)
    elif suffix in (".xlsx", ".xls"):
        return _read_excel(file_path, max_rows)
    elif suffix == ".json":
        return _read_json(file_path, max_rows)
    elif suffix == ".parquet":
        return _read_parquet(file_path, max_rows)
    else:
        raise ValueError(f"Unsupported file format: {suffix}. Supported: .csv, .xlsx, .xls, .json, .parquet")


def _read_csv(file_path: Path, max_rows: int | None = None) -> tuple[list[str], list[dict[str, Any]], int]:
    encodings = ["utf-8", "utf-8-sig", "latin-1"]
    content = None
    used_encoding = "utf-8"

    for enc in encodings:
        try:
            with open(file_path, mode="r", encoding=enc, errors="strict") as f:
                content = f.read(1024 * 64)
                used_encoding = enc
                break
        except (UnicodeDecodeError, UnicodeError):
            continue

    if content is None:
        raise ValueError(f"Unable to decode CSV file {file_path.name} with standard encodings.")

    # Sniff delimiter
    try:
        dialect = csv.Sniffer().sniff(content, delimiters=[",", ";", "\t", "|"])
        delimiter = dialect.delimiter
    except Exception:
        delimiter = ","

    with open(file_path, mode="r", encoding=used_encoding, errors="replace") as f:
        reader = csv.reader(f, delimiter=delimiter)
        try:
            headers = [h.strip() for h in next(reader)]
        except StopIteration:
            return [], [], 0

        rows = []
        total_count = 0
        for row in reader:
            total_count += 1
            if max_rows is None or len(rows) < max_rows:
                # Pad row if short
                if len(row) < len(headers):
                    row += [""] * (len(headers) - len(row))
                row_dict = {headers[i]: row[i].strip() for i in range(len(headers))}
                rows.append(row_dict)

        return headers, rows, total_count


def _read_excel(file_path: Path, max_rows: int | None = None) -> tuple[list[str], list[dict[str, Any]], int]:
    wb = openpyxl.load_workbook(filename=file_path, read_only=True, data_only=True)
    ws = wb.active
    if not ws:
        return [], [], 0

    rows_iter = ws.iter_rows(values_only=True)
    try:
        first_row = next(rows_iter)
        headers = [str(cell).strip() if cell is not None else f"col_{idx}" for idx, cell in enumerate(first_row)]
    except StopIteration:
        wb.close()
        return [], [], 0

    rows = []
    total_count = 0
    for r in rows_iter:
        total_count += 1
        if max_rows is None or len(rows) < max_rows:
            row_dict = {}
            for i, val in enumerate(r):
                if i < len(headers):
                    row_dict[headers[i]] = val if val is not None else ""
            rows.append(row_dict)

    wb.close()
    return headers, rows, total_count


def _read_json(file_path: Path, max_rows: int | None = None) -> tuple[list[str], list[dict[str, Any]], int]:
    with open(file_path, mode="r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict):
        for candidate_key in ["records", "data", "rows", "items"]:
            if candidate_key in data and isinstance(data[candidate_key], list):
                data = data[candidate_key]
                break
        else:
            # Single object or dict of objects
            data = [data]

    if not isinstance(data, list) or not data:
        return [], [], 0

    # Collect all unique headers across the sample
    headers_set = {}
    for item in data[:100]:
        if isinstance(item, dict):
            for k in item.keys():
                headers_set[k] = None
    headers = list(headers_set.keys())

    total_count = len(data)
    sample = data[:max_rows] if max_rows else data
    cleaned_rows = []
    for item in sample:
        if isinstance(item, dict):
            cleaned_rows.append({h: item.get(h, "") for h in headers})

    return headers, cleaned_rows, total_count


def _read_parquet(file_path: Path, max_rows: int | None = None) -> tuple[list[str], list[dict[str, Any]], int]:
    table = pq.read_table(str(file_path))
    headers = table.column_names
    total_count = table.num_rows

    if max_rows and max_rows < total_count:
        sub_table = table.slice(0, max_rows)
    else:
        sub_table = table

    pydict = sub_table.to_pydict()
    rows = []
    num_sample = len(next(iter(pydict.values()))) if pydict else 0

    for i in range(num_sample):
        row_dict = {col: pydict[col][i] for col in headers}
        rows.append(row_dict)

    return headers, rows, total_count


def profile_raw_dataset(
    file_path: Path,
    sample_preview_limit: int = PREVIEW_ROW_LIMIT,
) -> DatasetProfile:
    """
    Analyzes an uploaded raw file, inspects column nulls, types,
    computes sample preview, and infers likely target mappings.
    """
    headers, rows, total_rows = read_file_records(file_path, max_rows=sample_preview_limit)
    if not headers:
        return DatasetProfile(row_count=0, column_count=0)

    mappings = infer_semantic_mapping(headers)

    columns_meta: list[ColumnMetadata] = []
    missing_summary: dict[str, float] = {}

    for h in headers:
        target_field, conf = mappings.get(h, (None, 0.0))
        sample_vals = [r[h] for r in rows if r.get(h) not in (None, "")]
        null_count_sample = len(rows) - len(sample_vals)
        null_pct = round((null_count_sample / len(rows) * 100), 2) if rows else 0.0

        types_detected = [infer_type_of_value(v) for v in sample_vals[:10]]
        # Majority type
        detected_type = "string"
        if types_detected:
            from collections import Counter
            counts = Counter(types_detected)
            detected_type = counts.most_common(1)[0][0]

        is_req = target_field in ("store_id", "sku_id", "date", "sales", "on_hand_stock")

        meta = ColumnMetadata(
            name=h,
            detected_type=detected_type,
            data_type=detected_type,
            null_count=null_count_sample,
            null_percentage=null_pct,
            sample_values=sample_vals[:5],
            inferred_target_field=target_field,
            inferred_target=target_field,
            mapping_confidence=conf,
            confidence=conf,
            is_required=is_req,
        )
        columns_meta.append(meta)
        missing_summary[h] = null_pct

    # Estimate stores, skus, date range from sample if mapped
    store_col = next((h for h in headers if mappings.get(h, (None, 0))[0] == "store_id"), None)
    sku_col = next((h for h in headers if mappings.get(h, (None, 0))[0] == "sku_id"), None)
    date_col = next((h for h in headers if mappings.get(h, (None, 0))[0] == "date"), None)

    store_count = len(set(r[store_col] for r in rows if store_col and r.get(store_col))) if store_col else 0
    sku_count = len(set(r[sku_col] for r in rows if sku_col and r.get(sku_col))) if sku_col else 0

    date_range = None
    if date_col:
        dates = [str(r[date_col]) for r in rows if r.get(date_col)]
        if dates:
            date_range = [min(dates), max(dates)]

    suggested = {col.name: col.inferred_target_field for col in columns_meta if col.inferred_target_field}
    conf_map = {col.name: col.mapping_confidence for col in columns_meta if col.mapping_confidence}
    file_size = file_path.stat().st_size if file_path.exists() else 0

    files_wrap = [{
        "file_id": file_path.name,
        "file_name": file_path.name,
        "file_type": file_path.suffix.upper().replace(".", "") or "CSV",
        "file_size_bytes": file_size,
        "row_count": total_rows,
        "columns": [c.model_dump() for c in columns_meta],
    }]

    return DatasetProfile(
        row_count=total_rows,
        total_raw_rows=total_rows,
        column_count=len(headers),
        file_count=1,
        columns=columns_meta,
        files=files_wrap,
        date_range=date_range,
        store_count=store_count,
        sku_count=sku_count,
        missing_value_summary=missing_summary,
        duplicate_rows_count=0,
        sample_preview=rows[:sample_preview_limit],
        suggested_mappings=suggested,
        mapping_confidence=conf_map,
    )
