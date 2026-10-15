# StockSentinel AI — Backend Documentation

**Implementation based on Problem Statement: R1. The Phantom Stock-Out Detector**

---

## 1. Overview

The StockSentinel AI backend provides high-performance, deterministic anomaly detection for retail inventory. It flags suspicious SKU–store combinations where recorded ERP inventory remains positive while point-of-sale register sales have quietly collapsed to zero for consecutive days.

Strictly adhering to operational constraints from the problem statement:
- **Strict Cap**: Exactly $\le 20$ high-confidence products ranked per store per day for physical morning inspection.
- **Explainable Reasoning**: Plain-English audit rationale provided for every alert.
- **Zero Label Leakage**: Ground-truth labels are stored strictly for evaluation (`evaluate.py`) and never exposed to detection features or ranking algorithms.
- **Explainable Metrics**: Precision@20 per store-day and recall against hidden labels.
- **Financial Arithmetic**: Step-by-step annual rupees (₹) recovered calculation with transparent arithmetic.

---

## 2. Technology Stack

- **Runtime**: Python 3.11+ (Tested on Python 3.14.6)
- **Web Framework**: FastAPI & Uvicorn
- **Validation**: Pydantic v2
- **ORM**: SQLAlchemy 2.x
- **Database**: SQLite (default local zero-config file `stocksentinel.db`), fully compatible with PostgreSQL
- **Testing**: pytest & FastAPI TestClient

---

## 3. Quick Start

### 3.1 Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 3.2 Initialize Database & Seed Benchmark Data
```bash
python -c "from backend.app.db.database import init_db, SessionLocal; from backend.app.services.data_generator import generate_and_seed_data; init_db(); db = SessionLocal(); generate_and_seed_data(db, num_stores=5, num_skus=40, days_history=45); db.close(); print('Database initialized and seeded.')"
```

### 3.3 Start FastAPI Development Server
```bash
uvicorn backend.app.main:app --reload --port 8000
```
API Documentation (Swagger UI): `http://localhost:8000/docs`  
Health Endpoint: `http://localhost:8000/api/health`

### 3.4 Run Backend Automated Tests
```bash
python -m pytest backend/tests -v
```

### 3.5 Run Standalone Benchmark Evaluation (`evaluate.py`)
```bash
# Human-readable table output:
python evaluate.py --date 2026-10-15

# Machine-readable JSON output:
python evaluate.py --date 2026-10-15 --format json
```

---

## 4. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend health, version, database connectivity, record counts |
| `GET` | `/api/stores` | List of stores with active SKU counts and formats |
| `POST` | `/api/scans` | Trigger detection scan, run algorithm, persist findings |
| `GET` | `/api/scans` | Paginated scan execution history |
| `GET` | `/api/scans/{scan_id}` | Full scan execution details with ranked findings |
| `GET` | `/api/findings` | Filterable findings by store, SKU, severity, status, date |
| `PATCH` | `/api/findings/{id}/status` | Update verification status (`pending`, `verified`, `false_positive`, `unresolved`) |
| `GET` | `/api/findings/{id}/evidence` | Detailed signals and 14-day sales-vs-stock time series |
| `GET` | `/api/evaluation` | Precision@20 per store-day and recall against hidden labels |
| `GET` | `/api/recovery-estimate` | Transparent annual rupees (₹) recovered calculation |
| `POST` | `/api/ingest/synthetic` | Seed or reset synthetic demo benchmark data |

---

## 5. Detection Engine & Ranking Logic

### 5.1 Consecutive Zero-Sales Threshold Justification ($N \ge 3$)
- **Rationale**: For items selling 2–5 units/day, a single zero-sales day happens with probability $e^{-\lambda} \approx 1\% - 13\%$. Three consecutive zero-sales days has an unconditioned probability $(e^{-\lambda})^3 < 0.2\%$, making 3 days an empirical inflection point where phantom stock-out probability surges.
- **Slow-Mover Protection**: For SKUs with low historical velocity ($\lambda < 0.5$ units/day), zero-sales streaks of 2–4 days are statistically expected. The engine raises the required threshold to $\max(3, \lceil 2 / \lambda \rceil)$ and computes the Poisson zero-arrival probability $P(X=0 \mid \lambda) = e^{-\lambda \times d}$. If $P > 0.05$, the alert is suppressed to prevent drowning managers in false positives.
- **Promotions & Weekend Effects**: Promotional days scale expected velocity ($\times 1.6$), dramatically raising suspicion if sales remain zero during promotional periods.

### 5.2 Deterministic Ranking Formula (Top 20 per store-day)
$$\text{Priority Score} = \text{Unit Price} \times \text{Historical Daily Velocity} \times \left(\frac{\text{Confidence Score}}{100}\right)$$
- Prioritizes high-revenue impact discrepancies.
- Tie-breaking: Stable secondary sort on `consecutive_zero_days DESC`, `recorded_stock DESC`, and `sku_id ASC`.
- Strictly caps findings at **20 per store per day** to guarantee associate physical audits finish under 20 minutes.

---

## 6. Official Dataset Ingestion

When the full benchmark dataset (800 SKUs, 25 stores, 18 months) is provided:
1. Place CSV files in `backend/data/` or configure via `DATASET_PATH`.
2. Format:
   - `stores.csv`: `store_id,store_name,city_tier,format`
   - `skus.csv`: `sku_id,product_name,category,shelf_bay,unit_price`
   - `daily_sales_inventory.csv`: `store_id,sku_id,date,sales,recorded_stock,is_promotion`
   - `hidden_ground_truth.csv` *(Evaluation only)*: `store_id,sku_id,date,is_phantom_stockout`
3. Execute ingestion:
   ```bash
   python -c "from backend.app.db.database import init_db; init_db()"
   ```
