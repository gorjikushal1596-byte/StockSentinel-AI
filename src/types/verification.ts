import type { RiskTier } from './scanner';

/**
 * Top-20 Verification Queue Domain Types
 */

export type VerificationStatus =
  | 'Pending Inspection'
  | 'Floor Check Dispatched'
  | 'Resolved (Restocked)'
  | 'Misplaced (Found)';

export interface VerificationItem {
  id: string;
  storeId: string;
  sku: string;
  productName: string;
  category: string;
  aisle: string;
  recordedUnits: number;
  recentSales7d: number;
  expectedWeeklySales: number;
  unitPrice: number;
  riskTier: RiskTier;
  confidenceScore: number;
  plainReason: string;
  status: VerificationStatus;
}
