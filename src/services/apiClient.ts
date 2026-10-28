/**
 * StockSentinel AI — Backend Typed API Client
 *
 * Connects the React + Vite frontend to the FastAPI Python backend.
 * Provides resilient fallbacks and typed data adapters so the UI
 * functions seamlessly whether the backend is live or offline.
 */

export interface TimeSeriesPoint {
  date: string;
  sales: number;
  stock: number;
  is_promotion?: boolean;
}

export type SeverityType = 'CRITICAL' | 'HIGH' | 'ROUTINE';
export type FindingStatusType = 'pending' | 'verified' | 'false_positive' | 'unresolved';
export type AnomalyType = 'phantom_stockout' | 'misplaced' | 'delisted' | 'unclassified';

export interface FindingResponse {
  finding_id: string;
  scan_id: string;
  store_id: string;
  store_name?: string | null;
  sku_id: string;
  product_name?: string | null;
  category?: string | null;
  shelf_bay?: string | null;
  unit_price?: number | null;
  rank: number;
  evaluation_date: string;
  recorded_stock: number;
  consecutive_zero_days: number;
  historical_daily_velocity: number;
  confidence_score: number;
  severity: SeverityType;
  anomaly_type: AnomalyType;
  explanation: string;
  status: FindingStatusType;
  time_series: TimeSeriesPoint[];
}

export interface EvidenceSignal {
  name: string;
  value: string;
  status: 'alert' | 'normal' | 'info';
  detail: string;
}

export interface EvidenceResponse {
  finding_id: string;
  store_id: string;
  store_name?: string | null;
  sku_id: string;
  product_name?: string | null;
  category?: string | null;
  shelf_bay?: string | null;
  unit_price?: number | null;
  evaluation_date: string;
  recorded_stock: number;
  consecutive_zero_days: number;
  confidence_score: number;
  severity: SeverityType;
  anomaly_type: AnomalyType;
  explanation: string;
  signals: EvidenceSignal[];
  time_series: TimeSeriesPoint[];
  detection_algorithm: string;
  ranking_formula: string;
}

export interface ReasoningPlanResponse {
  finding_id: string;
  source: 'omniroute_live' | 'deterministic_fallback';
  model: string;
  root_cause_diagnosis: string;
  confidence_rationale: string;
  associate_checklist: string[];
  shrinkage_risk_level: string;
  estimated_recovery_action: string;
}

export interface ScanResponse {
  scan_id: string;
  dataset_id?: string | null;
  evaluation_date: string;
  status: string;
  threshold_days?: number;
  stores_covered: number;
  total_evaluated?: number;
  flagged_count?: number;
  skus_analyzed?: number;
  anomalies_detected?: number;
  created_at: string;
  findings: FindingResponse[];
  message?: string;
}

export interface TelemetryStats {
  stores_count: number;
  skus_count: number;
  daily_records_count: number;
  persisted_findings_count: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  service: string;
  database: string;
  telemetry_stats?: TelemetryStats;
  stores_in_db?: number;
  records_in_db?: number;
  evaluation_labels_in_db?: number;
}

export interface PerStoreMetric {
  store_id: string;
  store_name: string;
  top20_findings_count: number;
  true_positives_in_top20: number;
  precision_at_20: number;
  total_hidden_positives: number;
  recall_at_20: number;
}

export interface EvaluationResponse {
  available: boolean;
  evaluation_date: string;
  message: string;
  dataset_scope: string;
  mean_precision_at_20: number | null;
  overall_recall: number | null;
  total_stores_evaluated: number;
  total_findings_evaluated: number;
  total_true_positives: number;
  total_ground_truth_positives: number;
  per_store_metrics: PerStoreMetric[];
  evaluation_rules: string[];
}

export type MetricSourceType = 'MEASURED' | 'ESTIMATED' | 'ASSUMED';

export interface VisibleFormulaStep {
  step_number: number;
  title: string;
  formula: string;
  substituted: string;
  result_text: string;
  source_type: MetricSourceType;
  note: string;
}

export interface MissingInputPrompt {
  field_key: string;
  label: string;
  question: string;
  default_assumption: number | string;
  current_value: number | string | null;
  unit: string;
  why_needed: string;
}

export interface RecoveryResponse {
  currency: string;
  currency_symbol: string;

  // Context & Active Association
  dataset_id?: string | null;
  dataset_name?: string | null;
  scan_id?: string | null;
  evaluation_date?: string | null;

  // 1. Findings and Verified Findings [MEASURED]
  total_findings_count: number;
  verified_findings_count: number;
  false_positive_count: number;
  pending_verification_count: number;
  inspected_count: number;
  measured_verification_rate_percent?: number | null;
  effective_conversion_rate_percent: number;
  is_conversion_rate_assumed: boolean;

