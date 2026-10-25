import { test, expect } from 'vitest';
import { evaluateAnomaly } from '../src/features/scanner/scannerEngine.ts';

test('evaluateAnomaly detects critical phantom stock-out when stock > 0 and 0 sales over 7 days', () => {
  const result = evaluateAnomaly(6, 7, 4.2);

  expect(result.isCritical).toBe(true);
  expect(result.riskTier).toBe('CRITICAL');
  expect(result.isGenuineOos).toBe(false);
  expect(result.anomalyConfidence).toBeGreaterThan(95);
});

test('evaluateAnomaly identifies genuine out-of-stock when recorded stock is 0', () => {
  const result = evaluateAnomaly(0, 4, 6.5);

  expect(result.isGenuineOos).toBe(true);
  expect(result.isCritical).toBe(false);
  expect(result.riskTier).toBe('ROUTINE');
  expect(result.anomalyConfidence).toBe(0);
});

test('evaluateAnomaly handles slow mover without false alarm', () => {
  const result = evaluateAnomaly(4, 2, 2.1);

  expect(result.isCritical).toBe(false);
  expect(result.isGenuineOos).toBe(false);
  expect(result.anomalyConfidence).toBeLessThan(80);
});

