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
              <div className="flex items-center gap-2">
                <h3 className="modal-title">Interactive Visual Simulation</h3>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Simulation Preset
                </span>
              </div>
              <p className="modal-subtitle">Client-Side UI Demonstration • Real scans execute via FastAPI backend</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="modal-body">
          <div className="p-2.5 mb-3 rounded bg-cyan-950/40 border border-cyan-500/20 text-[11px] text-cyan-200/90 flex items-center justify-between">
            <span>Illustrative simulation preset. Real POS and ERP ledger audits run in Frame 05 / 06.</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                const el = document.getElementById('demo');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-cyan-400 underline font-mono hover:text-white"
            >
              Go to Real Scanner →
            </button>
          </div>

          {/* Target Store Select */}
          <div className="store-selector-bar">
            <div className="selector-label">Target Environment:</div>
            <div className="selected-store-pill">
              <span className="store-dot" />
              <span>Simulated Store #12 — Downtown Flagship (Preset SKU Catalog)</span>
            </div>
          </div>

          {/* Scanner Simulation View */}
          <div className="scan-viewport">
            {!scanning && !completed && (
              <div className="idle-state">
                <Search size={40} className="idle-icon" />
                <h4>Simulate Inventory Cross-Reference</h4>
                <p>
                  Demonstrates the multi-stage visual process comparing sales velocity against ledger stock to identify phantom discrepancies.
                </p>
                <button
                  type="button"
                  onClick={handleStartScan}
                  className="btn-primary start-scan-btn"
                >
                  <Play size={16} fill="currentColor" />
                  <span>Execute Simulated Scan</span>
                </button>
              </div>
            )}

            {scanning && (
              <div className="scanning-state">
                <RefreshCw size={44} className="spin-icon" />
                <h4 className="scan-status-text">
                  {scanStep === 1 && '[Simulated] Ingesting POS register throughput...'}
                  {scanStep === 2 && '[Simulated] Comparing ERP on-hand units across aisles...'}
                  {scanStep === 3 && '[Simulated] Evaluating anomaly thresholds...'}
                  {scanStep === 4 && '[Simulated] Isolating high-confidence phantom stock-outs...'}
                </h4>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${scanStep * 25}%` }} />
                </div>
                <div className="scanned-count">[Simulation] Evaluating SKU #{4580 + scanStep * 2} of 824</div>
              </div>
            )}

            {completed && (
              <div className="result-state">
                <div className="result-alert-box">
                  <div className="alert-chip">[SIMULATED RESULT] CRITICAL ANOMALY IDENTIFIED</div>
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
                    Calculated stock-out probability: <strong>99.4%</strong>. (Preset simulation outcome).
                  </p>
                </div>

                <div className="result-actions">
                  <button
                    type="button"
                    onClick={handleStartScan}
                    className="btn-secondary re-scan-btn"
                  >
                    Re-run Simulation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      const el = document.getElementById('dashboard');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="btn-primary confirm-btn"
                  >
                    <span>View Real Store Queue</span>
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
