# Saffron Retail Group — Official Hackathon Dataset

This directory contains the official data package for **R1 — The Phantom Stock-Out Detector** (TalentAP Mega Hackathon 2026).

## Files

- `daily_sales_inventory_sample_2stores.csv`: 110,400 daily inventory and register sales rows (2 stores × 120 days: `STR-BFPW` and `STR-H5GD`).
- `daily_sales_inventory.parquet`: (Optional full dataset, 7,970,112 rows for all 25 stores). Available in the official pack or external storage.
- `store_master.csv`: 25 retail stores with store format (`Hyper`, `Market`, `Express`), size in sqft, city, state, city tier (1, 2, 3), and label split (`dev_labelled` / `test_hidden`).
- `sku_master.csv`: 800 FMCG SKUs across categories with unit price, unit cost, margin, shelf life, and case pack.
- `promotion_calendar.csv`: 1,789 active promotional campaigns with discount percentages.
- `holiday_calendar.csv`: 27 Indian national and regional holidays (2025–2026).
- `dev_labels.csv`: 2,905 public anomaly episodes for the 13 dev stores.
- `dev_truth.csv`: 24,639 scored store-SKU-days for dev evaluation via `evaluate.py`.

## Suggested Workflow

1. In StockSentinel AI UI, open **Dataset Manager** and click **Restore Saffron Retail Benchmark** (or upload your custom CSV/Parquet dataset).
2. Execute a scan for dates between `2026-06-04` and `2026-09-30` (e.g. `2026-07-01` or `2026-09-01`).
3. Inspect the explainable Evidence Passports, physical inspection checklists, and business impact estimates.
4. Run official benchmark validation:
   ```bash
   python evaluate.py --submission submission/R1_predictions_dev.csv --truth data/dev_truth.csv
   ```
