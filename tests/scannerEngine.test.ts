import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAnomaly } from '../src/features/scanner/scannerEngine.ts';

test('evaluateAnomaly detects critical phantom stock-out when stock > 0 and 0 sales over 7 days', () => {
  const result = evaluateAnomaly(6, 7, 4.2);

  assert.equal(result.isCritical, true);
  assert.equal(result.riskTier, 'CRITICAL');
  assert.equal(result.isGenuineOos, false);
  assert.ok(result.anomalyConfidence > 95);
});

test('evaluateAnomaly identifies genuine out-of-stock when recorded stock is 0', () => {
  const result = evaluateAnomaly(0, 4, 6.5);

  assert.equal(result.isGenuineOos, true);
  assert.equal(result.isCritical, false);
  assert.equal(result.riskTier, 'ROUTINE');
  assert.equal(result.anomalyConfidence, 0);
});

test('evaluateAnomaly handles slow mover without false alarm', () => {
  const result = evaluateAnomaly(4, 2, 2.1);

  assert.equal(result.isCritical, false);
  assert.equal(result.isGenuineOos, false);
  assert.ok(result.anomalyConfidence < 80);
});
