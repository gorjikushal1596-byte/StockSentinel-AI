/**
 * Inventory & Store Telemetry Domain Types
 */

export interface SkuProduct {
  sku: string;
  name: string;
  category: string;
  price: number;
  normalVelocity: number; // expected weekly units
  aisle: string;
}

export interface StoreOption {
  id: string;
  name: string;
  activeSkuCount: number;
  displayLabel: string;
}

export interface TimelineDataPoint {
  day: string;
  stock: number;
  sales: number;
  isZeroSales?: boolean;
}

export interface MetricSummaryItem {
  iconName: string;
  value: string;
  label: string;
  sublabel: string;
  highlight?: boolean;
  isPlaceholder?: boolean;
}
