# StockSentinel AI — Requirements Traceability & Audit Matrix

> **Authoritative Specification:** Official Talent AP Mega Hackathon Problem Statement: `R1. The Phantom Stock-Out Detector` (`docs/R1_The_Phantom_Stock-Out_Detector.pdf`)  
> **Evaluation Reference:** `StockSentinel_AI_Round1_Judges_Ready.pdf` (`docs/StockSentinel_AI_Round1_Judges_Ready.pdf`)  
> **Audit Date:** 2026-10-28 18:25 IST  
> **Branch:** `feature/cinematic-website-rebuild`  

---

## 1. Compliance Audit Matrix

| # | Official PDF Requirement | Codebase Target (FE / BE / DB / API / Test) | Status | Evidence | Missing Work / Next Action |
|---|--------------------------|---------------------------------------------|--------|----------|----------------------------|
| **1.1** | **Process daily sales and recorded inventory per SKU-store-day** | `backend/app/db/models.py` (`DailyRecord`), `detection_service.py`, `dataset_service.py` | ✅ **PASS** | `DailyRecord` table stores `(date, store_id, sku_id, sales, on_hand_stock)`. Ingestion parses CSV/XLSX/Parquet. | Tested in `backend/tests/test_dataset_ingestion.py`. |
| **1.2** | **Detect cases where stock > 0 but sales == 0 for configurable $N$ consecutive days** | `detection_service.py` (`evaluate_sku_store_history`), `scans.py` | ✅ **PASS** | `consecutive_zero_days >= threshold_days` enforced with configurable threshold ($N \ge 3$). | Tested in `test_positive_stock_consecutive_zero_sales_detected`. |
| **1.3** | **Explain and justify chosen threshold $N$** | `detection_service.py`, `ARCHITECTURE.md`, `PhantomProblemSection.tsx` | ✅ **PASS** | $N=3$ justified via Poisson inter-arrival math ($P(0 \text{ sales}) = e^{-\lambda \cdot N} < 0.05$ for velocity $\ge 1.0$). Displayed in UI and API responses. | Documented in `ARCHITECTURE.md` Section 3. |
| **1.4** | **Protect slow-moving SKUs from false-positive drowning** | `detection_service.py` (`poisson_p_zero > 0.15 and daily_velocity < 0.35`) | ✅ **PASS** | Bayesian/Poisson filter evaluates whether zero sales is statistically normal variance before flagging. | Tested in `test_slow_moving_sku_protection`. |
| **1.5** | **Account for promotions, holidays, and calendar gaps** | `detection_service.py` (`is_promotion`, calendar date contiguity), `models.py` (`PromotionCalendar`) | ✅ **PASS** | Contiguous calendar date enforcement terminates streak across missing dates; active promo boosts confidence; holiday sales drops protected. | Tested in `test_holiday_false_positive_protection`, `test_promotion_amplifies_suspicion`. |
| **1.6** | **Zero reliance on camera, RFID, or staff tracking** | Entire codebase architecture | ✅ **PASS** | Zero external hardware dependencies; 100% powered by existing POS sales logs and ERP/WMS inventory ledgers. | Architecture verified in Section 1 of `ARCHITECTURE.md`. |
| **1.7** | **Distinguish suspicious record from confirmed shelf stock-out** | `models.py` (`Finding.status`), `findings.py` (`update_finding_status`), `Top20VerificationSection.tsx` | ✅ **PASS** | Findings flagged as `pending` (suspicious); transitioned to `verified`, `misplaced`, `false_positive`, `unresolved` only upon human associate audit. | Tested in `test_verification_status_update_and_reload_persistence`. |
| **2.1** | **Ranked daily "go check this shelf" list: Store, SKU, confidence, plain reason** | `detection_service.py` (`DetectionCandidate`), `models.py` (`Finding`), `Top20VerificationSection.tsx` | ✅ **PASS** | Returns store, SKU name, shelf bay, confidence %, and English explanation. | Verified in `test_ranking_determinism_and_tie_breaking`. |
| **2.2** | **Strict cap of $\le 20$ physical inspections per store per day** | `scans.py`, `schemas/scan.py` (`max_findings_per_store = 20`), `test_top20.py` | ✅ **PASS** | Hard cap at 20 enforced in SQL query slice and Pydantic schema validation. | Tested in `test_strict_cap_at_20_findings` and `test_top20_constraint_clamps_client_request_above_20`. |
| **2.3** | **Queue responsive to uploaded datasets and active filters** | `Top20VerificationSection.tsx`, `DatasetManagerModal.tsx`, `apiClient.ts` | 🟡 **PARTIAL** | Core dataset dropdown and filtering exists. Needs guarantee that switching datasets invalidates stale results and resets active queue across all frames. | Enhance dataset change callback across Hero, Top-20, and ROI frames. |
| **2.4** | **No hardcoded example products as live findings** | `Top20VerificationSection.tsx`, `apiAdapters.ts` | 🟡 **PARTIAL** | Live items load from `/api/findings`. Fallback items exist for zero-data/offline mode; must be explicitly badged as "DEMO PREVIEW". | Add explicit synthetic/demo banner when displaying offline items. |
| **3.1** | **Implement and verify `evaluate.py`** | `evaluate.py`, `backend/evaluate.py`, `backend/app/services/evaluation_service.py` | ✅ **PASS** | Standalone benchmark runner and FastAPI `/api/evaluation` endpoint compute Precision@20 and Recall against ground-truth CSV. | Verified via `python evaluate.py` (100% recall on synthetic benchmark). |
| **3.2** | **Prevent label leakage into detection or ranking** | `models.py` (`GroundTruthLabel`), `detection_service.py`, `scans.py` | ✅ **PASS** | `GroundTruthLabel` table is isolated; `detection_service.py` does not join or query `ground_truth_labels`. | Verified by code audit and `data/README.md` isolation rules. |
| **3.3** | **Respect positive-only label semantics; document missing labels** | `evaluation_service.py`, `evaluate.py` | 🟡 **PARTIAL** | Precision calculated on known true positives; need clear UI and terminal documentation that unlabeled items are treated as unconfirmed rather than assumed true negatives. | Add disclaimer and denominator documentation in evaluation modal. |
| **3.4** | **Report evaluation sample size and fallback if ground truth unavailable** | `evaluation_service.py`, `Top20VerificationSection.tsx` | 🟡 **PARTIAL** | When no labels exist for a custom dataset, UI should show "Evaluation unavailable — ground-truth labels required" rather than crashing or displaying 0%. | Add explicit conditional banner in evaluation modal. |
| **4.1** | **Sales vs recorded stock chart for flagged SKUs** | `SalesStockChart.tsx`, `Top20VerificationSection.tsx` | ✅ **PASS** | 14-day dual-axis time series displaying on-hand inventory vs checkout lane sales with hover tooltips and promotion markers. | Displayed in live Product Detail Drawer. |
| **4.2** | **Estimate annual rupees recovered with transparent arithmetic** | `BusinessImpactSection.tsx`, `recovery.py`, `impactCalculations.ts` | ✅ **PASS** | Step-by-step formula breakdown ($Recoverable = Units \times Price \times Days \times Rate$). Realized vs Estimated distinction clearly presented. | Tested in `backend/tests/test_business_impact.py`. |
| **5.1** | **Stretch: Distinguish phantom stockout vs misplaced vs delisted** | `detection_service.py` (`anomaly_type`), `Top20VerificationSection.tsx` | ✅ **PASS** | Distinguishes `phantom_stockout` (extended streak, positive stock), `misplaced` (moderate mover, short streak), and `delisted` (SKU status flag). | Tested in `test_api_full_workflow`. |
| **6.1** | **Signature Feature: Evidence-Backed Investigator with OmniRoute AI** | `reasoning_service.py`, `Top20VerificationSection.tsx`, `findings.py` | ✅ **PASS** | Live qualitative diagnosis and 3-step physical verification checklist streamed from `groq/openai/gpt-oss-120b` via OmniRoute. | Verified live in Session Commit `6ba3ef5`. |

---

## 2. Prioritized Implementation Plan

- **Phase 1: Verification & Traceability Baseline (Current)**
  - Establish `REQUIREMENTS_AUDIT.md` and verify ground truth PDF requirements.
- **Phase 2: Data Pipeline & Truthfulness Hardening**
  - Ensure custom dataset switching across all frames completely resets cached findings, hero metrics, and ROI figures.
  - Add explicit "DEMO / SYNTHETIC PREVIEW" badging if offline fallback items are ever rendered.
  - In evaluation modal, show "Evaluation unavailable — ground-truth labels required" when evaluating datasets without planted labels.
- **Phase 3: Dataset Ingestion File Upload Enhancement**
  - Verify multi-format ingestion (.csv, .xlsx, .parquet) from frontend modal with row-level error reporting and column remapping.
- **Phase 4: Responsive UI & Alignment Polish**
  - Verify detail drawer layout, sticky navbar clearance, and z-index across mobile, tablet, and desktop viewports.
- **Phase 5: Full Regression Test & Project Status Documentation**
  - Run frontend test suite, frontend build, backend pytest suite, and benchmark runner.
