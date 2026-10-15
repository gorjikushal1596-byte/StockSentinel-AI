import React from 'react';
import { Package, AlertTriangle, Layers, TrendingDown } from 'lucide-react';

interface FloatingInventoryPanelProps {
  className?: string;
}

export const FloatingInventoryPanel: React.FC<FloatingInventoryPanelProps> = ({ className = '' }) => {
  return (
    <div 
      className={`glass-panel floating-inventory-card ${className}`}
      role="region"
      aria-label="SKU Inventory Telemetry"
    >
      {/* Top Header */}
      <div className="card-top-bar">
        <div className="sku-meta">
          <div className="sku-icon-box">
            <Package size={14} className="sku-icon" />
          </div>
          <div>
            <div className="sku-id">SKU #4587</div>
            <div className="sku-category">Smart Electronics • Aisle 4-B</div>
          </div>
        </div>
        <span className="live-telemetry-pill">
          <span className="live-dot" />
          ERP SYNCED
        </span>
      </div>

      {/* Metric Comparison Grid */}
      <div className="metrics-grid">
        <div className="metric-box erp-box">
          <div className="metric-label">
            <Layers size={13} />
            <span>Recorded Stock</span>
          </div>
          <div className="metric-val erp-val">
            6 <span className="metric-unit">units</span>
          </div>
          <div className="metric-subtext">ERP / POS Database</div>
        </div>

        <div className="metric-box sales-box">
          <div className="metric-label">
            <TrendingDown size={13} />
            <span>Actual Sales</span>
          </div>
          <div className="metric-val sales-val">
            0 <span className="metric-unit">units / 7d</span>
          </div>
          <div className="metric-subtext">Last Sale: 8 days ago</div>
        </div>
      </div>

      {/* Discrepancy Status Warning */}
      <div className="status-discrepancy-banner">
        <div className="status-icon-wrap">
          <AlertTriangle size={15} className="status-icon" />
        </div>
        <div className="status-copy">
          <div className="status-headline">Status: Suspicious Activity Detected</div>
          <div className="status-detail">Expected velocity: 4.2 units/week • Deviation: -100%</div>
        </div>
      </div>

      {/* Illustrative Demo Badge */}
      <div className="demo-notice">
        <span>* Illustrative Sentinel demo data</span>
      </div>

      <style>{`
        .floating-inventory-card {
          width: 320px;
          padding: 16px 18px;
          font-family: var(--font-sans);
          border-left: 3px solid var(--cyan-primary);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s;
        }

        .card-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .sku-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sku-icon-box {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: rgba(0, 242, 254, 0.12);
          border: 1px solid rgba(0, 242, 254, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--cyan-primary);
        }

        .sku-id {
          font-family: var(--font-mono);
          font-size: 0.95rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.01em;
        }

        .sku-category {
          font-size: 0.68rem;
          color: var(--text-muted);
        }

        .live-telemetry-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: var(--font-mono);
          font-size: 0.62rem;
          font-weight: 700;
          color: var(--cyan-bright);
          background: rgba(14, 116, 144, 0.25);
          padding: 3px 8px;
          border-radius: 12px;
          border: 1px solid rgba(56, 189, 248, 0.3);
        }

        .live-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--cyan-primary);
          box-shadow: 0 0 6px var(--cyan-primary);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 12px;
        }

        .metric-box {
          padding: 10px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .metric-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .erp-box .metric-label {
          color: #94a3b8;
        }

        .sales-box .metric-label {
          color: #fca5a5;
        }

        .metric-val {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 800;
          line-height: 1.1;
        }

        .erp-val {
          color: #38bdf8;
        }

        .sales-val {
          color: #ef4444;
        }

        .metric-unit {
          font-size: 0.72rem;
          font-weight: 500;
          color: var(--text-dim);
          font-family: var(--font-sans);
        }

        .metric-subtext {
          font-size: 0.62rem;
          color: var(--text-dim);
          margin-top: 4px;
          font-family: var(--font-mono);
        }

        .status-discrepancy-banner {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.28);
        }

        .status-icon-wrap {
          color: #ef4444;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .status-headline {
          font-size: 0.72rem;
          font-weight: 700;
          color: #fca5a5;
        }

        .status-detail {
          font-size: 0.62rem;
          color: #f87171;
          opacity: 0.9;
          font-family: var(--font-mono);
          margin-top: 1px;
        }

        .demo-notice {
          margin-top: 8px;
          text-align: right;
          font-size: 0.58rem;
          color: var(--text-dim);
          font-family: var(--font-mono);
        }
      `}</style>
    </div>
  );
};
