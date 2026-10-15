import type { RiskTier, ScanResult } from '@/types/scanner';

/**
 * Pure Poisson-Bayes Anomaly Detection Engine
 * 
 * Mathematically evaluates the likelihood of an observed zero-sales interval
 * given positive ERP ledger stock and historical velocity.
 * 
 * Formula:
 * P(0 sales for D days | rate lambda) = exp(-lambda * D)
 */
export function evaluateAnomaly(
  recordedStock: number,
  zeroSalesDays: number,
  historicalWeeklyVelocity: number
): ScanResult {
  const safeVelocity = Math.max(0.1, historicalWeeklyVelocity);
  const expectedTotalSales = (safeVelocity / 7) * zeroSalesDays;
  const pZeroSales = Math.exp(-expectedTotalSales);

  const isGenuineOos = recordedStock === 0;
  const isCritical = recordedStock > 0 && zeroSalesDays >= 4 && expectedTotalSales >= 2.0;
  const isModerate = recordedStock > 0 && zeroSalesDays >= 2 && !isCritical;
  const isNormal = recordedStock > 0 && !isCritical && !isModerate;

  const anomalyConfidence = isGenuineOos
    ? 0.0
    : Math.min(99.8, Math.max(12.0, (1 - pZeroSales) * 100));

  let riskTier: RiskTier = 'ROUTINE';
  let severityLabel = 'Routine Audit';

  if (isCritical) {
    riskTier = 'CRITICAL';
    severityLabel = 'Critical Phantom Stock-Out';
  } else if (isModerate) {
    riskTier = 'HIGH';
    severityLabel = 'High Discrepancy Risk';
  } else if (isGenuineOos) {
    riskTier = 'ROUTINE';
    severityLabel = 'Genuine Out-of-Stock (0 on hand)';
  }

  return {
    isGenuineOos,
    isCritical,
    isModerate,
    isNormal,
    riskTier,
    expectedTotalSales,
    pZeroSales,
    anomalyConfidence,
    severityLabel,
  };
}
