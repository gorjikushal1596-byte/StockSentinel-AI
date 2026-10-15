/**
 * Business Impact and ROI calculation engine for StockSentinel AI.
 * 
 * Provides pure, deterministic formulas for:
 * 1. Findings vs Verified Findings & effective conversion rates
 * 2. Estimated Recoverable Units strictly bounded by ledger stock
 * 3. Potential Revenue at Risk (nominal value of trapped stock)
 * 4. Estimated Recoverable Revenue (bounded by velocity, days saved, capture rate, and verification status)
 * 5. Estimated Profit Impact (only when cost or margin is mapped/provided)
 * 6. Annualized Projections (when observation period justifies extrapolation)
 */

export interface FindingItemSummary {
  id: string;
  sku: string;
  store_id: string;
  stock: number;
  price: number;
  cost?: number | null;
  daily_velocity: number;
  status: 'verified' | 'false_positive' | 'pending' | string;
}

export interface ImpactCalculationParams {
  findings: FindingItemSummary[];
  days_saved: number;
  capture_rate_percent: number;
  gross_margin_percent?: number | null;
  unverified_conversion_rate: number; // e.g. 60.0%
  observation_period_days?: number | null;
  store_count?: number;
  annualization_enabled?: boolean;
}

export interface ImpactCalculationResult {
  // 1. Findings & Verification
  total_findings: number;
  verified_findings: number;
  false_positives: number;
  pending_findings: number;
  inspected_count: number;
  measured_conversion_rate_percent: number | null;
  effective_conversion_rate_percent: number;
  is_conversion_rate_assumed: boolean;

  // 2. Recoverable Units (Bounded)
  total_ledger_units_flagged: number;
  estimated_recoverable_units: number;
  recoverable_units_method: string;

  // 3. Potential Revenue at Risk
  potential_units_at_risk: number;
  potential_revenue_at_risk: number;
  revenue_at_risk_method: string;

  // 4. Estimated Recoverable Revenue
  estimated_recoverable_revenue: number;
  recoverable_revenue_method: string;

  // 5. Estimated Profit Impact
  has_profit_impact: boolean;
  estimated_profit_impact: number | null;
  detected_gross_margin_percent: number | null;
  has_unit_cost_data: boolean;
  profit_impact_method: string;
  missing_cost_note: string | null;

  // 6. Annualized Estimates
  can_annualize: boolean;
  annualization_multiplier: number;
  annualized_recoverable_revenue: number | null;
  annualized_profit_impact: number | null;
  annualization_methodology: string;

  // Currency & Store Context
  detected_avg_price: number;
  detected_avg_cost: number | null;
  stores_count: number;
}

/**
 * Calculates business impact from finding summaries and assumptions.
 */
