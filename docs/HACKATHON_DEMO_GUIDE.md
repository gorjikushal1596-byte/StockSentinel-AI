# StockSentinel AI — Hackathon Presentation & Jury Demo Guide

> **TalentAP Mega Hackathon 2026**  
> **Problem Statement:** R1 — The Phantom Stock-Out Detector  
> **Submission Deadline:** 06:00 IST, 31 October 2026  
> **Lead Architect:** Kushal Gorji  

---

## 1. Executive Summary

**StockSentinel AI** solves the retail industry's silent revenue drain: **phantom stock-outs** — where the inventory ledger reports positive stock on hand ($I_t > 0$), but the shelf is empty due to theft, shrinkage, misplaced stock, or barcode errors, resulting in sustained zero sales ($S_t = 0$).

Traditional systems only alert when recorded inventory hits zero. StockSentinel AI detects velocity collapse in positive-inventory items using:
- **Poisson arrival likelihood** that protects genuine slow-moving SKUs.
- **Strict Top-20 ranking per store-day** ($\le 20$ inspection tasks per store) to respect store associate shift bandwidth.
- **Empirical Recoverable Revenue in INR (₹)** bounded strictly by ledger inventory and historical run-rate.
- **Zero ground-truth leakage**: evaluation runs strictly against unexposed binary labels.

---

## 2. 3-Minute Video Demo Script

| Timestamp | Screen / Frame | Visual Focus | Spoken Script / Narration |
|---|---|---|---|
| **0:00 - 0:35** | **Hero & Frame 2 (The Phantom Dilemma)** | Warehouse video backdrop, 3D shelf discrepancy reticle | *"Retail stores lose 4% of annual revenue to phantom stock-outs. The ERP system insists there are 14 units on the shelf, so replenishment never triggers, while customers walk away empty-handed. StockSentinel AI continuously monitors sales velocity against ledger stock to catch these silent collapses without requiring cameras or RFID tags."* |
| **0:35 - 1:10** | **Frame 3 & 4 (Pipeline & Feature Explorer)** | 5-stage pipeline stepper, Poisson math cards | *"How does it work? Every midnight, StockSentinel ingests daily POS sales and inventory records. Instead of naively flagging all zero-sales days, our statistical engine evaluates the Poisson probability of zero arrivals given baseline velocity. A luxury perfume selling 0.1 units/day is protected; a high-velocity detergent collapsing from 6 units/day to zero during an active promotion is immediately flagged."* |
| **1:10 - 2:00** | **Frame 5 & 6 (Live Scanner & Top-20 Queue)** | Live scan execution, Top-20 Verification Queue table | *"Store managers cannot inspect 500 alerts a day. In strict compliance with the R1 specification, StockSentinel ranks and caps recommendations to exactly 20 priority items per store per day. Clicking any item opens the detail drawer with historical sales-vs-stock charts, Poisson confidence scores, and an associate checklist powered by OmniRoute reasoning."* |
| **2:00 - 2:35** | **Frame 7 (Business Impact & Verification Sync)** | Changing finding status, real-time ROI recalculation | *"When a store associate verifies an item on the shelf and marks it 'Resolved (Restocked)' or 'Misplaced (Found)', the verified status persists in SQLite with WAL mode. Watch the Business Impact section: the Measured Audit metrics and recoverable revenue in INR recalculate instantly in real time."* |
| **2:35 - 3:00** | **CLI Evaluator & Conclusion** | Terminal running `python evaluate.py` | *"Finally, our system undergoes rigorous evaluation. Running `python evaluate.py` against hidden ground-truth labels scores 100% recall and 40% Precision@20 on held-out benchmarks with zero data leakage. StockSentinel AI is production-tested, self-contained, and ready for immediate deployment."* |

---

## 3. Live Jury Walkthrough (5-Minute Defense)

### Step 1: Open the Application
- Open browser at `http://localhost:5174/` (or `http://localhost:5173/`).
- Show the hero section with the live system status badge (`ONLINE · 127.0.0.1:8000`), warehouse video backdrop, and telemetry overlay.

### Step 2: Ingest a Dataset or Inspect Isolated Test Cases
- Click **"Manage Datasets"** in the top navigation.
- Demonstrate that the user can drop any custom CSV/Parquet file, or choose from the 5 dedicated test cases in `data/testing_datasets/`:
  1. `01_case_phantom_stockout.csv` — Fast-moving item with velocity collapse ($I > 0, S = 0$).
  2. `02_case_slow_moving_sku.csv` — Slow-moving SKU ($0.1$ units/day) protected by Poisson likelihood.
  3. `03_case_genuine_oos.csv` — Genuine out-of-stock ($I = 0$) correctly ignored.
  4. `04_case_promo_collapse.csv` — Promotion active with zero sales (escalated to Critical).
  5. `05_case_misplaced_multistore.csv` — Multi-store disparity (Store 1 zero vs Store 2 normal sales).

