import React from 'react';
import { Layers, Store, History, CheckCircle2, Calculator } from 'lucide-react';

export const HeroMetrics: React.FC = () => {
  const metrics = [
    {
      icon: <Layers size={18} className="text-cyan-bright" />,
      value: '~800',
      label: 'Retail SKUs',
      sublabel: 'Monitored across shelves',
      highlight: false,
    },
    {
      icon: <Store size={18} className="text-cyan-bright" />,
      value: '25',
      label: 'Stores',
      sublabel: 'Active multi-store telemetry',
      highlight: false,
    },
    {
      icon: <History size={18} className="text-cyan-bright" />,
      value: '18 Months',
      label: 'Historical Sales',
      sublabel: 'Deep velocity baseline model',
      highlight: false,
    },
    {
      icon: <CheckCircle2 size={18} className="text-cyan-bright" />,
      value: 'Top 20',
      label: 'Daily Checks / Store',
      sublabel: 'High-risk prioritized audits',
      highlight: false,
    },
    {
      icon: <Calculator size={18} className="text-amber-accent" />,
      value: '[ Calculation in Progress ]',
      label: 'Revenue Recovery',
      sublabel: 'Awaiting verified store rollout',
      isPlaceholder: true,
    },
  ];

  return (
    <div className="hero-metrics-section">
      <div className="metrics-strip-wrapper glass-panel motion-fade-up">
        <div className="metrics-grid">
          {metrics.map((item, index) => (
            <div
              key={index}
              className={`metric-item motion-fade-up motion-stagger-${index + 1} ${
                item.isPlaceholder ? 'metric-item-placeholder' : ''
              }`}
            >
              <div className="metric-header">
                <span className="metric-icon-wrap">{item.icon}</span>
                <span className="metric-label">{item.label}</span>
              </div>
              <div className="metric-value-row">
                <span className={`metric-big-num ${item.isPlaceholder ? 'placeholder-num' : ''}`}>
                  {item.value}
                </span>
              </div>
              <div className="metric-sublabel">{item.sublabel}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .hero-metrics-section {
          width: 100%;
          max-width: 1360px;
          margin: 0 auto;
          padding: 24px 20px 48px;
          position: relative;
          z-index: 10;
        }

        .metrics-strip-wrapper {
          padding: 24px 28px;
          border-radius: 16px;
          background: rgba(8, 16, 32, 0.78);
          border: 1px solid rgba(56, 189, 248, 0.18);
          box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.6), 0 0 24px rgba(0, 242, 254, 0.05);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        @media (min-width: 768px) {
          .metrics-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 1080px) {
          .metrics-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 24px;
          }
        }

        .metric-item {
          display: flex;
          flex-direction: column;
          padding: 8px 12px;
          border-radius: 10px;
          transition: background 0.2s;
        }

        .metric-item:not(:last-child) {
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }

        @media (max-width: 1079px) {
          .metric-item:not(:last-child) {
            border-right: none;
          }
        }

        .metric-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .metric-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .text-cyan-bright {
          color: var(--cyan-primary);
        }

        .text-amber-accent {
          color: #f59e0b;
        }

        .metric-label {
          font-family: var(--font-sans);
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metric-value-row {
          margin-bottom: 4px;
        }

        .metric-big-num {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
          background: linear-gradient(180deg, #ffffff 40%, #cbd5e1 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .placeholder-num {
          font-family: var(--font-mono);
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          background: none;
          -webkit-background-clip: unset;
          background-clip: unset;
          -webkit-text-fill-color: unset;
          color: #f59e0b;
        }

        .metric-sublabel {
          font-size: 0.72rem;
          color: var(--text-dim);
          line-height: 1.35;
        }

        .metric-item-placeholder {
          background: rgba(245, 158, 11, 0.04);
          border: 1px dashed rgba(245, 158, 11, 0.25);
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
};