  // Master Data Detection Status [MEASURED]
  has_cost_data: boolean;
  has_price_data: boolean;
  detected_avg_selling_price: number;
  detected_avg_unit_cost?: number | null;
  detected_gross_margin_percent?: number | null;
  margin_source: MetricSourceType;

  // 2. Estimated Recoverable Units [ESTIMATED via Documented Method]
  total_ledger_units_flagged: number;
  estimated_recoverable_units: number;
  recoverable_units_method: string;

  // 3. Potential Revenue at Risk [ESTIMATED]
  potential_units_at_risk: number;
  potential_revenue_at_risk: number;
  revenue_at_risk_method: string;

  // 4. Estimated Recoverable Revenue [ESTIMATED]
  estimated_recoverable_revenue: number;
  recoverable_revenue_method: string;

  // 5. Estimated Profit Impact [ESTIMATED - only when cost/margin available]
  has_profit_impact: boolean;
  estimated_profit_impact?: number | null;
  profit_impact_method: string;
  missing_cost_note?: string | null;

  // 6. Annualized Estimates [only when observation period and assumptions justify]
  can_annualize: boolean;
  annualization_basis: string;
  annualization_multiplier: number;
  annualized_recoverable_revenue?: number | null;
  annualized_profit_impact?: number | null;
  annualized_total_incidents?: number | null;
  annualized_methodology: string;

  // Step-by-Step Visible Formulas
  visible_formula_steps: VisibleFormulaStep[];

  // Missing Input Questions & Assumptions
  missing_input_prompts: MissingInputPrompt[];
  assumptions_applied: Record<string, any>;
  persisted_assumptions: Record<string, any>;

  // Scope & Observation
  stores_count: number;
  observation_period_days?: number | null;
  observation_start_date?: string | null;
  observation_end_date?: string | null;

  // Legacy & Compatibility Fields
  annual_revenue_protected_inr: number;
  annual_margin_saved_inr: number;
  per_store_annual_recovery_inr: number;
  total_annual_rupees_recovered: number;
  per_store_annual_recovery: number;
  total_annual_incidents: number;
  units_saved_per_incident: number;
  rupees_recovered_per_incident: number;
  arithmetic_steps: string[];
  methodology_notes: string[];
  distinction_notes?: string[];
}

export interface StoreOption {
  store_id: string;
  store_name: string;
  city_tier?: string;
  format?: string;
  active_skus?: number;
}

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? '/api' : 'http://127.0.0.1:8000/api');

