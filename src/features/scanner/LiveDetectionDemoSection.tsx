import React, { useState, useMemo, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  AlertOctagon,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  TrendingDown,
  Layers,
  ArrowRight,
  Store,
  Package,
  SlidersHorizontal,
  Database,
  RefreshCw,
} from 'lucide-react';
import { SectionBackdrop } from '@/components/layout/SectionBackdrop';
import { evaluateAnomaly } from './scannerEngine';
import type { DetectedAnomalyPayload } from '@/types/scanner';
import { apiClient } from '@/services/apiClient';

export type { DetectedAnomalyPayload };

export const LiveDetectionDemoSection: React.FC<{
  onExploreDashboard: (detectedAnomaly?: DetectedAnomalyPayload) => void;
}> = ({ onExploreDashboard }) => {
  // Configurable input states
  const [selectedStore, setSelectedStore] = useState('Store #12 — Downtown Flagship');
  const [selectedSku, setSelectedSku] = useState('SKU #4587');
  const [recordedStock, setRecordedStock] = useState(6);
  const [zeroSalesDays, setZeroSalesDays] = useState(7);
  const [historicalVelocity, setHistoricalVelocity] = useState(4.2);

  // Quick narrative demo scenario presets
  const [activePreset, setActivePreset] = useState<'critical' | 'slow-mover' | 'genuine-oos' | 'custom'>('critical');

  const handleApplyPreset = (preset: 'critical' | 'slow-mover' | 'genuine-oos') => {
    setActivePreset(preset);
    if (preset === 'critical') {
      setSelectedStore('Store #12 — Downtown Flagship (824 active SKUs)');
      setSelectedSku('SKU #4587');
      setRecordedStock(6);
      setZeroSalesDays(7);
      setHistoricalVelocity(4.2);
    } else if (preset === 'slow-mover') {
      setSelectedStore('Store #12 — Downtown Flagship (824 active SKUs)');
      setSelectedSku('SKU #6320');
      setRecordedStock(4);
      setZeroSalesDays(2);
      setHistoricalVelocity(2.1);
    } else if (preset === 'genuine-oos') {
      setSelectedStore('Store #12 — Downtown Flagship (824 active SKUs)');
      setSelectedSku('SKU #1042');
      setRecordedStock(0);
      setZeroSalesDays(4);
      setHistoricalVelocity(6.5);
    }
  };

  // Scanning animation states (Client Simulation)
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [hasScanned, setHasScanned] = useState(true); // Initial demo view ready

  // Real backend scan states
  const [isScanningBackend, setIsScanningBackend] = useState(false);
  const [backendScanDate, setBackendScanDate] = useState('2025-04-30');
  const [backendScanResult, setBackendScanResult] = useState<{
    scanId: string;
    findingCount: number;
    storesCovered: number;
    status: string;
    evaluationDate: string;
  } | null>(null);
  const [backendScanError, setBackendScanError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .listDatasets()
      .then((dsList) => {
        if (dsList && dsList.length > 0) {
          const target = dsList.find((d) => d.status === 'imported') || dsList[0];
          if (target?.end_date) {
            setBackendScanDate(target.end_date);
          }
        }
      })
      .catch(() => {});
  }, []);

  const storeOptions = [
    'Store #12 — Downtown Flagship (824 active SKUs)',
    'Store #04 — West End Galleria (780 active SKUs)',
    'Store #19 — Airport Plaza (690 active SKUs)',
    'Store #08 — Suburb Center (810 active SKUs)',
  ];

  const skuLibrary: Record<
    string,
    { name: string; category: string; price: number; normalVelocity: number; aisle: string }
  > = {
    'SKU #4587': {
      name: 'Smart Aura Soundbar System',
      category: 'Electronics',
      price: 189.99,
      normalVelocity: 4.2,
      aisle: 'Aisle 4-B, Bay 2',
    },
    'SKU #2891': {
      name: 'Ultra Wireless ANC Buds Pro',
      category: 'Audio',
      price: 129.50,
      normalVelocity: 3.8,
      aisle: 'Aisle 2-A, Bay 1',
    },
    'SKU #1042': {
      name: 'USB-C GaN 100W Fast Charger',
      category: 'Accessories',
      price: 49.99,
      normalVelocity: 6.5,
      aisle: 'Aisle 5-C, Bay 4',
    },
    'SKU #6320': {
      name: 'MagCharge Dual Wireless Stand',
      category: 'Accessories',
      price: 79.0,
      normalVelocity: 2.1,
      aisle: 'Aisle 3-D, Bay 3',
    },
  };

  const handleSkuChange = (skuId: string) => {
    setActivePreset('custom');
    setSelectedSku(skuId);
    if (skuLibrary[skuId]) {
      setHistoricalVelocity(skuLibrary[skuId].normalVelocity);
    }
  };

  const handleRunSimulation = () => {
    if (isScanning) return; // Prevent duplicate simulation runs while active
    setIsScanning(true);
    setScanStep(1);
    setHasScanned(false);

    setTimeout(() => setScanStep(2), 350);
    setTimeout(() => setScanStep(3), 750);
    setTimeout(() => {
      setScanStep(4);
      setIsScanning(false);
      setHasScanned(true);
    }, 1200);
  };

  const handleRunBackendScan = async () => {
    if (isScanningBackend) return;
    setIsScanningBackend(true);
    setBackendScanError(null);

    try {
      const res = await apiClient.triggerScan({
        evaluation_date: backendScanDate,
        threshold_days: Math.max(2, Math.min(7, zeroSalesDays)),
        confidence_cutoff: 40.0,
        max_findings_per_store: 20,
      });

      setBackendScanResult({
        scanId: res.scan_id,
        findingCount: res.flagged_count ?? res.findings?.length ?? 0,
        storesCovered: res.stores_covered,
        status: res.status,
        evaluationDate: res.evaluation_date,
      });
    } catch (err: any) {
      setBackendScanResult(null);
      setBackendScanError(err.message || 'Backend scan request failed');
    } finally {
      setIsScanningBackend(false);
    }
  };

  // Deterministic Poisson evaluation logic via centralized detection engine
  const {
    expectedTotalSales,
    pZeroSales,
    isGenuineOos,
    isCritical,
    isModerate,
    isNormal,
    anomalyConfidence,
  } = evaluateAnomaly(recordedStock, zeroSalesDays, historicalVelocity);

  const currentSkuData = skuLibrary[selectedSku] || skuLibrary['SKU #4587'];

  // Dynamic 7-day timeline points updating live with user sliders
  const timelinePoints = useMemo(() => {
    const days = ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1', 'Today'];
    const dailyVelocity = historicalVelocity / 7;
    return days.map((day, idx) => {
      const daysAgo = 6 - idx;
      const isZero = daysAgo < zeroSalesDays;
      const normalSales = Math.max(1, Math.round(dailyVelocity * 1.3));
      return {
        day,
        stock: recordedStock,
        sales: isZero ? 0 : normalSales,
        isZeroSales: isZero,
      };
    });
  }, [historicalVelocity, zeroSalesDays, recordedStock]);

  return (
    <section id="demo" className="demo-section-viewport" aria-label="Live Detection Demo">
      {/* Section Backdrop & Cyan Pathway Motif */}
      <SectionBackdrop
        frameIndex={5}
        mediaSrc="/images/backgrounds/frame-05-live-scanner.webp"
        accentColor="cyan"
        topTransition={true}
        bottomTransition={true}
      />

      <div className="section-container">
        {/* Section Header */}
        <div className="section-header-centered motion-fade-up">
          <div className="section-eyebrow">
            <span className="eyebrow-dot" />
            <span>FRAME 05 — CLIENT-SIDE DIAGNOSTIC SIMULATOR</span>
          </div>
          <h2 className="section-headline">
            Test the Phantom Stock-Out Detector
          </h2>
          <p className="section-subheadline">
            Configure store parameters, adjust consecutive zero-sales duration, and execute live Bayesian diagnostic inference to observe anomaly scoring in real time.
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
              CLIENT-SIDE DIAGNOSTIC SIMULATOR (SINGLE SKU SANDBOX)
            </span>
            <button
              type="button"
              onClick={() => onExploreDashboard()}
              className="text-xs text-slate-400 hover:text-cyan-400 underline font-mono ml-2 transition-colors cursor-pointer"
            >
              For Multi-Store Backend Scans, See Frame 06 ↓
            </button>
          </div>
        </div>

        {/* Demo Interface Grid */}
        <div className="demo-workbench-grid">
          {/* Left Column: Interactive Scenario Controls */}
          <div className="workbench-controls glass-panel motion-fade-up motion-stagger-1">
            <div className="controls-header">
              <span className="ctrl-badge">SIMULATION PARAMETERS</span>
              <span className="ctrl-note">* Deterministic illustrative engine</span>
            </div>

            {/* Quick 1-Click Demo Narrative Presets */}
            <div className="demo-preset-group">
              <div className="preset-label-row">
                <span className="preset-title font-mono">1-CLICK DEMO NARRATIVES:</span>
                <span className="preset-sub font-mono">* Presenter presets</span>
              </div>
              <div className="preset-buttons-grid">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('critical')}
                  className={`btn-preset ${activePreset === 'critical' ? 'preset-active-critical' : ''}`}
                  disabled={isScanning}
                  title="Preset 1: SKU #4587 in Bay 4-B with 6 on-hand units and 0 sales in 7 days"
                >
                  <AlertOctagon size={12} className="text-red-accent" />
                  <span>Critical Phantom (Bay 4-B)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('slow-mover')}
                  className={`btn-preset ${activePreset === 'slow-mover' ? 'preset-active-warning' : ''}`}
                  disabled={isScanning}
                  title="Preset 2: SKU #6320 with low sales rate correctly filtered by Poisson baseline"
                >
                  <SlidersHorizontal size={12} className="text-cyan-primary" />
                  <span>Slow-Mover Filtered</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('genuine-oos')}
                  className={`btn-preset ${activePreset === 'genuine-oos' ? 'preset-active-neutral' : ''}`}
                  disabled={isScanning}
                  title="Preset 3: SKU #1042 with 0 ledger units recognized as legitimate out-of-stock"
                >
                  <CheckCircle size={12} className="text-emerald-400" />
                  <span>Genuine 0-Stock Baseline</span>
                </button>
              </div>
            </div>

            {/* Store Picker */}
            <div className="ctrl-group">
              <label htmlFor="store-select" className="ctrl-label">
                <Store size={14} className="text-cyan-primary" />
                <span>Store Location</span>
              </label>
              <select
                id="store-select"
                value={selectedStore}
                onChange={(e) => {
                  setActivePreset('custom');
                  setSelectedStore(e.target.value);
                }}
                className="select-field"
              >
                {storeOptions.map((st, i) => (
                  <option key={i} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* SKU Selector */}
            <div className="ctrl-group">
              <label htmlFor="sku-select" className="ctrl-label">
                <Package size={14} className="text-cyan-primary" />
                <span>Target Retail SKU</span>
              </label>
              <select
                id="sku-select"
                value={selectedSku}
                onChange={(e) => handleSkuChange(e.target.value)}
                className="select-field"
              >
                {Object.keys(skuLibrary).map((sku) => (
                  <option key={sku} value={sku}>
                    {sku} — {skuLibrary[sku].name} (${skuLibrary[sku].price})
                  </option>
                ))}
              </select>
              <div className="sku-meta-hint">
                Location: {currentSkuData.aisle} • Category: {currentSkuData.category}
              </div>
            </div>

            {/* Recorded Stock Slider */}
            <div className="ctrl-group">
              <div className="slider-label-row">
                <span className="ctrl-label">
                  <Layers size={14} className="text-cyan-primary" />
                  <span>Recorded ERP Ledger Stock</span>
                </span>
                <span className="slider-val text-cyan-primary font-mono font-bold">
                  {recordedStock} units
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={recordedStock}
                onChange={(e) => {
                  setActivePreset('custom');
                  setRecordedStock(Number(e.target.value));
                }}
                className="range-slider"
              />
              <div className="slider-range-ticks">
                <span>0 units (Genuine OOS)</span>
                <span>10 units</span>
                <span>20 units</span>
              </div>
            </div>

            {/* Consecutive Zero-Sales Days Slider */}
            <div className="ctrl-group">
              <div className="slider-label-row">
                <span className="ctrl-label">
                  <TrendingDown size={14} className="text-red-accent" />
                  <span>Consecutive Zero-Sales Days</span>
                </span>
                <span className="slider-val text-red-accent font-mono font-bold">
                  {zeroSalesDays} days
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="14"
                step="1"
                value={zeroSalesDays}
                onChange={(e) => {
                  setActivePreset('custom');
                  setZeroSalesDays(Number(e.target.value));
                }}
                className="range-slider range-red"
              />
              <div className="slider-range-ticks">
                <span>0 days (Active)</span>
                <span>7 days (1 Week)</span>
                <span>14 days (Severe)</span>
              </div>
            </div>

            {/* Historical Run Rate Slider */}
            <div className="ctrl-group">
              <div className="slider-label-row">
                <span className="ctrl-label">Historical Velocity Baseline</span>
                <span className="slider-val text-cyan-bright font-mono">
                  {historicalVelocity.toFixed(1)} units/wk
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="12.0"
                step="0.5"
                value={historicalVelocity}
                onChange={(e) => {
                  setActivePreset('custom');
                  setHistoricalVelocity(Number(e.target.value));
                }}
                className="range-slider"
              />
            </div>

            {/* Action Triggers */}
            <div className="flex flex-col gap-2 mt-4">
              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isScanning}
                className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 font-mono text-xs cursor-pointer"
              >
                <Play size={14} fill="currentColor" />
                <span>{isScanning ? 'Simulating Scenario...' : 'Run Client Simulation'}</span>
              </button>

              <button
                type="button"
                onClick={handleRunBackendScan}
                disabled={isScanningBackend}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 font-mono text-xs cursor-pointer"
              >
                {isScanningBackend ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-cyan-primary" />
                    <span>Executing Backend Scan...</span>
                  </>
                ) : (
                  <>
                    <Database size={14} />
                    <span>Execute Real Backend Scan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Dynamic Analysis & Results Card */}
          <div className="workbench-results glass-panel motion-fade-up motion-stagger-2">
            {/* Visible Backend Scan Error Notification */}
            {backendScanError && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-fade-in font-mono">
                <AlertOctagon size={16} className="text-red-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-red-300">Backend Scan Failed</div>
                  <div className="text-slate-300 mt-0.5">{backendScanError}</div>
                </div>
              </div>
            )}

            {/* Real Backend Scan Result Banner */}
            {backendScanResult && (
              <div className="p-3 mb-4 rounded-lg bg-cyan-950/60 border border-cyan-500/50 text-cyan-200 text-xs flex items-center justify-between gap-3 animate-fade-in font-mono flex-wrap">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-cyan-400 shrink-0" />
                  <div>
                    <div className="font-bold text-white">
                      Backend Scan Confirmed: <span className="text-cyan-primary">{backendScanResult.scanId}</span>
                    </div>
                    <div className="text-slate-300 text-[11px]">
                      {backendScanResult.findingCount} findings returned across {backendScanResult.storesCovered} stores (Date: {backendScanResult.evaluationDate})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onExploreDashboard()}
                  className="btn-secondary py-1 px-2.5 text-xs font-mono text-cyan-300 hover:text-white shrink-0 cursor-pointer"
                >
                  View in Top-20 Queue →
                </button>
              </div>
            )}

            {isScanning && (
              <div className="scan-in-progress-view animate-fade-in">
                <div className="radar-spinner" />
                <h4 className="scan-step-title">
                  {scanStep === 1 && 'Step 1/4: Ingesting 7-day register receipts...'}
                  {scanStep === 2 && 'Step 2/4: Cross-referencing ERP on-hand ledger (+ units)...'}
                  {scanStep === 3 && 'Step 3/4: Calculating Poisson zero-sales threshold probability...'}
                  {scanStep === 4 && 'Step 4/4: Formatting operational associate action card...'}
                </h4>
                <div className="scan-progress-bar">
                  <div
                    className="scan-progress-fill"
                    style={{ width: `${scanStep * 25}%` }}
                  />
                </div>
                <div className="scan-sub-status">
                  Cross-referencing {selectedSku} against {selectedStore}
                </div>
              </div>
            )}

            {!isScanning && hasScanned && (
              <div className="scan-results-top animate-fade-in">
                {/* Clear Simulation Mode Label Banner */}
                <div className="mb-3 flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/5">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
                    <SlidersHorizontal size={12} />
                    <span>SIMULATION RESULT ({activePreset === 'custom' ? 'CUSTOM SCENARIO' : `PRESET: ${activePreset.toUpperCase()}`})</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    * Client-side Poisson diagnostic sandbox
                  </span>
                </div>

                {/* Result Header Badge */}
                <div className="result-status-header">
                  {isGenuineOos ? (
                    <div className="badge-normal badge-oos">
                      <CheckCircle size={18} />
                      <span>GENUINE OUT-OF-STOCK (NO PHANTOM ANOMALY)</span>
                    </div>
                  ) : isCritical ? (
                    <div className="badge-critical">
                      <AlertOctagon size={18} />
                      <span>CRITICAL PHANTOM STOCK-OUT CONFIRMED</span>
                    </div>
                  ) : isModerate ? (
                    <div className="badge-warning">
                      <HelpCircle size={18} />
                      <span>SUSPICIOUS VELOCITY DIP — MONITORING</span>
                    </div>
                  ) : (
                    <div className="badge-normal">
                      <CheckCircle size={18} />
                      <span>HEALTHY VELOCITY — NO ANOMALY</span>
                    </div>
                  )}

                  <div className="score-badge">
                    <Sparkles size={13} className="text-cyan-primary" />
                    <span>
                      {isGenuineOos
                        ? 'ERP LEDGER: 0 ON-HAND'
                        : `AI CONFIDENCE: ${anomalyConfidence.toFixed(1)}%`}
                    </span>
                  </div>
                </div>

                {/* SKU Highlight Strip */}
                <div className="sku-summary-strip">
                  <div>
                    <div className="sku-name-title">{currentSkuData.name}</div>
                    <div className="sku-details-sub">
                      {selectedSku} • {currentSkuData.aisle} • MSRP: ${currentSkuData.price.toFixed(2)}
                    </div>
                  </div>
                  <div className="sku-price-at-risk">
                    <span className="risk-dollars-label">Est. Weekly Revenue Loss:</span>
                    <span className="risk-dollars-val font-mono">
                      ${((currentSkuData.price * historicalVelocity)).toFixed(0)}/wk
                    </span>
                  </div>
                </div>

                {/* Contradiction Telemetry Visual Box */}
                <div className="contradiction-visual-box">
                  <div className="stat-pill-col positive">
                    <span className="p-label">Recorded Ledger Stock</span>
                    <span className="p-value font-mono">+{recordedStock} units</span>
                    <span className="p-note">ERP shows on-hand</span>
                  </div>

                  <div className="stat-vs-divider">VS</div>

                  <div className={`stat-pill-col ${isCritical ? 'negative' : 'neutral'}`}>
                    <span className="p-label">Consecutive Zero Sales</span>
                    <span className="p-value font-mono">{zeroSalesDays} days</span>
                    <span className="p-note">
                      Expected {expectedTotalSales.toFixed(1)} units sold
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* State-Driven Dynamic Divergence Chart (Visible both during scan and on completed result) */}
            <div className={`dynamic-divergence-chart glass-panel ${isScanning ? 'is-scanning-pulse' : ''}`}>
              {/* Sweeping LiDAR Laser Scan Plane across shelf and timeline */}
              {isScanning && (
                <div className="chart-scanning-overlay">
                  <div className="sweeping-laser-beam" />
                </div>
              )}

              {/* Shelf Bay Optical Sensor Strip */}
              <div className="shelf-optical-strip">
                <div className="shelf-optical-label">
                  <span className="text-cyan-primary">SHELF BAY SENSOR:</span>
                  <span className="font-mono text-slate-300">{currentSkuData.aisle}</span>
                </div>
                <div className="shelf-slots-bar">
                  {[...Array(6)].map((_, i) => {
                    const isMissingSlot = i >= 3 && isCritical;
                    return (
                      <div
                        key={i}
                        className={`shelf-slot-indicator ${isMissingSlot ? 'slot-missing' : 'slot-present'}`}
                        title={isMissingSlot ? 'Empty shelf slot (Missing)' : 'Stocked unit slot'}
                      >
                        <span className="slot-dot" />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="chart-meta-row">
                <div className="chart-legend-left">
                  <span className="legend-chip">
                    <span className="legend-dot-cyan" />
                    <span>ERP Stock: +{recordedStock}u</span>
                  </span>
                  <span className="legend-chip">
                    <span className="legend-dot-red" />
                    <span>Register Sales: 0 for {zeroSalesDays}d</span>
                  </span>
                </div>
                <span className="chart-engine-tag font-mono">
                  {isScanning ? 'SCANNING SHELF TIMELINE...' : `Poisson λ = ${(historicalVelocity / 7).toFixed(2)}/day`}
                </span>
              </div>

              <div className="chart-svg-wrap">
                <svg viewBox="0 0 440 90" className="chart-svg-elem">
                  {/* Grid lines */}
                  <line x1="25" y1="20" x2="415" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                  <line x1="25" y1="48" x2="415" y2="48" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                  <line x1="25" y1="72" x2="415" y2="72" stroke="rgba(255,255,255,0.12)" />

                  {/* Dynamic timeline points */}
                  {timelinePoints.map((pt, idx) => {
                    const x = 40 + idx * 60;
                    const stockY = 20;
                    const salesY = pt.isZeroSales ? 72 : Math.max(26, 72 - (pt.sales * 14));
                    return (
                      <g key={idx} className="timeline-node">
                        <text x={x} y="86" fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
                          {pt.day}
                        </text>

                        {/* Shaded vertical bar indicating phantom divergence gap */}
                        {pt.isZeroSales && (
                          <rect
                            x={x - 14}
                            y={stockY}
                            width="28"
                            height={72 - stockY}
                            fill="rgba(239, 68, 68, 0.12)"
                            rx="3"
                          />
                        )}

                        {/* Stock line segment */}
                        {idx > 0 && (
                          <line
                            x1={x - 60}
                            y1="20"
                            x2={x}
                            y2="20"
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeDasharray="3 3"
                          />
                        )}

                        {/* Sales line segment */}
                        {idx > 0 && (
                          <line
                            x1={x - 60}
                            y1={timelinePoints[idx - 1].isZeroSales ? 72 : Math.max(26, 72 - (timelinePoints[idx - 1].sales * 14))}
                            x2={x}
                            y2={salesY}
                            stroke={pt.isZeroSales ? '#ef4444' : '#10b981'}
                            strokeWidth="2.4"
                          />
                        )}

                        {/* Sales node circle */}
                        <circle
                          cx={x}
                          cy={salesY}
                          r={pt.isZeroSales ? 4 : 3}
                          fill={pt.isZeroSales ? '#ef4444' : '#10b981'}
                        />
                        {/* Stock node circle */}
                        <circle cx={x} cy="20" r="3" fill="#38bdf8" />
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="chart-disclaimer font-mono">
                * Interactive deterministic demo data based on configured historical baseline. Not live production telemetry.
              </div>
            </div>

            {!isScanning && hasScanned && (
              <div className="scan-results-bottom animate-fade-in">
                {/* Plain-English Actionable Rationale */}
                <div className="rationale-card">
                  <div className="rationale-header">
                    <ShieldCheck size={16} className="text-cyan-primary" />
                    <span>Associate Action Directive</span>
                  </div>
                  <p className="rationale-text">
                    {isGenuineOos && (
                      <>
                        <strong>Legitimate Stock-Out Recognized:</strong> ERP balance shows 0 units on-hand. Zero register transactions over {zeroSalesDays} days is consistent with legitimate stockout depletion, not a phantom discrepancy. Purchase order replenishment required rather than store associate bay inspection.
                      </>
                    )}
                    {isCritical && !isGenuineOos && (
                      <>
                        <strong>High Probability of Physical Shelf Absence:</strong> With an expected baseline of {historicalVelocity.toFixed(1)} units/week, observing {zeroSalesDays} consecutive days with 0 sales while holding +{recordedStock} units in inventory has less than a {(pZeroSales * 100).toFixed(2)}% probability under normal conditions. Immediate floor inspection dispatched to {currentSkuData.aisle}.
                      </>
                    )}
                    {isModerate && !isGenuineOos && (
                      <>
                        <strong>Early Warning Triggered:</strong> {zeroSalesDays} days with zero transactions is beginning to diverge from expected velocity ({historicalVelocity.toFixed(1)} units/week). Queued for associate check if dormant for another 24 hours.
                      </>
                    )}
                    {isNormal && !isGenuineOos && (
                      <>
                        <strong>Normal Velocity Variance:</strong> Current dormancy ({zeroSalesDays} days) is within expected statistical inter-arrival tolerance for {selectedSku}. No associate floor action required.
                      </>
                    )}
                  </p>
                </div>

                {/* Next Steps Buttons */}
                <div className="result-actions-row">
                  <button
                    type="button"
                    onClick={handleRunSimulation}
                    className="btn-secondary"
                  >
                    <RotateCcw size={15} />
                    <span>Recalculate Simulation</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onExploreDashboard({
                        sku: selectedSku,
                        productName: currentSkuData.name,
                        store: selectedStore,
                        recordedUnits: recordedStock,
                        zeroSalesDays: zeroSalesDays,
                        riskTier: isCritical ? 'CRITICAL' : isModerate ? 'HIGH' : 'ROUTINE',
                        confidence: Number(anomalyConfidence.toFixed(1)),
                      })
                    }
                    className="btn-primary"
                  >
                    <span>View Store Top-20 Queue</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .demo-section-viewport {
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
          max-width: 780px;
          margin: 0 auto 56px;
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

        .demo-workbench-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          align-items: start;
        }

        @media (min-width: 1080px) {
          .demo-workbench-grid {
            grid-template-columns: 1fr 1.35fr;
            gap: 40px;
          }
        }

        .workbench-controls {
          padding: 30px;
          border-radius: 18px;
          background: rgba(10, 20, 38, 0.82);
          border: 1px solid rgba(56, 189, 248, 0.22);
        }

        .controls-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ctrl-badge {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--cyan-bright);
          letter-spacing: 0.08em;
        }

        .ctrl-note {
          font-family: var(--font-mono);
          font-size: 0.62rem;
          color: var(--text-dim);
        }

        .ctrl-group {
          margin-bottom: 22px;
        }

        .ctrl-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 8px;
        }

        .select-field {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(56, 189, 248, 0.25);
          color: #ffffff;
          font-family: var(--font-sans);
          font-size: 0.85rem;
          cursor: pointer;
          outline: none;
        }

        .select-field:focus {
          border-color: var(--cyan-primary);
          box-shadow: 0 0 12px rgba(0, 242, 254, 0.2);
        }

        .sku-meta-hint {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--text-dim);
          margin-top: 6px;
        }

        .slider-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .slider-val {
          font-size: 0.85rem;
        }

        .range-slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.1);
          outline: none;
          cursor: pointer;
          accent-color: var(--cyan-primary);
        }

        .range-slider.range-red {
          accent-color: var(--alert-red);
        }

        .slider-range-ticks {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-mono);
          font-size: 0.62rem;
          color: var(--text-dim);
          margin-top: 6px;
        }

        .demo-preset-group {
          margin-bottom: 20px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(56, 189, 248, 0.18);
        }

        .preset-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .preset-title {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--cyan-bright);
          letter-spacing: 0.08em;
        }

        .preset-sub {
          font-size: 0.62rem;
          color: var(--text-dim);
        }

        .preset-buttons-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        @media (min-width: 640px) {
          .preset-buttons-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .btn-preset {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 8px;
          background: rgba(10, 20, 38, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-family: var(--font-mono);
          font-size: 0.68rem;
          font-weight: 600;
          color: #cbd5e1;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .btn-preset:hover:not(:disabled) {
          background: rgba(14, 116, 144, 0.2);
          border-color: rgba(56, 189, 248, 0.4);
          color: #ffffff;
        }

        .btn-preset.preset-active-critical {
          background: rgba(239, 68, 68, 0.18);
          border-color: rgba(239, 68, 68, 0.6);
          color: #fca5a5;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
        }

        .btn-preset.preset-active-warning {
          background: rgba(14, 116, 144, 0.25);
          border-color: rgba(56, 189, 248, 0.7);
          color: #e0f2fe;
          box-shadow: 0 0 12px rgba(0, 242, 254, 0.2);
        }

        .btn-preset.preset-active-neutral {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.5);
          color: #a7f3d0;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
        }

        .run-scan-trigger {
          margin-top: 10px;
          padding: 14px;
          font-size: 0.95rem;
        }

        /* Results Card */
        .workbench-results {
          padding: 32px;
          border-radius: 18px;
          background: rgba(10, 20, 38, 0.9);
          border: 1px solid rgba(56, 189, 248, 0.25);
          min-height: 480px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          transition: all 0.35s ease;
        }

        /* Scanning In-Progress */
        .scan-in-progress-view {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 16px 20px 24px;
        }

        .radar-spinner {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 3px solid rgba(0, 242, 254, 0.2);
          border-top-color: var(--cyan-primary);
          animation: radarSweep 1.2s linear infinite;
          margin-bottom: 24px;
        }

        .scan-step-title {
          font-family: var(--font-display);
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 20px;
        }

        .scan-progress-bar {
          width: 80%;
          height: 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
          margin-bottom: 14px;
        }

        .scan-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00f2fe, #38bdf8);
          box-shadow: 0 0 12px #00f2fe;
          transition: width 0.4s ease;
        }

        .scan-sub-status {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--text-dim);
        }

        /* Scan Completed View */
        .scan-completed-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .result-status-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .badge-critical {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.45);
          color: #fca5a5;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 800;
        }

        .badge-warning {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 8px;
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #fde68a;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 800;
        }

        .badge-normal {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 8px;
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #a7f3d0;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 800;
        }

        .badge-oos {
          background: rgba(56, 189, 248, 0.16);
          border-color: rgba(56, 189, 248, 0.4);
          color: #bae6fd;
        }

        .score-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--cyan-bright);
        }

        .sku-summary-strip {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 10px;
          padding: 14px 18px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .sku-name-title {
          font-family: var(--font-display);
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 3px;
        }

        .sku-details-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .sku-price-at-risk {
          text-align: right;
        }

        .risk-dollars-label {
          display: block;
          font-size: 0.65rem;
          color: var(--text-dim);
          margin-bottom: 2px;
        }

        .risk-dollars-val {
          font-size: 1.1rem;
          font-weight: 800;
          color: #ef4444;
        }

        .contradiction-visual-box {
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 18px;
          background: rgba(8, 14, 28, 0.85);
          border-radius: 12px;
          border: 1px solid rgba(56, 189, 248, 0.15);
        }

        .stat-pill-col {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .p-label {
          font-size: 0.7rem;
          color: var(--text-dim);
          margin-bottom: 4px;
        }

        .p-value {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 800;
        }

        .stat-pill-col.positive .p-value {
          color: var(--cyan-primary);
        }

        .stat-pill-col.negative .p-value {
          color: #ef4444;
        }

        .stat-pill-col.neutral .p-value {
          color: #cbd5e1;
        }

        .p-note {
          font-size: 0.65rem;
          color: var(--text-dim);
          margin-top: 2px;
          font-family: var(--font-mono);
        }

        .stat-vs-divider {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--text-dim);
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
        }

        /* Dynamic Divergence Chart */
        .dynamic-divergence-chart {
          padding: 16px 20px;
          background: rgba(8, 14, 28, 0.75);
          border-radius: 12px;
          border: 1px solid rgba(56, 189, 248, 0.18);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chart-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .chart-legend-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .legend-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: var(--text-primary);
        }

        .legend-dot-cyan {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #38bdf8;
          box-shadow: 0 0 6px #38bdf8;
        }

        .legend-dot-red {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 6px #ef4444;
        }

        .chart-engine-tag {
          font-size: 0.68rem;
          color: var(--cyan-bright);
          background: rgba(0, 242, 254, 0.08);
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid rgba(0, 242, 254, 0.2);
        }

        .chart-svg-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .chart-svg-elem {
          width: 100%;
          height: auto;
          display: block;
        }

        .chart-disclaimer {
          font-size: 0.65rem;
          color: var(--text-dim);
          text-align: right;
        }

        .scan-results-top {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 20px;
        }

        .scan-results-bottom {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-top: 20px;
        }

        .shelf-optical-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px;
          margin-bottom: 12px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-family: var(--font-mono);
          font-size: 0.7rem;
        }

        .shelf-optical-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
        }

        .shelf-slots-bar {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .shelf-slot-indicator {
          width: 22px;
          height: 14px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .shelf-slot-indicator.slot-present {
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.4);
        }

        .shelf-slot-indicator.slot-present .slot-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #38bdf8;
        }

        .shelf-slot-indicator.slot-missing {
          background: rgba(239, 68, 68, 0.22);
          border: 1px dashed rgba(239, 68, 68, 0.75);
        }

        .shelf-slot-indicator.slot-missing .slot-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 6px #ef4444;
        }

        .dynamic-divergence-chart {
          position: relative;
          overflow: hidden;
          transition: all 0.35s var(--motion-ease-out, ease);
        }

        .dynamic-divergence-chart.is-scanning-pulse {
          box-shadow: 0 0 36px rgba(0, 242, 254, 0.45), inset 0 0 20px rgba(0, 242, 254, 0.2);
          border-color: rgba(0, 242, 254, 0.85);
          animation: pulseDivergenceChart 1.1s ease-in-out infinite alternate;
        }

        @keyframes pulseDivergenceChart {
          0% {
            box-shadow: 0 0 20px rgba(0, 242, 254, 0.25), inset 0 0 10px rgba(0, 242, 254, 0.1);
            border-color: rgba(0, 242, 254, 0.5);
          }
          100% {
            box-shadow: 0 0 45px rgba(0, 242, 254, 0.65), inset 0 0 25px rgba(0, 242, 254, 0.3);
            border-color: rgba(0, 242, 254, 1);
          }
        }

        .chart-scanning-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 10;
          overflow: hidden;
        }

        .sweeping-laser-beam {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent 0%, #00f2fe 30%, #38bdf8 50%, #00f2fe 70%, transparent 100%);
          box-shadow: 0 0 16px #00f2fe, 0 0 32px rgba(0, 242, 254, 0.9);
          animation: sweepLaser 1.2s ease-in-out infinite alternate;
        }

        @keyframes sweepLaser {
          0% {
            top: 4%;
            opacity: 0.8;
          }
          100% {
            top: 94%;
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dynamic-divergence-chart.is-scanning-pulse {
            animation: none;
            box-shadow: 0 0 20px rgba(0, 242, 254, 0.3);
          }
          .sweeping-laser-beam {
            animation: none;
            top: 50%;
          }
        }

        .rationale-card {
          padding: 18px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .rationale-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--cyan-bright);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .rationale-text {
          font-size: 0.85rem;
          line-height: 1.6;
          color: #cbd5e1;
        }

        .rationale-text strong {
          color: #ffffff;
        }

        .result-actions-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 10px;
        }
      `}</style>
    </section>
  );
};
