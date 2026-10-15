import React, { useState } from 'react';
import { LineChart } from 'lucide-react';

interface DataPoint {
  day: string;
  stock: number;
  sales: number;
}

const timelineData: DataPoint[] = [
  { day: 'D-6', stock: 6, sales: 5 },
  { day: 'D-5', stock: 6, sales: 4 },
  { day: 'D-4', stock: 6, sales: 3 },
  { day: 'D-3', stock: 6, sales: 2 },
  { day: 'D-2', stock: 6, sales: 1 },
  { day: 'D-1', stock: 6, sales: 0 },
  { day: 'Today', stock: 6, sales: 0 },
];

export const SalesStockChart: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(6);

  // SVG dimensions
  const width = 280;
  const height = 110;
  const paddingX = 25;
  const paddingY = 20;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Max value is 6
  const maxVal = 7;

  const getX = (index: number) => paddingX + (index / (timelineData.length - 1)) * chartW;
  const getY = (val: number) => paddingY + chartH - (val / maxVal) * chartH;

  // Path generators
  const stockPoints = timelineData.map((d, i) => `${getX(i)},${getY(d.stock)}`).join(' ');
  const salesPoints = timelineData.map((d, i) => `${getX(i)},${getY(d.sales)}`).join(' ');

  // Area under sales
  const salesArea = `${getX(0)},${getY(0)} ${salesPoints} ${getX(
    timelineData.length - 1
  )},${getY(0)}`;

  const activePoint = hoverIndex !== null ? timelineData[hoverIndex] : timelineData[6];

  return (
    <div
      className={`glass-panel sales-chart-card ${className}`}
      role="region"
      aria-label="Recorded Stock vs Sales Discrepancy Chart"
    >
      {/* Header */}
      <div className="chart-header">
        <div className="title-row">
          <LineChart size={14} className="text-cyan" />
          <span className="chart-title">Telemetry: Stock vs. Sales</span>
        </div>
        <div className="legend-pills">
          <div className="legend-item">
            <span className="dot dot-stock" />
            <span>Stock (6)</span>
          </div>
          <div className="legend-item">
            <span className="dot dot-sales" />
            <span>Sales (0)</span>
          </div>
        </div>
      </div>

      {/* SVG Multi-Series Divergence Chart */}
      <div className="chart-svg-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="chart-svg"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Sales gradient fill */}
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>

            {/* Cyan glow filter */}
            <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00f2fe" floodOpacity="0.8" />
            </filter>
            <filter id="redGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#ef4444" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={getY(0)}
            x2={width - paddingX}
            y2={getY(0)}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="2 2"
          />
          <line
            x1={paddingX}
            y1={getY(3)}
            x2={width - paddingX}
            y2={getY(3)}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="2 2"
          />
          <line
            x1={paddingX}
            y1={getY(6)}
            x2={width - paddingX}
            y2={getY(6)}
            stroke="rgba(56, 189, 248, 0.15)"
            strokeDasharray="2 2"
          />

          {/* Divergence Gap Shading (Phantom Zone) */}
          <polygon
            points={`${stockPoints} ${getX(timelineData.length - 1)},${getY(
              timelineData[timelineData.length - 1].sales
            )} ${getX(0)},${getY(timelineData[0].sales)}`}
            fill="rgba(239, 68, 68, 0.08)"
          />

          {/* Sales Gradient Area */}
          <polygon points={salesArea} fill="url(#salesGrad)" />

          {/* Stock Series Line (Flat positive at 6) */}
          <polyline
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.2"
            points={stockPoints}
            filter="url(#cyanGlow)"
            className="chart-polyline-stock"
          />

          {/* Sales Series Line (Plummets to 0) */}
          <polyline
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.2"
            points={salesPoints}
            filter="url(#redGlow)"
            className="chart-polyline-sales"
          />

          {/* Interactive node hover targets */}
          {timelineData.map((d, i) => {
            const x = getX(i);
            const isHovered = hoverIndex === i;
            return (
              <g key={i} onMouseEnter={() => setHoverIndex(i)} className="chart-node-group">
                {/* Invisible hover bar */}
                <rect
                  x={x - 12}
                  y={0}
                  width={24}
                  height={height}
                  fill="transparent"
                  cursor="pointer"
                />

                {/* Vertical cursor guide */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingY}
                    x2={x}
                    y2={height - paddingY}
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Stock circle */}
                <circle
                  cx={x}
                  cy={getY(d.stock)}
                  r={isHovered ? 4.5 : 2.5}
                  fill="#00f2fe"
                  stroke="#050b18"
                  strokeWidth="1.5"
                />

                {/* Sales circle */}
                <circle
                  cx={x}
                  cy={getY(d.sales)}
                  r={isHovered ? 4.5 : 2.5}
                  fill="#ef4444"
                  stroke="#050b18"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dynamic Tooltip Bar */}
      <div className="chart-footer">
        <div className="footer-day">{activePoint.day} Velocity:</div>
        <div className="footer-stats">
          <span className="stat-stock">Stock: {activePoint.stock}u</span>
          <span className="stat-sep">•</span>
          <span className="stat-sales">Sales: {activePoint.sales}u</span>
          {activePoint.sales === 0 && (
            <span className="phantom-flag">ALERT: 0 SALES</span>
          )}
        </div>
      </div>

      <style>{`
        .sales-chart-card {
          width: 320px;
          padding: 14px 16px;
        }

        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .text-cyan {
          color: var(--cyan-primary);
        }

        .chart-title {
          font-family: var(--font-sans);
          font-size: 0.76rem;
          font-weight: 700;
          color: #ffffff;
        }

        .legend-pills {
          display: flex;
          gap: 10px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: var(--font-mono);
          font-size: 0.62rem;
          color: var(--text-muted);
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .dot-stock {
          background: #38bdf8;
          box-shadow: 0 0 6px #00f2fe;
        }

        .dot-sales {
          background: #ef4444;
          box-shadow: 0 0 6px #ef4444;
        }

        .chart-svg-container {
          width: 100%;
          height: 105px;
          position: relative;
        }

        .chart-svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .chart-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 8px;
          margin-top: 4px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-family: var(--font-mono);
          font-size: 0.65rem;
        }

        .footer-day {
          color: var(--text-dim);
        }

        .footer-stats {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .stat-stock {
          color: #38bdf8;
        }

        .stat-sep {
          color: var(--text-dim);
        }

        .stat-sales {
          color: #ef4444;
          font-weight: 700;
        }

        .phantom-flag {
          font-size: 0.58rem;
          padding: 2px 6px;
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 4px;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
};