export function calculateBusinessImpact(params: ImpactCalculationParams): ImpactCalculationResult {
  const {
    findings,
    days_saved,
    capture_rate_percent,
    gross_margin_percent,
    unverified_conversion_rate,
    observation_period_days,
    store_count,
    annualization_enabled = true,
  } = params;

  const total_findings = findings.length;
  let verified_findings = 0;
  let false_positives = 0;
  let pending_findings = 0;

  for (const f of findings) {
    const s = (f.status || '').toLowerCase();
    if (s.includes('verified') || s.includes('resolved') || s.includes('found')) {
      verified_findings += 1;
    } else if (s.includes('false_positive') || s.includes('false positive')) {
      false_positives += 1;
    } else {
      pending_findings += 1;
    }
  }

  const inspected_count = verified_findings + false_positives;
  let measured_conversion_rate_percent: number | null = null;
  let effective_conversion_rate_percent = unverified_conversion_rate;
  let is_conversion_rate_assumed = true;

  if (inspected_count > 0) {
    measured_conversion_rate_percent = (verified_findings / inspected_count) * 100.0;
    effective_conversion_rate_percent = measured_conversion_rate_percent;
    is_conversion_rate_assumed = false;
  }

  const unverified_weight = (effective_conversion_rate_percent / 100.0);
  const capture_factor = Math.max(0.01, Math.min(1.0, capture_rate_percent / 100.0));
  const effective_days_saved = Math.max(0.5, days_saved);

  let total_ledger_units_flagged = 0;
  let estimated_recoverable_units = 0;
  let potential_revenue_at_risk = 0;
  let estimated_recoverable_revenue = 0;
  let profit_impact_from_costs = 0;
  let items_with_cost = 0;
  let sum_price = 0;
  let sum_cost = 0;

  const distinctStores = new Set<string>();

  for (const f of findings) {
    if (f.store_id) distinctStores.add(f.store_id);

    const stock = Math.max(0, f.stock || 0);
    const price = Math.max(0, f.price || 0);
    const cost = f.cost !== undefined && f.cost !== null ? Math.max(0, f.cost) : null;
    const velocity = Math.max(0.05, f.daily_velocity || 1.0);

    total_ledger_units_flagged += stock;
    sum_price += price;

    if (cost !== null) {
      items_with_cost += 1;
      sum_cost += cost;
    }

    // Weight based on status
    const s = (f.status || '').toLowerCase();
    let weight = unverified_weight;
    if (s.includes('verified') || s.includes('resolved') || s.includes('found')) {
      weight = 1.0;
    } else if (s.includes('false_positive') || s.includes('false positive')) {
      weight = 0.0;
    }

    // Recoverable units bounded by physical stock
    const unconstrained = effective_days_saved * velocity * capture_factor;
    const bounded_units = Math.min(stock, unconstrained);

    estimated_recoverable_units += (bounded_units * weight);
    potential_revenue_at_risk += (stock * price);
    estimated_recoverable_revenue += (bounded_units * price * weight);

    if (cost !== null) {
      const unit_margin = Math.max(0, price - cost);
      profit_impact_from_costs += (bounded_units * unit_margin * weight);
    }
  }

  const stores_count = store_count && store_count > 0 ? store_count : Math.max(1, distinctStores.size);
  const detected_avg_price = total_findings > 0 ? sum_price / total_findings : 450.0;
  const detected_avg_cost = items_with_cost > 0 ? sum_cost / items_with_cost : null;
  const has_unit_cost_data = items_with_cost > 0 && items_with_cost >= total_findings * 0.5;

  // Margin calculation
  let detected_gross_margin_percent: number | null = null;
  let estimated_profit_impact: number | null = null;
  let has_profit_impact = false;
  let missing_cost_note: string | null = null;

  if (has_unit_cost_data && detected_avg_cost !== null && detected_avg_price > 0) {
    detected_gross_margin_percent = Math.max(0, ((detected_avg_price - detected_avg_cost) / detected_avg_price) * 100.0);
    estimated_profit_impact = profit_impact_from_costs;
    has_profit_impact = true;
  } else if (gross_margin_percent !== undefined && gross_margin_percent !== null && gross_margin_percent > 0) {
    detected_gross_margin_percent = gross_margin_percent;
    estimated_profit_impact = estimated_recoverable_revenue * (gross_margin_percent / 100.0);
    has_profit_impact = true;
  } else {
    missing_cost_note = 'Unit cost is not mapped in this dataset. Provide gross margin % to compute profit impact.';
  }

  // Annualization calculation
  const obs_days = observation_period_days || 0;
  const can_annualize = annualization_enabled && obs_days >= 7;
  let annualization_multiplier = 1.0;
  let annualized_recoverable_revenue: number | null = null;
  let annualized_profit_impact: number | null = null;

  if (can_annualize && obs_days > 0) {
    annualization_multiplier = 365.0 / obs_days;
    annualized_recoverable_revenue = estimated_recoverable_revenue * annualization_multiplier;
    if (estimated_profit_impact !== null) {
      annualized_profit_impact = estimated_profit_impact * annualization_multiplier;
    }
  }

  return {
    total_findings,
    verified_findings,
    false_positives,
    pending_findings,
    inspected_count,
    measured_conversion_rate_percent,
    effective_conversion_rate_percent,
    is_conversion_rate_assumed,

    total_ledger_units_flagged,
    estimated_recoverable_units,
    recoverable_units_method: 'Bounded: sum(min(stock_i, days_saved * velocity_i * capture_rate) * weight_i)',

    potential_units_at_risk: total_ledger_units_flagged,
    potential_revenue_at_risk,
    revenue_at_risk_method: 'Nominal trapped value: sum(stock_i * price_i)',

    estimated_recoverable_revenue,
    recoverable_revenue_method: 'Risk-weighted bounded revenue: sum(bounded_units_i * price_i * weight_i)',

    has_profit_impact,
    estimated_profit_impact,
    detected_gross_margin_percent,
    has_unit_cost_data,
    profit_impact_method: has_unit_cost_data
      ? 'Empirical Unit Margins: sum(bounded_units_i * (price_i - cost_i) * weight_i)'
      : 'Assumed Gross Margin: estimated_recoverable_revenue * (gross_margin_percent / 100)',
    missing_cost_note,

    can_annualize,
    annualization_multiplier,
    annualized_recoverable_revenue,
    annualized_profit_impact,
    annualization_methodology: can_annualize
      ? `Extrapolated over 365-day operational year using multiplier (365 / ${obs_days} = ${annualization_multiplier.toFixed(2)}x)`
      : 'Annualization disabled or observation period (< 7 days) insufficient to justify annual extrapolation',

    detected_avg_price,
    detected_avg_cost,
    stores_count,
  };
}

/**
 * Format Indian Rupees with Lakhs and Crores notations.
 */
export function formatRupees(amount: number): string {
  if (isNaN(amount) || amount === 0) return '₹0';
  const abs = Math.abs(amount);
  if (abs >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakhs`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Format USD values with thousands/millions notations.
 */
export function formatUSD(amount: number): string {
  if (isNaN(amount) || amount === 0) return '$0';
  const abs = Math.abs(amount);
  if (abs >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }
  if (abs >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}
