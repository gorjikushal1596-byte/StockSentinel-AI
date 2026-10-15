/**
 * Anomaly Scanner & Detection Engine Domain Types
 */

export type RiskTier = 'CRITICAL' | 'HIGH' | 'ROUTINE';

export interface DetectedAnomalyPayload {
  sku: string;
  productName: string;
  store: string;
  recordedUnits: number;
  zeroSalesDays: number;
  riskTier: RiskTier;
  confidence: number;
}

export type ScanPreset = 'critical' | 'slow-mover' | 'genuine-oos' | 'custom';

export interface ScanResult {
  isGenuineOos: boolean;
  isCritical: boolean;
  isModerate: boolean;
  isNormal: boolean;
  riskTier: RiskTier;
  expectedTotalSales: number;
  pZeroSales: number;
  anomalyConfidence: number;
  severityLabel: string;
}
