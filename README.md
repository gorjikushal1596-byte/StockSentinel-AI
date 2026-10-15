# StockSentinel AI — Retail Intelligence & Phantom Stock-Out Detection

StockSentinel AI is a full-stack, high-performance retail intelligence platform designed to detect and eliminate **phantom retail stock-outs**—inventory items recorded as positive on enterprise ERP/WMS ledgers while actual retail checkout register sales have collapsed to zero.

---

## Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **3D Telemetry & Graphics**: Three.js (`@react-three/fiber`, `@react-three/drei`)
- **Styling**: Standard modern CSS design system with HSL tokens, glassmorphism, and responsive layouts
- **Icons & Visuals**: Lucide React
- **Testing**: Vitest (`npm test`)

### Backend & Analytics
- **Framework**: Python 3.11+ / FastAPI & Uvicorn
- **Data Ingestion**: Apache Arrow (`pyarrow`), `openpyxl`, `pandas`
- **Database / ORM**: SQLite (development) / PostgreSQL (production) via SQLAlchemy
- **Detection Engine**: Poisson inter-arrival distribution anomaly detector & business impact prioritization
- **Testing & Benchmarking**: Pytest (17+ unit & integration tests) and dedicated evaluation benchmark (`evaluate.py`)

---

## Quick Start & Setup

### Prerequisites
- **Node.js**: `v20+` (Tested on `v24.19.0`) & npm `v10+`
- **Python**: `3.11+` (Tested on `3.14.6`)

### 1. Environment Configuration

Copy the example environment files for both frontend and backend:

```bash
# Frontend configuration
cp .env.example .env

# Backend configuration
cp backend/.env.example backend/.env
```

#### Frontend Environment Variables (`.env.example`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_APP_ENV` | Application environment (`development` \| `production`) | `development` |
| `VITE_APP_BASE_URL` | Base frontend URL | `http://localhost:5173` |
| `VITE_TELEMETRY_API_ENDPOINT` | Optional remote telemetry endpoint URL | `""` (in-memory) |
| `VITE_ANOMALY_ENGINE_URL` | Backend anomaly service endpoint URL | `""` (client engine) |
| `VITE_ENABLE_3D_PROCEDURAL_MODE` | Enable Three.js procedural warehouse rendering | `true` |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | Enable FPS/latency performance telemetry | `false` |

#### Backend Environment Variables (`backend/.env.example`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Backend environment (`development` \| `production`) | `development` |
| `DATABASE_URL` | Database connection string | `sqlite:///./stocksentinel.db` |
| `CORS_ORIGINS` | Permitted CORS origins (JSON array) | `["http://localhost:5173", ...]` |
| `CONSECUTIVE_ZERO_THRESHOLD` | Consecutive zero sales days threshold | `3` |
| `MAX_FINDINGS_PER_STORE` | Store queue operational cap (anti-fatigue) | `20` |
| `LOG_LEVEL` | Python logging level | `INFO` |

---

### 2. Frontend Setup & Startup

```bash
# Install frontend dependencies
npm install

# Start Vite development server (http://localhost:5173)
npm run dev

# Run frontend test suite
npm test

# Build production bundle
npm run build
```

---

### 3. Backend Setup & Startup

```bash
# Navigate to project root or backend
# Recommended: Create and activate a Python virtual environment
python -m venv backend/.venv
# On Windows:
.\backend\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source backend/.venv/bin/activate

# Install Python backend dependencies
pip install -r backend/requirements.txt

# Start FastAPI server on port 8000
uvicorn backend.app.main:app --reload --port 8000
```

Interactive API documentation will be available at `http://localhost:8000/docs`.

---

### 4. Running Tests & Benchmarks

```bash
# Run backend test suite (unit tests, API tests, and ingestion tests)
python -m pytest backend/tests -v

# Run official evaluation benchmark on synthetic test dataset
python backend/evaluate.py --date 2026-10-15

# Run official evaluation benchmark on a specific uploaded dataset ID
python backend/evaluate.py --date 2026-10-15 --dataset-id DS_CUSTOM_ID
```

---

## Dataset Ingestion & Synthetic Test Data

### Universal Ingestion Engine
StockSentinel AI provides a production-grade multi-format ingestion pipeline:
1. **Multi-Format Ingestion**: Supports `.csv`, `.tsv` (auto-sniffed delimiters and encoding fallback), `.xlsx`, `.xls`, `.json`, and `.parquet` (via Apache Arrow).
2. **Multi-File Stitching**: Accepts split file uploads (e.g., `sales.csv` and `inventory.csv`) and merges on `(store_id, sku_id, date)`.
3. **Semantic Column Mapping**: Automatically infers column headers (e.g. `store_code`, `outlet_id`, `units_sold`, `on_hand`) to canonical fields.
4. **Data Hygiene Gates**: Coerces negative quantities, handles duplicate entries, and guarantees strict detection vs. evaluation isolation.

### Included Synthetic Test Dataset (`/data`)
The repository includes a synthetic functional test dataset under [`data/`](file:///data/README.md) for reproducible local testing and public demos:
- `daily_sales_inventory.csv`: 30,000 synthetic records across 5 stores and 50 SKUs over a 120-day span.
- `store_master.csv`, `sku_master.csv`, `promotion_calendar.csv`: Metadata tables.
- `ground_truth_labels_EVALUATION_ONLY.csv`: Strictly isolated positive labels for evaluation metrics. **Never exposed to detection models.**

---

## Project Structure

```text
├── backend/                  # FastAPI backend application
│   ├── app/
│   │   ├── api/              # REST routers (datasets, detection, health)
│   │   ├── db/               # SQLAlchemy models & database session setup
│   │   ├── schemas/          # Pydantic data schemas
│   │   └── services/         # Detection, ingestion, and validation engines
│   ├── tests/                # Pytest automated test suite
│   ├── evaluate.py           # Evaluation benchmark runner
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend configuration template
├── data/                     # Synthetic test datasets and evaluation ground-truth
├── docs/                     # System architecture & technical documentation
├── public/                   # Static assets, fallback video, and icons
├── src/                      # React 19 TypeScript frontend
│   ├── app/                  # Application root & layout coordination
│   ├── components/           # Reusable UI & Three.js 3D warehouse components
│   ├── features/             # Feature modules (scanner, verification queue, impact)
│   ├── styles/               # CSS design tokens, typography, glassmorphism
│   ├── types/                # TypeScript shared interfaces
│   └── utils/                # Utilities & formatters
├── tests/                    # Frontend Vitest test files
├── .env.example              # Frontend configuration template
├── .gitignore                # Git exclusions (secrets, venvs, DBs, build output)
└── README.md                 # Project documentation
```

---

## License

This project is licensed under the MIT License - see the LICENSE file for details if applicable.
