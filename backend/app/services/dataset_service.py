"""Dataset management and ingestion orchestration service.

Handles multi-format dataset creation, column mapping confirmation,
validation reporting, and transaction-safe chunked batch importing.
"""

import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any
from fastapi import UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from backend.app.db.models import (
    Dataset,
    DatasetFile,
    Store,
    SKU,
    DailyRecord,
    GroundTruthLabel,
)
from backend.app.schemas.dataset import (
    DatasetResponse,
    DatasetProfile,
    ValidationReport,
    ImportResult,
    ColumnMappingRequest,
)
from backend.app.services.ingestion_service import (
    sanitize_filename,
    get_dataset_storage_dir,
    profile_raw_dataset,
    infer_semantic_mapping,
    read_file_records,
)
from backend.app.services.validation_service import validate_dataset_records


class DatasetService:
    """Orchestrates datasets ingestion, validation, and database synchronization."""

    def __init__(self, db: Session):
        self.db = db

    async def save_uploaded_dataset(
        self,
        files: list[UploadFile],
        dataset_name: str | None = None,
    ) -> Dataset:
        """
        Saves one or more uploaded files to disk in an isolated folder,
        inspects formats, infers mappings, and creates Dataset tracking records.
        """
        if not files:
            raise ValueError("No files provided for upload.")

        dataset_id = f"DS_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        upload_dir = get_dataset_storage_dir(dataset_id)

        daily_candidate = None
        dataset_files_records = []
        total_size = 0
        for file in files:
            clean_name = sanitize_filename(file.filename or "data.csv")
            dest_path = upload_dir / clean_name

            file_bytes = await file.read()
            total_size += len(file_bytes)

            with open(dest_path, "wb") as f:
                f.write(file_bytes)

            fmt = dest_path.suffix.upper().replace(".", "") or "CSV"
            try:
                headers, _, count = read_file_records(dest_path, max_rows=1)
            except Exception:
                headers, count = [], 0

            lower_name = clean_name.lower()
            lower_headers = [h.lower() for h in headers]
            role = "daily_records"
            if "store" in lower_name or "store_name" in lower_headers:
                role = "store_master"
            elif "sku" in lower_name or "product_name" in lower_headers or any("cost" in h for h in lower_headers):
                role = "sku_master"
            elif "promo" in lower_name:
                role = "promo_calendar"
            elif "ground_truth" in lower_name or "label" in lower_name:
                role = "ground_truth"
            elif "daily" in lower_name or "sales" in lower_name or "units_sold" in lower_headers:
                role = "daily_records"

            if (role == "daily_records" or "daily" in lower_name) and daily_candidate is None:
                daily_candidate = (dest_path, fmt)

            dataset_files_records.append(
                DatasetFile(
                    dataset_id=dataset_id,
                    filename=clean_name,
                    file_format=fmt,
                    file_path=str(dest_path.resolve()),
                    file_size_bytes=len(file_bytes),
                    row_count=count,
                    columns_json=json.dumps(headers),
                    detected_role=role,
                )
            )

        if daily_candidate:
            primary_file_path, primary_format = daily_candidate
        elif dataset_files_records:
            primary_file_path = Path(dataset_files_records[0].file_path)
            primary_format = dataset_files_records[0].file_format
        else:
            raise ValueError("No files uploaded.")

        name = dataset_name or (files[0].filename or dataset_id)
        file_format = primary_format if len(files) == 1 else "MULTI"

        # Generate initial profile on primary file
        profile = profile_raw_dataset(primary_file_path)
        profile.dataset_id = dataset_id
        profile.name = name
        inferred_mappings = {col.name: col.inferred_target_field for col in profile.columns if col.inferred_target_field}

        dataset = Dataset(
            dataset_id=dataset_id,
            name=name,
            file_format=file_format,
            file_path=str(primary_file_path.resolve()),
            file_size_bytes=total_size,
            status="uploaded",
            row_count=profile.row_count,
            column_count=profile.column_count,
            detected_schema_json=json.dumps(profile.model_dump(), default=str),
            confirmed_mapping_json=json.dumps(inferred_mappings),
            validation_report_json=None,
            created_at=datetime.utcnow(),
        )

        self.db.add(dataset)
        for df in dataset_files_records:
            self.db.add(df)
        self.db.commit()
        self.db.refresh(dataset)

        return dataset

    def get_dataset(self, dataset_id: str) -> Dataset | None:
        return self.db.get(Dataset, dataset_id)

    def list_datasets(self) -> list[Dataset]:
        return list(self.db.scalars(select(Dataset).order_by(Dataset.created_at.desc())).all())

    def update_mapping(self, dataset_id: str, mapping_request: ColumnMappingRequest) -> Dataset:
        dataset = self.get_dataset(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found.")

        dataset.confirmed_mapping_json = json.dumps(mapping_request.mappings)
        dataset.status = "mapped"
        self.db.commit()
        self.db.refresh(dataset)
        return dataset

    def validate_dataset(
        self,
        dataset_id: str,
        duplicate_policy: str = "keep_first",
        date_format: str | None = None,
    ) -> ValidationReport:
        dataset = self.get_dataset(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found.")

        mapping = json.loads(dataset.confirmed_mapping_json or "{}")
        file_path = Path(dataset.file_path)

        report, _ = validate_dataset_records(
            file_path=file_path,
            mapping=mapping,
            duplicate_policy=duplicate_policy,  # type: ignore
            explicit_date_format=date_format,
        )

        dataset.validation_report_json = json.dumps(report.model_dump(), default=str)
        dataset.status = "validated" if report.can_import else "validation_error"
        self.db.commit()

        return report

    def import_dataset(
        self,
        dataset_id: str,
        duplicate_policy: str = "keep_first",
        date_format: str | None = None,
    ) -> ImportResult:
        dataset = self.get_dataset(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found.")

        mapping = json.loads(dataset.confirmed_mapping_json or "{}")
        file_path = Path(dataset.file_path)

        report, clean_records = validate_dataset_records(
            file_path=file_path,
            mapping=mapping,
            duplicate_policy=duplicate_policy,  # type: ignore
            explicit_date_format=date_format,
        )

        if not report.can_import or not clean_records:
            errors_summary = "; ".join([i.message for i in report.issues if i.level == "error"][:3])
            raise ValueError(f"Cannot import invalid dataset. Validation errors: {errors_summary or 'No valid records'}")

        # Check for companion metadata files in dataset files
        store_meta_map: dict[str, dict[str, Any]] = {}
        sku_meta_map: dict[str, dict[str, Any]] = {}
        labels_to_insert: list[GroundTruthLabel] = []

        for df in dataset.files:
            df_path = Path(df.file_path)
            if not df_path.exists():
                continue

            # Store Master enrichment
            if df.detected_role == "store_master" or "store" in df.filename.lower():
                try:
                    _, s_rows, _ = read_file_records(df_path)
                    for srow in s_rows:
                        sid = str(srow.get("store_id", "")).strip()
                        if sid:
                            store_meta_map[sid] = {
                                "name": str(srow.get("store_name") or f"Store {sid}").strip(),
                                "city_tier": str(srow.get("city_tier") or "Tier-1").strip(),
                                "format": str(srow.get("store_format") or "Supermarket").strip(),
                                "size_sqft": int(srow.get("store_size_sqft") or 35000),
                            }
                except Exception:
                    pass

            # SKU Master enrichment
            if df.detected_role == "sku_master" or "sku" in df.filename.lower():
                try:
                    _, k_rows, _ = read_file_records(df_path)
                    for krow in k_rows:
                        kid = str(krow.get("sku_id", "")).strip()
                        if kid:
                            price_val = 150.0
                            try:
                                price_val = float(krow.get("unit_price_inr") or krow.get("unit_price") or krow.get("price") or 150.0)
                            except Exception:
                                pass
                            cost_val = None
                            try:
                                raw_cost = krow.get("unit_cost_inr") or krow.get("unit_cost") or krow.get("cost_price") or krow.get("cost")
                                if raw_cost is not None and str(raw_cost).strip() != "":
                                    cost_val = float(raw_cost)
                            except Exception:
                                pass
                            sku_meta_map[kid] = {
                                "name": str(krow.get("product_name") or f"SKU #{kid}").strip(),
                                "category": str(krow.get("category") or "General").strip(),
                                "price": price_val,
                                "cost": cost_val,
                                "shelf_bay": str(krow.get("shelf_bay") or "Aisle 1-A").strip(),
                            }
                except Exception:
                    pass

            # Ground Truth enrichment (isolated for evaluation only!)
            if df.detected_role == "ground_truth" or "ground_truth" in df.filename.lower() or "label" in df.filename.lower():
                try:
                    _, gt_rows, _ = read_file_records(df_path)
                    for gt_row in gt_rows:
                        gt_store = str(gt_row.get("store_id", "")).strip()
                        gt_sku = str(gt_row.get("sku_id", "")).strip()
                        gt_date = str(gt_row.get("date", "")).strip()
                        gt_flag = str(gt_row.get("is_phantom_stockout", "1")).strip().lower() in ("1", "true", "yes")
                        if gt_store and gt_sku and gt_date and gt_flag:
                            labels_to_insert.append(
                                GroundTruthLabel(
                                    dataset_id=dataset_id,
                                    store_id=gt_store,
                                    sku_id=gt_sku,
                                    date=gt_date,
                                    is_phantom_stockout=True,
                                    label_type="phantom_stockout",
                                    source=f"dataset_{dataset_id}_eval_labels",
                                )
                            )
                except Exception:
                    pass

        # 1. Identify distinct stores and SKUs in records
        stores_map: dict[str, Store] = {}
        skus_map: dict[str, SKU] = {}
        daily_records_to_insert: list[DailyRecord] = []

        existing_stores = {s.store_id: s for s in self.db.scalars(select(Store)).all()}
        existing_skus = {s.sku_id: s for s in self.db.scalars(select(SKU)).all()}

        for rec in clean_records:
            st_id = rec["store_id"]
            sk_id = rec["sku_id"]

            if st_id not in existing_stores and st_id not in stores_map:
                s_info = store_meta_map.get(st_id, {})
                st_obj = Store(
                    store_id=st_id,
                    dataset_id=dataset_id,
                    name=s_info.get("name") or rec.get("store_name") or f"Store {st_id}",
                    city_tier=s_info.get("city_tier") or rec.get("city_tier") or "Tier-1",
                    format=s_info.get("format") or "Supermarket",
                    size_sqft=s_info.get("size_sqft") or 35000,
                )
                stores_map[st_id] = st_obj
                self.db.add(st_obj)

            if sk_id not in existing_skus and sk_id not in skus_map:
                k_info = sku_meta_map.get(sk_id, {})
                sku_obj = SKU(
                    sku_id=sk_id,
                    dataset_id=dataset_id,
                    name=k_info.get("name") or rec.get("product_name") or f"SKU #{sk_id}",
                    category=k_info.get("category") or rec.get("category") or "General",
                    price=k_info.get("price") or rec.get("price") or 150.0,
                    cost=k_info.get("cost") or rec.get("cost"),
                    shelf_bay=k_info.get("shelf_bay") or rec.get("shelf_bay") or "Aisle 1-A",
                    status="active",
                )
                skus_map[sk_id] = sku_obj
                self.db.add(sku_obj)

            daily_records_to_insert.append(
                DailyRecord(
                    dataset_id=dataset_id,
                    store_id=st_id,
                    sku_id=sk_id,
                    date=rec["date"],
                    sales=rec["sales"],
                    on_hand_stock=rec["on_hand_stock"],
                    is_promotion=rec.get("is_promotion", False),
                    is_holiday=rec.get("is_holiday", False),
                )
            )

            if rec.get("is_phantom_stockout"):
                labels_to_insert.append(
                    GroundTruthLabel(
                        dataset_id=dataset_id,
                        store_id=st_id,
                        sku_id=sk_id,
                        date=rec["date"],
                        is_phantom_stockout=True,
                        label_type="phantom_stockout",
                        source=f"dataset_{dataset_id}",
                    )
                )

        # Commit master records first to satisfy foreign keys
        self.db.commit()

        # Chunked batch insert for daily_records (batch size 1500)
        batch_size = 1500
        for i in range(0, len(daily_records_to_insert), batch_size):
            chunk = daily_records_to_insert[i:i + batch_size]
            self.db.bulk_save_objects(chunk)
            self.db.commit()

        # Batch insert labels if any
        if labels_to_insert:
            for i in range(0, len(labels_to_insert), batch_size):
                chunk = labels_to_insert[i:i + batch_size]
                self.db.bulk_save_objects(chunk)
                self.db.commit()

        # Update dataset metadata
        dates = [r["date"] for r in clean_records if r.get("date")]
        min_date = min(dates) if dates else None
        max_date = max(dates) if dates else None

        dataset.status = "imported"
        dataset.imported_at = datetime.utcnow()
        dataset.row_count = len(clean_records)
        dataset.validation_report_json = json.dumps(report.model_dump(), default=str)
        self.db.commit()

        distinct_stores_in_dataset = len({r["store_id"] for r in clean_records})
        distinct_skus_in_dataset = len({r["sku_id"] for r in clean_records})

        return ImportResult(
            dataset_id=dataset_id,
            status="imported",
            records_imported=len(daily_records_to_insert),
            stores_imported=distinct_stores_in_dataset,
            skus_imported=distinct_skus_in_dataset,
            labels_imported=len(labels_to_insert),
            imported_records=len(daily_records_to_insert),
            imported_stores=distinct_stores_in_dataset,
            imported_skus=distinct_skus_in_dataset,
            imported_labels=len(labels_to_insert),
            warnings_count=report.warning_count,
            date_range_start=min_date,
            date_range_end=max_date,
            message=f"Successfully imported {len(daily_records_to_insert):,} inventory records across {distinct_stores_in_dataset} store(s) and {distinct_skus_in_dataset} SKUs ({min_date or 'N/A'} to {max_date or 'N/A'}). {len(labels_to_insert)} evaluation labels registered.",
        )

    def load_synthetic_dataset(self) -> tuple[Dataset, ImportResult]:
        """
        Loads and imports the official synthetic test dataset directly from the project data folder.
        """
        import shutil
        data_dir = Path("data")
        if not (data_dir / "daily_sales_inventory.csv").exists():
            data_dir = Path(__file__).resolve().parent.parent.parent.parent / "data"
        if not (data_dir / "daily_sales_inventory.csv").exists():
            data_dir = Path("C:/Users/ASUS/Downloads/StockSentinel_AI_Test_Dataset")

        if not (data_dir / "daily_sales_inventory.csv").exists():
            raise FileNotFoundError("Synthetic test dataset files not found in data/ or downloads.")

        dataset_id = f"DS_SYNTHETIC_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        upload_dir = get_dataset_storage_dir(dataset_id)

        target_files = [
            ("daily_sales_inventory.csv", "daily_records"),
            ("store_master.csv", "store_master"),
            ("sku_master.csv", "sku_master"),
            ("promotion_calendar.csv", "promo_calendar"),
            ("ground_truth_labels_EVALUATION_ONLY.csv", "ground_truth"),
        ]

        total_size = 0
        file_records = []
        primary_path = upload_dir / "daily_sales_inventory.csv"

        for fname, role in target_files:
            src = data_dir / fname
            if src.exists():
                dst = upload_dir / fname
                shutil.copy2(src, dst)
                f_size = dst.stat().st_size
                total_size += f_size
                headers, _, count = read_file_records(dst, max_rows=1)
                file_records.append(
                    DatasetFile(
                        dataset_id=dataset_id,
                        filename=fname,
                        file_format="CSV",
                        file_path=str(dst.resolve()),
                        file_size_bytes=f_size,
                        row_count=count,
                        columns_json=json.dumps(headers),
                        detected_role=role,
                    )
                )

        profile = profile_raw_dataset(primary_path)
        profile.dataset_id = dataset_id
        profile.name = "StockSentinel AI Synthetic Benchmark Dataset"

        confirmed_mapping = {
            "date": "date",
            "store_id": "store_id",
            "sku_id": "sku_id",
            "units_sold": "sales",
            "on_hand": "on_hand_stock",
            "promotion_active": "is_promotion",
            "holiday_flag": "is_holiday",
        }

        dataset = Dataset(
            dataset_id=dataset_id,
            name="StockSentinel AI Synthetic Benchmark Dataset",
            file_format="MULTI",
            file_path=str(primary_path.resolve()),
            file_size_bytes=total_size,
            status="uploaded",
            row_count=profile.row_count,
            column_count=profile.column_count,
            detected_schema_json=json.dumps(profile.model_dump(), default=str),
            confirmed_mapping_json=json.dumps(confirmed_mapping),
            validation_report_json=None,
            created_at=datetime.utcnow(),
        )

        self.db.add(dataset)
        for df in file_records:
            self.db.add(df)
        self.db.commit()
        self.db.refresh(dataset)

        # Validate
        self.validate_dataset(dataset_id)

        # Import
        import_result = self.import_dataset(dataset_id)
        self.db.refresh(dataset)

        return dataset, import_result
