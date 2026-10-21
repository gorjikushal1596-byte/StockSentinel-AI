import React from 'react';
import { ClipboardList, ChevronRight, CheckCircle2 } from 'lucide-react';

interface CandidatePreview {
  rank: number;
  sku: string;
  name: string;
  bay: string;
  stock: number;
  sales7d: number;
  confidence: number;
  severity: 'CRITICAL' | 'HIGH';
}

interface Top20QueuePreviewPanelProps {
  className?: string;
  onOpenDashboard?: () => void;
  candidates?: CandidatePreview[];
  storeLabel?: string;
}

const DEFAULT_BENCHMARK_CANDIDATES: CandidatePreview[] = [
  {
    rank: 1,
    sku: 'SKU #4587',
    name: 'Smart Aura Soundbar',
    bay: 'Bay 4-B',
    stock: 6,
    sales7d: 0,
    confidence: 99.4,
    severity: 'CRITICAL',
  },
  {
    rank: 2,
    sku: 'SKU #2891',
    name: 'ANC Wireless Buds',
    bay: 'Bay 2-A',
    stock: 9,
    sales7d: 0,
    confidence: 98.7,
    severity: 'CRITICAL',
  },
  {
    rank: 3,
    sku: 'SKU #1042',
    name: 'USB-C GaN 100W Charger',
    bay: 'Bay 5-C',
    stock: 14,
    sales7d: 1,
    confidence: 92.1,
    severity: 'HIGH',
  },
];

export const Top20QueuePreviewPanel: React.FC<Top20QueuePreviewPanelProps> = ({
  className = '',
  onOpenDashboard,
  candidates,
  storeLabel = 'Store #001 Indiranagar • Daily Dispatch',
}) => {
  const isSample = !candidates || candidates.length === 0;
  const activeList = (!candidates || candidates.length === 0) ? DEFAULT_BENCHMARK_CANDIDATES : candidates.slice(0, 3);

  return (
    <div
      className={`glass-panel top20-preview-panel ${className}`}
      role="region"
      aria-label="Top-20 Daily Store Verification Queue Preview"
    >
      {/* Header */}
      <div className="preview-header">
        <div className="header-left">
          <div className="icon-badge">
            <ClipboardList size={14} className="text-cyan-primary" />
          </div>
          <div>
            <div className="panel-title">Top-20 Verification Queue</div>
            <div className="panel-sub">{storeLabel}</div>
          </div>
        </div>
        <span className="cap-pill" title="Enforced operational limit to prevent store associate alert fatigue">
          <CheckCircle2 size={11} className="text-emerald-400" />
          <span>CAP: ≤20 / DAY</span>
        </span>
      </div>

      {/* Candidate List */}
      <div className="candidate-list">
        {activeList.map((c) => (
          <div key={c.sku} className="candidate-row">
            <div className="rank-indicator">
              <span className="rank-num">#{c.rank}</span>
            </div>
            <div className="candidate-meta">
              <div className="meta-line1">
                <span className="sku-tag">{c.sku}</span>
                <span className="product-text">{c.name}</span>
              </div>
              <div className="meta-line2">
                <span className="bay-text">{c.bay}</span>
                <span className="sep">•</span>
                <span className="stock-alert-text">Stock: +{c.stock} | Sales: {c.sales7d}</span>
              </div>
            </div>
            <div className="candidate-badge">
              <span className={`confidence-tag ${c.severity === 'CRITICAL' ? 'crit' : 'high'}`}>
                {c.confidence}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer / CTA Link */}
      <div className="preview-footer">
        <span className="rule-note">
          {isSample ? '* Illustrative benchmark queue' : 'Zero alert fatigue protocol active'}
        </span>
        {onOpenDashboard && (
          <button
            type="button"
            onClick={onOpenDashboard}
            className="explore-link-btn"
            title="Open complete Top-20 verification queue in Dashboard"
          >
            <span>Full Queue (20)</span>
            <ChevronRight size={13} />
          </button>
        )}
      </div>

      <style>{`
        .top20-preview-panel {
          width: min(330px, 100%);
          box-sizing: border-box;
          padding: 14px 16px;
          border-left: 3px solid var(--cyan-primary);
          font-family: var(--font-sans);
          background: rgba(3, 7, 18, 0.78);
          backdrop-filter: blur(14px);
          border-radius: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .icon-badge {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: rgba(0, 242, 254, 0.12);
          border: 1px solid rgba(0, 242, 254, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .panel-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.01em;
        }

        .panel-sub {
          font-size: 0.68rem;
          color: #94a3b8;
          font-family: var(--font-mono);
        }

        .cap-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-mono);
          font-size: 0.64rem;
          font-weight: 700;
          color: #a7f3d0;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 2px 7px;
          border-radius: 999px;
          white-space: nowrap;
        }

        .candidate-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 10px;
        }

        .candidate-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 6px;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.2s, border-color 0.2s;
        }

        .candidate-row:hover {
          background: rgba(15, 23, 42, 0.9);
          border-color: rgba(0, 242, 254, 0.25);
        }

        .rank-indicator {
          width: 22px;
          height: 22px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .rank-num {
          font-size: 0.68rem;
          font-family: var(--font-mono);
          font-weight: 800;
          color: #38bdf8;
        }

        .candidate-meta {
          flex: 1;
          min-width: 0;
        }

        .meta-line1 {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sku-tag {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          font-weight: 700;
          color: #e2e8f0;
        }

        .product-text {
          font-size: 0.72rem;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .meta-line2 {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.65rem;
          color: #64748b;
          font-family: var(--font-mono);
          margin-top: 1px;
        }

        .stock-alert-text {
          color: #f87171;
          font-weight: 600;
        }

        .candidate-badge {
          flex-shrink: 0;
        }

        .confidence-tag {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .confidence-tag.crit {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .confidence-tag.high {
          background: rgba(245, 158, 11, 0.15);
          color: #fcd34d;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .preview-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .rule-note {
          font-size: 0.65rem;
          color: #64748b;
          font-family: var(--font-mono);
        }

        .explore-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background: transparent;
          border: none;
          color: var(--cyan-primary);
          font-family: var(--font-sans);
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 4px;
          transition: color 0.15s, transform 0.15s;
        }

        .explore-link-btn:hover {
          color: #ffffff;
          transform: translateX(2px);
        }
      `}</style>
    </div>
  );
};
