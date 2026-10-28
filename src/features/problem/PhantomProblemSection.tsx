import React, { useState, Suspense, lazy } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Layers,
  TrendingDown,
  Sparkles,
  Search,
  PackageX,
  FileQuestion,
  RotateCcw,
} from 'lucide-react';
import { SectionBackdrop } from '@/components/layout/SectionBackdrop';

const ShelfComparison3D = lazy(() => import('@/components/3d/ShelfComparison3D'));

interface PhantomProblemSectionProps {
  onContinueToNext: () => void;
}

export const PhantomProblemSection: React.FC<PhantomProblemSectionProps> = ({
  onContinueToNext,
}) => {
  const [selectedAnomaly, setSelectedAnomaly] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Root cause hypothesis list
  const rootCauses = [
    {
      icon: <PackageX size={16} className="text-red-accent" />,
      title: 'Misplaced in Backroom or Wrong Aisle',
      desc: 'Stock was checked in and received at loading dock, but physically stashed in aisle 7 instead of assigned planogram bay.',
      impact: '42% of observed cases',
    },
    {
      icon: <Search size={16} className="text-red-accent" />,
      title: 'Barcode Occlusion & Label Damage',
      desc: 'Item barcode is torn or folded inward, causing cashiers or self-checkout kiosks to skip scanning or scan wrong barcode.',
      impact: '26% of observed cases',
    },
    {
      icon: <FileQuestion size={16} className="text-red-accent" />,
      title: 'Unrecorded Shrinkage & Shoplifting',
      desc: 'Merchandise was stolen or discarded without being registered in waste/shrinkage log, leaving positive phantom ledger units.',
      impact: '21% of observed cases',
    },
    {
      icon: <RotateCcw size={16} className="text-red-accent" />,
      title: 'Unprocessed Restock Returns',
      desc: 'Customer returned unit logged into POS system as on-shelf, but lingering in customer service bin awaiting restocking.',
      impact: '11% of observed cases',
    },
  ];

  return (
    <section id="problem" className="problem-section-viewport" aria-label="The Phantom Problem">
      {/* Section Backdrop & Cyan/Red Pathway Motif */}
      <SectionBackdrop
        frameIndex={2}
        mediaSrc="/images/backgrounds/frame-02-phantom-problem.webp"
        accentColor="red"
        topTransition={true}
        bottomTransition={true}
      />

      <div className="section-container">
        {/* Section Header */}
        <div className="section-header-centered motion-fade-up">
          <div className="section-eyebrow">
            <span className="eyebrow-dot" />
            <span>FRAME 02 — THE CORE CONTRADICTION</span>
          </div>
          <h2 className="section-headline">
            The Phantom Stock-Out Dilemma
          </h2>
          <p className="section-subheadline">
            Your inventory management system reports positive stock. Your register sales have dropped to zero. Customers are walking away empty-handed—and standard ERP reports won't flag it.
          </p>
        </div>

        {/* Central Contradiction Interactive Grid */}
        <div className="problem-grid">
          {/* Left Side: 3D Shelf Inspection View */}
          <div className="problem-left-col motion-fade-up motion-stagger-1">
            <Suspense fallback={
              <div className="shelf-3d-wrapper flex items-center justify-center bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="font-mono text-xs text-cyan-400 animate-pulse">INITIALIZING 3D SPATIAL SHELF...</span>
              </div>
            }>
              <ShelfComparison3D
                isAnomalySelected={selectedAnomaly}
                onSelectAnomaly={() => setSelectedAnomaly(true)}
              />
            </Suspense>

            {/* Interactive Discrepancy Selector Bar */}
            <div className={`discrepancy-card glass-panel ${selectedAnomaly ? 'anomaly-active-glow' : ''}`}>
              <div className="disc-header">
                <div className="disc-title-group">
                  <span className="disc-pill">SKU #4587</span>
                  <span className="disc-name">Smart Soundbar (Bay 4-B)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAnomaly(!selectedAnomaly)}
                  className={`btn-toggle-anomaly ${selectedAnomaly ? 'active' : ''}`}
                >
                  <Sparkles size={13} />
                  <span>{selectedAnomaly ? 'Anomaly Bay Active' : 'Highlight Anomaly'}</span>
                </button>
              </div>

              {/* Two Contrasting States Bar */}
              <div className="states-contrast-strip">
                <div className="state-item state-erp">
                  <div className="state-label">
                    <Layers size={13} />
                    <span>Inventory System (ERP)</span>
                  </div>
                  <div className="state-value text-cyan-primary">
                    +6 <span className="unit">units reported</span>
                  </div>
                  <div className="state-status">Database Status: In Stock</div>
                </div>

                <div className="state-vs">VS</div>

                <div className="state-item state-actual">
                  <div className="state-label">
                    <TrendingDown size={13} />
                    <span>Physical Reality & Sales</span>
                  </div>
                  <div className="state-value text-red-accent">
                    0 <span className="unit">units on shelf</span>
                  </div>
                  <div className="state-status text-red-accent">Sales: 0 across 7 days</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Cause & Effect Analysis Panel */}
          <div className="problem-right-col motion-fade-up motion-stagger-2">
            <div className="glass-panel explanation-main-card">
              <div className="card-badge-row">
                <div className="alert-badge">
                  <AlertTriangle size={15} />
                  <span>SILENT REVENUE LEAK</span>
                </div>
                <span className="demo-tag">* Illustrative demo telemetry</span>
              </div>

              <h3 className="card-title">
                Why Standard Inventory Audits Fail to Catch It
              </h3>
              <p className="card-desc">
                Traditional retail systems rely on cycle counts that only audit each SKU once every several months. When an item is misplaced, stolen, or damaged, the database remains blind until a customer complains or a physical audit occurs weeks later.
              </p>

              {/* Collapsible Root Causes Analysis */}
              <div className="causes-accordion">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="accordion-toggle-btn"
                  aria-expanded={showDetails}
                >
                  <span>Root Causes Behind Positive-Stock Zero-Sales Anomaly</span>
                  <ChevronDown
                    size={16}
                    className={`chevron-icon ${showDetails ? 'rotate' : ''}`}
                  />
                </button>

                {showDetails && (
                  <div className="causes-list animate-fade-in">
                    {rootCauses.map((cause, idx) => (
                      <div key={idx} className="cause-item">
                        <div className="cause-icon-box">{cause.icon}</div>
                        <div className="cause-content">
                          <div className="cause-title-row">
                            <span className="cause-title">{cause.title}</span>
                            <span className="cause-impact">{cause.impact}</span>
                          </div>
                          <p className="cause-desc">{cause.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="card-actions-row">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="btn-secondary"
                >
                  <span>{showDetails ? 'Collapse Breakdown' : 'Examine Root Causes'}</span>
                </button>

                <button
                  type="button"
                  onClick={onContinueToNext}
                  className="btn-primary"
                >
                  <span>How StockSentinel Solves It</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .problem-section-viewport {
          position: relative;
          width: 100%;
          padding: 100px 0 80px;
          background: transparent;
          overflow: hidden;
          z-index: 10;
        }

        .section-container {
          position: relative;
          z-index: 10;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .section-header-centered {
          text-align: center;
          max-width: 780px;
          margin: 0 auto 56px;
        }

        .section-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 14px;
          border-radius: 20px;
          background: rgba(14, 116, 144, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--cyan-primary);
          margin-bottom: 16px;
        }

        .eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--cyan-primary);
          box-shadow: 0 0 8px var(--cyan-primary);
        }

        .section-headline {
          font-family: var(--font-display);
          font-size: 2.4rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #ffffff;
          margin-bottom: 16px;
          line-height: 1.2;
        }

        @media (min-width: 768px) {
          .section-headline {
            font-size: 3rem;
          }
        }

        .section-subheadline {
          font-size: 1.05rem;
          line-height: 1.6;
          color: #94a3b8;
        }

        .problem-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 36px;
          align-items: start;
        }

        @media (min-width: 1080px) {
          .problem-grid {
            grid-template-columns: 1.15fr 1fr;
            gap: 44px;
          }
        }

        .problem-left-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .discrepancy-card {
          padding: 18px 22px;
          border-radius: 14px;
          background: rgba(10, 20, 38, 0.82);
          border: 1px solid rgba(56, 189, 248, 0.2);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .discrepancy-card.anomaly-active-glow {
          border-color: rgba(239, 68, 68, 0.55);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(239, 68, 68, 0.22);
        }

        .disc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .disc-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .disc-pill {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(56, 189, 248, 0.15);
          color: var(--cyan-bright);
          border: 1px solid rgba(56, 189, 248, 0.3);
        }

        .disc-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #e2e8f0;
        }

        .btn-toggle-anomaly {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 8px;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 700;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-toggle-anomaly.active {
          background: rgba(239, 68, 68, 0.28);
          border-color: #ef4444;
          color: #ffffff;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.35);
        }

        .states-contrast-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px;
          background: rgba(8, 14, 28, 0.7);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .state-item {
          flex: 1;
        }

        .state-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          color: var(--text-dim);
          margin-bottom: 4px;
          font-family: var(--font-mono);
        }

        .state-value {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 800;
          line-height: 1.1;
        }

        .text-cyan-primary {
          color: var(--cyan-primary);
        }

        .text-red-accent {
          color: #ef4444;
        }

        .state-value .unit {
          font-size: 0.75rem;
          font-weight: 500;
          font-family: var(--font-sans);
          color: var(--text-muted);
        }

        .state-status {
          font-size: 0.68rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .state-vs {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--text-dim);
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.04);
        }

        .problem-right-col {
          display: flex;
          flex-direction: column;
        }

        .explanation-main-card {
          padding: 32px;
          border-radius: 18px;
          background: rgba(10, 20, 38, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.22);
        }

        .card-badge-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .alert-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
          font-family: var(--font-mono);
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .demo-tag {
          font-family: var(--font-mono);
          font-size: 0.62rem;
          color: var(--text-dim);
        }

        .card-title {
          font-family: var(--font-display);
          font-size: 1.45rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.3;
          margin-bottom: 14px;
        }

        .card-desc {
          font-size: 0.92rem;
          line-height: 1.6;
          color: #cbd5e1;
          margin-bottom: 24px;
        }

        .causes-accordion {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 16px 0;
          margin-bottom: 28px;
        }

        .accordion-toggle-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: transparent;
          border: none;
          color: var(--cyan-bright);
          font-family: var(--font-mono);
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          padding: 6px 0;
          transition: color 0.2s;
        }

        .accordion-toggle-btn:hover {
          color: #ffffff;
        }

        .chevron-icon {
          transition: transform 0.25s ease;
        }

        .chevron-icon.rotate {
          transform: rotate(180deg);
        }

        .causes-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 14px;
        }

        .cause-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .cause-icon-box {
          margin-top: 2px;
          flex-shrink: 0;
        }

        .cause-content {
          flex: 1;
        }

        .cause-title-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .cause-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: #f1f5f9;
        }

        .cause-impact {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: #fca5a5;
          font-weight: 600;
        }

        .cause-desc {
          font-size: 0.74rem;
          color: var(--text-dim);
          line-height: 1.45;
        }

        .card-actions-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 14px;
        }

        @keyframes fadeInFast {
          0% { opacity: 0; transform: translateY(-6px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeInFast 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </section>
  );
};
