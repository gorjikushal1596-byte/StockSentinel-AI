import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapStatusToBackend,
  mapStatusToFrontend,
  mapFindingToVerificationItem,
  isBackendFinding,
} from '../src/services/apiAdapters.ts';
import type { FindingResponse } from '../src/services/apiClient.ts';
import type { VerificationStatus } from '../src/types/verification.ts';

test('mapStatusToBackend correctly translates all frontend UI statuses and backend keys', () => {
  assert.equal(mapStatusToBackend('Pending Inspection'), 'pending');
  assert.equal(mapStatusToBackend('Floor Check Dispatched'), 'unresolved');
  assert.equal(mapStatusToBackend('Resolved (Restocked)'), 'verified');
  assert.equal(mapStatusToBackend('Misplaced (Found)'), 'false_positive');
  // Idempotent with backend keys
  assert.equal(mapStatusToBackend('pending'), 'pending');
  assert.equal(mapStatusToBackend('unresolved'), 'unresolved');
  assert.equal(mapStatusToBackend('verified'), 'verified');
  assert.equal(mapStatusToBackend('false_positive'), 'false_positive');
});

test('mapStatusToFrontend correctly translates all backend API statuses and display names', () => {
  assert.equal(mapStatusToFrontend('pending'), 'Pending Inspection');
  assert.equal(mapStatusToFrontend('unresolved'), 'Floor Check Dispatched');
  assert.equal(mapStatusToFrontend('verified'), 'Resolved (Restocked)');
  assert.equal(mapStatusToFrontend('false_positive'), 'Misplaced (Found)');
  // Idempotent with display names
  assert.equal(mapStatusToFrontend('Floor Check Dispatched'), 'Floor Check Dispatched');
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
    assert.equal(roundTripped, status);
  }
});

test('isBackendFinding correctly distinguishes backend finding IDs from preset simulation IDs', () => {
  assert.equal(isBackendFinding('fnd_8a12bc9d01ef'), true);
  assert.equal(isBackendFinding('FINDING_STORE01_SKU02'), true);
  assert.equal(isBackendFinding('fnd_uuid_12345'), true);
  assert.equal(isBackendFinding('V-01'), false);
  assert.equal(isBackendFinding('V-05'), false);
  assert.equal(isBackendFinding('DEMO-123'), false);
  assert.equal(isBackendFinding('SIM-001'), false);
  assert.equal(isBackendFinding(''), false);
  assert.equal(isBackendFinding(null), false);
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

  assert.equal(item.id, 'fnd_a1b2c3d4e5f6');
  assert.equal(item.storeId, 'Store #001');
  assert.equal(item.sku, 'SKU_1001');
  assert.equal(item.productName, 'Organic Almond Milk 1L');
  assert.equal(item.recordedUnits, 12);
  assert.equal(item.expectedWeeklySales, 17.5);
  assert.equal(item.riskTier, 'CRITICAL');
  assert.equal(item.status, 'Floor Check Dispatched');
  assert.equal(item.confidenceScore, 94.5);
});
