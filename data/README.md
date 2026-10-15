# StockSentinel AI synthetic test dataset

Synthetic functional-test data only; not real retail data and not the official benchmark.

## Files
- `daily_sales_inventory.csv`: 30,000 rows with date, store_id, sku_id, units_sold, on_hand, promotion_active, holiday_flag.
- `store_master.csv`: store metadata.
- `sku_master.csv`: product metadata and illustrative unit cost/price.
- `promotion_calendar.csv`: promotion windows and lift factors.
- `ground_truth_labels_EVALUATION_ONLY.csv`: planted positive labels for evaluation only. Never include this file as detector input or use it to build features.

## Scope
120 days (2025-01-01 to 2025-04-30), 5 stores, 50 SKUs. Includes slow-moving products, weekday/seasonal variation, promotion periods, and planted phantom-stock-out intervals.

## Suggested workflow
1. Upload `daily_sales_inventory.csv`.
2. Optionally upload the store master, SKU master, and promotion calendar as supporting files.
3. Map `date` -> date, `store_id` -> store, `sku_id` -> SKU, `units_sold` -> sales, `on_hand` -> recorded stock.
4. Validate, import, then scan a date near the end of the date range.
5. Use the ground-truth file only via the backend's evaluation-only mechanism.

Important: this file contains positive labels only. Do not automatically treat every unlabeled row as a confirmed negative unless the evaluator's label semantics explicitly support that assumption. This dataset is for integration testing, not a valid real-world accuracy claim.
