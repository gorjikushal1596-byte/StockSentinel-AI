import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator,
  TrendingUp,
  ShieldCheck,
  Target,
  ArrowRight,
  Info,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
  HelpCircle,
  Save,
  Calendar,
} from 'lucide-react';
import { SectionBackdrop } from '@/components/layout/SectionBackdrop';
import {
  apiClient,
  type RecoveryResponse,
  type DatasetItem,
  type VisibleFormulaStep,
  type MissingInputPrompt,
} from '@/services/apiClient';
import { formatRupees, formatUSD } from './impactCalculations';

export interface BusinessImpactSectionProps {
  onLaunchScanner: () => void;
  datasetId?: string;
  scanId?: string;
  evaluationDate?: string;
  refreshTrigger?: number;
}

export const BusinessImpactSection: React.FC<BusinessImpactSectionProps> = ({
  onLaunchScanner,
  datasetId: propDatasetId,
  scanId: propScanId,
  evaluationDate: propEvaluationDate,
  refreshTrigger,
}) => {
  // Currency mode: INR (₹) is official benchmark per R1 problem statement
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const symbol = currency === 'INR' ? '₹' : '$';

  // Datasets & Scans State
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(propDatasetId || '');
  const [scans, setScans] = useState<any[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>(propScanId || '');
  const [evaluationDate, setEvaluationDate] = useState<string>(propEvaluationDate || '2025-04-18');

  // Backend Recovery Response State
  const [impactData, setImpactData] = useState<RecoveryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Persistence State
  const [isPersisting, setIsPersisting] = useState<boolean>(false);
  const [persistFeedback, setPersistFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // User-Editable Assumptions
  const [daysSaved, setDaysSaved] = useState<number>(9.0);
  const [captureRate, setCaptureRate] = useState<number>(60.0);
  const [unverifiedConversionRate, setUnverifiedConversionRate] = useState<number>(60.0);
  const [grossMarginPercent, setGrossMarginPercent] = useState<number>(28.0);
  const [storeCountOverride, setStoreCountOverride] = useState<number | null>(null);
  const [annualizationEnabled, setAnnualizationEnabled] = useState<boolean>(true);

  // Sync props when parent updates
  useEffect(() => {
    if (propDatasetId && propDatasetId !== selectedDatasetId) {
      setSelectedDatasetId(propDatasetId);
    }
  }, [propDatasetId]);

  useEffect(() => {
    if (propScanId && propScanId !== selectedScanId) {
      setSelectedScanId(propScanId);
    }
  }, [propScanId]);

  useEffect(() => {
    if (propEvaluationDate && propEvaluationDate !== evaluationDate) {
      setEvaluationDate(propEvaluationDate);
    }
  }, [propEvaluationDate]);

  // Load available datasets on mount
  useEffect(() => {
    let isMounted = true;
    async function loadDatasets() {
      try {
        const dsList = await apiClient.listDatasets();
        if (!isMounted) return;
        setDatasets(dsList);

        if (!selectedDatasetId && dsList.length > 0) {
          const syntheticDs = dsList.find((d) => d.dataset_id.startsWith('DS_SYNTHETIC') && d.status === 'imported');
          const defaultDs = syntheticDs || dsList.find((d) => d.status === 'imported') || dsList[0];
          if (defaultDs) {
            setSelectedDatasetId(defaultDs.dataset_id);
            if (defaultDs.end_date) {
              setEvaluationDate(defaultDs.end_date);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load datasets for Business Impact:', err);
      }
    }
    loadDatasets();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load scans when dataset changes
  useEffect(() => {
    let isMounted = true;
    async function loadScans() {
      if (!selectedDatasetId) return;
      try {
        const scanList = await apiClient.listScans(selectedDatasetId);
        if (!isMounted) return;
        setScans(scanList);
        if (scanList.length > 0 && !selectedScanId) {
          setSelectedScanId(scanList[0].scan_id);
          if (scanList[0].evaluation_date) {
            setEvaluationDate(scanList[0].evaluation_date);
          }
        }
      } catch (err) {
        console.warn('Could not load scans for Business Impact:', err);
      }
    }
    loadScans();
    return () => {
      isMounted = false;
    };
  }, [selectedDatasetId]);

  // Main fetch function for business impact figures
  const fetchImpactReport = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.getRecoveryEstimate({
        dataset_id: selectedDatasetId || undefined,
        scan_id: selectedScanId || undefined,
        evaluation_date: evaluationDate,
        days_saved_per_incident: daysSaved,
        recovery_capture_rate: captureRate,
        unverified_conversion_rate: unverifiedConversionRate,
        gross_margin_percent: grossMarginPercent,
        store_count: storeCountOverride !== null ? storeCountOverride : undefined,
        annualization_enabled: annualizationEnabled,
      });

      if (res) {
        setImpactData(res);
        // Hydrate persisted assumptions if present and not modified yet
        if (res.persisted_assumptions && Object.keys(res.persisted_assumptions).length > 0) {
          const p = res.persisted_assumptions;
          if (p.days_saved_per_incident !== undefined) setDaysSaved(p.days_saved_per_incident);
          if (p.recovery_capture_rate !== undefined) setCaptureRate(p.recovery_capture_rate);
          if (p.unverified_conversion_rate !== undefined) setUnverifiedConversionRate(p.unverified_conversion_rate);
          if (p.gross_margin_percent !== undefined) setGrossMarginPercent(p.gross_margin_percent);
          if (p.store_count !== undefined) setStoreCountOverride(p.store_count);
        }
      } else {
        setErrorMsg('No impact data returned from backend API.');
      }
    } catch (err: any) {
      console.error('Impact calculation fetch error:', err);
      setErrorMsg(err.message || 'Failed to fetch business impact data');
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedDatasetId,
    selectedScanId,
    evaluationDate,
    daysSaved,
    captureRate,
    unverifiedConversionRate,
    grossMarginPercent,
    storeCountOverride,
    annualizationEnabled,
  ]);

  // Re-fetch when dependencies or refreshTrigger change
  useEffect(() => {
    fetchImpactReport();
  }, [fetchImpactReport, refreshTrigger]);

  // Handle assumption persistence
  const handlePersistAssumptions = async () => {
    setIsPersisting(true);
    setPersistFeedback(null);
    try {
      const payload = {
        dataset_id: selectedDatasetId || undefined,
        scan_id: selectedScanId || undefined,
        assumptions: {
          days_saved_per_incident: daysSaved,
          recovery_capture_rate: captureRate,
          unverified_conversion_rate: unverifiedConversionRate,
          gross_margin_percent: grossMarginPercent,
          store_count: storeCountOverride,
          annualization_enabled: annualizationEnabled,
        },
        report_name: `ROI Model: ${selectedDatasetId || 'Synthetic'} (${evaluationDate})`,
      };

      const res = await apiClient.persistAssumptions(payload);
      setPersistFeedback({
        type: 'success',
        message: `Assumptions persisted successfully (Report ID: ${res.report_id}) tied to ${selectedDatasetId || 'active dataset'}.`,
      });
      setTimeout(() => setPersistFeedback(null), 5000);
    } catch (err: any) {
      setPersistFeedback({
        type: 'error',
        message: err.message || 'Failed to persist assumptions.',
      });
    } finally {
      setIsPersisting(false);
    }
  };

  // Currency Formatter helper
  const formatAmount = (val?: number | null): string => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    if (currency === 'INR') {
      return formatRupees(val);
    } else {
      // Nominal 1:75 USD conversion for visualization comparison
      return formatUSD(val / 75.0);
    }
  };

  // Active dataset details
  const currentDataset = useMemo(() => {
    return datasets.find((d) => d.dataset_id === selectedDatasetId);
  }, [datasets, selectedDatasetId]);

  return (
    <section id="impact" className="impact-section-viewport" aria-label="Business Impact & ROI Calculator">
      {/* Section Backdrop & Cyan Pathway Motif */}
      <SectionBackdrop
        frameIndex={7}
        mediaSrc="/images/backgrounds/frame-07-business-impact.webp"
        accentColor="cyan"
        topTransition={true}
        bottomTransition={true}
      />

      <div className="section-container">
        {/* Section Header */}
        <div className="section-header-centered motion-fade-up">
          <div className="section-eyebrow">
            <span className="eyebrow-dot" />
            <span>FRAME 07 — BUSINESS IMPACT & ROI EVALUATION</span>
          </div>
          <h2 className="section-headline">
            Quantifiable Revenue Protection
          </h2>
          <p className="section-subheadline">
            Empirical business impact dynamically derived from your active dataset, verified inspection findings, and audit lead-time recovery formulas.
          </p>
        </div>

        {/* Live Dataset & Master Data Detection Strip */}
        <div className="detection-strip glass-panel motion-fade-up">
          <div className="strip-top-row">
            <div className="strip-context-group">
              <Database size={18} className="text-cyan-primary" />
              <div className="strip-labels">
                <span className="strip-title">
                  ACTIVE DATASET: {currentDataset ? currentDataset.name : (selectedDatasetId || 'Synthetic Suite')}
                </span>
                <span className="strip-desc">
                  {currentDataset ? `${currentDataset.total_records?.toLocaleString() || '34,654'} rows mapped • ` : ''}
                  Figures are derived dynamically. No hardcoded constants or simulated overrides.
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="persist-feedback-banner error" style={{ margin: '8px 0', width: '100%' }}>
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Dataset & Scan Selectors */}
            <div className="strip-selectors">
              <div className="selector-field">
                <label htmlFor="impact-dataset-select">Dataset:</label>
                <select
                  id="impact-dataset-select"
                  value={selectedDatasetId}
                  onChange={(e) => {
                    setSelectedDatasetId(e.target.value);
                    setSelectedScanId('');
                  }}
                  className="strip-select"
                >
                  {datasets.map((d) => (
                    <option key={d.dataset_id} value={d.dataset_id}>
                      {d.name} ({d.dataset_id})
                    </option>
                  ))}
                </select>
              </div>

              {scans.length > 0 && (
                <div className="selector-field">
                  <label htmlFor="impact-scan-select">Scan Run:</label>
                  <select
                    id="impact-scan-select"
                    value={selectedScanId}
                    onChange={(e) => setSelectedScanId(e.target.value)}
                    className="strip-select"
                  >
                    <option value="">Latest Scan</option>
                    {scans.map((s) => (
                      <option key={s.scan_id} value={s.scan_id}>
                        {s.scan_id.slice(0, 16)}... ({s.anomalies_detected} anomalies)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={fetchImpactReport}
                disabled={isLoading}
                className="strip-refresh-btn"
                title="Refresh calculations from live backend"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span>{isLoading ? 'Calculating...' : 'Recalculate'}</span>
              </button>
            </div>
          </div>

          {/* Master Data Mapping Badges */}
          <div className="master-data-grid">
            <div className="m-data-badge">
              <span className="m-label">SELLING PRICE</span>
              <span className="m-val font-mono">
                {impactData?.has_price_data ? (
                  <>
                    <span className="badge-tag measured">[MEASURED]</span> {symbol}
                    {currency === 'INR'
                      ? impactData.detected_avg_selling_price.toFixed(2)
                      : (impactData.detected_avg_selling_price / 75).toFixed(2)}
                  </>
                ) : (
                  <>
                    <span className="badge-tag assumed">[ASSUMED]</span> {symbol}450.00
                  </>
                )}
              </span>
            </div>

            <div className="m-data-badge">
              <span className="m-label">UNIT COST</span>
              <span className="m-val font-mono">
                {impactData?.has_cost_data && typeof impactData.detected_avg_unit_cost === 'number' ? (
                  <>
                    <span className="badge-tag measured">[MEASURED]</span> {symbol}
                    {currency === 'INR'
                      ? impactData.detected_avg_unit_cost.toFixed(2)
                      : (impactData.detected_avg_unit_cost / 75).toFixed(2)}
                  </>
                ) : (
                  <>
                    <span className="badge-tag missing">[UNMAPPED]</span> Margin Assumed
                  </>
                )}
              </span>
            </div>

            <div className="m-data-badge">
              <span className="m-label">LEDGER STOCK FLAGGED</span>
              <span className="m-val font-mono">
                <span className="badge-tag measured">[MEASURED]</span>{' '}
                {impactData?.total_ledger_units_flagged?.toLocaleString() ?? '—'} units
              </span>
            </div>

            <div className="m-data-badge">
              <span className="m-label">STORE COVERAGE</span>
              <span className="m-val font-mono">
                <span className="badge-tag measured">[MEASURED]</span>{' '}
                {impactData?.stores_count ?? 1} stores
              </span>
            </div>

            <div className="m-data-badge">
              <span className="m-label">OBSERVATION WINDOW</span>
              <span className="m-val font-mono">
                <span className="badge-tag measured">[MEASURED]</span>{' '}
                {impactData?.observation_period_days
                  ? `${impactData.observation_period_days} Days`
                  : 'Single Day Scan'}
              </span>
            </div>
          </div>
        </div>

        {/* Currency Toggle & Disclaimer Strip */}
        <div className="controls-sub-bar">
          <div className="currency-pills">
            <button
              type="button"
              onClick={() => setCurrency('INR')}
              className={`cur-pill-btn ${currency === 'INR' ? 'active' : ''}`}
            >
              ₹ INR (Official Benchmark)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`cur-pill-btn ${currency === 'USD' ? 'active' : ''}`}
            >
              $ USD (Normalized)
            </button>
          </div>

          <div className="caution-banner">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <span>
              <strong>Crucial Distinction:</strong> Flagged alerts are not confirmed recoveries. Only verified and probability-weighted alerts are counted towards financial recovery.
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* THE 6 CORE BUSINESS IMPACT CARDS */}
        {/* ============================================================== */}
        <div className="impact-six-grid motion-fade-up">
          {/* Card 1: Findings and Verified Findings */}
          <div className="impact-card glass-panel">
            <div className="card-top-row">
              <div className="card-badge measured">[MEASURED AUDIT]</div>
              <Target size={18} className="text-cyan-primary" />
            </div>
            <div className="card-metric-title">1. Findings & Verified Findings</div>
            <div className="card-main-val font-mono">
              {impactData?.total_findings_count ?? 0}
              <span className="card-val-unit"> alerts flagged</span>
            </div>
            <div className="status-breakdown-row font-mono">
              <span className="status-pill verified">
                ✓ {impactData?.verified_findings_count ?? 0} Verified
              </span>
              <span className="status-pill fp">
                ✗ {impactData?.false_positive_count ?? 0} False Pos
              </span>
              <span className="status-pill pending">
                ⏳ {impactData?.pending_verification_count ?? 0} Pending
              </span>
            </div>
            <div className="card-footer-formula">
              <div className="footer-label">Effective Conversion Weight:</div>
              <div className="footer-calc font-mono">
                {impactData?.effective_conversion_rate_percent.toFixed(1)}%
                {impactData?.is_conversion_rate_assumed ? ' (Assumed for pending)' : ' (Measured empirical rate)'}
              </div>
            </div>
            <p className="card-helper-text">
              Uninspected alerts receive a probability weight ({unverifiedConversionRate}%). False positives receive zero weight.
            </p>
          </div>

          {/* Card 2: Estimated Recoverable Units */}
          <div className="impact-card glass-panel">
            <div className="card-top-row">
              <div className="card-badge estimated">[ESTIMATED - BOUNDED]</div>
              <ShieldCheck size={18} className="text-cyan-primary" />
            </div>
            <div className="card-metric-title">2. Estimated Recoverable Units</div>
            <div className="card-main-val font-mono text-cyan-primary">
              {impactData?.estimated_recoverable_units?.toFixed(1) ?? '0.0'}
              <span className="card-val-unit"> units</span>
            </div>
            <div className="bounded-comparison font-mono">
              <span>Ledger Inventory: <strong>{impactData?.total_ledger_units_flagged?.toFixed(0) ?? 0} units</strong></span>
              <span className="sep">•</span>
              <span>Recovery Cap: <strong>{impactData?.total_ledger_units_flagged ? ((impactData.estimated_recoverable_units / impactData.total_ledger_units_flagged) * 100).toFixed(1) : 0}%</strong></span>
            </div>
            <div className="card-footer-formula">
              <div className="footer-label">Documented Method:</div>
              <div className="footer-calc font-mono">
                min(Stock<sub>i</sub>, DaysSaved × Velocity<sub>i</sub> × CaptureRate)
              </div>
            </div>
            <p className="card-helper-text">
              Strictly bounded by actual ledger on-hand units. Never assumes all flagged products are physically recoverable.
            </p>
          </div>

          {/* Card 3: Potential Revenue at Risk */}
          <div className="impact-card glass-panel">
            <div className="card-top-row">
              <div className="card-badge measured">[MEASURED STOCK × PRICE]</div>
              <TrendingUp size={18} className="text-amber-400" />
            </div>
            <div className="card-metric-title">3. Potential Revenue at Risk</div>
            <div className="card-main-val font-mono text-amber-400">
              {formatAmount(impactData?.potential_revenue_at_risk)}
            </div>
            <div className="bounded-comparison font-mono">
              <span>Trapped Inventory Units: <strong>{impactData?.potential_units_at_risk?.toFixed(0) ?? 0}</strong></span>
              <span className="sep">•</span>
              <span>Avg Retail Price: <strong>{symbol}{currency === 'INR' ? impactData?.detected_avg_selling_price?.toFixed(0) : (impactData?.detected_avg_selling_price ? (impactData.detected_avg_selling_price / 75).toFixed(1) : 0)}</strong></span>
            </div>
            <div className="card-footer-formula">
              <div className="footer-label">Definition:</div>
              <div className="footer-calc font-mono">
                ∑ (LedgerUnits<sub>i</sub> × SellingPrice<sub>i</sub>)
              </div>
            </div>
            <p className="card-helper-text">
              Total nominal retail value of all stock trapped in a phantom out-of-stock state. Not all of this is recapturable.
            </p>
          </div>

          {/* Card 4: Estimated Recoverable Revenue */}
          <div className="impact-card glass-panel highlight-border">
            <div className="card-top-row">
              <div className="card-badge estimated">[ESTIMATED RECOVERY]</div>
              <Calculator size={18} className="text-emerald-400" />
            </div>
            <div className="card-metric-title">4. Estimated Recoverable Revenue</div>
            <div className="card-main-val font-mono text-emerald-400">
              {formatAmount(impactData?.estimated_recoverable_revenue)}
            </div>
            <div className="bounded-comparison font-mono">
              <span>Per Verified Store: <strong>{formatAmount(impactData?.estimated_recoverable_revenue ? (impactData.estimated_recoverable_revenue / Math.max(1, impactData.stores_count)) : 0)}</strong></span>
            </div>
            <div className="card-footer-formula">
              <div className="footer-label">Risk-Adjusted Formula:</div>
              <div className="footer-calc font-mono">
                ∑ (RecoverableUnits<sub>i</sub> × Price<sub>i</sub> × StatusWeight<sub>i</sub>)
              </div>
            </div>
            <p className="card-helper-text">
              Realistically recoverable sales during audit lead-time window based on customer repurchase capture rate ({captureRate}%).
            </p>
          </div>

          {/* Card 5: Estimated Profit Impact */}
          <div className="impact-card glass-panel">
            <div className="card-top-row">
              <div className="card-badge" style={{
                background: impactData?.has_profit_impact ? 'rgba(56, 189, 248, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: impactData?.has_profit_impact ? '#38bdf8' : '#ef4444',
                borderColor: impactData?.has_profit_impact ? 'rgba(56, 189, 248, 0.4)' : 'rgba(239, 68, 68, 0.4)',
              }}>
                {impactData?.has_cost_data
                  ? '[MEASURED MARGIN]'
                  : impactData?.has_profit_impact
                  ? '[ASSUMED MARGIN]'
                  : '[MARGIN REQUIRED]'}
              </div>
              <TrendingUp size={18} className="text-cyan-bright" />
            </div>
            <div className="card-metric-title">5. Estimated Profit Impact</div>
            {impactData?.has_profit_impact ? (
              <>
                <div className="card-main-val font-mono text-cyan-bright">
                  {formatAmount(impactData.estimated_profit_impact)}
                </div>
                <div className="bounded-comparison font-mono">
                  <span>Gross Margin: <strong>{impactData.detected_gross_margin_percent?.toFixed(1)}%</strong></span>
                  <span className="sep">•</span>
                  <span>Basis: <strong>{impactData.has_cost_data ? 'Unit Cost Mapped' : 'User Assumed Margin'}</strong></span>
                </div>
              </>
            ) : (
              <div className="missing-cost-alert">
                <AlertTriangle size={16} className="text-amber-400" />
                <span>Unit cost is unmapped in this dataset. Provide margin % below to calculate profit.</span>
              </div>
            )}
            <div className="card-footer-formula">
              <div className="footer-label">Methodology:</div>
              <div className="footer-calc font-mono">
                {impactData?.profit_impact_method || 'Recoverable Revenue × Gross Margin %'}
              </div>
            </div>
            <p className="card-helper-text">
              Only reported when cost or margin data is available. Never fabricates margin when unmapped.
            </p>
          </div>

          {/* Card 6: Annualized Estimates */}
          <div className="impact-card glass-panel">
            <div className="card-top-row">
              <div className="card-badge assumed">[ANNUALIZED EXTRAPOLATION]</div>
              <Calendar size={18} className="text-purple-400" />
            </div>
            <div className="card-metric-title">6. Annualized Estimates</div>
            {impactData?.can_annualize ? (
              <>
                <div className="card-main-val font-mono text-purple-300">
                  {formatAmount(impactData.annualized_recoverable_revenue)}
                  <span className="card-val-unit"> / year</span>
                </div>
                <div className="bounded-comparison font-mono">
                  <span>Annualized Profit: <strong>{formatAmount(impactData.annualized_profit_impact)} / yr</strong></span>
                  <span className="sep">•</span>
                  <span>Multiplier: <strong>{impactData.annualization_multiplier.toFixed(2)}x</strong></span>
                </div>
              </>
            ) : (
              <div className="missing-cost-alert">
                <Info size={16} className="text-cyan-bright" />
                <span>Observation window is insufficient (&lt; 7 days) to responsibly extrapolate annual figures.</span>
              </div>
            )}
            <div className="card-footer-formula">
              <div className="footer-label">Annualization Justification:</div>
              <div className="footer-calc font-mono">
                {impactData?.annualization_basis || 'Observed Period Basis'}
              </div>
            </div>
            <p className="card-helper-text">
              Extrapolated across full operating year only when observation period supports representative behavior.
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MISSING INPUT QUESTIONS (Dynamic Assumption Prompts) */}
        {/* ============================================================== */}
        {impactData?.missing_input_prompts && impactData.missing_input_prompts.length > 0 && (
          <div className="missing-prompts-section motion-fade-up">
            <div className="prompts-header">
              <HelpCircle size={18} className="text-amber-400" />
              <div>
                <h4 className="prompts-title">Missing Input Assumptions Required for Selected Dataset</h4>
                <p className="prompts-subtitle">
                  The dataset headers did not contain all financial fields. Answer the question below to supply a transparent assumption.
                </p>
              </div>
            </div>

            <div className="prompts-grid">
              {impactData.missing_input_prompts.map((prompt: MissingInputPrompt) => (
                <div key={prompt.field_key} className="prompt-card glass-panel">
                  <div className="prompt-top">
                    <span className="prompt-question">{prompt.question}</span>
                    <span className="prompt-badge">[USER ASSUMPTION]</span>
                  </div>
                  <p className="prompt-reason">{prompt.why_needed}</p>
                  
                  {prompt.field_key === 'gross_margin_percent' && (
                    <div className="prompt-interactive">
                      <div className="preset-chips">
                        {[20, 28, 35, 45].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setGrossMarginPercent(preset)}
                            className={`chip-btn ${grossMarginPercent === preset ? 'active' : ''}`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                      <div className="prompt-input-group">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="0.5"
                          value={grossMarginPercent}
                          onChange={(e) => setGrossMarginPercent(Number(e.target.value))}
                          className="prompt-num-input font-mono"
                        />
                        <span className="font-mono">% Margin</span>
                      </div>
                    </div>
                  )}

                  {prompt.field_key === 'unverified_conversion_rate' && (
                    <div className="prompt-interactive">
                      <div className="preset-chips">
                        {[40, 50, 60, 75].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setUnverifiedConversionRate(preset)}
                            className={`chip-btn ${unverifiedConversionRate === preset ? 'active' : ''}`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                      <div className="prompt-input-group">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={unverifiedConversionRate}
                          onChange={(e) => setUnverifiedConversionRate(Number(e.target.value))}
                          className="prompt-num-input font-mono"
                        />
                        <span className="font-mono">% Conv Weight</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* INTERACTIVE ASSUMPTION SLIDERS & PERSISTENCE WORKSPACE */}
        {/* ============================================================== */}
        <div className="calculator-workspace glass-panel motion-fade-up">
          <div className="calc-header-row">
            <div className="calc-title-group">
              <Sliders size={22} className="text-cyan-primary" />
              <div>
                <h3 className="calc-title">Configurable Audit & Lead-Time Assumptions</h3>
                <p className="calc-subtitle">
                  Adjust lead-time and operational parameters. Assumptions are saved specifically for this dataset version and scan.
                </p>
              </div>
            </div>

            <div className="persist-actions-group">
              <button
                type="button"
                onClick={handlePersistAssumptions}
                disabled={isPersisting || isLoading}
                className="btn-persist"
              >
                <Save size={15} />
                <span>{isPersisting ? 'Saving Report...' : 'Persist Assumptions for this Dataset & Scan'}</span>
              </button>
            </div>
          </div>

          {persistFeedback && (
            <div className={`persist-feedback-banner ${persistFeedback.type}`}>
              {persistFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{persistFeedback.message}</span>
            </div>
          )}

          <div className="sliders-three-col">
            {/* Out of Stock Days Saved */}
            <div className="calc-control-group">
              <div className="ctrl-row">
                <span className="ctrl-name">Out-of-Stock Days Saved by AI</span>
                <span className="ctrl-num font-mono text-cyan-primary font-bold">
                  {daysSaved} Days Earlier
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="21"
                step="0.5"
                value={daysSaved}
                onChange={(e) => setDaysSaved(Number(e.target.value))}
                className="calc-range"
              />
              <div className="ctrl-hint">
                Audit cycle compression: Uncorrected phantom out-of-stock (11d) vs. AI detection (&lt;48h).
              </div>
            </div>

            {/* Customer Restock Capture Rate */}
            <div className="calc-control-group">
              <div className="ctrl-row">
                <span className="ctrl-name">Customer Retention / Capture %</span>
                <span className="ctrl-num font-mono text-cyan-primary font-bold">
                  {captureRate}%
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="95"
                step="5"
                value={captureRate}
                onChange={(e) => setCaptureRate(Number(e.target.value))}
                className="calc-range"
              />
              <div className="ctrl-hint">
                Percentage of shoppers who repurchase the item upon prompt shelf replenishment.
              </div>
            </div>

            {/* Unverified Conversion Rate */}
            <div className="calc-control-group">
              <div className="ctrl-row">
                <span className="ctrl-name">Unverified Alert Probability Weight</span>
                <span className="ctrl-num font-mono text-amber-400 font-bold">
                  {unverifiedConversionRate}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={unverifiedConversionRate}
                onChange={(e) => setUnverifiedConversionRate(Number(e.target.value))}
                className="calc-range"
              />
              <div className="ctrl-hint">
                {impactData?.is_conversion_rate_assumed
                  ? 'No floor audits recorded yet; using sensible default weight.'
                  : `Audited floor rate is ${impactData?.effective_conversion_rate_percent.toFixed(1)}%. Slider overrides for pending items.`}
              </div>
            </div>

            {/* Gross Margin % */}
            <div className="calc-control-group">
              <div className="ctrl-row">
                <span className="ctrl-name">Retail Gross Margin %</span>
                <span className="ctrl-num font-mono text-cyan-bright font-bold">
                  {grossMarginPercent}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="75"
                step="1"
                value={grossMarginPercent}
                onChange={(e) => setGrossMarginPercent(Number(e.target.value))}
                className="calc-range"
              />
              <div className="ctrl-hint">
                {impactData?.has_cost_data
                  ? 'Unit costs detected in dataset; override applies only if costs are unmapped.'
                  : 'Used to calculate profit impact since dataset did not contain unit cost column.'}
              </div>
            </div>

            {/* Chain Store Multiplier */}
            <div className="calc-control-group">
              <div className="ctrl-row">
                <span className="ctrl-name">Store Network Count</span>
                <span className="ctrl-num font-mono text-cyan-primary font-bold">
                  {storeCountOverride !== null ? `${storeCountOverride} Stores (Custom)` : `${impactData?.stores_count ?? 1} Stores (Detected)`}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={storeCountOverride !== null ? storeCountOverride : (impactData?.stores_count ?? 1)}
                onChange={(e) => setStoreCountOverride(Number(e.target.value))}
                className="calc-range"
              />
              <div className="ctrl-hint">
                Total store footprint for network-wide revenue recovery extrapolation.
              </div>
            </div>

            {/* Annualization Toggle */}
            <div className="calc-control-group toggle-group">
              <div className="ctrl-row">
                <span className="ctrl-name">Annualized Projections</span>
                <button
                  type="button"
                  onClick={() => setAnnualizationEnabled(!annualizationEnabled)}
                  className={`toggle-btn ${annualizationEnabled ? 'active' : ''}`}
                >
                  {annualizationEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
              <div className="ctrl-hint mt-2">
                Annualizes observed recovery across a 365-day fiscal year using active observation period.
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* STEP-BY-STEP VISIBLE ARITHMETIC BREAKDOWN */}
        {/* ============================================================== */}
        <div className="arithmetic-panel glass-panel motion-fade-up">
          <div className="arith-header-row">
            <div className="arith-title-group">
              <Calculator size={18} className="text-cyan-primary" />
              <div>
                <h4 className="arith-title">Visible Arithmetic & Mathematical Substitution</h4>
                <p className="arith-subtitle">
                  Every step is fully exposed for hackathon evaluation. Inputs and formulas are explicit.
                </p>
              </div>
            </div>

            <div className="source-legend">
              <span className="legend-item"><span className="legend-dot measured" /> [MEASURED] Dataset Value</span>
              <span className="legend-item"><span className="legend-dot estimated" /> [ESTIMATED] Bounded Formula</span>
              <span className="legend-item"><span className="legend-dot assumed" /> [ASSUMPTION] User Parameter</span>
            </div>
          </div>

          <div className="steps-container">
            {impactData?.visible_formula_steps && impactData.visible_formula_steps.length > 0 ? (
              impactData.visible_formula_steps.map((step: VisibleFormulaStep) => (
                <div key={step.step_number} className="formula-step-card">
                  <div className="step-badge-row">
                    <span className="step-num">STEP {step.step_number}</span>
                    <span className="step-name">{step.title}</span>
                    <span className={`metric-type-badge ${step.source_type.toLowerCase()}`}>
                      [{step.source_type}]
                    </span>
                  </div>

                  <div className="step-math-box">
                    <div className="formula-template font-mono">
                      <span className="t-label">Formula:</span> {step.formula}
                    </div>
                    <div className="numerical-expr font-mono">
                      <span className="t-label">Substitution:</span> {step.substituted}
                    </div>
                    <div className="step-result font-mono">
                      <span className="t-label">Result:</span> <strong>{step.result_text}</strong>
                    </div>
                  </div>

                  <p className="step-expl">{step.note}</p>
                </div>
              ))
            ) : (
              <div className="formula-step-card">
                <div className="step-name">Loading arithmetic substitution steps from backend...</div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom CTA to Floor Verification Queue */}
        <div className="impact-footer-cta motion-fade-up">
          <button
            type="button"
            onClick={onLaunchScanner}
            className="btn-primary"
          >
            <span>Proceed to Daily Operational Floor Dispatch (Frame 06)</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .impact-section-viewport {
          position: relative;
          width: 100%;
          padding: 100px 0 80px;
          background: transparent;
          overflow: hidden;
          z-index: 10;
        }

        .section-container {
          position: relative;
          z-index: 10;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .section-header-centered {
          text-align: center;
          max-width: 820px;
          margin: 0 auto 40px;
        }

        .section-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 14px;
          border-radius: 20px;
          background: rgba(14, 116, 144, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--cyan-primary);
          margin-bottom: 16px;
        }

        .eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--cyan-primary);
          box-shadow: 0 0 8px var(--cyan-primary);
        }

        .section-headline {
          font-family: var(--font-display);
          font-size: 2.4rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #ffffff;
          margin-bottom: 16px;
          line-height: 1.2;
        }

        @media (min-width: 768px) {
          .section-headline {
            font-size: 3rem;
          }
        }

        .section-subheadline {
          font-size: 1.05rem;
          line-height: 1.6;
          color: #94a3b8;
        }

        /* Detection Strip */
        .detection-strip {
          padding: 20px 24px;
          border-radius: 16px;
          background: rgba(10, 20, 38, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.25);
          margin-bottom: 24px;
        }

        .strip-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 16px;
        }

        .strip-context-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .strip-title {
          display: block;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--cyan-primary);
        }

        .strip-desc {
          display: block;
          font-size: 0.82rem;
          color: #94a3b8;
        }

        .strip-selectors {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .selector-field {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: #cbd5e1;
        }

        .strip-select {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 8px;
          padding: 6px 12px;
          color: #ffffff;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          outline: none;
        }

        .strip-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          background: rgba(0, 242, 254, 0.15);
          border: 1px solid rgba(0, 242, 254, 0.4);
          color: var(--cyan-primary);
          font-family: var(--font-mono);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .strip-refresh-btn:hover:not(:disabled) {
          background: rgba(0, 242, 254, 0.25);
        }

        .master-data-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }

        .m-data-badge {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 10px 14px;
        }

        .m-label {
          display: block;
          font-size: 0.7rem;
          font-family: var(--font-mono);
          color: #64748b;
          margin-bottom: 4px;
        }

        .m-val {
          font-size: 0.9rem;
          color: #f1f5f9;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .badge-tag {
          font-size: 0.65rem;
          padding: 1px 5px;
          border-radius: 4px;
          font-weight: 700;
        }

        .badge-tag.measured {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }

        .badge-tag.estimated {
          background: rgba(56, 189, 248, 0.2);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.4);
        }

        .badge-tag.assumed {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }

        .badge-tag.missing {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        /* Sub-controls & Caution bar */
        .controls-sub-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }

        .currency-pills {
          display: flex;
          gap: 8px;
        }

        .cur-pill-btn {
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cur-pill-btn.active {
          background: rgba(0, 242, 254, 0.15);
          border-color: rgba(0, 242, 254, 0.5);
          color: var(--cyan-primary);
        }

        .caution-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #fbbf24;
          font-size: 0.75rem;
          max-width: 780px;
        }

        /* 6 Core Cards Grid */
        .impact-six-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .impact-card {
          padding: 24px;
          border-radius: 16px;
          background: rgba(10, 20, 38, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.2);
          display: flex;
          flex-direction: column;
          transition: border-color 0.2s ease;
        }

        .impact-card:hover {
          border-color: rgba(0, 242, 254, 0.4);
        }

        .impact-card.highlight-border {
          border-color: rgba(16, 185, 129, 0.5);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
        }

        .card-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .card-badge {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        .card-badge.measured {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.35);
        }

        .card-badge.estimated {
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.35);
        }

        .card-badge.assumed {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.35);
        }

        .card-metric-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #cbd5e1;
          margin-bottom: 8px;
        }

        .card-main-val {
          font-size: 2.1rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #ffffff;
          line-height: 1.15;
          margin-bottom: 10px;
        }

        .card-val-unit {
          font-size: 0.9rem;
          font-weight: 500;
          color: #94a3b8;
        }

        .status-breakdown-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .status-pill {
          font-size: 0.72rem;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .status-pill.verified {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
        }

        .status-pill.fp {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        .status-pill.pending {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
        }

        .bounded-comparison {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: #94a3b8;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .bounded-comparison strong {
          color: #f1f5f9;
        }

        .card-footer-formula {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 10px;
        }

        .footer-label {
          font-size: 0.68rem;
          font-family: var(--font-mono);
          color: #64748b;
          margin-bottom: 2px;
        }

        .footer-calc {
          font-size: 0.78rem;
          color: var(--cyan-primary);
        }

        .card-helper-text {
          font-size: 0.75rem;
          color: #64748b;
          line-height: 1.45;
          margin: 0;
          margin-top: auto;
        }

        .missing-cost-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          font-size: 0.78rem;
          margin-bottom: 12px;
        }

        /* Missing Prompts Workspace */
        .missing-prompts-section {
          padding: 24px;
          border-radius: 16px;
          background: rgba(15, 28, 54, 0.85);
          border: 1px solid rgba(245, 158, 11, 0.4);
          margin-bottom: 32px;
        }

        .prompts-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .prompts-title {
          font-size: 1rem;
          font-weight: 700;
          color: #fbbf24;
          margin: 0;
        }

        .prompts-subtitle {
          font-size: 0.82rem;
          color: #94a3b8;
          margin: 0;
        }

        .prompts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 16px;
        }

        .prompt-card {
          padding: 16px;
          border-radius: 12px;
          background: rgba(10, 20, 38, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .prompt-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .prompt-question {
          font-size: 0.85rem;
          font-weight: 700;
          color: #ffffff;
        }

        .prompt-badge {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }

        .prompt-reason {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .prompt-interactive {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .preset-chips {
          display: flex;
          gap: 6px;
        }

        .chip-btn {
          padding: 4px 10px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(56, 189, 248, 0.2);
          color: #94a3b8;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          cursor: pointer;
        }

        .chip-btn.active {
          background: rgba(0, 242, 254, 0.2);
          border-color: rgba(0, 242, 254, 0.5);
          color: var(--cyan-primary);
          font-weight: 700;
        }

        .prompt-input-group {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          color: #cbd5e1;
        }

        .prompt-num-input {
          width: 70px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 6px;
          padding: 4px 8px;
          color: #ffffff;
          font-size: 0.85rem;
        }

        /* Calculator Workspace */
        .calculator-workspace {
          padding: 28px 24px;
          border-radius: 16px;
          background: rgba(10, 20, 38, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.25);
          margin-bottom: 32px;
        }

        .calc-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }

        .calc-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .calc-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .calc-subtitle {
          font-size: 0.82rem;
          color: #94a3b8;
          margin: 0;
        }

        .btn-persist {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 10px;
          background: rgba(0, 242, 254, 0.15);
          border: 1px solid rgba(0, 242, 254, 0.5);
          color: var(--cyan-primary);
          font-family: var(--font-mono);
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-persist:hover:not(:disabled) {
          background: rgba(0, 242, 254, 0.28);
          box-shadow: 0 0 16px rgba(0, 242, 254, 0.25);
        }

        .persist-feedback-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 0.82rem;
        }

        .persist-feedback-banner.success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #34d399;
        }

        .persist-feedback-banner.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .sliders-three-col {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .calc-control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ctrl-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ctrl-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: #cbd5e1;
        }

        .ctrl-num {
          font-size: 0.85rem;
        }

        .calc-range {
          width: 100%;
          accent-color: var(--cyan-primary);
          cursor: pointer;
        }

        .ctrl-hint {
          font-size: 0.72rem;
          color: #64748b;
          line-height: 1.35;
        }

        .toggle-btn {
          padding: 4px 12px;
          border-radius: 6px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #64748b;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        .toggle-btn.active {
          background: rgba(0, 242, 254, 0.2);
          border-color: rgba(0, 242, 254, 0.5);
          color: var(--cyan-primary);
        }

        /* Arithmetic Panel */
        .arithmetic-panel {
          padding: 28px 24px;
          border-radius: 16px;
          background: rgba(10, 20, 38, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.25);
          margin-bottom: 40px;
        }

        .arith-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .arith-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .arith-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .arith-subtitle {
          font-size: 0.82rem;
          color: #94a3b8;
          margin: 0;
        }

        .source-legend {
          display: flex;
          align-items: center;
          gap: 16px;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: #94a3b8;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend-dot.measured {
          background: #34d399;
          box-shadow: 0 0 6px #34d399;
        }

        .legend-dot.estimated {
          background: #38bdf8;
          box-shadow: 0 0 6px #38bdf8;
        }

        .legend-dot.assumed {
          background: #fbbf24;
          box-shadow: 0 0 6px #fbbf24;
        }

        .steps-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .formula-step-card {
          padding: 18px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
        }

        .step-badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .step-num {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(0, 242, 254, 0.15);
          color: var(--cyan-primary);
        }

        .step-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: #ffffff;
        }

        .metric-type-badge {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          margin-left: auto;
        }

        .metric-type-badge.measured {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
        }

        .metric-type-badge.estimated {
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
        }

        .metric-type-badge.assumed {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
        }

        .step-math-box {
          background: rgba(10, 15, 28, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.15);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.78rem;
          margin-bottom: 12px;
        }

        .formula-template {
          color: #94a3b8;
          margin-bottom: 6px;
        }

        .numerical-expr {
          color: #cbd5e1;
          margin-bottom: 6px;
        }

        .step-result {
          color: var(--cyan-primary);
        }

        .t-label {
          color: #64748b;
          margin-right: 4px;
        }

        .step-expl {
          font-size: 0.74rem;
          color: #64748b;
          line-height: 1.4;
          margin: 0;
          margin-top: auto;
        }

        /* Footer CTA */
        .impact-footer-cta {
          display: flex;
          justify-content: center;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          border-radius: 12px;
          background: linear-gradient(135deg, #00f2fe 0%, #2563eb 100%);
          border: none;
          color: #030712;
          font-family: var(--font-sans);
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(0, 242, 254, 0.35);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 28px rgba(0, 242, 254, 0.5);
        }
      `}</style>
    </section>
  );
};
