import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  MapPin,
  X,
  ShieldCheck,
  PackageCheck,
  Activity,
  RefreshCw,
  Radio,
  Target,
  Database,
  Calendar,
  Layers,
  Sliders,
  Info,
} from 'lucide-react';
import { SectionBackdrop } from '@/components/layout/SectionBackdrop';
import type { VerificationItem, VerificationStatus } from '@/types/verification';
import {
  apiClient,
  type EvidenceResponse,
  type DatasetItem,
  type EvaluationResponse,
  type ReasoningPlanResponse,
} from '@/services/apiClient';
import {
  mapFindingToVerificationItem,
  mapStatusToBackend,
  mapStatusToFrontend,
  isBackendFinding,
} from '@/services/apiAdapters';

export type { VerificationItem, VerificationStatus };

export const Top20VerificationSection: React.FC<{
  onLaunchScanner: () => void;
  onOpenDataset?: () => void;
  onScanExecuted?: (scanId: string, datasetId: string, evaluationDate: string) => void;
  onFindingStatusChanged?: (scanId?: string, datasetId?: string, evaluationDate?: string) => void;
  datasetId?: string;
}> = ({
  onLaunchScanner,
  onOpenDataset,
  onScanExecuted,
  onFindingStatusChanged,
  datasetId,
}) => {
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('');
  const [availableStores, setAvailableStores] = useState<string[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [evidenceData, setEvidenceData] = useState<EvidenceResponse | null>(null);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState<boolean>(false);
  const [reasoningPlan, setReasoningPlan] = useState<ReasoningPlanResponse | null>(null);
  const [isLoadingReasoning, setIsLoadingReasoning] = useState<boolean>(false);
  const [isScanningBackend, setIsScanningBackend] = useState<boolean>(false);
  const [backendStatusMsg, setBackendStatusMsg] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<VerificationItem | null>(null);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);
  const [statusUpdateError, setStatusUpdateError] = useState<{ id: string; message: string } | null>(null);
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);

  // Dataset & Live Scan parameters
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [evaluationDate, setEvaluationDate] = useState<string>('2025-04-30');
  const [thresholdDays, setThresholdDays] = useState<number>(3);
  const [queueSourceLabel, setQueueSourceLabel] = useState<string>('Official Synthetic Suite');

  const currentDataset = useMemo(() => {
    return datasets.find((item) => item.dataset_id === selectedDatasetId);
  }, [datasets, selectedDatasetId]);

  // Evaluation benchmark modal
  const [isEvalModalOpen, setIsEvalModalOpen] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResponse | null>(null);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState<boolean>(false);

  // Scan history modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [scanHistoryList, setScanHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Initial fallback 20-item dataset strictly capped at 20 items per store
  const [items, setItems] = useState<VerificationItem[]>([
    {
      id: 'V-01',
      storeId: 'Store #001 - Indiranagar Hypermarket',
      sku: 'SKU #4587',
      productName: 'Smart Aura Soundbar System',
      category: 'Electronics',
      aisle: 'Aisle 4-B, Bay 2',
      recordedUnits: 6,
      recentSales7d: 0,
      expectedWeeklySales: 4.2,
      unitPrice: 189.99,
      riskTier: 'CRITICAL',
      confidenceScore: 99.4,
      plainReason: 'Recorded +6 units, but 0 register sales in 7 days. Normal velocity is 4.2 units/week.',
      status: 'Floor Check Dispatched',
    },
    {
      id: 'V-02',
      storeId: 'Store #001 - Indiranagar Hypermarket',
      sku: 'SKU #2891',
      productName: 'Ultra Wireless ANC Buds Pro',
      category: 'Audio',
      aisle: 'Aisle 2-A, Bay 1',
      recordedUnits: 9,
      recentSales7d: 0,
      expectedWeeklySales: 3.8,
      unitPrice: 129.5,
      riskTier: 'CRITICAL',
      confidenceScore: 98.7,
      plainReason: 'Sudden sales collapse from 4/week to 0 across 8 days while ledger shows 9 units.',
      status: 'Pending Inspection',
    },
    {
      id: 'V-03',
      storeId: 'Store #001 - Indiranagar Hypermarket',
      sku: 'SKU #1042',
      productName: 'USB-C GaN 100W Fast Charger',
      category: 'Accessories',
      aisle: 'Aisle 5-C, Bay 4',
      recordedUnits: 14,
      recentSales7d: 1,
      expectedWeeklySales: 6.5,
      unitPrice: 49.99,
      riskTier: 'HIGH',
      confidenceScore: 92.1,
      plainReason: 'Sales rate dropped 85% below moving baseline. Shelf facing may be obstructed.',
      status: 'Pending Inspection',
    },
    {
      id: 'V-04',
      storeId: 'Store #001 - Indiranagar Hypermarket',
      sku: 'SKU #6320',
      productName: 'MagCharge Dual Stand 15W',
      category: 'Accessories',
      aisle: 'Aisle 3-D, Bay 3',
      recordedUnits: 4,
      recentSales7d: 0,
      expectedWeeklySales: 2.1,
      unitPrice: 79.0,
      riskTier: 'HIGH',
      confidenceScore: 89.5,
      plainReason: 'Zero sales in 6 days. Discrepancy between POS transactions and shelf capacity.',
      status: 'Resolved (Restocked)',
    },
    {
      id: 'V-05',
      storeId: 'Store #001 - Indiranagar Hypermarket',
      sku: 'SKU #5109',
      productName: 'Precision Gaming Mouse Wireless',
      category: 'Gaming',
      aisle: 'Aisle 1-B, Bay 3',
      recordedUnits: 8,
      recentSales7d: 0,
      expectedWeeklySales: 3.0,
      unitPrice: 89.99,
      riskTier: 'CRITICAL',
      confidenceScore: 97.2,
      plainReason: 'High shrinkage category item with 0 transactions across 7 days.',
      status: 'Misplaced (Found)',
    },
  ]);

  const executeBackendScan = async (targetDate?: string, targetDsId?: string, targetThresh?: number) => {
    setIsScanningBackend(true);
    const dateToUse = targetDate || evaluationDate;
    const dsToUse = targetDsId !== undefined ? targetDsId : (selectedDatasetId || undefined);
    const threshToUse = targetThresh || thresholdDays;

    try {
      const scanRes = await apiClient.triggerScan({
        evaluation_date: dateToUse,
        dataset_id: dsToUse,
        threshold_days: threshToUse,
      });

      if (scanRes) {
        if (scanRes.scan_id) {
          onScanExecuted?.(scanRes.scan_id, dsToUse || '', dateToUse);
        }
        if (scanRes.findings && scanRes.findings.length > 0) {
          const mapped = scanRes.findings.map(mapFindingToVerificationItem);
          setItems(mapped);
          const stores = Array.from(new Set(mapped.map((f) => f.storeId)));
          if (stores.length > 0) {
            setAvailableStores(stores);
            setSelectedStoreFilter((curr) => (stores.includes(curr) ? curr : stores[0]));
          }
          setQueueSourceLabel(`Live Scan: ${scanRes.findings.length} findings across ${scanRes.stores_covered} stores (date: ${dateToUse})`);
          setBackendStatusMsg(`Scan complete: ${scanRes.anomalies_detected} anomalies detected`);
        } else {
          setItems([]);
          setQueueSourceLabel(`Live Scan: 0 anomalies for ${dateToUse}`);
          setBackendStatusMsg(`Scan complete: 0 anomalies detected`);
        }
      }
    } catch (err: any) {
      console.warn('Backend scan failed:', err);
      setBackendStatusMsg(`Scan error: ${err.message || 'Check connection'}`);
    } finally {
      setIsScanningBackend(false);
    }
  };

  const loadQueueFindings = async (targetDate?: string, targetDsId?: string) => {
    setIsScanningBackend(true);
    const dateToUse = targetDate || evaluationDate;
    const dsToUse = targetDsId !== undefined ? targetDsId : (selectedDatasetId || undefined);

    try {
      // 1. Fetch persisted findings from database first
      const existing = await apiClient.getFindings({
        date: dateToUse,
        dataset_id: dsToUse,
        limit: 200,
      });

      if (existing && existing.length > 0) {
        const mapped = existing.map(mapFindingToVerificationItem);
        setItems(mapped);
        const stores = Array.from(new Set(mapped.map((f) => f.storeId)));
        if (stores.length > 0) {
          setAvailableStores(stores);
          setSelectedStoreFilter((curr) => (stores.includes(curr) ? curr : stores[0]));
        }
        const activeScanId = existing[0]?.scan_id || '';
        if (activeScanId) {
          onScanExecuted?.(activeScanId, dsToUse || '', dateToUse);
        }
        setQueueSourceLabel(`Persisted Queue: ${existing.length} findings across ${stores.length} stores (date: ${dateToUse})`);
        setBackendStatusMsg(`Loaded ${existing.length} verified findings`);
        return;
      }

      // 2. If no findings in database yet, trigger scan
      await executeBackendScan(dateToUse, dsToUse, thresholdDays);
    } catch (err: any) {
      console.warn('Queue load error, falling back to backend scan:', err);
      await executeBackendScan(dateToUse, dsToUse, thresholdDays);
    } finally {
      setIsScanningBackend(false);
    }
  };

  // Load real findings from FastAPI backend on mount if reachable
  useEffect(() => {
    let isMounted = true;
    async function loadBackendData() {
      try {
        const health = await apiClient.checkHealth();
        if (!isMounted) return;
        if (health.online) {
          setBackendOnline(true);
          setBackendStatusMsg(`Live API Connected (${health.data?.stores_in_db ?? 0} Stores in DB)`);

          const dsList = await apiClient.listDatasets();
          if (!isMounted) return;
          setDatasets(dsList);

          const syntheticDs = dsList.find((d) => d.dataset_id.startsWith('DS_SYNTHETIC') && d.status === 'imported');
          const targetDs = syntheticDs || dsList.find((d) => d.status === 'imported') || dsList[0];

          let initDate = '2025-04-30';
          let initDsId = '';
          if (targetDs) {
            initDsId = targetDs.dataset_id;
            setSelectedDatasetId(targetDs.dataset_id);
            // Choose valid date from selected dataset's available date range
            initDate = targetDs.end_date || targetDs.start_date || '2025-04-30';
            setEvaluationDate(initDate);
          }

          await loadQueueFindings(initDate, initDsId || undefined);
        } else {
          setBackendOnline(false);
          setBackendStatusMsg('Demo Mode (Backend offline)');
        }
      } catch {
        if (isMounted) {
          setBackendOnline(false);
          setBackendStatusMsg('Demo Mode');
        }
      }
    }
    loadBackendData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Respond dynamically to newly uploaded / selected dataset from modal or parent
  useEffect(() => {
    if (datasetId && datasetId !== selectedDatasetId && backendOnline) {
      setSelectedDatasetId(datasetId);
      apiClient.listDatasets().then((dsList) => {
        setDatasets(dsList);
        const match = dsList.find((d) => d.dataset_id === datasetId);
        const validDate = match?.end_date || match?.start_date || evaluationDate;
        setEvaluationDate(validDate);
        loadQueueFindings(validDate, datasetId);
      });
    }
  }, [datasetId, backendOnline]);

  // Fetch telemetry evidence and OmniRoute reasoning when an item is selected for detail
  useEffect(() => {
    if (!selectedItemForDetail) {
      setEvidenceData(null);
      setReasoningPlan(null);
      return;
    }
    const currentItemId = selectedItemForDetail.id;
    let isMounted = true;
    async function fetchDetailEvidence() {
      if (!backendOnline || !isBackendFinding(currentItemId)) return;
      setIsLoadingEvidence(true);
      setIsLoadingReasoning(true);
      try {
        const [ev, plan] = await Promise.all([
          apiClient.getEvidence(currentItemId),
          apiClient.getFindingReasoning(currentItemId),
        ]);
        if (isMounted) {
          setEvidenceData(ev);
          setReasoningPlan(plan);
        }
      } catch (err) {
        console.warn('Could not fetch detail telemetry/reasoning:', err);
      } finally {
        if (isMounted) {
          setIsLoadingEvidence(false);
          setIsLoadingReasoning(false);
        }
      }
    }
    fetchDetailEvidence();
    return () => {
      isMounted = false;
    };
  }, [selectedItemForDetail, backendOnline]);

  // Keyboard Escape listener to dismiss active detail drawer and modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedItemForDetail) setSelectedItemForDetail(null);
        if (isEvalModalOpen) setIsEvalModalOpen(false);
        if (isHistoryModalOpen) setIsHistoryModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemForDetail, isEvalModalOpen, isHistoryModalOpen]);

  const handleOpenEvaluation = async () => {
    setIsEvalModalOpen(true);
    setIsLoadingEvaluation(true);
    try {
      const res = await apiClient.getEvaluation(evaluationDate, selectedDatasetId || undefined);
      setEvaluationResult(res);
    } catch (err) {
      console.warn('Evaluation fetch failed:', err);
    } finally {
      setIsLoadingEvaluation(false);
    }
  };

  const handleOpenHistory = async () => {
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const scans = await apiClient.listScans(selectedDatasetId || undefined);
      setScanHistoryList(scans);
    } catch (err) {
      console.warn('History fetch failed:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchStore = item.storeId === selectedStoreFilter;
      const matchSearch =
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.aisle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRisk = riskFilter === 'ALL' || item.riskTier === riskFilter;

      return matchStore && matchSearch && matchRisk;
    });
  }, [items, selectedStoreFilter, searchQuery, riskFilter]);

  // Handle status update with server confirmation and visible error handling
  const handleUpdateStatus = async (
    id: string,
    newStatus: VerificationItem['status']
  ) => {
    setStatusUpdateError(null);

    if (!backendOnline) {
      setStatusUpdateError({
        id,
        message: 'Backend is offline. Cannot save verification status to database.',
      });
      return;
    }

    if (!isBackendFinding(id)) {
      setStatusUpdateError({
        id,
        message: 'Cannot update status on simulated demo items. Please run or load a real backend scan first.',
      });
      return;
    }

    setIsUpdatingStatusId(id);
    try {
      const backendStatus = mapStatusToBackend(newStatus);
      const updated = await apiClient.updateFindingStatus(id, backendStatus);
      const confirmedStatus = mapStatusToFrontend(updated.status);

      // ONLY update UI and counters AFTER backend confirms successful save
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: confirmedStatus } : it))
      );
      if (selectedItemForDetail && selectedItemForDetail.id === id) {
        setSelectedItemForDetail((prev) => (prev ? { ...prev, status: confirmedStatus } : null));
      }
      setRecentlyUpdatedId(id);
      setTimeout(() => {
        setRecentlyUpdatedId((curr) => (curr === id ? null : curr));
      }, 1200);
      onFindingStatusChanged?.(updated.scan_id, selectedDatasetId, updated.evaluation_date);
    } catch (err: any) {
      console.error('Finding status update error:', err);
      setStatusUpdateError({
        id,
        message: err.message || 'Server status update failed. Status was not saved.',
      });
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  const pendingCount = filteredItems.filter((i) => i.status.includes('Pending')).length;
  const dispatchedCount = filteredItems.filter((i) => i.status.includes('Dispatched')).length;
  const resolvedCount = filteredItems.filter((i) =>
    i.status.includes('Resolved') || i.status.includes('Found')
  ).length;

  return (
    <section id="dashboard" className="dashboard-section-viewport" aria-label="Top 20 Verification Dashboard">
      {/* Section Backdrop & Cyan Pathway Motif */}
      <SectionBackdrop
        frameIndex={6}
        mediaSrc="/images/backgrounds/frame-06-verification-queue.webp"
        accentColor="cyan"
        topTransition={true}
        bottomTransition={true}
      />

      <div className="section-container">
        {/* Section Header */}
        <div className="section-header-centered motion-fade-up">
          <div className="section-eyebrow">
            <span className="eyebrow-dot" />
            <span>FRAME 06 — OPERATIONAL FLOOR DISPATCH</span>
          </div>
          <h2 className="section-headline">
            Top-20 Daily Verification Queue
          </h2>
          <p className="section-subheadline">
            Operational constraint enforced: Up to 20 findings per store per day. Store associates audit high-confidence discrepancies in under 20 minutes.
          </p>
        </div>

        {/* Dashboard Workspace */}
        <div className="dashboard-matrix-container glass-panel motion-fade-up motion-stagger-1">
          {/* Visible Status Update Error Banner */}
          {statusUpdateError && (
            <div className="p-3 m-3 mb-0 rounded-lg bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center justify-between gap-3 animate-fade-in font-mono">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-400 shrink-0" />
                <span>
                  Status update failed on server: {statusUpdateError.message} (Finding ID: {statusUpdateError.id})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStatusUpdateError(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
                aria-label="Dismiss error"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Top Scan & Dataset Control Strip */}
          <div className="matrix-control-strip">
            <div className="control-strip-left">
              {/* Dataset Selector */}
              <div className="control-group">
                <span className="control-label font-mono">
                  <Database size={13} className="text-cyan-primary" />
                  <span>Dataset:</span>
                </span>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedDatasetId(newId);
                    const d = datasets.find((item) => item.dataset_id === newId);
                    const validDate = d?.end_date || d?.start_date || evaluationDate;
                    setEvaluationDate(validDate);
                    loadQueueFindings(validDate, newId);
                  }}
                  className="control-select font-mono"
                >
                  <option value="">All Database Records</option>
                  {datasets.map((d) => (
                    <option key={d.dataset_id} value={d.dataset_id}>
                      {d.name} ({d.total_records.toLocaleString()} rows{d.has_ground_truth ? ' • GT Verified' : ''})
                    </option>
                  ))}
                </select>
                {onOpenDataset && (
                  <button
                    type="button"
                    onClick={onOpenDataset}
                    className="dataset-manage-btn font-mono"
                    title="Upload or import new datasets"
                  >
                    <Layers size={13} />
                    <span>Manage</span>
                  </button>
                )}
              </div>

              {/* Evaluation Target Date Picker & Presets */}
              <div className="control-group">
                <span className="control-label font-mono">
                  <Calendar size={13} className="text-cyan-primary" />
                  <span>Eval Date:</span>
                </span>
                <input
                  type="date"
                  value={evaluationDate}
                  min={currentDataset?.start_date || undefined}
                  max={currentDataset?.end_date || undefined}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setEvaluationDate(newDate);
                    loadQueueFindings(newDate, selectedDatasetId);
                  }}
                  className="control-date-input font-mono"
                />
                <div className="date-presets">
                  {currentDataset?.end_date && (
                    <button
                      type="button"
                      onClick={() => {
                        const d = currentDataset.end_date!;
                        setEvaluationDate(d);
                        loadQueueFindings(d, selectedDatasetId);
                      }}
                      className={`preset-date-btn ${evaluationDate === currentDataset.end_date ? 'active' : ''}`}
                      title={`Latest available date in ${currentDataset.name}`}
                    >
                      Latest ({currentDataset.end_date})
                    </button>
                  )}
                  {currentDataset?.start_date && currentDataset.start_date !== currentDataset.end_date && (
                    <button
                      type="button"
                      onClick={() => {
                        const d = currentDataset.start_date!;
                        setEvaluationDate(d);
                        loadQueueFindings(d, selectedDatasetId);
                      }}
                      className={`preset-date-btn ${evaluationDate === currentDataset.start_date ? 'active' : ''}`}
                      title={`Start date of ${currentDataset.name}`}
                    >
                      Start ({currentDataset.start_date})
                    </button>
                  )}
                </div>
              </div>

              {/* Consecutive Zero Days */}
              <div className="control-group">
                <span className="control-label font-mono">
                  <Sliders size={13} className="text-cyan-primary" />
                  <span>Min Days:</span>
                </span>
                <select
                  value={thresholdDays}
                  onChange={(e) => {
                    const t = Number(e.target.value);
                    setThresholdDays(t);
                    executeBackendScan(evaluationDate, selectedDatasetId, t);
                  }}
                  className="control-select font-mono"
                >
                  <option value={2}>2 Days</option>
                  <option value={3}>3 Days (Standard)</option>
                  <option value={5}>5 Days (Strict)</option>
                  <option value={7}>7 Days (Critical)</option>
                </select>
              </div>
            </div>

            <div className="control-strip-right">
              {/* Execute Live Scan Button */}
              <button
                type="button"
                onClick={() => executeBackendScan()}
                disabled={isScanningBackend}
                className="btn-primary scan-exec-btn font-mono"
              >
                <RefreshCw size={13} className={isScanningBackend ? 'animate-spin' : ''} />
                <span>{isScanningBackend ? 'Scanning Backend...' : 'Run Backend Scan'}</span>
              </button>

              {/* Ground Truth Evaluation Modal Trigger */}
              <button
                type="button"
                onClick={handleOpenEvaluation}
                className="btn-secondary benchmark-btn font-mono"
                title="Evaluate Precision@20 against held-out ground truth labels"
              >
                <Target size={14} className="text-cyan-primary" />
                <span>Evaluation Metrics</span>
              </button>

              {/* Scan History Trigger */}
              <button
                type="button"
                onClick={handleOpenHistory}
                className="btn-secondary history-btn font-mono"
                title="View past execution history"
              >
                <Clock size={14} />
                <span>Scan History</span>
              </button>
            </div>
          </div>

          {/* Top Filter and Search Bar */}
          <div className="matrix-toolbar">
            <div className="toolbar-left">
              {/* Store Filter Tabs */}
              <div className="store-filter-pills">
                {availableStores.length > 0 ? (
                  availableStores.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedStoreFilter(st)}
                      className={`store-tab-btn ${selectedStoreFilter === st ? 'active' : ''}`}
                    >
                      <span>{st}</span>
                      <span className="tab-badge font-mono">≤20</span>
                    </button>
                  ))
                ) : (
                  <button type="button" className="store-tab-btn active">
                    <span>{selectedStoreFilter || 'All Stores'}</span>
                    <span className="tab-badge font-mono">≤20</span>
                  </button>
                )}
              </div>

              {/* Backend Connectivity Status & Source Label */}
              <div className="backend-conn-chip">
                <span className={`conn-dot ${backendOnline ? 'online' : 'offline'}`} />
                <span className="conn-label font-mono">
                  {queueSourceLabel || backendStatusMsg || (backendOnline ? 'Live API' : 'Backend Offline')}
                </span>
              </div>

            {!backendOnline && (
              <div className="p-3 mb-4 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                  <span>
                    <strong>FastAPI Backend Offline:</strong> Live scans, store telemetry, and database persistence are unavailable at http://localhost:8000. Start backend: <code className="bg-black/40 px-1 py-0.5 rounded text-cyan-300">uvicorn backend.app.main:app --reload --port 8000</code>
                  </span>
                </div>
              </div>
            )}

              {/* Risk Tier Toggle */}
              <div className="risk-toggle-group">
                <button
                  type="button"
                  onClick={() => setRiskFilter('ALL')}
                  className={`risk-btn ${riskFilter === 'ALL' ? 'active' : ''}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setRiskFilter('CRITICAL')}
                  className={`risk-btn ${riskFilter === 'CRITICAL' ? 'active' : ''}`}
                >
                  Critical
                </button>
                <button
                  type="button"
                  onClick={() => setRiskFilter('HIGH')}
                  className={`risk-btn ${riskFilter === 'HIGH' ? 'active' : ''}`}
                >
                  High
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="toolbar-search-box">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU, product, or aisle..."
                className="search-input"
              />
            </div>
          </div>

          {/* KPI Mini-Strip for Filtered Store */}
          <div className="queue-summary-strip">
            <div className="kpi-pill">
              <span className="kpi-num font-mono">{filteredItems.length}</span>
              <span className="kpi-label">Active Queue Tasks</span>
            </div>
            <div className="kpi-sep">•</div>
            <div className="kpi-pill">
              <span key={`p-${pendingCount}`} className="kpi-num font-mono text-amber-accent num-update-pulse">{pendingCount}</span>
              <span className="kpi-label">Pending</span>
            </div>
            <div className="kpi-sep">•</div>
            <div className="kpi-pill">
              <span key={`d-${dispatchedCount}`} className="kpi-num font-mono text-cyan-primary num-update-pulse">{dispatchedCount}</span>
              <span className="kpi-label">Dispatched</span>
            </div>
            <div className="kpi-sep">•</div>
            <div className="kpi-pill">
              <span key={`r-${resolvedCount}`} className="kpi-num font-mono text-emerald-accent num-update-pulse">{resolvedCount}</span>
              <span className="kpi-label">Audited & Resolved</span>
            </div>
            <div className="kpi-note font-mono">
              * Max 20 daily checks strictly enforced per store
            </div>
          </div>

          {/* Table Container */}
          <div className="queue-table-scroll">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>SKU & Product Name</th>
                  <th>Location</th>
                  <th>Ledger Units</th>
                  <th>7d Sales</th>
                  <th>Risk Tier</th>
                  <th>Audit Directive</th>
                  <th>Status & Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 size={36} className="text-emerald-400 opacity-80" />
                        <span className="font-medium text-white">No Discrepancies Flagged</span>
                        <span className="text-xs text-slate-400 max-w-md">
                          All active SKU register transaction velocities match ERP stock records for {selectedStoreFilter || 'this store'} on {evaluationDate}.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isCrit = item.riskTier === 'CRITICAL';
                    const isHigh = item.riskTier === 'HIGH';
                    const isRecentlyUpdated = recentlyUpdatedId === item.id;

                    return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemForDetail(item)}
                      className={`queue-row ${isCrit ? 'row-critical' : ''} ${
                        isRecentlyUpdated ? 'row-updated-flash' : ''
                      }`}
                    >
                      {/* SKU & Name */}
                      <td>
                        <div className="sku-cell">
                          <span className="sku-code font-mono">{item.sku}</span>
                          <span className="sku-name">{item.productName}</span>
                          <span className="sku-price font-mono">₹{item.unitPrice.toFixed(2)}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td>
                        <div className="aisle-cell">
                          <MapPin size={13} className="text-cyan-primary" />
                          <span>{item.aisle}</span>
                        </div>
                      </td>

                      {/* Ledger Stock */}
                      <td>
                        <span className="stock-pos font-mono">+{item.recordedUnits}u</span>
                      </td>

                      {/* Sales 7d */}
                      <td>
                        <span
                          className={`sales-signal font-mono ${
                            item.recentSales7d === 0 ? 'text-red-accent font-bold' : ''
                          }`}
                        >
                          {item.recentSales7d}u / 7d
                        </span>
                      </td>

                      {/* Risk Tier */}
                      <td>
                        <span
                          className={`risk-badge ${
                            isCrit ? 'badge-crit' : isHigh ? 'badge-hi' : 'badge-rout'
                          }`}
                        >
                          {isCrit && <AlertTriangle size={11} />}
                          <span>{item.riskTier}</span>
                        </span>
                      </td>

                      {/* Rationale */}
                      <td>
                        <div className="reason-cell" title={item.plainReason}>
                          {item.plainReason}
                        </div>
                      </td>

                      {/* Status / Quick Action */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="status-dropdown-wrap">
                          <select
                            value={item.status}
                            disabled={isUpdatingStatusId === item.id}
                            onChange={(e) =>
                              handleUpdateStatus(
                                item.id,
                                e.target.value as VerificationItem['status']
                              )
                            }
                            className={`status-select ${isUpdatingStatusId === item.id ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            <option value="Pending Inspection">Pending Inspection</option>
                            <option value="Floor Check Dispatched">Floor Check Dispatched</option>
                            <option value="Resolved (Restocked)">Resolved (Restocked)</option>
                            <option value="Misplaced (Found)">Misplaced (Found)</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>

          <div className="matrix-footer-actions">
            <span className="footer-tip font-mono">
              Tip: Click any queue row to open the complete associate guidance dossier
            </span>
            <button
              type="button"
              onClick={onLaunchScanner}
              className="btn-secondary footer-btn"
            >
              <Sparkles size={14} />
              <span>Simulate Custom SKU in Scanner</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Alert Detail Drawer */}
      {selectedItemForDetail && (
        <div
          className="detail-drawer-backdrop"
          onClick={() => setSelectedItemForDetail(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            key={selectedItemForDetail.id}
            className="detail-drawer glass-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="header-left">
                <div className="modal-icon-badge">
                  <ClipboardList size={20} className="text-cyan-primary" />
                </div>
                <div>
                  <h3 className="modal-title">{selectedItemForDetail.productName}</h3>
                  <p className="modal-subtitle">
                    {selectedItemForDetail.sku} • {selectedItemForDetail.storeId} • {selectedItemForDetail.aisle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForDetail(null)}
                className="close-btn"
                aria-label="Close details"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Contradiction Stats */}
              <div className="dossier-stats-grid">
                <div className="dossier-stat-box">
                  <span className="stat-label">ERP Ledger Units</span>
                  <span className="stat-val text-cyan-primary font-mono">
                    +{selectedItemForDetail.recordedUnits} Units
                  </span>
                  <span className="stat-sub">Positive on-hand record</span>
                </div>

                <div className="dossier-stat-box">
                  <span className="stat-label">Register Sales (7d)</span>
                  <span className="stat-val text-red-accent font-mono">
                    {selectedItemForDetail.recentSales7d} Units
                  </span>
                  <span className="stat-sub">Zero sales velocity</span>
                </div>

                <div className="dossier-stat-box">
                  <span className="stat-label">Expected Velocity</span>
                  <span className="stat-val font-mono">
                    {selectedItemForDetail.expectedWeeklySales} / wk
                  </span>
                  <span className="stat-sub">18-mo store baseline</span>
                </div>
              </div>

              {/* Associate Guidance Directive / AI Reasoning Directive */}
              <div className="associate-guidance-card">
                <div className="guidance-title flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-cyan-primary" />
                    <span className="font-semibold">
                      {reasoningPlan?.source === 'omniroute_live'
                        ? 'AI Root-Cause Reasoning & Action Plan'
                        : 'Floor Inspection Checklist'}
                    </span>
                  </div>
                  {reasoningPlan?.source === 'omniroute_live' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
                      ⚡ GPT-OSS 120B // VIA OMNIROUTE
                    </span>
                  )}
                </div>

                {isLoadingReasoning ? (
                  <div className="py-2 text-xs font-mono text-cyan-400 animate-pulse flex items-center gap-2">
                    <Activity size={14} className="animate-spin" />
                    <span>Synthesizing root-cause hypothesis with reasoning model...</span>
                  </div>
                ) : reasoningPlan ? (
                  <>
                    <p className="guidance-desc mb-2">
                      <strong>Diagnosis:</strong> {reasoningPlan.root_cause_diagnosis}
                    </p>
                    <p className="text-xs text-slate-400 mb-2 font-mono">
                      <strong>Signal Rationale:</strong> {reasoningPlan.confidence_rationale}
                    </p>
                    <div className="mt-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Associate Action Steps:
                    </div>
                    <ul className="guidance-checklist">
                      {reasoningPlan.associate_checklist.map((step, idx) => (
                        <li key={idx}>
                          {idx + 1}. {step}
                        </li>
                      ))}
                    </ul>
                    {reasoningPlan.estimated_recovery_action && (
                      <div className="mt-2 text-xs p-2 rounded bg-cyan-950/40 border border-cyan-800/50 text-cyan-200">
                        <strong>Recommended Protocol:</strong> {reasoningPlan.estimated_recovery_action}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="guidance-desc">{selectedItemForDetail.plainReason}</p>
                    <ul className="guidance-checklist">
                      <li>1. Inspect primary shelf facing at <strong>{selectedItemForDetail.aisle}</strong>.</li>
                      <li>2. Check top risers and bottom stock bins for misplaced units.</li>
                      <li>3. Verify barcode scanning readability on packaging.</li>
                      <li>4. Check customer returns cart at front service desk.</li>
                    </ul>
                  </>
                )}
              </div>

              {/* Telemetry Evidence & Time Series (Mandatory R1 Requirement) */}
              {isLoadingEvidence ? (
                <div className="evidence-loading-wrap font-mono">
                  <Activity size={16} className="animate-spin text-cyan-primary" />
                  <span>Loading live telemetry signals and sales vs stock series...</span>
                </div>
              ) : evidenceData ? (
                <div className="backend-evidence-section">
                  <div className="evidence-section-header">
                    <Radio size={14} className="text-cyan-primary" />
                    <span>Telemetry Evidence & Signals ({evidenceData.detection_algorithm})</span>
                  </div>

                  {/* Diagnostic Signals */}
                  <div className="evidence-signals-grid">
                    {evidenceData.signals.map((sig, sIdx) => (
                      <div key={sIdx} className={`signal-chip ${sig.status}`}>
                        <div className="sig-row-top">
                          <span className="sig-name font-bold">{sig.name}</span>
                          <span className="sig-val font-mono">{sig.value}</span>
                        </div>
                        <span className="sig-detail">{sig.detail}</span>
                      </div>
                    ))}
                  </div>

                  {/* Time Series Table */}
                  {evidenceData.time_series && evidenceData.time_series.length > 0 && (
                    <div className="time-series-box">
                      <div className="ts-header font-mono">
                        Recent 10-Day Sales vs On-Hand Inventory Telemetry:
                      </div>
                      <div className="ts-table-wrap">
                        <table className="ts-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Recorded Stock</th>
                              <th>POS Sales</th>
                              <th>Promo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {evidenceData.time_series.slice(-10).map((pt, ptIdx) => (
                              <tr key={ptIdx}>
                                <td className="font-mono text-dim">{pt.date}</td>
                                <td className="font-mono text-cyan-primary">+{pt.stock}u</td>
                                <td className={`font-mono ${pt.sales === 0 ? 'text-red-accent font-bold' : ''}`}>
                                  {pt.sales}u
                                </td>
                                <td>
                                  {pt.is_promotion ? (
                                    <span className="promo-tag font-mono">PROMO</span>
                                  ) : (
                                    <span className="text-muted font-mono">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Status Update Controls */}
              <div className="dossier-status-controls">
                <span className="controls-label font-mono">Log Associate Audit Outcome:</span>
                <div className="outcome-btn-group">
                  <button
                    type="button"
                    disabled={isUpdatingStatusId === selectedItemForDetail.id}
                    onClick={() => {
                      handleUpdateStatus(selectedItemForDetail.id, 'Resolved (Restocked)');
                    }}
                    className={`btn-outcome resolved ${isUpdatingStatusId === selectedItemForDetail.id ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    <PackageCheck size={14} />
                    <span>Restocked from Backroom</span>
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingStatusId === selectedItemForDetail.id}
                    onClick={() => {
                      handleUpdateStatus(selectedItemForDetail.id, 'Misplaced (Found)');
                    }}
                    className={`btn-outcome found ${isUpdatingStatusId === selectedItemForDetail.id ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    <CheckCircle2 size={14} />
                    <span>Found in Wrong Aisle</span>
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingStatusId === selectedItemForDetail.id}
                    onClick={() => {
                      handleUpdateStatus(selectedItemForDetail.id, 'Floor Check Dispatched');
                    }}
                    className={`btn-outcome dispatched ${isUpdatingStatusId === selectedItemForDetail.id ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    <Clock size={14} />
                    <span>Associate Dispatched</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ground Truth Evaluation Modal */}
      {isEvalModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsEvalModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog glass-panel" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-left">
                <div className="modal-icon-badge">
                  <Target size={20} className="text-cyan-primary" />
                </div>
                <div>
                  <h3 className="modal-title">Ground Truth Performance Evaluation</h3>
                  <p className="modal-subtitle">
                    Evaluation Date: <span className="font-mono text-cyan-primary">{evaluationDate}</span> • Strict Top-20 Queue Policy
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEvalModalOpen(false)}
                className="close-btn"
                aria-label="Close evaluation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {isLoadingEvaluation ? (
                <div className="evidence-loading-wrap font-mono py-12">
                  <RefreshCw size={22} className="animate-spin text-cyan-primary" />
                  <span>Evaluating ranked anomalies against ground-truth labels...</span>
                </div>
              ) : evaluationResult ? (
                <div>
                  {evaluationResult.available ? (
                    <div>
                      {/* Metric summary boxes */}
                      <div className="dossier-stats-grid mb-4">
                        <div className="dossier-stat-box">
                          <span className="stat-label">Precision@20</span>
                          <span className="stat-val text-cyan-primary font-mono font-bold text-xl">
                            {evaluationResult.mean_precision_at_20 !== null
                              ? `${(evaluationResult.mean_precision_at_20 <= 1 ? evaluationResult.mean_precision_at_20 * 100 : evaluationResult.mean_precision_at_20).toFixed(1)}%`
                              : 'N/A'}
                          </span>
                          <span className="stat-sub">Across evaluated stores</span>
                        </div>
                        <div className="dossier-stat-box">
                          <span className="stat-label">Overall Recall</span>
                          <span className="stat-val text-emerald-400 font-mono font-bold text-xl">
                            {evaluationResult.overall_recall !== null
                              ? `${(evaluationResult.overall_recall <= 1 ? evaluationResult.overall_recall * 100 : evaluationResult.overall_recall).toFixed(1)}%`
                              : 'N/A'}
                          </span>
                          <span className="stat-sub">Known anomalies caught</span>
                        </div>
                        <div className="dossier-stat-box">
                          <span className="stat-label">True Positives</span>
                          <span className="stat-val font-mono font-bold text-xl">
                            {evaluationResult.total_true_positives} / {evaluationResult.total_ground_truth_positives}
                          </span>
                          <span className="stat-sub">In Top-20 dispatch</span>
                        </div>
                      </div>

                      {/* Per-Store Breakdown Table */}
                      {evaluationResult.per_store_metrics && evaluationResult.per_store_metrics.length > 0 && (
                        <div className="time-series-box mb-4">
                          <div className="ts-header font-mono text-xs flex justify-between">
                            <span>Per-Store Evaluation Breakdown:</span>
                            <span className="text-cyan-primary">Capped at ≤20 items/store</span>
                          </div>
                          <div className="ts-table-wrap">
                            <table className="ts-table">
                              <thead>
                                <tr>
                                  <th>Store</th>
                                  <th>Top-20 Findings</th>
                                  <th>GT Positives</th>
                                  <th>True Positives</th>
                                  <th>Precision@20</th>
                                  <th>Recall</th>
                                </tr>
                              </thead>
                              <tbody>
                                {evaluationResult.per_store_metrics.map((pm, idx) => (
                                  <tr key={idx}>
                                    <td className="font-mono text-white text-xs">{pm.store_name}</td>
                                    <td className="font-mono text-center">{pm.top20_findings_count}</td>
                                    <td className="font-mono text-center text-amber-300">{pm.total_hidden_positives}</td>
                                    <td className="font-mono text-center text-cyan-primary font-bold">{pm.true_positives_in_top20}</td>
                                    <td className="font-mono text-right font-bold text-cyan-bright">
                                      {(pm.precision_at_20 <= 1 ? pm.precision_at_20 * 100 : pm.precision_at_20).toFixed(1)}%
                                    </td>
                                    <td className="font-mono text-right font-bold text-emerald-400">
                                      {(pm.recall_at_20 <= 1 ? pm.recall_at_20 * 100 : pm.recall_at_20).toFixed(1)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Explicit Methodology Notice */}
                      <div className="associate-guidance-card mt-3">
                        <div className="guidance-title">
                          <ShieldCheck size={16} className="text-cyan-primary" />
                          <span>Evaluation Semantics & Methodology Disclaimer</span>
                        </div>
                        <ul className="guidance-checklist text-xs text-slate-300">
                          {evaluationResult.evaluation_rules.map((rule, rIdx) => (
                            <li key={rIdx}>• {rule}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
                        <Info size={24} className="text-amber-400" />
                      </div>
                      <h4 className="text-base font-bold text-amber-300 font-mono mb-2">Evaluation unavailable — ground-truth labels required</h4>
                      <p className="text-xs text-slate-300 max-w-md mx-auto mb-2">
                        {evaluationResult.message || `No evaluation ground-truth labels exist for date ${evaluationDate}. Benchmark metrics are withheld in strict compliance with non-fabrication policy.`}
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-lg mx-auto mb-4 font-mono">
                        Note: Ground-truth labels mark verified positive phantom stock-outs only (~3% held back). Unlabeled items cannot be automatically assumed to be confirmed negatives without verified physical audit records.
                      </p>
                      {(() => {
                        const parsedDates = (evaluationResult.message?.match(/\b\d{4}-\d{2}-\d{2}\b/g) || []).filter(d => d !== evaluationDate);
                        const suggestedDate = parsedDates[parsedDates.length - 1] || currentDataset?.end_date || currentDataset?.start_date;
                        if (!suggestedDate) return null;
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setEvaluationDate(suggestedDate);
                              loadQueueFindings(suggestedDate, selectedDatasetId);
                              setIsEvalModalOpen(false);
                              setTimeout(() => {
                                handleOpenEvaluation();
                              }, 600);
                            }}
                            className="btn-primary text-xs py-2 px-4 mx-auto inline-flex items-center gap-2"
                          >
                            <Calendar size={13} />
                            <span>Switch to Available Date ({suggestedDate})</span>
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Scan History Drawer Modal */}
      {isHistoryModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsHistoryModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog glass-panel" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-left">
                <div className="modal-icon-badge">
                  <Clock size={20} className="text-cyan-primary" />
                </div>
                <div>
                  <h3 className="modal-title">Scan Execution Audit Trail</h3>
                  <p className="modal-subtitle">
                    Persisted scan histories from SQLite database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="close-btn"
                aria-label="Close history"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {isLoadingHistory ? (
                <div className="evidence-loading-wrap font-mono py-12">
                  <RefreshCw size={22} className="animate-spin text-cyan-primary" />
                  <span>Loading scan history from backend...</span>
                </div>
              ) : scanHistoryList.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Clock size={36} className="mx-auto mb-2 opacity-50" />
                  <p>No historical scans found. Click "Run Backend Scan" to record a new run.</p>
                </div>
              ) : (
                <div className="time-series-box">
                  <div className="ts-table-wrap max-h-80 overflow-y-auto">
                    <table className="ts-table">
                      <thead>
                        <tr>
                          <th>Scan ID</th>
                          <th>Target Date</th>
                          <th>Stores</th>
                          <th>Flagged</th>
                          <th>Recorded At</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanHistoryList.map((sc) => (
                          <tr key={sc.scan_id}>
                            <td className="font-mono text-xs text-cyan-primary font-bold">{sc.scan_id}</td>
                            <td className="font-mono text-xs text-white">{sc.evaluation_date}</td>
                            <td className="font-mono text-xs text-center">{sc.stores_covered}</td>
                            <td className="font-mono text-xs text-center font-bold text-amber-300">{sc.flagged_count}</td>
                            <td className="font-mono text-[11px] text-slate-400">
                              {sc.created_at ? new Date(sc.created_at).toLocaleTimeString() : 'N/A'}
                            </td>
                            <td>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {sc.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .matrix-control-strip {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 24px;
          background: rgba(8, 14, 28, 0.95);
          border-bottom: 1px solid rgba(56, 189, 248, 0.15);
        }

        .control-strip-left {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 14px;
        }

        .control-strip-right {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .control-select,
        .control-date-input {
          padding: 6px 10px;
          border-radius: 6px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(56, 189, 248, 0.25);
          color: #ffffff;
          font-size: 0.76rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .control-select:focus,
        .control-date-input:focus {
          border-color: var(--cyan-primary);
        }

        .dataset-manage-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 10px;
          border-radius: 6px;
          background: rgba(14, 116, 144, 0.2);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: var(--cyan-bright);
          font-size: 0.72rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dataset-manage-btn:hover {
          background: rgba(14, 116, 144, 0.35);
        }

        .date-presets {
          display: flex;
          gap: 4px;
        }

        .preset-date-btn {
          padding: 4px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-dim);
          font-family: var(--font-mono);
          font-size: 0.65rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .preset-date-btn:hover,
        .preset-date-btn.active {
          background: rgba(0, 242, 254, 0.15);
          border-color: var(--cyan-primary);
          color: #ffffff;
        }

        .scan-exec-btn {
          padding: 7px 14px;
          font-size: 0.76rem;
          gap: 6px;
        }

        .benchmark-btn,
        .history-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 0.74rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dashboard-section-viewport {
          position: relative;
          width: 100%;
          padding: 80px 0 70px;
          background: transparent;
          overflow: visible;
        }

        .section-container {
          position: relative;
          z-index: 10;
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .section-header-centered {
          text-align: center;
          max-width: 780px;
          margin: 0 auto 50px;
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

        .dashboard-matrix-container {
          border-radius: 18px;
          background: rgba(10, 20, 38, 0.88);
          border: 1px solid rgba(56, 189, 248, 0.22);
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
        }

        .matrix-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 24px;
          background: rgba(15, 23, 42, 0.75);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .toolbar-left {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 14px;
        }

        .store-filter-pills {
          display: flex;
          gap: 8px;
        }

        .store-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 8px;
          background: rgba(8, 14, 28, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          font-family: var(--font-sans);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .store-tab-btn.active {
          background: rgba(0, 242, 254, 0.15);
          border-color: var(--cyan-primary);
          color: #ffffff;
        }

        .tab-badge {
          font-family: var(--font-mono);
          font-size: 0.62rem;
          background: rgba(255, 255, 255, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .risk-toggle-group {
          display: flex;
          background: rgba(8, 14, 28, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 2px;
        }

        .risk-btn {
          background: transparent;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-dim);
          cursor: pointer;
        }

        .risk-btn.active {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .toolbar-search-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 300px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-dim);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          border-radius: 8px;
          background: rgba(8, 14, 28, 0.8);
          border: 1px solid rgba(56, 189, 248, 0.2);
          color: #ffffff;
          font-size: 0.82rem;
          outline: none;
        }

        .search-input:focus {
          border-color: var(--cyan-primary);
        }

        .queue-summary-strip {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          background: rgba(8, 14, 28, 0.6);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 0.75rem;
        }

        .kpi-pill {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .kpi-num {
          font-weight: 800;
          font-size: 0.88rem;
        }

        .kpi-label {
          color: var(--text-muted);
        }

        .kpi-sep {
          color: var(--text-dim);
          opacity: 0.4;
        }

        .kpi-note {
          margin-left: auto;
          color: var(--text-dim);
          font-size: 0.68rem;
        }

        .text-amber-accent {
          color: #f59e0b;
        }

        .text-emerald-accent {
          color: #10b981;
        }

        /* Table */
        .queue-table-scroll {
          max-height: 520px;
          overflow-y: auto;
          overflow-x: auto;
          scrollbar-gutter: stable;
        }

        .queue-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
          text-align: left;
        }

        .queue-table th {
          position: sticky;
          top: 0;
          z-index: 5;
          padding: 14px 18px;
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: rgba(11, 21, 40, 0.96);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          white-space: nowrap;
        }

        .queue-table td {
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          color: var(--text-primary);
        }

        .queue-row {
          cursor: pointer;
          transition: background 0.15s;
        }

        .queue-row:hover {
          background: rgba(0, 242, 254, 0.05);
        }

        .row-critical {
          background: rgba(239, 68, 68, 0.04);
        }

        .sku-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sku-code {
          font-weight: 700;
          color: var(--cyan-bright);
          font-size: 0.76rem;
        }

        .sku-name {
          font-weight: 600;
          color: #ffffff;
        }

        .sku-price {
          font-size: 0.68rem;
          color: var(--text-dim);
        }

        .aisle-cell {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: #cbd5e1;
        }

        .stock-pos {
          color: var(--cyan-primary);
          font-weight: 700;
        }

        .sales-signal {
          font-size: 0.78rem;
        }

        .risk-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 800;
        }

        .badge-crit {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.45);
          color: #fca5a5;
        }

        .badge-hi {
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.45);
          color: #fde68a;
        }

        .badge-rout {
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #bae6fd;
        }

        .reason-cell {
          max-width: 280px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .status-select {
          padding: 6px 10px;
          border-radius: 6px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-family: var(--font-mono);
          font-size: 0.68rem;
          cursor: pointer;
          outline: none;
        }

        .status-select:focus {
          border-color: var(--cyan-primary);
        }

        .matrix-footer-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: rgba(15, 23, 42, 0.7);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.72rem;
          gap: 12px;
        }

        .footer-tip {
          color: var(--text-dim);
        }

        .footer-btn {
          font-size: 0.78rem;
          padding: 8px 16px;
        }

        /* Right-Side Detail Drawer */
        .detail-drawer-backdrop {
          position: fixed;
          top: var(--navbar-height, 72px);
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(100vh - var(--navbar-height, 72px));
          background: rgba(3, 7, 18, 0.72);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          justify-content: flex-end;
          align-items: stretch;
          padding: 16px;
          overflow: hidden;
        }

        .detail-drawer {
          width: 100%;
          max-width: 580px;
          height: 100%;
          max-height: calc(100vh - var(--navbar-height, 72px) - 32px);
          background: rgba(10, 20, 38, 0.96);
          border: 1px solid rgba(56, 189, 248, 0.35);
          border-radius: 16px;
          box-shadow: -15px 0 50px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 242, 254, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          scroll-margin-top: 80px;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .detail-drawer .modal-header {
          flex-shrink: 0;
        }

        .detail-drawer .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          scroll-padding-top: 16px;
        }

        @media (max-width: 768px) {
          .detail-drawer-backdrop {
            top: var(--navbar-height, 72px);
            height: calc(100vh - var(--navbar-height, 72px));
            padding: 0;
            align-items: flex-end;
          }

          .detail-drawer {
            max-width: 100%;
            max-height: calc(100vh - var(--navbar-height, 72px) - 16px);
            border-radius: 20px 20px 0 0;
            animation: slideInUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          }
        }

        @keyframes slideInUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        /* Modal Dialog (for Evaluation and History modals) */
        .modal-backdrop {
          position: fixed;
          top: var(--navbar-height, 72px);
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(100vh - var(--navbar-height, 72px));
          background: rgba(3, 7, 18, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-dialog {
          width: 100%;
          max-width: 620px;
          background: rgba(10, 20, 38, 0.95);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 18px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85);
          overflow: hidden;
          animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-icon-badge {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(0, 242, 254, 0.1);
          border: 1px solid rgba(0, 242, 254, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-title {
          font-family: var(--font-display);
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
        }

        .modal-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
        }

        .close-btn:hover {
          color: #ffffff;
        }

        .modal-body {
          padding: 24px;
        }

        .dossier-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .dossier-stat-box {
          padding: 12px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 0.68rem;
          color: var(--text-dim);
          margin-bottom: 4px;
        }

        .stat-val {
          font-size: 1.15rem;
          font-weight: 700;
        }

        .stat-sub {
          display: block;
          font-size: 0.62rem;
          color: var(--text-dim);
          margin-top: 2px;
        }

        .associate-guidance-card {
          padding: 18px;
          border-radius: 10px;
          background: rgba(14, 116, 144, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.25);
          margin-bottom: 22px;
        }

        .guidance-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--cyan-bright);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .guidance-desc {
          font-size: 0.85rem;
          color: #ffffff;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .guidance-checklist {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.78rem;
          color: #cbd5e1;
        }

        .dossier-status-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .controls-label {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .outcome-btn-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .btn-outcome {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 6px;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-outcome.resolved {
          background: rgba(16, 185, 129, 0.18);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #6ee7b7;
        }

        .btn-outcome.resolved:hover {
          background: rgba(16, 185, 129, 0.35);
        }

        .btn-outcome.found {
          background: rgba(56, 189, 248, 0.18);
          border: 1px solid rgba(56, 189, 248, 0.4);
          color: #7dd3fc;
        }

        .btn-outcome.found:hover {
          background: rgba(56, 189, 248, 0.35);
        }

        .btn-outcome.dispatched {
          background: rgba(245, 158, 11, 0.18);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #fde68a;
        }

        .btn-outcome.dispatched:hover {
          background: rgba(245, 158, 11, 0.35);
        }

        /* Backend Connectivity Chip */
        .backend-conn-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 0.68rem;
        }

        .conn-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .conn-dot.online {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .conn-dot.offline {
          background: #f59e0b;
        }

        .conn-label {
          color: var(--text-dim);
          font-size: 0.66rem;
        }

        .conn-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(14, 116, 144, 0.35);
          border: 1px solid rgba(56, 189, 248, 0.35);
          color: #ffffff;
          padding: 2px 7px;
          border-radius: 8px;
          font-size: 0.64rem;
          font-family: var(--font-mono);
          cursor: pointer;
          transition: all 0.2s;
        }

        .conn-refresh-btn:hover {
          background: rgba(14, 116, 144, 0.6);
        }

        /* Telemetry & Time Series Section in Modal */
        .evidence-loading-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 10px;
          font-size: 0.74rem;
          color: var(--cyan-primary);
        }

        .backend-evidence-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
          background: rgba(10, 25, 47, 0.75);
          border: 1px solid rgba(56, 189, 248, 0.25);
          border-radius: 12px;
          margin-bottom: 14px;
        }

        .evidence-section-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--cyan-bright);
          text-transform: uppercase;
        }

        .evidence-signals-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .signal-chip {
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .signal-chip.alert {
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.08);
        }

        .signal-chip.normal {
          border-color: rgba(16, 185, 129, 0.3);
        }

        .sig-row-top {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
        }

        .sig-name {
          color: #e2e8f0;
        }

        .sig-val {
          color: var(--cyan-bright);
          font-weight: 700;
        }

        .sig-detail {
          font-size: 0.64rem;
          color: var(--text-dim);
          line-height: 1.3;
        }

        .time-series-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
        }

        .ts-header {
          font-size: 0.68rem;
          color: #94a3b8;
        }

        .ts-table-wrap {
          max-height: 140px;
          overflow-y: auto;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          background: rgba(3, 7, 18, 0.6);
        }

        .ts-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.68rem;
        }

        .ts-table th {
          text-align: left;
          padding: 5px 8px;
          background: rgba(15, 23, 42, 0.9);
          color: #94a3b8;
          font-weight: 600;
          font-family: var(--font-mono);
          position: sticky;
          top: 0;
        }

        .ts-table td {
          padding: 4px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .promo-tag {
          font-size: 0.58rem;
          padding: 1px 4px;
          border-radius: 4px;
          background: rgba(245, 158, 11, 0.25);
          color: #fde68a;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }
      `}</style>
    </section>
  );
};
