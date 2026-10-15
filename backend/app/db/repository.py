"""Data repository for querying and mutating StockSentinel database entities."""

import json
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, desc, func
from backend.app.db.models import Store, SKU, DailyRecord, GroundTruthLabel, Scan, Finding


class StockSentinelRepository:
    """Encapsulates all database interactions for stores, inventory, and findings."""

    def __init__(self, db: Session):
        self.db = db

    # ---------------------------------------------------------
    # Store & SKU Master Queries
    # ---------------------------------------------------------
    def get_all_stores(self, dataset_id: str | None = None) -> list[Store]:
        stmt = select(Store)
        if dataset_id:
            stmt = stmt.where(Store.dataset_id == dataset_id)
        stmt = stmt.order_by(Store.store_id)
        return list(self.db.scalars(stmt).all())

    def get_store(self, store_id: str) -> Store | None:
        return self.db.get(Store, store_id)

    def get_sku(self, sku_id: str) -> SKU | None:
        return self.db.get(SKU, sku_id)

    def get_all_skus(self, dataset_id: str | None = None) -> list[SKU]:
        stmt = select(SKU)
        if dataset_id:
            stmt = stmt.where(SKU.dataset_id == dataset_id)
        stmt = stmt.order_by(SKU.sku_id)
        return list(self.db.scalars(stmt).all())

    def get_stores_with_records(self, evaluation_date: str, dataset_id: str | None = None) -> list[str]:
        conditions = [DailyRecord.date == evaluation_date]
        if dataset_id:
            conditions.append(DailyRecord.dataset_id == dataset_id)
        stmt = (
            select(DailyRecord.store_id)
            .where(and_(*conditions))
            .distinct()
            .order_by(DailyRecord.store_id)
        )
        return list(self.db.scalars(stmt).all())

    # ---------------------------------------------------------
    # Daily Records & Historical Telemetry
    # ---------------------------------------------------------
    def get_records_for_sku_store_history(
        self,
        store_id: str,
        sku_id: str,
        end_date: str,
        limit_days: int = 45,
        dataset_id: str | None = None,
    ) -> list[DailyRecord]:
        """Fetch historical daily records up to end_date in chronological order."""
        conditions = [
            DailyRecord.store_id == store_id,
            DailyRecord.sku_id == sku_id,
            DailyRecord.date <= end_date,
        ]
        if dataset_id:
            conditions.append(DailyRecord.dataset_id == dataset_id)

        stmt = (
            select(DailyRecord)
            .where(and_(*conditions))
            .order_by(desc(DailyRecord.date))
            .limit(limit_days)
        )
        records = list(self.db.scalars(stmt).all())
        records.reverse()  # Chronological order
        return records

    def get_records_for_store_on_date(
        self, store_id: str, evaluation_date: str, dataset_id: str | None = None
    ) -> list[DailyRecord]:
        conditions = [
            DailyRecord.store_id == store_id,
            DailyRecord.date == evaluation_date,
        ]
        if dataset_id:
            conditions.append(DailyRecord.dataset_id == dataset_id)
        stmt = select(DailyRecord).where(and_(*conditions))
        return list(self.db.scalars(stmt).all())

    def get_all_skus_for_store_history(
        self,
        store_id: str,
        end_date: str,
        history_window_days: int = 45,
        dataset_id: str | None = None,
    ) -> dict[str, list[DailyRecord]]:
        """Fetch grouped history for all SKUs in a store ending at end_date."""
        conditions = [
            DailyRecord.store_id == store_id,
            DailyRecord.date <= end_date,
        ]
        if dataset_id:
            conditions.append(DailyRecord.dataset_id == dataset_id)

        stmt = (
            select(DailyRecord)
            .where(and_(*conditions))
            .order_by(DailyRecord.sku_id, DailyRecord.date)
        )
        all_records = self.db.scalars(stmt).all()
        grouped: dict[str, list[DailyRecord]] = {}
        for rec in all_records:
            grouped.setdefault(rec.sku_id, []).append(rec)

        # Trim to history window
        for sku_id in grouped:
            grouped[sku_id] = grouped[sku_id][-history_window_days:]
        return grouped

    # ---------------------------------------------------------
    # Scan Persistence
    # ---------------------------------------------------------
    def create_scan(
        self,
        scan_id: str,
        evaluation_date: str,
        threshold_days: int,
        total_evaluated: int,
        flagged_count: int,
        stores_covered: int,
        dataset_id: str | None = None,
    ) -> Scan:
        scan = Scan(
            scan_id=scan_id,
            dataset_id=dataset_id,
            evaluation_date=evaluation_date,
            status="completed",
            threshold_days=threshold_days,
            created_at=datetime.utcnow(),
            total_evaluated=total_evaluated,
            flagged_count=flagged_count,
            stores_covered=stores_covered,
        )
        self.db.add(scan)
        self.db.commit()
        self.db.refresh(scan)
        return scan

    def get_scan(self, scan_id: str) -> Scan | None:
        return self.db.get(Scan, scan_id)

    def get_scans(self, dataset_id: str | None = None, limit: int = 20, offset: int = 0) -> list[Scan]:
        stmt = select(Scan)
        if dataset_id:
            stmt = stmt.where(Scan.dataset_id == dataset_id)
        stmt = stmt.order_by(desc(Scan.created_at)).offset(offset).limit(limit)
        return list(self.db.scalars(stmt).all())

    # ---------------------------------------------------------
    # Findings Persistence & Querying
    # ---------------------------------------------------------
    def save_findings(self, findings: list[Finding]) -> None:
        self.db.add_all(findings)
        self.db.commit()

    def get_findings(
        self,
        scan_id: str | None = None,
        dataset_id: str | None = None,
        store_id: str | None = None,
        sku_id: str | None = None,
        status: str | None = None,
        severity: str | None = None,
        evaluation_date: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Finding]:
        conditions = []
        if scan_id:
            conditions.append(Finding.scan_id == scan_id)
        if dataset_id:
            conditions.append(Finding.dataset_id == dataset_id)
        if store_id:
            conditions.append(Finding.store_id == store_id)
        if sku_id:
            conditions.append(Finding.sku_id == sku_id)
        if status:
            conditions.append(Finding.status == status)
        if severity:
            conditions.append(Finding.severity == severity)
        if evaluation_date:
            conditions.append(Finding.evaluation_date == evaluation_date)

        stmt = (
            select(Finding)
            .where(and_(*conditions) if conditions else True)
            .order_by(Finding.store_id, Finding.rank)
            .offset(offset)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_finding(self, finding_id: str) -> Finding | None:
        return self.db.get(Finding, finding_id)

    def update_finding_status(self, finding_id: str, new_status: str) -> Finding | None:
        finding = self.db.get(Finding, finding_id)
        if finding:
            finding.status = new_status
            self.db.commit()
            self.db.refresh(finding)
        return finding

    # ---------------------------------------------------------
    # Ground Truth Queries (Evaluation Only!)
    # ---------------------------------------------------------
    def get_ground_truth_for_date(
        self, evaluation_date: str, dataset_id: str | None = None
    ) -> list[GroundTruthLabel]:
        conditions = [GroundTruthLabel.date == evaluation_date]
        if dataset_id:
            conditions.append(GroundTruthLabel.dataset_id == dataset_id)
        stmt = select(GroundTruthLabel).where(and_(*conditions))
        return list(self.db.scalars(stmt).all())

    def get_available_ground_truth_dates(self, dataset_id: str | None = None) -> list[str]:
        stmt = select(GroundTruthLabel.date)
        if dataset_id:
            stmt = stmt.where(GroundTruthLabel.dataset_id == dataset_id)
        stmt = stmt.distinct().order_by(GroundTruthLabel.date)
        return list(self.db.scalars(stmt).all())
