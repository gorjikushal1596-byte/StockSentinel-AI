import React, { useState, useEffect } from 'react';
import { X, Layers, AlertTriangle, CheckCircle, Clock, Database, RefreshCw } from 'lucide-react';
import { apiClient, type FindingResponse } from '@/services/apiClient';
import { mapStatusToFrontend } from '@/services/apiAdapters';

interface DashboardPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DashboardPreviewModal: React.FC<DashboardPreviewModalProps> = ({ isOpen, onClose }) => {
  const [liveFindings, setLiveFindings] = useState<FindingResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);

    apiClient
      .getFindings({ limit: 10 })
      .then((res) => {
        if (!isMounted) return;
        if (res && res.length > 0) {
          setLiveFindings(res);
        } else {
          setLiveFindings([]);
          setErrorMsg('No findings currently persisted in database. Run a scan to populate.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('DashboardPreviewModal getFindings error:', err);
        setErrorMsg('Backend connection failed. Ensure FastAPI is running on port 8000.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-left">
            <div className="modal-icon-badge">
              <Layers size={20} className="text-cyan" />
            </div>
            <div>
              <h3 className="modal-title">Store Telemetry — Prioritized Daily Top 20</h3>
              <p className="modal-subtitle">
                {liveFindings.length > 0
                  ? `Live Database Telemetry • ${liveFindings.length} Persisted Findings Loaded`
                  : 'FastAPI Backend Telemetry Cross-Validation'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {errorMsg && (
            <div className="p-3 mb-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-cyan-400" />
              <span>Loading live findings from database...</span>
            </div>
          ) : (
            <div className="telemetry-table-wrapper">
              <table className="telemetry-table">
                <thead>
                  <tr>
                    <th>SKU / Product</th>
                    <th>Location / Store</th>
                    <th>Ledger Units</th>
                    <th>Zero-Sales Days</th>
                    <th>Risk Tier</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {liveFindings.map((row) => (
                    <tr key={row.finding_id} className={row.severity === 'CRITICAL' ? 'row-critical' : ''}>
                      <td>
                        <div className="sku-cell">
                          <span className="sku-code">{row.sku_id}</span>
                          <span className="sku-title">{row.product_name || `Product ${row.sku_id}`}</span>
                        </div>
                      </td>
                      <td>
                        <span className="location-tag">
                          {row.shelf_bay || (row.store_name ? row.store_name.split('—')[0].trim() : row.store_id)}
                        </span>
                      </td>
                      <td><span className="stock-pos">+{row.recorded_stock}</span></td>
                      <td>
                        <span className="sales-zero font-mono font-bold">
                          {row.consecutive_zero_days}d
                        </span>
                      </td>
                      <td>
                        <span className={`risk-tag risk-${row.severity.toLowerCase()}`}>
                          {row.severity === 'CRITICAL' && <AlertTriangle size={11} />}
                          {row.severity}
                        </span>
                      </td>
                      <td>
                        <span className="status-cell">
                          {row.status === 'unresolved' && <Clock size={12} className="text-amber" />}
                          {row.status === 'verified' && <CheckCircle size={12} className="text-emerald" />}
                          {mapStatusToFrontend(row.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="table-footer-note flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Database size={13} className="text-cyan-primary" />
              <span>
                {liveFindings.length > 0
                  ? `Showing ${liveFindings.length} persisted findings strictly from real database records`
                  : 'Awaiting database scan findings'}
              </span>
            </span>
            <button type="button" onClick={onClose} className="btn-secondary close-sub-btn">
              Close Preview
            </button>
          </div>
        </div>

        <style>{`
          .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(3, 7, 18, 0.85);
            backdrop-filter: blur(12px);
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .modal-dialog {
            width: 100%;
            max-width: 760px;
            background: rgba(10, 20, 38, 0.95);
            border: 1px solid rgba(56, 189, 248, 0.28);
            border-radius: 18px;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85);
            overflow: hidden;
            animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: rgba(0, 242, 254, 0.1);
            border: 1px solid rgba(0, 242, 254, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .text-cyan {
            color: var(--cyan-primary);
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
            border-radius: 6px;
          }

          .close-btn:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.1);
          }

          .modal-body {
            padding: 24px;
          }

          .telemetry-table-wrapper {
            overflow-x: auto;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            background: rgba(8, 14, 28, 0.7);
          }

          .telemetry-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.78rem;
            text-align: left;
          }

          .telemetry-table th {
            padding: 12px 14px;
            font-family: var(--font-mono);
            font-size: 0.68rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: rgba(15, 23, 42, 0.8);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .telemetry-table td {
            padding: 12px 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            color: var(--text-primary);
          }

          .row-critical {
            background: rgba(239, 68, 68, 0.06);
          }

          .sku-cell {
            display: flex;
            flex-direction: column;
          }

          .sku-code {
            font-family: var(--font-mono);
            font-weight: 700;
            color: #38bdf8;
          }

          .sku-title {
            font-size: 0.7rem;
            color: var(--text-muted);
          }

          .location-tag {
            font-family: var(--font-mono);
            font-size: 0.7rem;
            background: rgba(255, 255, 255, 0.05);
            padding: 2px 6px;
            border-radius: 4px;
          }

          .stock-pos {
            font-family: var(--font-mono);
            font-weight: 700;
            color: #38bdf8;
          }

          .sales-zero {
            font-family: var(--font-mono);
            font-weight: 800;
            color: #ef4444;
          }

          .sales-low {
            font-family: var(--font-mono);
            color: #f59e0b;
          }

          .risk-tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-family: var(--font-mono);
            font-size: 0.62rem;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;
          }

          .risk-critical {
            background: rgba(239, 68, 68, 0.2);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.4);
          }

          .risk-high {
            background: rgba(245, 158, 11, 0.2);
            color: #fde68a;
            border: 1px solid rgba(245, 158, 11, 0.4);
          }

          .status-cell {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.7rem;
            color: var(--text-muted);
          }

          .text-amber {
            color: #f59e0b;
          }

          .text-emerald {
            color: #10b981;
          }

          .table-footer-note {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 16px;
            font-family: var(--font-mono);
            font-size: 0.72rem;
            color: var(--text-dim);
          }

          .close-sub-btn {
            font-size: 0.75rem;
            padding: 6px 14px;
          }
        `}</style>
      </div>
    </div>
  );
};
