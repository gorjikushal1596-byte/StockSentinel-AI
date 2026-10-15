"""Database session and engine management for StockSentinel AI."""

import os
from collections.abc import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from pathlib import Path

_project_root = Path(__file__).resolve().parent.parent.parent.parent
_env_db_url = os.getenv("DATABASE_URL")
if not _env_db_url:
    DATABASE_URL = f"sqlite:///{(_project_root / 'stocksentinel.db').as_posix()}"
elif _env_db_url.startswith("sqlite:///./"):
    _rel_name = _env_db_url[len("sqlite:///./"):]
    DATABASE_URL = f"sqlite:///{(_project_root / _rel_name).as_posix()}"
else:
    DATABASE_URL = _env_db_url

# SQLite specific thread checks
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for yielding database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize all tables declared in models and migrate missing columns non-destructively."""
    from backend.app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # SQLite non-destructive column addition for dataset_id
    if DATABASE_URL.startswith("sqlite"):
        with engine.connect() as conn:
            tables_to_check = [
                "stores",
                "skus",
                "daily_records",
                "ground_truth_labels",
                "scans",
                "findings",
            ]
            for table_name in tables_to_check:
                try:
                    res = conn.execute(text(f"PRAGMA table_info({table_name});")).fetchall()
                    existing_cols = [row[1] for row in res]
                    if existing_cols and "dataset_id" not in existing_cols:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN dataset_id VARCHAR(64);"))
                        conn.commit()
                    if table_name == "skus" and "cost" not in existing_cols:
                        conn.execute(text("ALTER TABLE skus ADD COLUMN cost FLOAT;"))
                        conn.commit()
                except Exception as ex:
                    # Ignore table not existing yet or already migrated
                    pass