### Step 3: Top-20 Verification Queue & Evidence Drawer
- Scroll to **Frame 6 (Top-20 Queue)**.
- Filter by Store (e.g., `ST001` or `ST002`).
- Point out:
  - Strictly $\le 20$ items per store per day.
  - Plain-English one-line explanation for floor associates.
  - Estimated recoverable revenue in ₹ (INR).
- Click any row to expand the **Evidence Drawer**:
  - Review the interactive Sales vs Stock dual-axis chart.
  - Review the OmniRoute `gpt-oss-120b` associate action checklist.

### Step 4: Verification Status Sync & Real-Time ROI
- Change the finding status from `Unverified` to `Resolved (Restocked)` or `Misplaced (Found)`.
- Scroll down to **Frame 7 (Business Impact)**:
  - Highlight the `[MEASURED AUDIT]` badge updating immediately without page reload.
  - Point out the formula breakdown: $\text{Recoverable Units} = \min(\text{Daily Run Rate} \times \text{Days}, \text{Ledger Stock})$.

### Step 5: Official Benchmark Execution
- Open terminal and run:
  ```bash
  python evaluate.py
  ```
- Show the jury the clean output:
  - Overall Recall: `100.0%`
  - Mean Precision@20: `40.0%`
  - Zero leakage confirmation.

---

## 4. Jury Q&A Defense Cheat Sheet

### Q1: "How do you distinguish slow-moving items from real phantom stock-outs?"
> **Answer:** *"We use a Poisson arrival distribution parameterized by the SKU's historical mean daily velocity ($\lambda$). For a slow-moving perfume selling $0.1$ units/day, the probability of zero sales over 3 consecutive days is $e^{-0.3} \approx 74\%$ — completely normal, so our engine suppresses the alert. For a fast-moving item selling 6 units/day, the probability of 3 consecutive zero days is $e^{-18} \approx 1.5 \times 10^{-8}$ — statistically impossible without an anomaly, triggering an immediate alert."*

### Q2: "Why cap recommendations at exactly 20 per store-day?"
> **Answer:** *"Problem Statement R1 explicitly requires an operational tool that floor managers can realistically act on. In retail store operations, associate shift bandwidth allows auditing 15–25 physical shelf bays per morning. Flooding managers with 200 alerts leads to alert fatigue and zero action. Our strict ranking by `confidence × estimated_revenue_loss` ensures associates inspect the 20 highest-value items first."*

### Q3: "How is recoverable revenue calculated? Is it inflated?"
> **Answer:** *"No. We enforce strict mathematical bounding:
> $$\text{Recoverable Units} = \min(\text{Historical Velocity} \times \text{Zero Days}, \text{Recorded Inventory})$$
> We never claim revenue for units the store didn't allegedly have in stock, and we compute profit impact using `unit_margin` when cost data is provided, or conservative retail gross margin (25%) when cost is absent. Every assumption is visibly exposed in Frame 7."*

### Q4: "Does your detector cheat by peeking at ground truth labels?"
> **Answer:** *"Never. Ground truth labels are stored in a dedicated `ground_truth_labels` table and are only accessed by `evaluate.py` or `/api/evaluation`. The scan engine (`app/api/scans.py` and `app/services/detection_service.py`) has zero access to ground truth tables. Furthermore, when evaluation is requested on custom datasets without labels, the UI explicitly reports 'Evaluation unavailable — ground-truth labels required'."*

### Q5: "What if local AI / OmniRoute is offline?"
> **Answer:** *"StockSentinel AI features zero-downtime graceful fallback. If the OmniRoute server is unreachable, the system automatically falls back to deterministic rule-based operational checklists and confidence rationales instantly, without dropping user requests or throwing errors."*

---

## 5. Judge Quick Verification Commands

```bash
# 1. Run official evaluation benchmark
python evaluate.py

# 2. Run backend test suite (34 tests)
pytest backend/tests -v

# 3. Run frontend test suite (13 tests)
npm test

# 4. Run frontend production build
npm run build

# 5. Verify release package & clean-room test
python scripts/package_release.py
```
