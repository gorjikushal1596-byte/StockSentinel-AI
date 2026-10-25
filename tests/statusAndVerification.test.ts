import { test, expect } from 'vitest';
import {
  mapStatusToBackend,
  mapStatusToFrontend,
  mapFindingToVerificationItem,
  isBackendFinding,
} from '../src/services/apiAdapters.ts';
import type { FindingResponse } from '../src/services/apiClient.ts';
import type { VerificationStatus } from '../src/types/verification.ts';

test('mapStatusToBackend correctly translates all frontend UI statuses and backend keys', () => {
  expect(mapStatusToBackend('Pending Inspection')).toBe('pending');
  expect(mapStatusToBackend('Floor Check Dispatched')).toBe('unresolved');
  expect(mapStatusToBackend('Resolved (Restocked)')).toBe('verified');
  expect(mapStatusToBackend('Misplaced (Found)')).toBe('false_positive');
  // Idempotent with backend keys
  expect(mapStatusToBackend('pending')).toBe('pending');
  expect(mapStatusToBackend('unresolved')).toBe('unresolved');
  expect(mapStatusToBackend('verified')).toBe('verified');
  expect(mapStatusToBackend('false_positive')).toBe('false_positive');
});

test('mapStatusToFrontend correctly translates all backend API statuses and display names', () => {
  expect(mapStatusToFrontend('pending')).toBe('Pending Inspection');
  expect(mapStatusToFrontend('unresolved')).toBe('Floor Check Dispatched');
  expect(mapStatusToFrontend('verified')).toBe('Resolved (Restocked)');
  expect(mapStatusToFrontend('false_positive')).toBe('Misplaced (Found)');
  // Idempotent with display names
  expect(mapStatusToFrontend('Floor Check Dispatched')).toBe('Floor Check Dispatched');
});

test('status mapping is bijective round-trip across all valid statuses', () => {
  const frontendStatuses: VerificationStatus[] = [
    'Pending Inspection',
    'Floor Check Dispatched',
    'Resolved (Restocked)',
    'Misplaced (Found)',
  ];

  for (const status of frontendStatuses) {
    const backend = mapStatusToBackend(status);
    const roundTripped = mapStatusToFrontend(backend);
    expect(roundTripped).toBe(status);
  }
});

test('isBackendFinding correctly distinguishes backend finding IDs from preset simulation IDs', () => {
  expect(isBackendFinding('fnd_8a12bc9d01ef')).toBe(true);
  expect(isBackendFinding('FINDING_STORE01_SKU02')).toBe(true);
  expect(isBackendFinding('fnd_uuid_12345')).toBe(true);
  expect(isBackendFinding('V-01')).toBe(false);
  expect(isBackendFinding('V-05')).toBe(false);
  expect(isBackendFinding('DEMO-123')).toBe(false);
  expect(isBackendFinding('SIM-001')).toBe(false);
  expect(isBackendFinding('')).toBe(false);
  expect(isBackendFinding(null)).toBe(false);
});

test('mapFindingToVerificationItem maps backend finding fields and status accurately', () => {
  const mockFinding: FindingResponse = {
    finding_id: 'fnd_a1b2c3d4e5f6',
    store_id: 'STR_001',
    store_name: 'Store #001 — Indiranagar',
    sku_id: 'SKU_1001',
    product_name: 'Organic Almond Milk 1L',
    category: 'Dairy & Beverages',
    shelf_bay: 'Aisle 2, Bay B',
    recorded_stock: 12,
    consecutive_zero_sales_days: 5,
    historical_daily_velocity: 2.5,
    confidence_score: 94.5,
    severity: 'CRITICAL',
    status: 'unresolved',
    explanation: 'Zero sales for 5 consecutive days despite stock.',
  };

  const item = mapFindingToVerificationItem(mockFinding);

  expect(item.id).toBe('fnd_a1b2c3d4e5f6');
  expect(item.storeId).toBe('Store #001');
  expect(item.sku).toBe('SKU_1001');
  expect(item.productName).toBe('Organic Almond Milk 1L');
  expect(item.recordedUnits).toBe(12);
  expect(item.expectedWeeklySales).toBe(17.5);
  expect(item.riskTier).toBe('CRITICAL');
  expect(item.status).toBe('Floor Check Dispatched');
  expect(item.confidenceScore).toBe(94.5);
});

