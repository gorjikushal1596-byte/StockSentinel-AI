"""SQLAlchemy ORM models for StockSentinel AI."""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
    Text,
)
from sqlalchemy.orm import relationship
from app.db.database import Base


def utc_now() -> datetime:
    """Return timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Dataset(Base):
    """Uploaded and ingested retail dataset with versioning."""
    __tablename__ = "datasets"

    dataset_id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    file_format = Column(String(16), nullable=False)  # CSV, XLSX, JSON, PARQUET, MULTI
    file_path = Column(String(256), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    status = Column(String(32), default="uploaded")  # uploaded, mapped, validated, imported, failed
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    detected_schema_json = Column(Text, nullable=True)  # detected column metadata & types
    confirmed_mapping_json = Column(Text, nullable=True)  # confirmed column semantic mappings
    validation_report_json = Column(Text, nullable=True)  # detailed validation stats & issues
    created_at = Column(DateTime, default=utc_now)
    imported_at = Column(DateTime, nullable=True)

    files = relationship("DatasetFile", back_populates="dataset", cascade="all, delete-orphan")


class DatasetFile(Base):
    """Individual file in a single-file or multi-file dataset bundle."""
    __tablename__ = "dataset_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(String(64), ForeignKey("datasets.dataset_id"), nullable=False, index=True)
    filename = Column(String(128), nullable=False)
    file_format = Column(String(16), nullable=False)
    file_path = Column(String(256), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    row_count = Column(Integer, default=0)
    columns_json = Column(Text, nullable=True)
    detected_role = Column(String(32), default="daily_records")  # daily_records, store_master, product_master, promo_calendar, ground_truth
    created_at = Column(DateTime, default=utc_now)

    dataset = relationship("Dataset", back_populates="files")


class Store(Base):
    """Retail store master record."""
    __tablename__ = "stores"

    store_id = Column(String(32), primary_key=True, index=True)
    dataset_id = Column(String(64), nullable=True, index=True)
    name = Column(String(128), nullable=False)
    city_tier = Column(String(16), default="Tier-1")
    format = Column(String(32), default="Supermarket")
    size_sqft = Column(Integer, default=45000)

    daily_records = relationship("DailyRecord", back_populates="store", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="store", cascade="all, delete-orphan")


class SKU(Base):
    """Stock Keeping Unit product master record."""
    __tablename__ = "skus"

    sku_id = Column(String(32), primary_key=True, index=True)
    dataset_id = Column(String(64), nullable=True, index=True)
    name = Column(String(128), nullable=False)
    category = Column(String(64), nullable=False)
    price = Column(Float, nullable=False)
    cost = Column(Float, nullable=True)  # Unit cost in INR (optional)
    shelf_bay = Column(String(32), default="Aisle 1-A")
    status = Column(String(32), default="active")  # active, delisted, seasonal

    daily_records = relationship("DailyRecord", back_populates="sku", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="sku", cascade="all, delete-orphan")


class DailyRecord(Base):
    """Daily sales and recorded inventory per SKU-store-day."""
    __tablename__ = "daily_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(String(64), nullable=True, index=True)
    store_id = Column(String(32), ForeignKey("stores.store_id"), nullable=False, index=True)
    sku_id = Column(String(32), ForeignKey("skus.sku_id"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    sales = Column(Integer, nullable=False, default=0)
    on_hand_stock = Column(Integer, nullable=False, default=0)
    is_promotion = Column(Boolean, default=False)
    is_holiday = Column(Boolean, default=False)

    store = relationship("Store", back_populates="daily_records")
    sku = relationship("SKU", back_populates="daily_records")

    __table_args__ = (
        Index("idx_store_sku_date", "store_id", "sku_id", "date"),
        Index("idx_dataset_store_date", "dataset_id", "store_id", "date"),
    )


class GroundTruthLabel(Base):
    """
    Hidden ground-truth labels for evaluation only (evaluate.py & /api/evaluation).
    NEVER leaked to detection service or ranking pipeline!
    """
    __tablename__ = "ground_truth_labels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(String(64), nullable=True, index=True)
    store_id = Column(String(32), nullable=False, index=True)
    sku_id = Column(String(32), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    is_phantom_stockout = Column(Boolean, nullable=False, default=False)
    label_type = Column(String(32), default="phantom_stockout")  # phantom_stockout, misplaced, delisted, normal
    source = Column(String(64), default="official_hidden_set")

    __table_args__ = (
        Index("idx_gt_store_date", "store_id", "date"),
        Index("idx_gt_dataset_store_date", "dataset_id", "store_id", "date"),
    )


class Scan(Base):
    """An executed detection scan batch."""
    __tablename__ = "scans"

    scan_id = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(64), nullable=True, index=True)
    evaluation_date = Column(String(10), nullable=False, index=True)
    status = Column(String(32), default="completed")  # running, completed, failed
    threshold_days = Column(Integer, default=3)
    created_at = Column(DateTime, default=utc_now)
    total_evaluated = Column(Integer, default=0)
    flagged_count = Column(Integer, default=0)
    stores_covered = Column(Integer, default=0)

    findings = relationship("Finding", back_populates="scan", cascade="all, delete-orphan")


class Finding(Base):
    """An identified anomaly candidate ranked for store verification."""
    __tablename__ = "findings"

    finding_id = Column(String(64), primary_key=True, index=True)
    scan_id = Column(String(64), ForeignKey("scans.scan_id"), nullable=False, index=True)
    dataset_id = Column(String(64), nullable=True, index=True)
    store_id = Column(String(32), ForeignKey("stores.store_id"), nullable=False, index=True)
    sku_id = Column(String(32), ForeignKey("skus.sku_id"), nullable=False, index=True)
    rank = Column(Integer, nullable=False)
    evaluation_date = Column(String(10), nullable=False, index=True)
    recorded_stock = Column(Integer, nullable=False)
    consecutive_zero_days = Column(Integer, nullable=False)
    historical_daily_velocity = Column(Float, nullable=False, default=1.0)
    confidence_score = Column(Float, nullable=False)
    severity = Column(String(16), default="CRITICAL")  # CRITICAL, HIGH, ROUTINE
    anomaly_type = Column(String(32), default="phantom_stockout")  # phantom_stockout, misplaced, delisted, unclassified
    explanation = Column(Text, nullable=False)
    status = Column(String(32), default="pending")  # pending, verified, false_positive, unresolved
    time_series_json = Column(Text, nullable=False)  # JSON string of recent days [{day, stock, sales}]
    created_at = Column(DateTime, default=utc_now)

    scan = relationship("Scan", back_populates="findings")
    store = relationship("Store", back_populates="findings")
    sku = relationship("SKU", back_populates="findings")

    __table_args__ = (
        Index("idx_finding_store_date_rank", "store_id", "evaluation_date", "rank"),
        Index("idx_finding_status", "status"),
        Index("idx_finding_dataset", "dataset_id"),
    )


class BusinessImpactReport(Base):
    """Persisted business impact and ROI report tied to dataset and scan."""
    __tablename__ = "business_impact_reports"

    report_id = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(64), nullable=True, index=True)
    scan_id = Column(String(64), nullable=True, index=True)
    evaluation_date = Column(String(10), nullable=False, index=True)
    assumptions_json = Column(Text, nullable=False)
    metrics_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        Index("idx_bi_dataset_scan", "dataset_id", "scan_id"),
    )

