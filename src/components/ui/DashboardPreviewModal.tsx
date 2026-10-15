import React from 'react';
import { X, Layers, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface DashboardPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DashboardPreviewModal: React.FC<DashboardPreviewModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const topDailyChecks = [
    {
      sku: 'SKU #4587',
      name: 'Smart Aura Soundbar',
      aisle: 'Aisle 4-B',
      systemStock: 6,
      sales7d: 0,
      risk: 'CRITICAL',
      status: 'Floor Check Dispatched',
    },
    {
      sku: 'SKU #2891',
      name: 'Ultra Wireless Noise-Cancelling Buds',
      aisle: 'Aisle 2-A',
      systemStock: 9,
      sales7d: 0,
      risk: 'CRITICAL',
      status: 'Pending Verification',
    },
    {
      sku: 'SKU #1042',
      name: 'USB-C GaN 100W Fast Charger',
      aisle: 'Aisle 5-C',
      systemStock: 14,
      sales7d: 1,
      risk: 'HIGH',
      status: 'Pending Verification',
    },
    {
      sku: 'SKU #6320',
      name: 'MagCharge Dual Wireless Stand',
      aisle: 'Aisle 3-D',
      systemStock: 4,
      sales7d: 0,
      risk: 'HIGH',
      status: 'Resolved (Restocked)',
    },
  ];

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
              <p className="modal-subtitle">Autonomous Sentinel Anomaly Detection across 25 Stores</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          <div className="telemetry-table-wrapper">
            <table className="telemetry-table">
              <thead>
                <tr>
                  <th>SKU / Product</th>
                  <th>Location</th>
                  <th>Ledger Units</th>
                  <th>7d Sales</th>
                  <th>Risk Tier</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topDailyChecks.map((row, idx) => (
                  <tr key={idx} className={row.risk === 'CRITICAL' ? 'row-critical' : ''}>
                    <td>
                      <div className="sku-cell">
                        <span className="sku-code">{row.sku}</span>
                        <span className="sku-title">{row.name}</span>
                      </div>
                    </td>
                    <td><span className="location-tag">{row.aisle}</span></td>
                    <td><span className="stock-pos">+{row.systemStock}</span></td>
                    <td>
                      <span className={row.sales7d === 0 ? 'sales-zero' : 'sales-low'}>
                        {row.sales7d}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-tag risk-${row.risk.toLowerCase()}`}>
                        {row.risk === 'CRITICAL' && <AlertTriangle size={11} />}
                        {row.risk}
                      </span>
                    </td>
                    <td>
                      <span className="status-cell">
                        {row.status.includes('Dispatched') && <Clock size={12} className="text-amber" />}
                        {row.status.includes('Resolved') && <CheckCircle size={12} className="text-emerald" />}
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-footer-note">
            <span>Showing Top 4 of 20 daily prioritized checks for Store #12</span>
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