/**
 * Helper to fetch with a timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export interface ColumnMetadata {
  name: string;
  data_type: string;
  sample_values: any[];
  non_null_count: number;
  null_count: number;
  inferred_target: string | null;
  confidence: number;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  column?: string | null;
  message: string;
  row_index?: number | null;
  details?: Record<string, any> | null;
}

export interface DatasetProfile {
  dataset_id: string;
  name: string;
  file_count: number;
  columns?: ColumnMetadata[];
  files: {
    file_id: string;
    file_name: string;
    file_type: string;
    file_size_bytes: number;
    row_count: number;
    columns: ColumnMetadata[];
  }[];
  total_raw_rows: number;
  suggested_mappings: Record<string, string>;
  mapping_confidence: Record<string, number>;
}

export interface ValidationReport {
  dataset_id: string;
  valid: boolean;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  duplicate_rows: number;
  missing_dates_count: number;
  date_range_start?: string | null;
  date_range_end?: string | null;
  unique_stores_count: number;
  unique_skus_count: number;
  issues: ValidationIssue[];
  preview_sample: Record<string, any>[];
  has_ground_truth: boolean;
}

export interface DatasetItem {
  dataset_id: string;
  name: string;
  description?: string | null;
  source_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  total_records: number;
  stores_count: number;
  skus_count: number;
  start_date?: string | null;
  end_date?: string | null;
  has_ground_truth: boolean;
  files_count: number;
}

export interface ImportResult {
  dataset_id: string;
  status: string;
  imported_stores: number;
  imported_skus: number;
  imported_records: number;
  imported_labels: number;
  date_range_start?: string | null;
  date_range_end?: string | null;
  message: string;
}

export const stockSentinelApi = {
  /**
   * Health check for backend connectivity, optionally scoped by active dataset.
   */
  async checkHealth(datasetId?: string): Promise<{ online: boolean; data?: HealthResponse }> {
    try {
      const query = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
      const res = await fetchWithTimeout(`${API_BASE}/health${query}`, {}, 2000);
      if (res.ok) {
        const data = await res.json();
        return { online: true, data };
      }
      return { online: false };
    } catch {
      return { online: false };
    }
  },

  /**
   * Fetch stores from backend
   */
  async getStores(datasetId?: string): Promise<StoreOption[]> {
    try {
      const query = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
      const res = await fetchWithTimeout(`${API_BASE}/stores${query}`);
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Trigger detection scan
   */
  async triggerScan(payload: {
    evaluation_date?: string;
    threshold_days?: number;
    confidence_cutoff?: number;
    max_findings_per_store?: number;
    store_ids?: string[];
    dataset_id?: string;
  }): Promise<ScanResponse> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, 15000);
      if (res.ok) {
        return await res.json();
      }
      let detail = `Scan failed (HTTP ${res.status})`;
      try {
        const errData = await res.json();
        if (errData?.detail) detail = errData.detail;
      } catch {}
      throw new Error(detail);
    } catch (err: any) {
      console.warn('Backend triggerScan error:', err);
      throw err;
    }
  },

  /**
   * Fetch findings with optional filters
   */
  async getFindings(params?: {
    store_id?: string;
    sku_id?: string;
    status?: string;
    severity?: string;
    date?: string;
    dataset_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<FindingResponse[]> {
    try {
      const query = new URLSearchParams();
      if (params?.store_id) query.set('store_id', params.store_id);
      if (params?.sku_id) query.set('sku_id', params.sku_id);
      if (params?.status) query.set('status', params.status);
      if (params?.severity) query.set('severity', params.severity);
      if (params?.date) query.set('date', params.date);
      if (params?.dataset_id) query.set('dataset_id', params.dataset_id);
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.offset) query.set('offset', String(params.offset));

      const res = await fetchWithTimeout(`${API_BASE}/findings?${query.toString()}`);
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (err) {
      console.warn('Backend getFindings unavailable:', err);
      return [];
    }
  },

  /**
   * Update finding verification status
   */
  async updateFindingStatus(findingId: string, status: FindingStatusType, notes?: string): Promise<FindingResponse> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/findings/${encodeURIComponent(findingId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      if (res.ok) {
        return await res.json();
      }
      let detail = `Status update failed (HTTP ${res.status})`;
      try {
        const errData = await res.json();
        if (errData?.detail) detail = errData.detail;
      } catch {}
      throw new Error(detail);
    } catch (err: any) {
      console.warn('Backend updateFindingStatus error:', err);
      throw err;
    }
  },

  /**
   * Fetch evidence and time series for a finding
   */
  async getEvidence(findingId: string): Promise<EvidenceResponse | null> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/findings/${encodeURIComponent(findingId)}/evidence`);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.warn('Backend getEvidence unavailable:', err);
      return null;
    }
  },

  /**
   * Fetch deep AI root-cause reasoning & associate action plan (gpt-oss-120b via OmniRoute)
   */
  async getFindingReasoning(findingId: string): Promise<ReasoningPlanResponse | null> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/findings/${encodeURIComponent(findingId)}/deep-reasoning`, {
        method: 'POST',
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.warn('Backend getFindingReasoning unavailable:', err);
      return null;
    }
  },

  /**
   * Fetch evaluation metrics against hidden ground truth labels
   */
  async getEvaluation(date = '2026-10-15', datasetId?: string): Promise<EvaluationResponse | null> {
    try {
      const query = new URLSearchParams({ evaluation_date: date });
      if (datasetId) query.set('dataset_id', datasetId);
      const res = await fetchWithTimeout(`${API_BASE}/evaluation?${query.toString()}`);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.warn('Backend getEvaluation unavailable:', err);
      return null;
    }
  },

  /**
   * Fetch empirical business impact and annual rupees recovery estimate
   */
  async getRecoveryEstimate(params?: {
    dataset_id?: string;
    scan_id?: string;
    evaluation_date?: string;
    date?: string;
    store_count?: number;
    avg_price_inr?: number;
    incidents_per_store_month?: number;
    days_saved_per_incident?: number;
    days_saved?: number;
    daily_sales_velocity?: number;
    daily_velocity?: number;
    recovery_capture_rate?: number;
    capture_rate_percent?: number;
    gross_margin_percent?: number;
    unverified_conversion_rate?: number;
    annualization_enabled?: boolean;
  }): Promise<RecoveryResponse | null> {
    try {
      const query = new URLSearchParams();
      if (params?.dataset_id) query.set('dataset_id', params.dataset_id);
      if (params?.scan_id) query.set('scan_id', params.scan_id);
      if (params?.evaluation_date) query.set('evaluation_date', params.evaluation_date);
      if (params?.date) query.set('date', params.date);
      if (params?.store_count !== undefined) query.set('store_count', String(params.store_count));
      if (params?.avg_price_inr !== undefined) query.set('avg_price_inr', String(params.avg_price_inr));
      if (params?.incidents_per_store_month !== undefined) query.set('incidents_per_store_month', String(params.incidents_per_store_month));
      if (params?.days_saved_per_incident !== undefined) query.set('days_saved_per_incident', String(params.days_saved_per_incident));
      if (params?.days_saved !== undefined) query.set('days_saved', String(params.days_saved));
      if (params?.daily_sales_velocity !== undefined) query.set('daily_sales_velocity', String(params.daily_sales_velocity));
      if (params?.daily_velocity !== undefined) query.set('daily_velocity', String(params.daily_velocity));
      if (params?.recovery_capture_rate !== undefined) query.set('recovery_capture_rate', String(params.recovery_capture_rate));
      if (params?.capture_rate_percent !== undefined) query.set('capture_rate_percent', String(params.capture_rate_percent));
      if (params?.gross_margin_percent !== undefined) query.set('gross_margin_percent', String(params.gross_margin_percent));
      if (params?.unverified_conversion_rate !== undefined) query.set('unverified_conversion_rate', String(params.unverified_conversion_rate));
      if (params?.annualization_enabled !== undefined) query.set('annualization_enabled', String(params.annualization_enabled));

      const res = await fetchWithTimeout(`${API_BASE}/recovery-estimate?${query.toString()}`);
      if (res.ok) {
        return await res.json();
      }
      let detail = `Failed to fetch recovery estimate (HTTP ${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson?.detail) detail = errJson.detail;
      } catch {}
      throw new Error(detail);
    } catch (err: any) {
      console.warn('Backend getRecoveryEstimate unavailable:', err);
      throw err;
    }
  },

  /**
   * Persist custom assumptions tied to a dataset and scan
   */
  async persistAssumptions(payload: {
    dataset_id?: string;
    scan_id?: string;
    assumptions: Record<string, any>;
    report_name?: string;
  }): Promise<{ status: string; report_id: string; message: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/recovery-estimate/persist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to persist assumptions' }));
      throw new Error(err.detail || 'Failed to persist assumptions');
    }
    return await res.json();
  },

  /**
   * Dataset Management Endpoints
   */
  async uploadDataset(formData: FormData): Promise<{ dataset_id: string; name: string; profile: DatasetProfile; status: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/datasets/upload`, {
      method: 'POST',
      body: formData,
    }, 60000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return await res.json();
  },

  async listDatasets(): Promise<DatasetItem[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/datasets`);
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (err) {
      console.warn('Backend listDatasets unavailable:', err);
      return [];
    }
  },

  async getDataset(datasetId: string): Promise<DatasetItem | null> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/datasets/${encodeURIComponent(datasetId)}`);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.warn('Backend getDataset unavailable:', err);
      return null;
    }
  },

  async getDatasetProfile(datasetId: string): Promise<DatasetProfile | null> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/datasets/${encodeURIComponent(datasetId)}/profile`);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.warn('Backend getDatasetProfile unavailable:', err);
      return null;
    }
  },

  async updateDatasetMapping(
    datasetId: string,
    mappings: Record<string, string>,
    duplicatePolicy = 'keep_first',
    dateFormat?: string
  ): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE}/datasets/${encodeURIComponent(datasetId)}/mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mappings,
        duplicate_policy: duplicatePolicy,
        date_format: dateFormat || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Mapping update failed' }));
      throw new Error(err.detail || 'Mapping update failed');
    }
    return await res.json();
  },

  async validateDataset(
    datasetId: string,
    duplicatePolicy = 'keep_first',
    dateFormat?: string
  ): Promise<ValidationReport> {
    const res = await fetchWithTimeout(`${API_BASE}/datasets/${encodeURIComponent(datasetId)}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        duplicate_policy: duplicatePolicy,
        date_format: dateFormat || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Validation failed' }));
      throw new Error(err.detail || 'Validation failed');
    }
    return await res.json();
  },

  async importDataset(
    datasetId: string,
    duplicatePolicy = 'keep_first',
    dateFormat?: string
  ): Promise<ImportResult> {
    const res = await fetchWithTimeout(`${API_BASE}/datasets/${encodeURIComponent(datasetId)}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        duplicate_policy: duplicatePolicy,
        date_format: dateFormat || null,
      }),
    }, 120000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Import failed' }));
      throw new Error(err.detail || 'Import failed');
    }
    return await res.json();
  },

  async listScans(datasetId?: string): Promise<any[]> {
    try {
      const query = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
      const res = await fetchWithTimeout(`${API_BASE}/scans${query}`);
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch {
      return [];
    }
  },

  async loadSyntheticTest(): Promise<ImportResult> {
    const res = await fetchWithTimeout(`${API_BASE}/datasets/load-synthetic-test`, {
      method: 'POST',
    }, 120000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load synthetic test dataset' }));
      throw new Error(err.detail || 'Failed to load synthetic test dataset');
    }
    return await res.json();
  },
};

export const apiClient = stockSentinelApi;

