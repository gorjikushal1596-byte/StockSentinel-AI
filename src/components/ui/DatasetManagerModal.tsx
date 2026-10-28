import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Database,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Info,
} from 'lucide-react';
import {
  stockSentinelApi,
  type DatasetItem,
  type DatasetProfile,
  type ValidationReport,
  type ImportResult,
} from '@/services/apiClient';

interface DatasetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetImported?: (datasetId: string) => void;
}

export const DatasetManagerModal: React.FC<DatasetManagerModalProps> = ({
  isOpen,
  onClose,
  onDatasetImported,
}) => {
  const [tab, setTab] = useState<'upload' | 'datasets'>('upload');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileList, setFileList] = useState<File[]>([]);
  const [datasetName, setDatasetName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentDatasetId, setCurrentDatasetId] = useState<string | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [duplicatePolicy, setDuplicatePolicy] = useState('keep_first');

  const [isValidating, setIsValidating] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const [existingDatasets, setExistingDatasets] = useState<DatasetItem[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const TARGET_FIELDS = [
    { key: 'date', label: 'Transaction Date (date) *', required: true },
    { key: 'store_id', label: 'Store ID / Code (store_id) *', required: true },
    { key: 'sku_id', label: 'SKU / Product ID (sku_id) *', required: true },
    { key: 'units_sold', label: 'Daily Sales Units (units_sold / sales) *', required: true },
    { key: 'on_hand', label: 'On-Hand Stock (on_hand / stock) *', required: true },
    { key: 'sales', label: 'Daily Sales Units (sales)', required: false },
    { key: 'on_hand_stock', label: 'On-Hand Stock (on_hand_stock)', required: false },
    { key: 'promotion_active', label: 'Promotion Active Flag (promotion_active)', required: false },
    { key: 'holiday_flag', label: 'Holiday Flag (holiday_flag)', required: false },
    { key: 'store_name', label: 'Store Name (store_name)', required: false },
    { key: 'product_name', label: 'Product Name (product_name)', required: false },
    { key: 'category', label: 'Category / Department (category)', required: false },
    { key: 'price', label: 'Unit Retail Price in INR (price / unit_price_inr)', required: false },
    { key: 'shelf_bay', label: 'Shelf / Bay Location (shelf_bay)', required: false },
    { key: 'is_phantom_stockout', label: 'Evaluation Ground Truth (Held-out)', required: false },
  ];

  useEffect(() => {
    if (isOpen) {
      loadExistingDatasets();
    }
  }, [isOpen]);

  const loadExistingDatasets = async () => {
    setIsLoadingDatasets(true);
    try {
      const list = await stockSentinelApi.listDatasets();
      setExistingDatasets(list);
    } catch {
      // Ignore
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  const handleLoadSynthetic = async () => {
    setIsUploading(true);
    setErrorMessage(null);
    try {
      const res = await stockSentinelApi.loadSyntheticTest();
      setImportResult(res);
      setCurrentDatasetId(res.dataset_id);
      setStep(4);
      loadExistingDatasets();
      if (onDatasetImported) {
        onDatasetImported(res.dataset_id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load synthetic dataset.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setFileList(files);
      if (!datasetName && files[0]) {
        const baseName = files[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setDatasetName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
      }
      setErrorMessage(null);
    }
  };

  const handleUploadFiles = async () => {
    if (fileList.length === 0) {
      setErrorMessage('Please select at least one CSV, XLSX, JSON, or Parquet file.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      fileList.forEach((f) => formData.append('files', f));
      if (datasetName.trim()) {
        formData.append('name', datasetName.trim());
      }

      const res = await stockSentinelApi.uploadDataset(formData);
      setCurrentDatasetId(res.dataset_id);
      const prof = res.profile || (await stockSentinelApi.getDatasetProfile(res.dataset_id));
      setProfile(prof);
      setMappings(prof?.suggested_mappings || (res as any).confirmed_mapping || {});
      setStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload and parse dataset.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleMappingChange = (sourceCol: string, targetField: string) => {
    setMappings((prev) => {
      const next = { ...prev };
      if (!targetField) {
        delete next[sourceCol];
      } else {
        next[sourceCol] = targetField;
      }
      return next;
    });
  };

  const handleRunValidation = async () => {
    if (!currentDatasetId) return;
    setIsValidating(true);
    setErrorMessage(null);

    try {
      await stockSentinelApi.updateDatasetMapping(currentDatasetId, mappings, duplicatePolicy);
      const report = await stockSentinelApi.validateDataset(currentDatasetId, duplicatePolicy);
      setValidationReport(report);
      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'Validation failed. Check your column mappings.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!currentDatasetId) return;
    setIsImporting(true);
    setErrorMessage(null);

    try {
      const result = await stockSentinelApi.importDataset(currentDatasetId, duplicatePolicy);
      setImportResult(result);
      setStep(4);
      loadExistingDatasets();
      if (onDatasetImported) {
        onDatasetImported(currentDatasetId);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ingestion failed into database.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFileList([]);
    setDatasetName('');
    setCurrentDatasetId(null);
    setProfile(null);
    setMappings({});
    setValidationReport(null);
    setImportResult(null);
    setErrorMessage(null);
    setStep(1);
  };

  if (!isOpen) return null;

  return (
    <div className="dataset-modal-overlay">
      <div className="dataset-modal glass-panel">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="modal-icon-badge">
              <Database size={20} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="modal-title">Dataset Ingestion & Management</h3>
              <p className="modal-subtitle">
                Support for CSV, Excel (XLSX), JSON, & Parquet with semantic auto-mapping.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close Modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            type="button"
            className={`tab-btn ${tab === 'upload' ? 'active' : ''}`}
            onClick={() => setTab('upload')}
          >
            <UploadCloud size={16} />
            <span>Upload New Dataset</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === 'datasets' ? 'active' : ''}`}
            onClick={() => setTab('datasets')}
          >
            <Layers size={16} />
            <span>Available Datasets ({existingDatasets.length})</span>
          </button>
        </div>

        <div className="modal-body">
          {tab === 'upload' ? (
            <div>
              <div className="stepper-bar">
                <div className={`step-item ${step >= 1 ? 'active' : ''}`}>
                  <span className="step-circle">1</span>
                  <span className="step-label">Upload</span>
                </div>
                <div className={`step-line ${step >= 2 ? 'active' : ''}`} />
                <div className={`step-item ${step >= 2 ? 'active' : ''}`}>
                  <span className="step-circle">2</span>
                  <span className="step-label">Map Columns</span>
                </div>
                <div className={`step-line ${step >= 3 ? 'active' : ''}`} />
                <div className={`step-item ${step >= 3 ? 'active' : ''}`}>
                  <span className="step-circle">3</span>
                  <span className="step-label">Validate</span>
                </div>
                <div className={`step-line ${step >= 4 ? 'active' : ''}`} />
                <div className={`step-item ${step >= 4 ? 'active' : ''}`}>
                  <span className="step-circle">4</span>
                  <span className="step-label">Ingest</span>
                </div>
              </div>

              {errorMessage && (
                <div className="error-alert">
                  <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {step === 1 && (
                <div className="step-content">
                  <div
                    className="dropzone-area"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud size={44} className="text-cyan-400 mb-2 animate-bounce-subtle" />
                    <p className="dropzone-title">Click or drag & drop retail dataset files here</p>
                    <p className="dropzone-hint">
                      Accepts <strong>.csv</strong>, <strong>.xlsx / .xls</strong>, <strong>.json</strong>, and <strong>.parquet</strong>.
                      Supports multi-file inventory + sales split uploads.
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      accept=".csv,.xlsx,.xls,.json,.parquet"
                      style={{ display: 'none' }}
                    />
                  </div>

                  {fileList.length > 0 && (
                    <div className="selected-files-list">
                      <p className="section-label">Selected Files ({fileList.length}):</p>
                      {fileList.map((f, i) => (
                        <div key={i} className="file-chip">
                          <FileSpreadsheet size={15} className="text-cyan-400" />
                          <span className="file-name">{f.name}</span>
                          <span className="file-size">{(f.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="input-label">Dataset Display Name (Optional):</label>
                    <input
                      type="text"
                      value={datasetName}
                      onChange={(e) => setDatasetName(e.target.value)}
                      placeholder="e.g. Q4 Hypermarket Pilot Run"
                      className="text-input"
                    />
                  </div>

                  <div className="modal-actions mt-6">
                    <button
                      type="button"
                      onClick={handleUploadFiles}
                      disabled={fileList.length === 0 || isUploading}
                      className="btn-primary"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Parsing & Sniffing Schema...</span>
                        </>
                      ) : (
                        <>
                          <span>Inspect & Auto-Detect Schema</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && profile && (
                <div className="step-content">
                  <div className="info-banner">
                    <Sparkles size={16} className="text-cyan-400 shrink-0" />
                    <span>
                      Our semantic engine auto-detected columns across <strong>{profile.file_count}</strong> file(s) ({profile.total_raw_rows.toLocaleString()} rows). Confirm or adjust the target field mappings below:
                    </span>
                  </div>

                  <div className="mapping-grid">
                    <div className="mapping-header-row">
                      <span>Source Column</span>
                      <span>Detected Data Type</span>
                      <span>Target Canonical Field</span>
                      <span>Confidence</span>
                    </div>

                    {(profile.columns && profile.columns.length > 0 ? profile.columns : (profile.files ? profile.files.flatMap((f: any) => f.columns) : [])).map((col: any) => {
                      const currentMapped = mappings[col.name] || '';
                      const colType = col.data_type || col.detected_type || 'string';
                      const conf = col.confidence ?? col.mapping_confidence ?? 0;
                      return (
                        <div key={col.name} className="mapping-row">
                          <div className="col-source">
                            <strong>{col.name}</strong>
                            {col.sample_values?.length > 0 && (
                              <span className="sample-hint">
                                Ex: {JSON.stringify(col.sample_values[0])}
                              </span>
                            )}
                          </div>
                          <div className="col-type">
                            <code>{colType}</code>
                          </div>
                          <div className="col-target">
                            <select
                              value={currentMapped}
                              onChange={(e) => handleMappingChange(col.name, e.target.value)}
                              className="select-input"
                            >
                              <option value="">-- Ignore Column --</option>
                              {TARGET_FIELDS.map((tf) => (
                                <option key={tf.key} value={tf.key}>
                                  {tf.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-conf">
                            {conf > 0 ? (
                              <span
                                className={`conf-badge ${
                                  conf >= 0.8 ? 'conf-high' : 'conf-med'
                                }`}
                              >
                                {Math.round(conf * 100)}%
                              </span>
                            ) : (
                              <span className="conf-badge conf-none">Manual</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-slate-400">Duplicate Date Handling:</label>
                      <select
                        value={duplicatePolicy}
                        onChange={(e) => setDuplicatePolicy(e.target.value)}
                        className="select-input-sm"
                      >
                        <option value="keep_first">Keep First Occurrence</option>
                        <option value="keep_last">Keep Latest Occurrence</option>
                        <option value="aggregate_sum">Sum Sales & Max Stock</option>
                        <option value="error">Strict Error on Duplicates</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="btn-secondary"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleRunValidation}
                        disabled={isValidating}
                        className="btn-primary"
                      >
                        {isValidating ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span>Validating Rows...</span>
                          </>
                        ) : (
                          <>
                            <span>Run Data Quality Validation</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && validationReport && (
                <div className="step-content">
                  <div className="validation-summary-cards">
                    <div className="metric-box">
                      <span className="metric-label">Total Rows</span>
                      <span className="metric-val">{validationReport.total_rows.toLocaleString()}</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-label">Valid Rows</span>
                      <span className="metric-val text-emerald-400">
                        {validationReport.valid_rows.toLocaleString()}
                      </span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-label">Stores / SKUs</span>
                      <span className="metric-val text-cyan-400">
                        {validationReport.unique_stores_count} / {validationReport.unique_skus_count}
                      </span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-label">Date Span</span>
                      <span className="metric-val text-xs">
                        {validationReport.date_range_start || 'N/A'} to {validationReport.date_range_end || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {validationReport.issues && validationReport.issues.length > 0 && (
                    <div className="validation-issues-panel mt-4">
                      <p className="section-label">Validation Warnings & Checks:</p>
                      <div className="issues-list">
                        {validationReport.issues.slice(0, 10).map((issue, idx) => (
                          <div key={idx} className={`issue-row issue-${issue.severity}`}>
                            {issue.severity === 'error' ? (
                              <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                            ) : (
                              <Info size={14} className="text-amber-400 shrink-0" />
                            )}
                            <span className="issue-msg">{issue.message}</span>
                            {issue.column && <code className="issue-col">{issue.column}</code>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="modal-actions mt-6 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="btn-secondary"
                    >
                      Modify Mappings
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      disabled={isImporting || !(validationReport.valid ?? (validationReport as any).is_valid ?? (validationReport as any).can_import)}
                      className="btn-primary"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Ingesting Database Records...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Commit & Ingest Dataset</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && importResult && (
                <div className="step-content text-center py-6">
                  <div className="success-icon-badge">
                    <CheckCircle2 size={48} className="text-emerald-400 animate-scale-up" />
                  </div>
                  <h4 className="text-xl font-bold text-white mt-3">Dataset Successfully Ingested!</h4>
                  <p className="text-sm text-slate-300 mt-1 max-w-md mx-auto">
                    {importResult.message}
                  </p>

                  <div className="ingest-stats-strip mt-6">
                    <div className="ingest-stat">
                      <span className="stat-title">Stores</span>
                      <span className="stat-num">{importResult.imported_stores ?? (importResult as any).stores_imported ?? 0}</span>
                    </div>
                    <div className="ingest-stat">
                      <span className="stat-title">SKUs</span>
                      <span className="stat-num">{importResult.imported_skus ?? (importResult as any).skus_imported ?? 0}</span>
                    </div>
                    <div className="ingest-stat">
                      <span className="stat-title">Daily Records</span>
                      <span className="stat-num">{(importResult.imported_records ?? (importResult as any).records_imported ?? 0).toLocaleString()}</span>
                    </div>
                    {((importResult.imported_labels ?? (importResult as any).labels_imported ?? 0) > 0) && (
                      <div className="ingest-stat">
                        <span className="stat-title">Evaluation Labels</span>
                        <span className="stat-num text-cyan-400">{importResult.imported_labels ?? (importResult as any).labels_imported}</span>
                      </div>
                    )}
                  </div>

                  <div className="modal-actions mt-8 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="btn-secondary"
                    >
                      Upload Another
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-primary"
                    >
                      Open Live Scanner
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="datasets-tab-content">
              {isLoadingDatasets ? (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Loading existing datasets...</span>
                </div>
              ) : existingDatasets.length === 0 ? (
                <div className="empty-state py-12 text-center text-slate-400">
                  <FolderOpen size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No custom datasets imported yet.</p>
                  <button
                    type="button"
                    onClick={() => setTab('upload')}
                    className="btn-secondary mt-3 inline-flex"
                  >
                    Upload Your First Dataset
                  </button>
                </div>
              ) : (
                <div className="datasets-grid">
                  {existingDatasets.map((ds) => (
                    <div key={ds.dataset_id} className="dataset-card glass-panel">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="dataset-name">{ds.name}</h4>
                          <span className="dataset-id-tag">{ds.dataset_id}</span>
                        </div>
                        <span
                          className={`status-pill ${
                            ds.status === 'imported' ? 'status-green' : 'status-yellow'
                          }`}
                        >
                          {ds.status}
                        </span>
                      </div>

                      <div className="dataset-details-grid mt-3">
                        <div>
                          <span className="sub-label">Records:</span>
                          <span className="sub-val">{ds.total_records.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="sub-label">Stores:</span>
                          <span className="sub-val">{ds.stores_count}</span>
                        </div>
                        <div>
                          <span className="sub-label">SKUs:</span>
                          <span className="sub-val">{ds.skus_count}</span>
                        </div>
                        <div>
                          <span className="sub-label">Ground Truth:</span>
                          <span className="sub-val">
                            {ds.has_ground_truth ? 'Available' : 'None'}
                          </span>
                        </div>
                      </div>

                      {ds.start_date && (
                        <p className="date-span-label mt-2">
                          Span: {ds.start_date} → {ds.end_date}
                        </p>
                      )}

                      <div className="card-actions mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (onDatasetImported) {
                              onDatasetImported(ds.dataset_id);
                            }
                            onClose();
                          }}
                          className="btn-primary-sm"
                        >
                          <span>Select for Scanning</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Looking for the official hackathon benchmark suite?</span>
                <button
                  type="button"
                  onClick={handleLoadSynthetic}
                  disabled={isUploading}
                  className="text-cyan-400 hover:text-cyan-300 font-mono underline inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles size={12} />
                  <span>Restore Canonical Benchmark (30,000 rows)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .dataset-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(3, 7, 18, 0.85);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .dataset-modal {
          width: 100%;
          max-width: 860px;
          max-height: 90vh;
          overflow-y: auto;
          background: #0b1329;
          border: 1px solid rgba(56, 189, 248, 0.25);
          border-radius: 1rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .modal-icon-badge {
          width: 40px;
          height: 40px;
          border-radius: 0.5rem;
          background: rgba(6, 182, 212, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #f8fafc;
        }

        .modal-subtitle {
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .modal-close-btn {
          color: #94a3b8;
          padding: 0.5rem;
          border-radius: 0.375rem;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .modal-close-btn:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.05);
        }

        .modal-tabs {
          display: flex;
          padding: 0 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          gap: 1rem;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 0.5rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #94a3b8;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }
        .tab-btn.active {
          color: #38bdf8;
          border-bottom-color: #38bdf8;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .stepper-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          padding: 0 1rem;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .step-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #1e293b;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .step-item.active .step-circle {
          background: #0284c7;
          color: #ffffff;
        }

        .step-label {
          font-size: 0.75rem;
          color: #64748b;
        }
        .step-item.active .step-label {
          color: #e2e8f0;
          font-weight: 600;
        }

        .step-line {
          flex: 1;
          height: 2px;
          background: #1e293b;
          margin: 0 0.5rem -1rem 0.5rem;
        }
        .step-line.active {
          background: #0284c7;
        }

        .dropzone-area {
          border: 2px dashed rgba(56, 189, 248, 0.4);
          border-radius: 0.75rem;
          padding: 2.5rem 1.5rem;
          text-align: center;
          background: rgba(15, 23, 42, 0.6);
          cursor: pointer;
          transition: all 0.2s;
        }
        .dropzone-area:hover {
          border-color: #38bdf8;
          background: rgba(15, 23, 42, 0.9);
        }

        .dropzone-title {
          font-size: 1rem;
          font-weight: 600;
          color: #f8fafc;
        }

        .dropzone-hint {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 0.35rem;
        }

        .selected-files-list {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .file-chip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(30, 41, 59, 0.8);
          border-radius: 0.375rem;
          font-size: 0.85rem;
          color: #e2e8f0;
        }

        .file-name {
          flex: 1;
          font-weight: 500;
        }

        .file-size {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .input-label {
          display: block;
          font-size: 0.8rem;
          color: #cbd5e1;
          margin-bottom: 0.25rem;
        }

        .text-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 0.5rem;
          color: #ffffff;
          font-size: 0.875rem;
        }

        .info-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(2, 132, 199, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          color: #e0f2fe;
          margin-bottom: 1rem;
        }

        .mapping-grid {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .mapping-header-row {
          display: grid;
          grid-template-columns: 2fr 1.2fr 2.5fr 1fr;
          padding: 0.625rem 1rem;
          background: #1e293b;
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .mapping-row {
          display: grid;
          grid-template-columns: 2fr 1.2fr 2.5fr 1fr;
          align-items: center;
          padding: 0.625rem 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(15, 23, 42, 0.4);
          font-size: 0.85rem;
        }

        .sample-hint {
          display: block;
          font-size: 0.7rem;
          color: #64748b;
          font-family: monospace;
        }

        .select-input {
          width: 100%;
          padding: 0.375rem 0.5rem;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.375rem;
          color: #ffffff;
          font-size: 0.8rem;
        }

        .select-input-sm {
          padding: 0.25rem 0.5rem;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.375rem;
          color: #ffffff;
          font-size: 0.75rem;
        }

        .conf-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 9999px;
        }
        .conf-high {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }
        .conf-med {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
        }
        .conf-none {
          background: rgba(100, 116, 139, 0.2);
          color: #94a3b8;
        }

        .validation-summary-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }

        .metric-box {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.5rem;
          padding: 0.75rem;
          text-align: center;
        }

        .metric-label {
          display: block;
          font-size: 0.7rem;
          color: #94a3b8;
        }

        .metric-val {
          display: block;
          font-size: 1.125rem;
          font-weight: 700;
          color: #ffffff;
          margin-top: 0.25rem;
        }

        .validation-issues-panel {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.5rem;
          padding: 0.75rem;
        }

        .issues-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.5rem;
          max-height: 160px;
          overflow-y: auto;
        }

        .issue-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          padding: 0.35rem 0.5rem;
          border-radius: 0.25rem;
          background: rgba(255, 255, 255, 0.03);
        }

        .issue-error {
          border-left: 3px solid #f43f5e;
        }
        .issue-warning {
          border-left: 3px solid #f59e0b;
        }

        .issue-msg {
          flex: 1;
          color: #cbd5e1;
        }

        .issue-col {
          color: #94a3b8;
          background: #1e293b;
          padding: 0.1rem 0.3rem;
          border-radius: 0.2rem;
        }

        .ingest-stats-strip {
          display: flex;
          justify-content: center;
          gap: 2rem;
          padding: 1rem;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ingest-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-title {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .stat-num {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(244, 63, 94, 0.15);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          color: #fecdd3;
          margin-bottom: 1rem;
        }

        .datasets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }

        .dataset-card {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 1rem;
        }

        .dataset-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #f8fafc;
        }

        .dataset-id-tag {
          font-size: 0.7rem;
          color: #0284c7;
          font-family: monospace;
        }

        .status-pill {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 9999px;
          text-transform: uppercase;
        }
        .status-green {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }
        .status-yellow {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
        }

        .dataset-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
          font-size: 0.75rem;
        }

        .sub-label {
          color: #94a3b8;
          margin-right: 0.25rem;
        }

        .sub-val {
          color: #ffffff;
          font-weight: 600;
        }

        .date-span-label {
          font-size: 0.7rem;
          color: #64748b;
        }

        .btn-primary-sm {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #0284c7;
          color: #ffffff;
          padding: 0.35rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
        }
        .btn-primary-sm:hover {
          background: #0369a1;
        }
      `}</style>
    </div>
  );
};
