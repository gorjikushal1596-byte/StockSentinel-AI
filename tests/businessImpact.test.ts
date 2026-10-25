import { test, expect } from 'vitest';
import {
  calculateBusinessImpact,
  formatRupees,
  formatUSD,
  type FindingItemSummary,
} from '../src/features/impact/impactCalculations.ts';

test('1. Bounded Recoverable Units strictly respects physical ledger stock limit', () => {
  // Finding has stock = 5, but velocity=3, days_saved=10, capture=60% -> unconstrained = 18 units!
  // Documented method must bound recovery to exactly 5 units!
  const findings: FindingItemSummary[] = [
    {
      id: 'F1',
      sku: 'SKU_01',
      store_id: 'STORE_01',
      stock: 5,
      price: 100,
      cost: 60,
      daily_velocity: 3.0,
      status: 'verified',
    },
  ];

  const result = calculateBusinessImpact({
    findings,
    days_saved: 10,
    capture_rate_percent: 60,
    unverified_conversion_rate: 60,
  });

  // Total ledger stock flagged is 5
  expect(result.total_ledger_units_flagged).toBe(5);
  // Estimated recoverable units is bounded by stock: min(5, 10 * 3.0 * 0.6) = min(5, 18) = 5
  expect(result.estimated_recoverable_units).toBe(5);
});

test('2. Distinguishes verified vs false positives vs pending findings without equating flagged with recoveries', () => {
  const findings: FindingItemSummary[] = [
    {
      id: 'F1',
      sku: 'SKU_01',
      store_id: 'STORE_01',
      stock: 10,
      price: 200,
      cost: 100,
      daily_velocity: 2.0,
      status: 'verified', // weight 1.0
    },
    {
      id: 'F2',
      sku: 'SKU_02',
      store_id: 'STORE_01',
      stock: 10,
      price: 200,
      cost: 100,
      daily_velocity: 2.0,
      status: 'false_positive', // weight 0.0
    },
    {
      id: 'F3',
      sku: 'SKU_03',
      store_id: 'STORE_01',
      stock: 10,
      price: 200,
      cost: 100,
      daily_velocity: 2.0,
      status: 'pending', // weight = 50% measured from F1 and F2
    },
  ];

  const result = calculateBusinessImpact({
    findings,
    days_saved: 10,
    capture_rate_percent: 100, // 10 * 2.0 * 1.0 = 20 -> bounded by stock 10
    unverified_conversion_rate: 60,
  });

  expect(result.total_findings).toBe(3);
  expect(result.verified_findings).toBe(1);
  expect(result.false_positives).toBe(1);
  expect(result.pending_findings).toBe(1);
  expect(result.inspected_count).toBe(2);
  // Measured conversion rate = 1 / 2 = 50%
  expect(result.measured_conversion_rate_percent).toBe(50);
  expect(result.effective_conversion_rate_percent).toBe(50);

  // F1 (10 units * 1.0) + F2 (10 units * 0.0) + F3 (10 units * 0.5) = 15 units
  expect(result.estimated_recoverable_units).toBe(15);
  // Recoverable revenue: 15 units * 200 = 3000
  expect(result.estimated_recoverable_revenue).toBe(3000);
  // Revenue at risk is all nominal stock: (10 + 10 + 10) * 200 = 6000
  expect(result.potential_revenue_at_risk).toBe(6000);
});

test('3. Computes profit impact using detected unit costs or prompts when cost is absent', () => {
  // Case A: Detected costs available
  const findingsWithCost: FindingItemSummary[] = [
    {
      id: 'F1',
      sku: 'SKU_01',
      store_id: 'STORE_01',
      stock: 10,
      price: 500,
      cost: 300, // unit margin = 200
      daily_velocity: 1.0,
      status: 'verified',
    },
  ];

  const resultWithCost = calculateBusinessImpact({
    findings: findingsWithCost,
    days_saved: 5,
    capture_rate_percent: 100,
    unverified_conversion_rate: 60,
  });

  expect(resultWithCost.has_unit_cost_data).toBe(true);
  expect(resultWithCost.has_profit_impact).toBe(true);
  // 5 units * (500 - 300) = 1000
  expect(resultWithCost.estimated_profit_impact).toBe(1000);

  // Case B: No costs available and no margin assumption
  const findingsNoCost: FindingItemSummary[] = [
    {
      id: 'F2',
      sku: 'SKU_02',
      store_id: 'STORE_01',
      stock: 10,
      price: 500,
      cost: null,
      daily_velocity: 1.0,
      status: 'verified',
    },
  ];

  const resultNoCost = calculateBusinessImpact({
    findings: findingsNoCost,
    days_saved: 5,
    capture_rate_percent: 100,
    unverified_conversion_rate: 60,
  });

  expect(resultNoCost.has_unit_cost_data).toBe(false);
  expect(resultNoCost.has_profit_impact).toBe(false);
  expect(resultNoCost.missing_cost_note).not.toBeNull();

  // Case C: Provided user margin assumption (e.g. 30%)
  const resultWithAssumedMargin = calculateBusinessImpact({
    findings: findingsNoCost,
    days_saved: 5,
    capture_rate_percent: 100,
    unverified_conversion_rate: 60,
    gross_margin_percent: 30,
  });

  expect(resultWithAssumedMargin.has_profit_impact).toBe(true);
  // Recoverable revenue = 5 units * 500 = 2500. Profit = 2500 * 0.30 = 750
  expect(resultWithAssumedMargin.estimated_profit_impact).toBe(750);
});

test('4. Annualization is only justified when observation period >= 7 days', () => {
  const findings: FindingItemSummary[] = [
    {
      id: 'F1',
      sku: 'SKU_01',
      store_id: 'STORE_01',
      stock: 10,
      price: 100,
      cost: 50,
      daily_velocity: 1.0,
      status: 'verified',
    },
  ];

  // Insufficient observation window (e.g. 3 days)
  const resultShort = calculateBusinessImpact({
    findings,
    days_saved: 5,
    capture_rate_percent: 100,
    unverified_conversion_rate: 60,
    observation_period_days: 3,
  });
  expect(resultShort.can_annualize).toBe(false);
  expect(resultShort.annualized_recoverable_revenue).toBeNull();

  // Sufficient observation window (e.g. 108 days)
  const resultLong = calculateBusinessImpact({
    findings,
    days_saved: 5,
    capture_rate_percent: 100,
    unverified_conversion_rate: 60,
    observation_period_days: 108,
  });
  expect(resultLong.can_annualize).toBe(true);
  expect(resultLong.annualized_recoverable_revenue).toBeGreaterThan(0);
  expect(resultLong.annualization_multiplier.toFixed(2)).toBe((365 / 108).toFixed(2));
});

test('5. Currency formatting handles Lakhs and thousands correctly', () => {
  expect(formatRupees(450000)).toBe('₹4.50 Lakhs');
  expect(formatRupees(15000000)).toBe('₹1.50 Cr');
  expect(formatRupees(2500)).toBe('₹2,500');
  expect(formatUSD(250000)).toBe('$250.0k');
  expect(formatUSD(1500000)).toBe('$1.50M');
});

