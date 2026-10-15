"""
StockSentinel AI - FastAPI Application Entry Point.

Provides REST endpoints for:
- /api/health: System status & telemetry metrics
- /api/scans: Execution & history of detection scans
- /api/findings: Top-20 verification queue & status transitions
- /api/evaluation: Precision@20 & recall benchmarking against hidden ground-truth labels
- /api/recovery-estimate: Empirical annual rupees (₹) recovered calculations
- /api/stores, /api/skus, /api/ingest: Retail catalog and dataset ingestion
"""

import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.db.database import init_db, SessionLocal
from backend.app.services.data_generator import generate_and_seed_data
from backend.app.api.health import router as health_router
from backend.app.api.scans import router as scans_router
from backend.app.api.findings import router as findings_router
from backend.app.api.evaluation import router as evaluation_router
from backend.app.api.recovery import router as recovery_router
from backend.app.api.stores import router as stores_router
from backend.app.api.ingest import router as ingest_router
from backend.app.api.datasets import router as datasets_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes tables and seeds initial development dataset if empty."""
    init_db()
    db = SessionLocal()
    try:
        from backend.app.services.dataset_service import DatasetService
        svc = DatasetService(db)
        existing = svc.list_datasets()
        has_benchmark = any(d.dataset_id.startswith("DS_SYNTHETIC") and d.status == "imported" for d in existing)
        if not has_benchmark:
            try:
                svc.load_synthetic_dataset()
            except Exception:
                generate_and_seed_data(
                    db=db,
                    num_stores=5,
                    num_skus=30,
                    days_history=30,
                    reference_date_str="2026-10-15",
                    clear_existing=False,
                )
    finally:
        db.close()
    yield


app = FastAPI(
    title="StockSentinel AI API",
    description="Phantom Stock-Out Detector backend adhering to R1 specifications.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for local development and production origins
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
env_origins = os.getenv("CORS_ORIGINS")
if env_origins:
    try:
        allowed_origins = json.loads(env_origins)
    except Exception:
        allowed_origins = [o.strip() for o in env_origins.split(",") if o.strip()]
else:
    allowed_origins = default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under /api prefix
app.include_router(health_router, prefix="/api")
app.include_router(scans_router, prefix="/api")
app.include_router(findings_router, prefix="/api")
app.include_router(evaluation_router, prefix="/api")
app.include_router(recovery_router, prefix="/api")
app.include_router(stores_router, prefix="/api")
app.include_router(ingest_router, prefix="/api")
app.include_router(datasets_router, prefix="/api")


@app.get("/")
def root():
    return {
        "app": "StockSentinel AI API",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/api/health",
    }
