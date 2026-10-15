"""
Revenue Recovery & Business Impact Calculation Service for StockSentinel AI.

Derives measured values directly from active datasets, store catalog, and scan findings.
Calculates documented recoverable units, potential revenue at risk, recoverable revenue,
profit impact (when cost/margin data is available), and annualized network projections.
Distinguishes MEASURED values, ESTIMATES, and USER ASSUMPTIONS with visible arithmetic.
"""

import json
import uuid
from typing import Any
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from backend.app.db.models import Finding, SKU, Store, Dataset, Scan, BusinessImpactReport
from backend.app.schemas.recovery import (
    RecoveryEstimateRequest,
    RecoveryEstimateResponse,
    RecoveryArithmeticBreakdown,
    MetricSourceType,
    VisibleFormulaStep,
    MissingInputPrompt,
    PersistAssumptionsRequest,
)


class RecoveryCalculationService:
    """Computes empirical, dataset-driven revenue recovery and ROI metrics."""

    @staticmethod
    def calculate_impact(
        db: Session | None,
        params: RecoveryEstimateRequest,
    ) -> RecoveryEstimateResponse:
        """
        Derives business impact metrics from live scan/dataset findings when available.
        Falls back to parameterized retail mathematical simulation when no DB session is provided.
        """
        if db is None:
            return RecoveryCalculationService.calculate_pure_simulation(params)

        # 1. Resolve Dataset & Scan context
        dataset = None
        if params.dataset_id:
            dataset = db.get(Dataset, params.dataset_id)
        if not dataset:
            # Pick latest active/imported dataset if none specified
            dataset = db.scalars(
                select(Dataset).where(Dataset.status.in_(("imported", "validated"))).order_by(desc(Dataset.created_at))
            ).first()

        scan = None
        if params.scan_id:
            scan = db.get(Scan, params.scan_id)
        elif params.evaluation_date:
            conditions = [Scan.evaluation_date == params.evaluation_date]
            if dataset:
                conditions.append(Scan.dataset_id == dataset.dataset_id)
            scan = db.scalars(select(Scan).where(*conditions).order_by(desc(Scan.created_at))).first()
        elif dataset:
            scan = db.scalars(
                select(Scan).where(Scan.dataset_id == dataset.dataset_id).order_by(desc(Scan.created_at))
            ).first()

        if not scan:
            scan = db.scalars(select(Scan).order_by(desc(Scan.created_at))).first()

        # 2. Check for persisted user assumptions for this dataset/scan
        persisted_assumptions: dict[str, Any] = {}
        if dataset or scan:
            stmt = select(BusinessImpactReport)
            if scan and dataset:
                stmt = stmt.where(
                    BusinessImpactReport.scan_id == scan.scan_id,
                    BusinessImpactReport.dataset_id == dataset.dataset_id,
                )
            elif scan:
                stmt = stmt.where(BusinessImpactReport.scan_id == scan.scan_id)
            elif dataset:
                stmt = stmt.where(BusinessImpactReport.dataset_id == dataset.dataset_id)
            report_record = db.scalars(stmt.order_by(desc(BusinessImpactReport.updated_at))).first()
            if report_record and report_record.assumptions_json:
                try:
                    persisted_assumptions = json.loads(report_record.assumptions_json)
                except Exception:
                    persisted_assumptions = {}

        # Merge persisted assumptions if not overridden in query params
        days_saved = (
            params.days_saved_per_incident
            if params.days_saved_per_incident is not None
            else float(persisted_assumptions.get("days_saved_per_incident", 9.0))
        )
        capture_rate = (
            params.recovery_capture_rate
            if params.recovery_capture_rate is not None
            else float(persisted_assumptions.get("recovery_capture_rate", 60.0))
        )
        unverified_conversion = (
            params.unverified_conversion_rate
            if params.unverified_conversion_rate is not None
            else float(persisted_assumptions.get("unverified_conversion_rate", 60.0))
        )
        incidents_per_mo = (
            params.incidents_per_store_month
            if params.incidents_per_store_month is not None
            else int(persisted_assumptions.get("incidents_per_store_month", 16))
        )
        user_margin = (
            params.gross_margin_percent
            if params.gross_margin_percent is not None
            else (
                float(persisted_assumptions["gross_margin_percent"])
                if "gross_margin_percent" in persisted_assumptions
                else None
            )
        )

        # 3. Retrieve findings from database
        findings: list[Finding] = []
        if scan:
            findings = list(db.scalars(select(Finding).where(Finding.scan_id == scan.scan_id)).all())
        elif dataset:
            findings = list(db.scalars(select(Finding).where(Finding.dataset_id == dataset.dataset_id)).all())

        if not findings:
            # Fallback to simulation if zero findings exist in database
            sim_res = RecoveryCalculationService.calculate_pure_simulation(params)
            sim_res.dataset_id = dataset.dataset_id if dataset else None
            sim_res.dataset_name = dataset.name if dataset else None
            sim_res.scan_id = scan.scan_id if scan else None
            sim_res.evaluation_date = scan.evaluation_date if scan else (params.evaluation_date or "2025-04-18")
            return sim_res

        # 4. MEASURED Data Points from Active Findings
        n_flagged = len(findings)
        n_verified = sum(1 for f in findings if f.status == "verified")
        n_fp = sum(1 for f in findings if f.status == "false_positive")
        n_pending = sum(1 for f in findings if f.status in ("pending", "unresolved"))
        n_inspected = n_verified + n_fp

        if n_inspected > 0:
            measured_verification_rate = round((n_verified / n_inspected) * 100.0, 1)
            effective_conversion_rate = measured_verification_rate
            is_conversion_rate_assumed = False
        else:
            measured_verification_rate = None
            effective_conversion_rate = unverified_conversion
            is_conversion_rate_assumed = True

        # Stores covered in findings
        distinct_stores = {f.store_id for f in findings}
        stores_count = params.store_count if params.store_count is not None else (len(distinct_stores) or 1)

        # Extract SKU prices and costs
        sku_prices = []
        sku_costs = []
        for f in findings:
            if f.sku:
                if f.sku.price is not None and f.sku.price > 0:
                    sku_prices.append(f.sku.price)
                if f.sku.cost is not None and f.sku.cost > 0:
                    sku_costs.append(f.sku.cost)

        has_price_data = len(sku_prices) > 0
        has_cost_data = len(sku_costs) >= (len(findings) * 0.5) and len(sku_costs) > 0

        avg_price = (
            round(sum(sku_prices) / len(sku_prices), 2)
            if sku_prices
            else (params.avg_price_inr or 250.0)
        )
        avg_cost = round(sum(sku_costs) / len(sku_costs), 2) if sku_costs else None

        detected_gross_margin_pct = None
        if has_cost_data and avg_cost is not None and avg_price > 0:
            detected_gross_margin_pct = round(((avg_price - avg_cost) / avg_price) * 100.0, 1)

        # 5. Core Mathematical Calculations (Finding by Finding)
        capture_fraction = capture_rate / 100.0
        pending_weight = effective_conversion_rate / 100.0

        total_ledger_stock = 0
        total_units_at_risk = 0.0
        total_revenue_at_risk = 0.0
        total_recoverable_units = 0.0
        total_recoverable_revenue = 0.0
        total_profit_impact = 0.0
        profit_calculated_items = 0

        for f in findings:
            stock = max(0, f.recorded_stock)
            total_ledger_stock += stock
            velocity = max(0.1, f.historical_daily_velocity)
            price = f.sku.price if (f.sku and f.sku.price) else avg_price
            cost = f.sku.cost if (f.sku and f.sku.cost) else None

            # Determine conversion weight: verified = 1.0, false_positive = 0.0, pending = pending_weight
            if f.status == "verified":
                weight = 1.0
            elif f.status == "false_positive":
                weight = 0.0
            else:
                weight = pending_weight

            # Potential units & revenue at risk (lost demand across the audit latency window)
            item_units_at_risk = min(float(stock), days_saved * velocity)
            item_rev_at_risk = item_units_at_risk * price
            total_units_at_risk += item_units_at_risk
            total_revenue_at_risk += item_rev_at_risk

            # Recoverable units & revenue (discounted by customer capture rate and verification weight)
            item_rec_units = weight * min(float(stock), days_saved * velocity * capture_fraction)
            item_rec_rev = item_rec_units * price
            total_recoverable_units += item_rec_units
            total_recoverable_revenue += item_rec_rev

            # Profit impact calculation
            if cost is not None and cost > 0:
                total_profit_impact += item_rec_units * max(0.0, price - cost)
                profit_calculated_items += 1
            elif user_margin is not None:
                total_profit_impact += item_rec_rev * (user_margin / 100.0)
                profit_calculated_items += 1

        # Profit Impact presence & classification
        has_profit_impact = False
        final_profit_impact = None
        margin_source = MetricSourceType.ASSUMED
        missing_cost_note = None

        if has_cost_data and profit_calculated_items > 0:
            has_profit_impact = True
            final_profit_impact = round(total_profit_impact, 2)
            margin_source = MetricSourceType.MEASURED
        elif user_margin is not None:
            has_profit_impact = True
            final_profit_impact = round(total_recoverable_revenue * (user_margin / 100.0), 2)
            margin_source = MetricSourceType.ASSUMED
        else:
            has_profit_impact = False
            final_profit_impact = None
            missing_cost_note = "Unit cost data is missing from dataset. Provide gross margin % to estimate profit impact."

        # 6. Annualized Projections (when observation/assumptions justify)
        can_annualize = True
        annual_incidents_network = stores_count * incidents_per_mo * 12
        avg_rec_per_incident = (
            total_recoverable_revenue / n_flagged if n_flagged > 0 else 0.0
        )
        annualized_revenue = round(annual_incidents_network * avg_rec_per_incident, 2)
        annualized_profit = (
            round(annualized_revenue * (detected_gross_margin_pct or user_margin or 28.0) / 100.0, 2)
            if (has_cost_data or user_margin is not None)
            else None
        )
        annual_multiplier = round(annual_incidents_network / n_flagged, 1) if n_flagged > 0 else 1.0

        annualization_basis = (
            f"Projected across {stores_count} store(s) based on {incidents_per_mo} expected phantom incidents "
            f"per store/month ({annual_incidents_network:,} annual network incidents)."
        )
        annualized_methodology = (
            f"Annual Recoverable Revenue = {annual_incidents_network:,} incidents × ₹{round(avg_rec_per_incident, 2):,} avg recoverable revenue / incident = ₹{annualized_revenue:,}."
        )

        # 7. Step-by-Step Visible Formulas with substituted numbers
        formula_steps: list[VisibleFormulaStep] = [
            VisibleFormulaStep(
                step_number=1,
                title="Flagged vs Verified Count",
                formula="Inspected = Verified + False_Positives; Pending = Flagged - Inspected",
                substituted=f"Flagged = {n_flagged} | Verified = {n_verified} | False Positives = {n_fp} | Pending = {n_pending}",
                result_text=f"{n_verified} confirmed / {n_flagged} flagged ({measured_verification_rate if measured_verification_rate is not None else unverified_conversion}% conversion weight)",
                source_type=MetricSourceType.MEASURED,
                note="Flagged alerts are never equated with confirmed recoveries. False positives receive 0% weight.",
            ),
            VisibleFormulaStep(
                step_number=2,
                title="Estimated Recoverable Units",
                formula="Recoverable_Units = Σ [ Weight_i × min(Stock_i, Days_Saved × Velocity_i × Capture_Rate) ]",
                substituted=f"Σ [ W_i × min(Stock_i, {days_saved}d saved × Velocity_i × {capture_rate}% capture) ] across {n_flagged} SKUs",
                result_text=f"{round(total_recoverable_units, 2):,} Units",
                source_type=MetricSourceType.ESTIMATED,
                note="Strictly bounded by actual ledger stock on hand to prevent mathematical over-counting.",
            ),
            VisibleFormulaStep(
                step_number=3,
                title="Potential Revenue at Risk",
                formula="Revenue_at_Risk = Σ [ min(Stock_i, Days_Saved × Velocity_i) × Price_i ]",
                substituted=f"Σ [ min(Stock_i, {days_saved}d × Velocity_i) × Price_i ] across {n_flagged} items",
                result_text=f"₹{round(total_revenue_at_risk, 2):,}",
                source_type=MetricSourceType.ESTIMATED,
                note="Represents unconstrained gross retail demand jeopardized while shelf remains empty.",
            ),
            VisibleFormulaStep(
                step_number=4,
                title="Estimated Recoverable Revenue",
                formula="Recoverable_Revenue = Σ [ Recoverable_Units_i × Price_i ]",
                substituted=f"{round(total_recoverable_units, 2):,} recoverable units × ₹{avg_price:,} avg price",
                result_text=f"₹{round(total_recoverable_revenue, 2):,}",
                source_type=MetricSourceType.ESTIMATED,
                note="Gross retail sales captured through associate shelf restocking on day of detection.",
            ),
            VisibleFormulaStep(
                step_number=5,
                title="Estimated Profit Impact",
                formula="Profit_Impact = Σ [ Recoverable_Units_i × (Price_i - Cost_i) ]" if has_cost_data else "Profit_Impact = Recoverable_Revenue × (Gross_Margin% / 100)",
                substituted=(
                    f"Σ [ Units_i × (Price_i - Cost_i) ] with measured unit costs (avg cost: ₹{avg_cost})"
                    if has_cost_data
                    else f"₹{round(total_recoverable_revenue, 2):,} × {user_margin or 28.0}% assumed gross margin"
                ),
                result_text=f"₹{final_profit_impact:,}" if final_profit_impact is not None else "Requires Gross Margin %",
                source_type=margin_source,
                note=(
                    "Directly derived from SKU unit cost prices mapped from uploaded dataset."
                    if has_cost_data
                    else "Derived from user-provided gross margin assumption because unit costs were not mapped."
                ),
            ),
            VisibleFormulaStep(
                step_number=6,
                title="Annualized Network Recovery",
                formula="Annual_Revenue = Total_Annual_Incidents × Avg_Recoverable_Revenue_per_Incident",
                substituted=f"{annual_incidents_network:,} network incidents ({stores_count} stores × {incidents_per_mo}/mo × 12) × ₹{round(avg_rec_per_incident, 2):,}",
                result_text=f"₹{round(annualized_revenue, 2):,} / yr (~₹{round(annualized_revenue / 100000, 2)} Lakhs)",
                source_type=MetricSourceType.ESTIMATED,
                note=annualization_basis,
            ),
        ]

        # 8. Missing Input Prompts
        missing_prompts: list[MissingInputPrompt] = []
        if not has_cost_data:
            missing_prompts.append(
                MissingInputPrompt(
                    field_key="gross_margin_percent",
                    label="Retail Gross Margin %",
                    question="Unit costs were not found in your SKU master. What gross margin % should be applied to calculate profit impact?",
                    default_assumption=28.0,
                    current_value=user_margin,
                    unit="%",
                    why_needed="Necessary to separate net gross profit protected from top-line gross merchandise revenue.",
                )
            )

        if n_inspected == 0:
            missing_prompts.append(
                MissingInputPrompt(
                    field_key="unverified_conversion_rate",
                    label="Unverified Conversion Rate",
                    question=f"All {n_flagged} alerts are currently pending physical floor verification. What conversion / precision rate should be assumed for uninspected alerts?",
                    default_assumption=60.0,
                    current_value=unverified_conversion,
                    unit="%",
                    why_needed="Ensures uninspected alerts are discounted and never equated 1-to-1 with confirmed recoveries.",
                )
            )

        # Assumptions applied
        assumptions_applied = {
            "days_saved_per_incident": days_saved,
            "recovery_capture_rate": capture_rate,
            "unverified_conversion_rate": unverified_conversion,
            "incidents_per_store_month": incidents_per_mo,
            "gross_margin_percent": user_margin if user_margin is not None else detected_gross_margin_pct,
            "margin_source": margin_source.value,
            "stores_count": stores_count,
        }

        # Observation dates
        start_d, end_d, obs_days = None, None, None
        if dataset and dataset.detected_schema_json:
            try:
                schema_dict = json.loads(dataset.detected_schema_json)
                drange = schema_dict.get("date_range")
                if drange and len(drange) == 2:
                    start_d, end_d = drange[0], drange[1]
            except Exception:
                pass

        # Legacy arithmetic object
        legacy_arithmetic = RecoveryArithmeticBreakdown(
            step_1_units_per_incident=round(total_recoverable_units / n_flagged, 2) if n_flagged else 11.88,
            step_2_revenue_per_incident_inr=round(avg_rec_per_incident, 2),
            step_3_annual_incidents=annual_incidents_network,
            step_4_annual_revenue_protected_inr=annualized_revenue,
            step_5_annual_margin_saved_inr=round(annualized_profit or 0.0, 2),
            per_store_annual_revenue_inr=round(annualized_revenue / stores_count, 2) if stores_count else 0.0,
        )

        return RecoveryEstimateResponse(
            currency="INR",
            currency_symbol="₹",
            dataset_id=dataset.dataset_id if dataset else None,
            dataset_name=dataset.name if dataset else None,
            scan_id=scan.scan_id if scan else None,
            evaluation_date=scan.evaluation_date if scan else params.evaluation_date,
            total_findings_count=n_flagged,
            verified_findings_count=n_verified,
            false_positive_count=n_fp,
            pending_verification_count=n_pending,
            inspected_count=n_inspected,
            measured_verification_rate_percent=measured_verification_rate,
            effective_conversion_rate_percent=effective_conversion_rate,
            is_conversion_rate_assumed=is_conversion_rate_assumed,
            has_cost_data=has_cost_data,
            has_price_data=has_price_data,
            detected_avg_selling_price=avg_price,
            detected_avg_unit_cost=avg_cost,
            detected_gross_margin_percent=detected_gross_margin_pct,
            margin_source=margin_source,
            total_ledger_units_flagged=total_ledger_stock,
            estimated_recoverable_units=round(total_recoverable_units, 2),
            potential_units_at_risk=round(total_units_at_risk, 2),
            potential_revenue_at_risk=round(total_revenue_at_risk, 2),
            estimated_recoverable_revenue=round(total_recoverable_revenue, 2),
            has_profit_impact=has_profit_impact,
            estimated_profit_impact=final_profit_impact,
            missing_cost_note=missing_cost_note,
            can_annualize=can_annualize,
            annualization_basis=annualization_basis,
            annualization_multiplier=annual_multiplier,
            annualized_recoverable_revenue=annualized_revenue,
            annualized_profit_impact=annualized_profit,
            annualized_total_incidents=annual_incidents_network,
            annualized_methodology=annualized_methodology,
            visible_formula_steps=formula_steps,
            missing_input_prompts=missing_prompts,
            assumptions_applied=assumptions_applied,
            persisted_assumptions=persisted_assumptions,
            stores_count=stores_count,
            observation_period_days=obs_days,
            observation_start_date=start_d,
            observation_end_date=end_d,
            annual_revenue_protected_inr=annualized_revenue,
            annual_margin_saved_inr=round(annualized_profit or 0.0, 2),
            per_store_annual_recovery_inr=round(annualized_revenue / stores_count, 2) if stores_count else 0.0,
            total_annual_rupees_recovered=annualized_revenue,
            per_store_annual_recovery=round(annualized_revenue / stores_count, 2) if stores_count else 0.0,
            total_annual_incidents=annual_incidents_network,
            units_saved_per_incident=round(total_recoverable_units / n_flagged, 2) if n_flagged else 11.88,
            rupees_recovered_per_incident=round(avg_rec_per_incident, 2),
            arithmetic_steps=[s.substituted for s in formula_steps],
            assumptions=assumptions_applied,
            arithmetic=legacy_arithmetic,
        )

    @staticmethod
    def calculate_pure_simulation(params: RecoveryEstimateRequest) -> RecoveryEstimateResponse:
        """Fallback parameterized mathematical modeling when database records are absent."""
        store_count = params.store_count or 25
        avg_price = params.avg_price_inr or 250.0
        incidents_mo = params.incidents_per_store_month or 16
        days_saved = params.days_saved_per_incident or 9.0
        velocity = params.daily_sales_velocity or 2.2
        capture_fraction = (params.recovery_capture_rate or 60.0) / 100.0
        margin_pct = params.gross_margin_percent or 28.0

        units_per_incident = round(days_saved * velocity * capture_fraction, 2)
        revenue_per_incident = round(units_per_incident * avg_price, 2)
        total_incidents = store_count * incidents_mo * 12
        total_revenue_protected = round(total_incidents * revenue_per_incident, 2)
        total_margin_saved = round(total_revenue_protected * (margin_pct / 100.0), 2)
        per_store_recovery = round(total_revenue_protected / store_count, 2) if store_count > 0 else 0.0

        legacy_arithmetic = RecoveryArithmeticBreakdown(
            step_1_units_per_incident=units_per_incident,
            step_2_revenue_per_incident_inr=revenue_per_incident,
            step_3_annual_incidents=total_incidents,
            step_4_annual_revenue_protected_inr=total_revenue_protected,
            step_5_annual_margin_saved_inr=total_margin_saved,
            per_store_annual_revenue_inr=per_store_recovery,
        )

        steps = [
            VisibleFormulaStep(
                step_number=1,
                title="Recoverable Units per Incident",
                formula="Units = Days_Saved × Daily_Velocity × Capture_Rate",
                substituted=f"{days_saved}d × {velocity} u/d × {round(capture_fraction * 100)}% = {units_per_incident} units",
                result_text=f"{units_per_incident} units / incident",
                source_type=MetricSourceType.ESTIMATED,
                note="Theoretical units saved per incident before physical restocking.",
            ),
            VisibleFormulaStep(
                step_number=2,
                title="Gross Revenue Recovered per Incident",
                formula="Revenue = Units × Avg_Price_INR",
                substituted=f"{units_per_incident} units × ₹{avg_price} = ₹{revenue_per_incident:,}",
                result_text=f"₹{revenue_per_incident:,} / incident",
                source_type=MetricSourceType.ESTIMATED,
                note="Gross sales preserved through timely detection.",
            ),
            VisibleFormulaStep(
                step_number=3,
                title="Annual Incidents across Network",
                formula="Annual_Incidents = Store_Count × Monthly_Incidents × 12",
                substituted=f"{store_count} stores × {incidents_mo}/mo × 12 = {total_incidents:,}",
                result_text=f"{total_incidents:,} annual incidents",
                source_type=MetricSourceType.ASSUMED,
                note="Network extrapolation assumption.",
            ),
            VisibleFormulaStep(
                step_number=4,
                title="Annual Revenue Protected",
                formula="Annual_Revenue = Annual_Incidents × Revenue_per_Incident",
                substituted=f"{total_incidents:,} incidents × ₹{revenue_per_incident:,} = ₹{total_revenue_protected:,}",
                result_text=f"₹{total_revenue_protected:,} / yr",
                source_type=MetricSourceType.ESTIMATED,
                note="Total annual gross revenue protected.",
            ),
            VisibleFormulaStep(
                step_number=5,
                title="Estimated Gross Margin Saved",
                formula="Margin_Saved = Annual_Revenue × (Gross_Margin% / 100)",
                substituted=f"₹{total_revenue_protected:,} × {margin_pct}% = ₹{total_margin_saved:,}",
                result_text=f"₹{total_margin_saved:,} / yr",
                source_type=MetricSourceType.ASSUMED,
                note="Gross profit impact derived from assumed margin.",
            ),
        ]

        assumptions = {
            "store_count": store_count,
            "avg_price_inr": avg_price,
            "incidents_per_store_month": incidents_mo,
            "days_saved_per_incident": days_saved,
            "daily_sales_velocity": velocity,
            "recovery_capture_rate_percent": round(capture_fraction * 100),
            "gross_margin_percent": margin_pct,
        }

        return RecoveryEstimateResponse(
            currency="INR",
            currency_symbol="₹",
            stores_count=store_count,
            detected_avg_selling_price=avg_price,
            has_price_data=True,
            has_cost_data=False,
            has_profit_impact=True,
            estimated_profit_impact=total_margin_saved,
            annual_revenue_protected_inr=total_revenue_protected,
            annual_margin_saved_inr=total_margin_saved,
            per_store_annual_recovery_inr=per_store_recovery,
            total_annual_rupees_recovered=total_revenue_protected,
            per_store_annual_recovery=per_store_recovery,
            total_annual_incidents=total_incidents,
            units_saved_per_incident=units_per_incident,
            rupees_recovered_per_incident=revenue_per_incident,
            estimated_recoverable_units=units_per_incident * 20,
            potential_revenue_at_risk=total_revenue_protected,
            estimated_recoverable_revenue=total_revenue_protected,
            can_annualize=True,
            annualization_basis=f"Network projection across {store_count} stores",
            annualized_recoverable_revenue=total_revenue_protected,
            annualized_profit_impact=total_margin_saved,
            annualized_total_incidents=total_incidents,
            visible_formula_steps=steps,
            assumptions_applied=assumptions,
            assumptions=assumptions,
            arithmetic=legacy_arithmetic,
            arithmetic_steps=[s.substituted for s in steps],
        )

    @staticmethod
    def persist_assumptions(
        db: Session,
        payload: PersistAssumptionsRequest,
    ) -> dict[str, Any]:
        """Saves custom user assumptions tied to a specific dataset and scan."""
        assumptions_data = {
            "days_saved_per_incident": payload.days_saved_per_incident,
            "recovery_capture_rate": payload.recovery_capture_rate,
            "gross_margin_percent": payload.gross_margin_percent,
            "unverified_conversion_rate": payload.unverified_conversion_rate,
            "incidents_per_store_month": payload.incidents_per_store_month,
        }
        # Filter None
        assumptions_clean = {k: v for k, v in assumptions_data.items() if v is not None}

        # Check existing report
        stmt = select(BusinessImpactReport)
        if payload.scan_id and payload.dataset_id:
            stmt = stmt.where(
                BusinessImpactReport.scan_id == payload.scan_id,
                BusinessImpactReport.dataset_id == payload.dataset_id,
            )
        elif payload.scan_id:
            stmt = stmt.where(BusinessImpactReport.scan_id == payload.scan_id)
        elif payload.dataset_id:
            stmt = stmt.where(BusinessImpactReport.dataset_id == payload.dataset_id)
        else:
            stmt = stmt.where(BusinessImpactReport.evaluation_date == payload.evaluation_date)

        existing = db.scalars(stmt).first()
        if existing:
            current_dict = json.loads(existing.assumptions_json) if existing.assumptions_json else {}
            current_dict.update(assumptions_clean)
            existing.assumptions_json = json.dumps(current_dict)
            existing.evaluation_date = payload.evaluation_date
            db.commit()
            db.refresh(existing)
            return {"status": "updated", "report_id": existing.report_id, "assumptions": current_dict}

        report_id = f"BIR_{uuid.uuid4().hex[:10]}"
        new_record = BusinessImpactReport(
            report_id=report_id,
            dataset_id=payload.dataset_id,
            scan_id=payload.scan_id,
            evaluation_date=payload.evaluation_date,
            assumptions_json=json.dumps(assumptions_clean),
            metrics_json="{}",
        )
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
        return {"status": "created", "report_id": report_id, "assumptions": assumptions_clean}
