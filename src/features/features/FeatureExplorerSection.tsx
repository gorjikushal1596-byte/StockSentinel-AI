import React, { useState } from 'react';
import {
  EyeOff,
  SlidersHorizontal,
  CalendarCheck2,
  CheckSquare,
  HelpCircle,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { SectionBackdrop } from '@/components/layout/SectionBackdrop';

interface FeatureItem {
  id: string;
  badge: string;
  title: string;
  shortDesc: string;
  icon: React.ReactNode;
  previewMetric: string;
  previewSubtext: string;
  fullTitle: string;
  deepDive: string[];
  techSpec: {
    label: string;
    value: string;
  }[];
  interactiveType: 'divergence' | 'poisson' | 'promo' | 'queue' | 'nlp' | 'precision';
}

export const FeatureExplorerSection: React.FC<{ onLaunchScanner: () => void }> = ({
  onLaunchScanner,
}) => {
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  const features: FeatureItem[] = [
    {
      id: 'phantom-detection',
      badge: 'CORE DETECTOR',
      title: 'Phantom Stock-Out Isolation',
      shortDesc: 'Instantly identifies items where ERP balances remain positive while POS register transactions drop to zero.',
      icon: <EyeOff size={22} className="text-cyan-primary" />,
      previewMetric: '0 Sales in 7 Days',
      previewSubtext: 'Against +6 on-hand units',
      fullTitle: 'Autonomous Velocity Collapse Isolation',
      deepDive: [
        'Monitors continuous transaction throughput at SKU-store-day granularity.',
        'Isolates sudden, uncharacteristic drops to absolute zero sales on historically consistent movers.',
        'Differentiates genuine customer out-of-stock from general footfall dips across the department.',
        'Flags suspicious bays before customer service inquiries or negative brand reviews escalate.',
      ],
      techSpec: [
        { label: 'Input Signals', value: 'Daily POS register receipts, ERP ledger' },
        { label: 'Sensitivity Window', value: '3 to 14 days dynamic threshold' },
        { label: 'Detection Speed', value: 'Sub-second per store batch' },
      ],
      interactiveType: 'divergence',
    },
    {
      id: 'false-positive-reduction',
      badge: 'BAYESIAN FILTERING',
      title: 'Slow-Moving SKU Protection',
      shortDesc: 'Eliminates false alarms on naturally slow-selling high-value inventory using Poisson arrival baselines.',
      icon: <SlidersHorizontal size={22} className="text-cyan-primary" />,
      previewMetric: 'α = 0.01 Threshold',
      previewSubtext: 'Filters normal 10-day dry spells',
      fullTitle: 'Poisson Inter-Arrival Demand Modeling',
      deepDive: [
        'High-value electronics or luxury cosmetics often sell 1 unit every 8-12 days under normal conditions.',
        'Standard naive zero-sales detectors flood store managers with false alarms on these items.',
        'StockSentinel models probability distributions of inter-arrival transaction intervals based on 18 months of history.',
        'Only flags slow-movers when the zero-sales period exceeds the 99th percentile of expected dormancy.',
      ],
      techSpec: [
        { label: 'Algorithm', value: 'Non-homogeneous Poisson Process (NHPP)' },
        { label: 'Noise Reduction', value: '78% fewer false alerts on low-velocity SKUs' },
        { label: 'Data Baseline', value: '18 months store-specific seasonality' },
      ],
      interactiveType: 'poisson',
    },
    {
      id: 'promo-aware',
      badge: 'CONTEXT ENGINE',
      title: 'Promotion-Aware Calibration',
      shortDesc: 'Calibrates expected velocity during circular ads, endcap promotions, and temporary price reductions.',
      icon: <CalendarCheck2 size={22} className="text-cyan-primary" />,
      previewMetric: '+320% Ad Velocity',
      previewSubtext: 'Adaptive threshold during promos',
      fullTitle: 'Promotional Calendar & Lift Normalization',
      deepDive: [
        'During circular promotions or Black Friday events, velocity spikes 3x-5x, requiring much faster stock-out detection.',
        'A promoted SKU going zero sales for even 18 hours represents an urgent, high-cost phantom stockout.',
        'StockSentinel dynamically compresses the zero-sales window during promotional campaign dates.',
        'Post-promotion, the baseline automatically recalibrates to normal velocity without manual reconfiguration.',
      ],
      techSpec: [
        { label: 'Event Ingestion', value: 'Promotion start/end dates, discount %' },
        { label: 'Trigger Acceleration', value: 'Flags anomalies within 24h of lift collapse' },
        { label: 'Channel Support', value: 'Circular ads, endcap displays, clearance tags' },
      ],
      interactiveType: 'promo',
    },
    {
      id: 'top-20-prioritization',
      badge: 'OPERATIONS',
      title: 'Top-20 Daily Prioritization',
      shortDesc: 'Caps daily floor inspections at exactly 20 high-value audits per store, preventing staff alert fatigue.',
      icon: <CheckSquare size={22} className="text-cyan-primary" />,
      previewMetric: 'Max 20 Checks/Day',
      previewSubtext: 'Grouped by aisle walking path',
      fullTitle: 'Constrained Operational Capacity Dispatch',
      deepDive: [
        'Store floor associates have limited time for audit duties; handing them 200 alerts results in complete non-compliance.',
        'StockSentinel enforces a hard operational constraint of the 20 most impactful anomalies per store each morning.',
        'Ranked strictly by Expected Dollars at Risk: (Unit Price × Normal Daily Run Rate × Days Dormant).',
        'Sequences check items along optimal store aisle routing to minimize associate walking travel distance.',
      ],
      techSpec: [
        { label: 'Capacity Limit', value: '20 high-confidence tasks / store / day' },
        { label: 'Associate Time', value: 'Average 18 minutes total daily audit time' },
        { label: 'Device Integration', value: 'Mobile browser, Zebra TC5x, iOS/Android' },
      ],
      interactiveType: 'queue',
    },
    {
      id: 'plain-english-nlp',
      badge: 'INTERPRETABILITY',
      title: 'Plain-English Rationale',
      shortDesc: 'Translates statistical anomalies into clear, actionable physical store instructions that associates understand.',
      icon: <HelpCircle size={22} className="text-cyan-primary" />,
      previewMetric: 'Plain Rationale',
      previewSubtext: 'No cryptic statistical scores',
      fullTitle: 'Human-Centered Associate Action Briefs',
      deepDive: [
        'Store teams reject opaque black-box machine learning scores.',
        'Every alert displays a plain-language summary: "Normally sells 5 units/week. System shows 6 units, but 0 sales in 8 days. Check Aisle 4-B top shelf or backroom bin #12."',
        'Includes product thumbnail, UPC barcode, planogram coordinates, and specific root cause checklists.',
        'Enables any team member to conduct an effective audit without specialized analytics training.',
      ],
      techSpec: [
        { label: 'Format', value: 'Natural Language Action Card' },
        { label: 'Location Metadata', value: 'Aisle, Section, Shelf Level, Facing Count' },
        { label: 'Feedback Entry', value: '1-tap outcome logging' },
      ],
      interactiveType: 'nlp',
    },
    {
      id: 'performance-eval',
      badge: 'ACCOUNTABILITY',
      title: 'Precision & Recovery Evaluation',
      shortDesc: 'Measures verified audit precision and quantifies recovered sales with zero hallucinated figures.',
      icon: <BarChart3 size={22} className="text-cyan-primary" />,
      previewMetric: 'Precision@20 Tracking',
      previewSubtext: 'Closed-loop audit outcome metrics',
      fullTitle: 'Empirical Performance & Audit Ground Truth',
      deepDive: [
        'Tracks whether associate investigations found the item misplaced, restocked it, or confirmed shrinkage.',
        'Calculates real Precision@20: (Confirmed Restocks + Confirmed Misplaced Items) / Total Checked.',
        'Measures sales velocity resumption within 48 hours of associate intervention.',
        'Exposes transparent mathematical formulas behind revenue recovery metrics with zero speculative claims.',
      ],
      techSpec: [
        { label: 'Evaluation Metric', value: 'Precision@20, Velocity Resumption Ratio' },
        { label: 'Audit Compliance', value: 'Daily completion % by store location' },
        { label: 'Reporting Cadence', value: 'Real-time dashboard + weekly executive rollups' },
      ],
      interactiveType: 'precision',
    },
  ];

  const selectedFeature = features.find((f) => f.id === selectedFeatureId);

  return (
    <section id="features" className="features-section-viewport" aria-label="Feature Explorer">
      {/* Section Backdrop & Cyan Pathway Motif */}
      <SectionBackdrop
        frameIndex={4}
        mediaSrc="/images/backgrounds/frame-04-feature-explorer.webp"
        accentColor="cyan"
        topTransition={true}
        bottomTransition={true}
      />

      <div className="section-container">
        {/* Section Header */}
        <div className="section-header-centered motion-fade-up">
          <div className="section-eyebrow">
            <span className="eyebrow-dot" />
            <span>FRAME 04 — CAPABILITIES & INTELLIGENCE ARCHITECTURE</span>
          </div>
          <h2 className="section-headline">
            Engineered for Retail Operations
          </h2>
          <p className="section-subheadline">
            Explore the six specialized capabilities powering StockSentinel AI—from Bayesian false-positive filtering to aisle-optimized associate dispatching.
          </p>
        </div>

        {/* Feature Grid vs Dedicated Detail View */}
        {!selectedFeature ? (
          <div className="features-grid feature-grid-enter">
            {features.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => setSelectedFeatureId(item.id)}
                className={`feature-card glass-panel motion-fade-up motion-stagger-${(idx % 6) + 1}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedFeatureId(item.id);
                }}
              >
                <div className="card-top">
                  <div className="icon-wrapper">{item.icon}</div>
                  <span className="feature-badge">{item.badge}</span>
                </div>

                <h3 className="feature-title">{item.title}</h3>
                <p className="feature-desc">{item.shortDesc}</p>

                {/* Micro Metric Preview */}
                <div className="preview-metric-box">
                  <div className="preview-val text-cyan-primary">{item.previewMetric}</div>
                  <div className="preview-sub">{item.previewSubtext}</div>
                </div>

                <div className="card-footer-action">
                  <span>Explore Architecture</span>
                  <ArrowRight size={14} className="action-arrow" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Dedicated Expanded Feature View */
          <div className="feature-detail-view glass-panel feature-detail-enter">
            <div className="detail-header-nav">
              <button
                type="button"
                onClick={() => setSelectedFeatureId(null)}
                className="btn-back-features"
              >
                <ArrowLeft size={16} />
                <span>Back to All Capabilities</span>
              </button>

              <span className="selected-badge">{selectedFeature.badge}</span>
            </div>

            <div className="detail-main-layout">
              <div className="detail-left-pane">
                <div className="icon-badge-lg">{selectedFeature.icon}</div>
                <h3 className="detail-feature-title">{selectedFeature.fullTitle}</h3>
                <p className="detail-short-summary">{selectedFeature.shortDesc}</p>

                <div className="deep-dive-points">
                  <div className="pane-subtitle">
                    <Sparkles size={14} className="text-cyan-primary" />
                    <span>Algorithmic Deep-Dive</span>
                  </div>
                  <div className="points-list">
                    {selectedFeature.deepDive.map((pt, pIdx) => (
                      <div key={pIdx} className="point-item">
                        <span className="point-marker">/</span>
                        <span className="point-copy">{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="detail-actions">
                  <button
                    type="button"
                    onClick={onLaunchScanner}
                    className="btn-primary"
                  >
                    <span>Test in Live Scanner</span>
                    <Zap size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFeatureId(null)}
                    className="btn-secondary"
                  >
                    Close Architecture View
                  </button>
                </div>
              </div>

              {/* Technical Specifications & Visual Telemetry Pane */}
              <div className="detail-right-pane">
                <div className="specs-card glass-panel">
                  <div className="specs-title">Engine Specifications</div>
                  <div className="specs-grid">
                    {selectedFeature.techSpec.map((spec, sIdx) => (
                      <div key={sIdx} className="spec-item">
                        <div className="spec-label">{spec.label}</div>
                        <div className="spec-value">{spec.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contextual Visual Simulator Box */}
                <div className="visual-simulator-box glass-panel">
                  <div className="sim-header">
                    <TrendingUp size={14} className="text-cyan-primary" />
                    <span>Real-Time Telemetry Simulation</span>
                  </div>
                  
                  <div className="sim-content">
                    {selectedFeature.interactiveType === 'divergence' && (
                      <div className="sim-graphic">
                        <div className="sim-stat-row">
                          <span>Recorded Ledger Units:</span>
                          <span className="text-cyan-primary font-mono font-bold">+6 Units</span>
                        </div>
                        <div className="sim-stat-row">
                          <span>POS Register Throughput:</span>
                          <span className="text-red-accent font-mono font-bold">0 Units / 7 Days</span>
                        </div>
                        <div className="sim-bar-divergence">
                          <div className="bar-stock" style={{ width: '85%' }}>Stock Steady at 6</div>
                          <div className="bar-sales" style={{ width: '5%' }}>0 Sales</div>
                        </div>
                      </div>
                    )}

                    {selectedFeature.interactiveType === 'poisson' && (
                      <div className="sim-graphic">
                        <div className="sim-stat-row">
                          <span>Normal Velocity Interval:</span>
                          <span className="text-cyan-primary font-mono">1 unit every 8.4 days</span>
                        </div>
                        <div className="sim-stat-row">
                          <span>Observed Dormancy:</span>
                          <span className="text-amber-accent font-mono">7 days (Within 95% CI)</span>
                        </div>
                        <div className="sim-badge-ok">STATUS: NO FALSE ALARM (SUPPRESSED)</div>
                      </div>
                    )}

                    {selectedFeature.interactiveType === 'promo' && (
                      <div className="sim-graphic">
                        <div className="sim-stat-row">
                          <span>Circular Ad Active:</span>
                          <span className="text-cyan-primary font-mono">Endcap Feature (-20% Off)</span>
                        </div>
                        <div className="sim-stat-row">
                          <span>Dynamic Window:</span>
                          <span className="text-amber-accent font-mono">Accelerated: 18h zero-sales limit</span>
                        </div>
                        <div className="sim-badge-alert">PRIORITY ESCALATED (HIGH PROMO LOSS)</div>
                      </div>
                    )}

                    {selectedFeature.interactiveType === 'queue' && (
                      <div className="sim-graphic">
                        <div className="sim-stat-row">
                          <span>Store Capacity Cap:</span>
                          <span className="text-cyan-primary font-mono font-bold">Top 20 Checks / Day</span>
                        </div>
                        <div className="sim-stat-row">
                          <span>Aisle Routing Sequence:</span>
                          <span className="text-cyan-bright font-mono">Aisle 2 → Aisle 4 → Aisle 7</span>
                        </div>
                        <div className="sim-badge-ok">AVERAGE WALK TIME: 16 MIN / ASSOCIATE</div>
                      </div>
                    )}

                    {selectedFeature.interactiveType === 'nlp' && (
                      <div className="sim-graphic">
                        <div className="sim-quote-box">
                          "SKU #4587 (Soundbar) shows +6 in ERP but has zero register transactions across 7 days. Planogram Bay 4-B. Expected run rate: 4.2 units/week."
                        </div>
                      </div>
                    )}

                    {selectedFeature.interactiveType === 'precision' && (
                      <div className="sim-graphic">
                        <div className="sim-stat-row">
                          <span>Simulated Model Target:</span>
                          <span className="text-cyan-primary font-mono font-bold">78.4% Target Precision</span>
                        </div>
                        <div className="sim-stat-row">
                          <span>Intervention Resolution:</span>
                          <span className="text-cyan-bright font-mono">Restocked / Relabeled within 2h</span>
                        </div>
                        <div className="sim-badge-ok">TARGET METRIC (LIVE EVALUATION AVAILABLE IN FRAME 06)</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .features-section-viewport {
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

        .features-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        @media (min-width: 768px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1120px) {
          .features-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 28px;
          }
        }

        .feature-card {
          padding: 28px 24px;
          border-radius: 16px;
          background: rgba(10, 20, 38, 0.75);
          border: 1px solid rgba(56, 189, 248, 0.16);
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .feature-card:hover {
          border-color: rgba(0, 242, 254, 0.45);
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 242, 254, 0.12);
        }

        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(0, 242, 254, 0.1);
          border: 1px solid rgba(0, 242, 254, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feature-badge {
          font-family: var(--font-mono);
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--cyan-bright);
          background: rgba(14, 116, 144, 0.2);
          border: 1px solid rgba(56, 189, 248, 0.28);
          padding: 3px 8px;
          border-radius: 6px;
        }

        .feature-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 10px;
          line-height: 1.3;
        }

        .feature-desc {
          font-size: 0.85rem;
          color: #94a3b8;
          line-height: 1.55;
          margin-bottom: 20px;
          flex: 1;
        }

        .preview-metric-box {
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 18px;
        }

        .preview-val {
          font-family: var(--font-mono);
          font-size: 0.95rem;
          font-weight: 700;
        }

        .preview-sub {
          font-size: 0.68rem;
          color: var(--text-dim);
          margin-top: 2px;
        }

        .card-footer-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: var(--font-sans);
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--cyan-bright);
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .action-arrow {
          transition: transform 0.2s;
        }

        .feature-card:hover .action-arrow {
          transform: translateX(4px);
        }

        /* Detail View */
        .feature-detail-view {
          padding: 36px;
          border-radius: 20px;
          background: rgba(10, 20, 38, 0.92);
          border: 1px solid rgba(56, 189, 248, 0.25);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8);
        }

        .detail-header-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .btn-back-features {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          color: var(--cyan-primary);
          font-family: var(--font-mono);
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .btn-back-features:hover {
          transform: translateX(-4px);
          color: #ffffff;
        }

        .selected-badge {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--cyan-bright);
          background: rgba(14, 116, 144, 0.25);
          border: 1px solid rgba(56, 189, 248, 0.35);
          padding: 4px 12px;
          border-radius: 8px;
        }

        .detail-main-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 36px;
        }

        @media (min-width: 1024px) {
          .detail-main-layout {
            grid-template-columns: 1.2fr 1fr;
            gap: 48px;
          }
        }

        .icon-badge-lg {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: rgba(0, 242, 254, 0.12);
          border: 1px solid rgba(0, 242, 254, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .detail-feature-title {
          font-family: var(--font-display);
          font-size: 1.85rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.25;
          margin-bottom: 12px;
        }

        .detail-short-summary {
          font-size: 1rem;
          color: #cbd5e1;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .deep-dive-points {
          margin-bottom: 30px;
        }

        .pane-subtitle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: 14px;
        }

        .points-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .point-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.85rem;
          color: #cbd5e1;
          line-height: 1.5;
        }

        .point-marker {
          color: var(--cyan-primary);
          font-family: var(--font-mono);
          font-weight: 700;
        }

        .detail-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 14px;
        }

        /* Right Pane Specs & Sim */
        .detail-right-pane {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .specs-card {
          padding: 22px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .specs-title {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 16px;
        }

        .specs-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .spec-item {
          display: flex;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 0.78rem;
        }

        .spec-label {
          color: var(--text-dim);
        }

        .spec-value {
          font-family: var(--font-mono);
          font-weight: 600;
          color: var(--cyan-bright);
        }

        .visual-simulator-box {
          padding: 22px;
          border-radius: 14px;
          background: rgba(8, 14, 28, 0.8);
          border: 1px solid rgba(56, 189, 248, 0.2);
        }

        .sim-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 16px;
        }

        .sim-stat-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          margin-bottom: 8px;
          color: #cbd5e1;
        }

        .sim-bar-divergence {
          margin-top: 14px;
          height: 32px;
          background: rgba(15, 23, 42, 0.9);
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 4px;
        }

        .bar-stock {
          height: 12px;
          background: #38bdf8;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 0.62rem;
          color: #030712;
          font-weight: 800;
          display: flex;
          align-items: center;
          padding-left: 6px;
        }

        .bar-sales {
          height: 10px;
          background: #ef4444;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 0.6rem;
          color: #ffffff;
          font-weight: 800;
          display: flex;
          align-items: center;
          padding-left: 4px;
        }

        .sim-badge-ok {
          margin-top: 14px;
          padding: 8px 12px;
          border-radius: 6px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.35);
          font-family: var(--font-mono);
          font-size: 0.68rem;
          font-weight: 800;
          color: #6ee7b7;
          text-align: center;
        }

        .sim-badge-alert {
          margin-top: 14px;
          padding: 8px 12px;
          border-radius: 6px;
          background: rgba(239, 68, 68, 0.18);
          border: 1px solid rgba(239, 68, 68, 0.4);
          font-family: var(--font-mono);
          font-size: 0.68rem;
          font-weight: 800;
          color: #fca5a5;
          text-align: center;
        }

        .sim-quote-box {
          font-style: italic;
          font-size: 0.85rem;
          line-height: 1.5;
          color: #e2e8f0;
          padding: 12px 14px;
          border-left: 3px solid var(--cyan-primary);
          background: rgba(15, 23, 42, 0.6);
          border-radius: 0 8px 8px 0;
        }

        .text-cyan-bright {
          color: var(--cyan-bright);
        }

        .text-amber-accent {
          color: #f59e0b;
        }
      `}</style>
    </section>
  );
};
