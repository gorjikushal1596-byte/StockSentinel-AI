# StockSentinel AI — Isolated Test Case Datasets

These 5 focused datasets allow you to verify each detection behavior individually in the UI or via API.

---

## Dataset Overview

| File | Scenario | Key Pattern | Expected Detector Verdict |
|---|---|---|---|
| `01_case_phantom_stockout.csv` | **Clear Phantom Stock-Out** | 8 units/day normal sales, suddenly **0 sales for 7 days**, recorded stock is **+14** | 🚨 **FLAGGED: CRITICAL**<br>Confidence >95%. Appears in Top-20 queue. |
| `02_case_slow_moving_sku.csv` | **Slow-Moving SKU Protection** | Luxury perfume selling only ~1 unit every 8–10 days. Sells 0 for 4 days, recorded stock = **3** | ✅ **PROTECTED (NOT FLAGGED)**<br>Poisson arrival model recognizes dormancy as normal variance ($p > 0.01$). |
| `03_case_genuine_oos.csv` | **Genuine Out-of-Stock** | Popular snack sells out; sales drop to 0, but on-hand stock is also **0** | ✅ **NOT FLAGGED**<br>ERP ledger accurately reflects 0 stock; no phantom contradiction. |
| `04_case_promo_collapse.csv` | **Promotion Collapse** | Active circular promotion for 3 days; expected ~20 units/day, but **0 sales**, stock = **50** | 🚨 **FLAGGED: CRITICAL**<br>Promotion-aware calibration triggers urgent alert even on short streaks. |
| `05_case_misplaced_multistore.csv` | **Misplaced Stock Classification** | Multi-store comparison: `STORE_01` has 0 sales for 7 days, but `STORE_02` sells 6 units/day | 🚨 **FLAGGED: Misplaced Stock**<br>Cross-store divergence flags aisle/bay misplacement rather than delisting. |

---

## How to Test in the Web UI

1. Open **StockSentinel AI** at `http://localhost:5173/`.
2. Scroll to **Frame 6 (Top-20 Daily Verification Queue)** or click **"Datasets"** in the top navigation.
3. Click **"Manage"** or **"Upload Dataset"**.
4. Drag & drop any of the CSV files from `data/testing_datasets/`.
5. Review the automated column schema preview and click **"Import & Set Active"**.
6. The entire application (Hero Metrics, Top-20 queue, Sales-vs-Stock charts, and ROI Calculator) immediately recalculates on that specific dataset!
