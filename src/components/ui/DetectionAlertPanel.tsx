import React from 'react';
import { AlertOctagon, Zap, ShieldCheck } from 'lucide-react';

interface DetectionAlertPanelProps {
  className?: string;
  onInvestigate?: () => void;
}

export const DetectionAlertPanel: React.FC<DetectionAlertPanelProps> = ({
  className = '',
  onInvestigate,
}) => {
  return (
    <div
      className={`glass-panel-warning detection-alert-card ${className}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Top Banner */}
      <div className="alert-top-row">
        <div className="alert-badge-group">
          <span className="alert-pulse-icon">
            <AlertOctagon size={16} />
          </span>
          <span className="alert-tag">PHANTOM STOCK-OUT</span>
        </div>
        <div className="confidence-pill">
          <Zap size={11} className="zap-icon" />
          <span>99.4% AI CONFIDENCE</span>
        </div>
      </div>

      {/* Main Core Contradiction Statement */}
      <div className="alert-body">
        <p className="contradiction-headline">
          "Stock is positive while sales remain at zero."
        </p>
        <p className="contradiction-explanation">
          Physical shelf inspection triggered. High probability of misplacement, shrinkage, or barcode occlusion in Bay 4B.
        </p>
      </div>

      {/* Recommended Action Bar */}
      <div className="action-bar">
        <div className="action-left">
          <ShieldCheck size={14} className="shield-icon" />
          <span>Action: Store Associate Dispatched</span>
        </div>
        {onInvestigate && (
          <button
            type="button"
            onClick={onInvestigate}
            className="action-link-btn"
          >
            Investigate Bay
          </button>
        )}
      </div>

      <style>{`
        .detection-alert-card {
          width: 330px;
          padding: 16px 18px;
          border-left: 3px solid var(--alert-red);
          font-family: var(--font-sans);
        }

        .alert-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .alert-badge-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .alert-pulse-icon {
          color: var(--alert-red);
          display: flex;
          align-items: center;
          animation: alertBlink 1.8s infinite;
        }

        .alert-tag {
          font-family: var(--font-mono);
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #fca5a5;
        }

        .confidence-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-mono);
          font-size: 0.62rem;
          font-weight: 700;
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.2);
          padding: 3px 8px;
          border-radius: 12px;
          border: 1px solid rgba(239, 68, 68, 0.35);
        }

        .zap-icon {
          color: var(--alert-orange);
        }

        .alert-body {
          margin-bottom: 14px;
        }

        .contradiction-headline {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.35;
          margin-bottom: 6px;
        }

        .contradiction-explanation {
          font-size: 0.72rem;
          color: #cbd5e1;
          line-height: 1.45;
        }

        .action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid rgba(239, 68, 68, 0.2);
          font-size: 0.68rem;
          font-family: var(--font-mono);
        }

        .action-left {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #fca5a5;
        }

        .shield-icon {
          color: #f97316;
        }

        .action-link-btn {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ffffff;
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-link-btn:hover {
          background: rgba(239, 68, 68, 0.4);
          border-color: #ef4444;
        }
      `}</style>
    </div>
  );
};
