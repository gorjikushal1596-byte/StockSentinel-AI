/**
 * StockSentinel AI — API to Frontend UI Adapters
 *
 * Maps FastAPI backend schemas to React frontend components safely.
 */

import type { FindingResponse, FindingStatusType } from './apiClient';
import type { VerificationItem, VerificationStatus } from '@/types/verification';
import type { RiskTier } from '@/types/scanner';

export function mapStatusToBackend(status: VerificationStatus): FindingStatusType {
  switch (status) {
    case 'Pending Inspection':
      return 'pending';
    case 'Floor Check Dispatched':
      return 'unresolved';
    case 'Resolved (Restocked)':
      return 'verified';
    case 'Misplaced (Found)':
      return 'false_positive';
    default:
      return 'pending';
  }
}

export function mapStatusToFrontend(status: FindingStatusType): VerificationStatus {
  switch (status) {
    case 'pending':
      return 'Pending Inspection';
    case 'unresolved':
      return 'Floor Check Dispatched';
    case 'verified':
      return 'Resolved (Restocked)';
    case 'false_positive':
      return 'Misplaced (Found)';
    default:
      return 'Pending Inspection';
  }
}

export function mapFindingToVerificationItem(finding: FindingResponse): VerificationItem {
  const riskTier: RiskTier = finding.severity === 'CRITICAL' ? 'CRITICAL' : finding.severity === 'HIGH' ? 'HIGH' : 'ROUTINE';
  
  return {
    id: finding.finding_id,
    storeId: finding.store_name ? finding.store_name.split('—')[0].trim() : finding.store_id,
    sku: finding.sku_id,
    productName: finding.product_name || `Product ${finding.sku_id}`,
    category: finding.category || 'Retail Goods',
    aisle: finding.shelf_bay || 'Main Aisle',
    recordedUnits: finding.recorded_stock,
    recentSales7d: 0, // Since flagged for consecutive zero days
    expectedWeeklySales: Number((finding.historical_daily_velocity * 7).toFixed(1)),
    unitPrice: finding.unit_price || 120.0,
    riskTier,
    confidenceScore: finding.confidence_score,
    plainReason: finding.explanation,
    status: mapStatusToFrontend(finding.status),
  };
}
