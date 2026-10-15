import React, { useState } from 'react';
import { X, Play, ShieldAlert, Search, ArrowRight, RefreshCw } from 'lucide-react';

interface InteractiveSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InteractiveSimulationModal: React.FC<InteractiveSimulationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  if (!isOpen) return null;

  const handleStartScan = () => {
    setScanning(true);
    setScanStep(1);
    setCompleted(false);

    setTimeout(() => setScanStep(2), 700);
    setTimeout(() => setScanStep(3), 1500);
    setTimeout(() => {
      setScanStep(4);
      setScanning(false);
      setCompleted(true);
    }, 2300);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-left">
            <div className="modal-icon-badge">
              <ShieldAlert size={20} className="text-cyan" />
            </div>
            <div>
              <h3 className="modal-title">Live Sentinel Anomaly Scanner</h3>
              <p className="modal-subtitle">Direct POS Telemetry vs ERP Ledger Cross-Validation</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="modal-body">
          {/* Target Store Select */}
          <div className="store-selector-bar">
            <div className="selector-label">Target Environment:</div>
            <div className="selected-store-pill">
              <span className="store-dot" />
              <span>Store #12 — Downtown Flagship (824 active SKUs)</span>
            </div>
          </div>

          {/* Scanner Simulation View */}
          <div className="scan-viewport">
            {!scanning && !completed && (
              <div className="idle-state">
                <Search size={40} className="idle-icon" />
                <h4>Ready to Cross-Reference Inventory</h4>
                <p>
                  Sentinel AI will compare 18 months of historical sales velocity against current positive on-hand inventory balances to isolate phantom stock-outs.
                </p>
                <button
                  type="button"
                  onClick={handleStartScan}
                  className="btn-primary start-scan-btn"
                >
                  <Play size={16} fill="currentColor" />
                  <span>Execute Diagnostic Scan</span>
                </button>
              </div>
            )}

            {scanning && (
              <div className="scanning-state">
                <RefreshCw size={44} className="spin-icon" />
                <h4 className="scan-status-text">
                  {scanStep === 1 && 'Ingesting 7-day POS register throughput...'}
                  {scanStep === 2 && 'Comparing ERP on-hand units across aisles...'}
                  {scanStep === 3 && 'Evaluating Bayesian zero-sales anomaly thresholds...'}
                  {scanStep === 4 && 'Isolating high-confidence phantom stock-outs...'}
                </h4>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${scanStep * 25}%` }} />
                </div>
                <div className="scanned-count">Evaluating SKU #{4580 + scanStep * 2} of 824</div>
              </div>
            )}

            {completed && (
              <div className="result-state">
                <div className="result-alert-box">
                  <div className="alert-chip">CRITICAL ANOMALY IDENTIFIED</div>
                  <div className="result-sku-row">
                    <span className="result-sku">SKU #4587</span>
                    <span className="result-name">Smart Aura Soundbar • Aisle 4-B</span>
                  </div>

                  <div className="result-contradiction">
                    <div className="c-item positive">
                      <span className="c-label">Ledger Stock</span>
                      <span className="c-val">+6 On-Hand</span>
                    </div>
                    <div className="c-vs">VS</div>
                    <div className="c-item negative">
                      <span className="c-label">Actual Sales</span>
                      <span className="c-val">0 In 7 Days</span>
                    </div>
                  </div>

                  <p className="result-summary">
                    Calculated stock-out probability: <strong>99.4%</strong>. The item is physically missing from the shelf despite positive system records.
                  </p>
                </div>

                <div className="result-actions">
                  <button
                    type="button"
                    onClick={handleStartScan}
                    className="btn-secondary re-scan-btn"
                  >
                    Run Another Scan
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-primary confirm-btn"
                  >
                    <span>Dispatch Floor Check</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}
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
            max-width: 580px;
            background: rgba(10, 20, 38, 0.95);
            border: 1px solid rgba(56, 189, 248, 0.28);
            border-radius: 18px;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(0, 242, 254, 0.15);
            overflow: hidden;
            animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes modalPop {
            0% { transform: scale(0.95); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
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
            transition: all 0.2s;
          }

          .close-btn:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.1);
          }

          .modal-body {
            padding: 24px;
          }

          .store-selector-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.06);
            padding: 8px 14px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 0.78rem;
          }

          .selector-label {
            color: var(--text-dim);
          }

          .selected-store-pill {
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: var(--font-mono);
            color: #e2e8f0;
          }

          .store-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 6px #10b981;
          }

          .scan-viewport {
            min-height: 240px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .idle-state {
            text-align: center;
            padding: 10px 20px;
          }

          .idle-icon {
            color: var(--cyan-primary);
            margin-bottom: 14px;
            opacity: 0.8;
          }

          .idle-state h4 {
            font-family: var(--font-display);
            font-size: 1.1rem;
            color: #ffffff;
            margin-bottom: 8px;
          }

          .idle-state p {
            font-size: 0.82rem;
            color: var(--text-muted);
            max-width: 440px;
            margin: 0 auto 20px;
            line-height: 1.5;
          }

          .start-scan-btn {
            font-size: 0.9rem;
            padding: 12px 24px;
          }

          .scanning-state {
            text-align: center;
            width: 100%;
            padding: 20px;
          }

          .spin-icon {
            color: var(--cyan-primary);
            animation: radarSweep 1.5s linear infinite;
            margin-bottom: 16px;
          }

          .scan-status-text {
            font-family: var(--font-sans);
            font-size: 0.95rem;
            color: #ffffff;
            margin-bottom: 16px;
          }

          .progress-bar-track {
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            overflow: hidden;
            width: 80%;
            margin: 0 auto 12px;
          }

          .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #00f2fe, #38bdf8);
            box-shadow: 0 0 10px #00f2fe;
            transition: width 0.4s ease;
          }

          .scanned-count {
            font-family: var(--font-mono);
            font-size: 0.72rem;
            color: var(--text-dim);
          }

          .result-state {
            width: 100%;
          }

          .result-alert-box {
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.4);
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 20px;
          }

          .alert-chip {
            font-family: var(--font-mono);
            font-size: 0.65rem;
            font-weight: 800;
            color: #ef4444;
            letter-spacing: 0.08em;
            margin-bottom: 8px;
          }

          .result-sku-row {
            display: flex;
            align-items: baseline;
            gap: 10px;
            margin-bottom: 14px;
          }

          .result-sku {
            font-family: var(--font-mono);
            font-size: 1.15rem;
            font-weight: 800;
            color: #ffffff;
          }

          .result-name {
            font-size: 0.85rem;
            color: #cbd5e1;
          }

          .result-contradiction {
            display: flex;
            align-items: center;
            justify-content: space-around;
            background: rgba(10, 16, 28, 0.7);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 14px;
          }

          .c-item {
            text-align: center;
          }

          .c-label {
            display: block;
            font-size: 0.68rem;
            color: var(--text-muted);
            margin-bottom: 2px;
          }

          .c-val {
            font-family: var(--font-mono);
            font-size: 1rem;
            font-weight: 700;
          }

          .positive .c-val {
            color: #38bdf8;
          }

          .negative .c-val {
            color: #ef4444;
          }

          .c-vs {
            font-family: var(--font-mono);
            font-size: 0.75rem;
            color: var(--text-dim);
            font-weight: 700;
          }

          .result-summary {
            font-size: 0.8rem;
            color: #cbd5e1;
            line-height: 1.4;
          }

          .result-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }

          .re-scan-btn, .confirm-btn {
            font-size: 0.85rem;
            padding: 10px 18px;
          }
        `}</style>
      </div>
    </div>
  );
};
