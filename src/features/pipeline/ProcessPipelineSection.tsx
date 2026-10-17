import React, { useState } from 'react';
import {
  Database,
  Search,
  Filter,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
} from 'lucide-react';
import { SectionBackdrop } from '@/components/layout/SectionBackdrop';

interface ProcessPipelineSectionProps {
  onContinueToFeatures: () => void;
}

export const ProcessPipelineSection: React.FC<ProcessPipelineSectionProps> = ({
  onContinueToFeatures,
}) => {
  const [activeStage, setActiveStage] = useState(0);

  const stages = [
    {
      id: 1,
      number: '01',
      title: 'Data Ingestion',
      subtitle: 'POS & ERP Stream Ingestion',
      icon: <Database size={20} />,
      summary: 'Ingests daily sales, recorded inventory, promotion calendars, and store metadata.',
      details: [
        'Connects via secure REST API or direct SQL batch ingestion to existing ERP ledgers (SAP, Oracle, NetSuite).',
        'Collects register-level POS transaction records across all 25 active retail store nodes.',
        'Zero hardware footprint: No in-aisle cameras, overhead sensors, or RFID tags required.',
        'Normalizes promotion schedules and seasonal price changes to avoid false demand distortions.',
      ],
      telemetryTag: 'INPUT: ~800 SKUs × 25 Stores',
      latency: '< 120ms Ingestion Batch',
    },
    {
      id: 2,
      number: '02',
      title: 'Anomaly Detection',
      subtitle: 'Zero-Sales Bayesian Engine',
      icon: <Search size={20} />,
      summary: 'Detects suspicious SKU-store-day velocity collapse patterns.',
      details: [
        'Calculates Poisson expected daily velocity based on 18 months of historical store sales patterns.',
        'Evaluates probability of N consecutive zero-sales days given positive recorded inventory.',
        'Filters out naturally slow-moving items with long inter-arrival transaction times.',
        'Triggers anomaly flag when p(zero sales | on_hand > 0) drops below statistical threshold α = 0.01.',
      ],
      telemetryTag: 'ALGORITHM: Poisson-Bayes Velocity Collapse',
      latency: 'Continuous Sub-Daily Scoring',
    },
    {
      id: 3,
      number: '03',
      title: 'Priority Ranking',
      subtitle: 'Revenue & Shelf-Risk Matrix',
      icon: <Filter size={20} />,
      summary: 'Ranks anomalies by operational priority and estimated sales exposure.',
      details: [
        'Weights anomalies by retail price ($) × expected daily velocity to isolate highest-cost leaks.',
        'Calculates planogram shelf density factor and cross-store correlation to identify batch delivery errors.',
        'Filters out false positives caused by supplier stockouts or region-wide logistics delays.',
        'Assigns severity classification: Critical Hazard, High Risk, or Routine Verification.',
      ],
      telemetryTag: 'METRIC: Expected Dollar Velocity at Risk',
      latency: 'Instantaneous Sorting',
    },
    {
      id: 4,
      number: '04',
      title: 'Daily Queue Generation',
      subtitle: 'Top-20 Targeted Dispatch',
      icon: <ClipboardList size={20} />,
      summary: 'Generates the daily top-20 verification queue per store.',
      details: [
        'Strictly caps inspection tasks at 20 actionable checks per store per day to avoid staff alert fatigue.',
        'Groups check tasks by physical store aisle/bay order to minimize floor associate walking travel time.',
        'Delivers clean, actionable guidance directly to mobile handhelds (Zebra, iOS, Android).',
        'Includes explicit plain-English rationale for store team (e.g. "Expected 4.2 units/week, 0 in 7 days").',
      ],
      telemetryTag: 'CONSTRAINT: Up to 20 Findings / Store-Day',
      latency: 'Automated 06:00 AM Roster',
    },
    {
      id: 5,
      number: '05',
      title: 'Verification & Closed-Loop',
      subtitle: 'Ground-Truth Outcome Feedback',
      icon: <CheckCircle2 size={20} />,
      summary: 'Records verification outcomes and continually evaluates performance.',
      details: [
        'Store associate logs outcome with one tap: Restocked from backroom, Misplaced in wrong bay, or Shrinkage confirmed.',
        'Automatically synchronizes inventory ledger to correct phantom balance if shrinkage is confirmed.',
        'Feeds ground-truth audit outcomes back into detection weights to continuously improve precision.',
        'Generates automated Precision@20 and revenue recovery tracking for regional operations leaders.',
      ],
      telemetryTag: 'FEEDBACK: Continuous Model Weight Updates',
      latency: 'Instant ERP Ledger Adjustment',
    },
  ];

  const currentStage = stages[activeStage];

  const handleNext = () => {
    setActiveStage((prev) => (prev < stages.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setActiveStage((prev) => (prev > 0 ? prev - 1 : stages.length - 1));
  };

  return (
    <section id="architecture" className="pipeline-section-viewport" aria-label="How StockSentinel Works">
      {/* Section Backdrop & Cyan Pathway Motif */}
      <SectionBackdrop
        frameIndex={3}
        mediaSrc="/images/backgrounds/frame-03-how-it-works.webp"
        accentColor="cyan"
        topTransition={true}
        bottomTransition={true}
      />

      <div className="section-container">
        {/* Section Header */}
        <div className="section-header-centered motion-fade-up">
          <div className="section-eyebrow">
            <span className="eyebrow-dot" />
            <span>FRAME 03 — FIVE-STAGE INTELLIGENCE PIPELINE</span>
          </div>
          <h2 className="section-headline">
            How StockSentinel AI Operates
          </h2>
          <p className="section-subheadline">
            A non-invasive, data-driven intelligence pipeline converting raw POS registers and ERP balances into prioritized physical store actions—with zero in-store hardware.
          </p>
        </div>

        {/* 5-Stage Interactive Pipeline Stepper */}
        <div className="pipeline-stepper-track glass-panel motion-fade-up motion-stagger-1">
          <div className="stepper-nodes-row">
            {stages.map((stg, idx) => {
              const isSelected = activeStage === idx;
              const isCompleted = activeStage > idx;

              return (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => setActiveStage(idx)}
                  className={`pipeline-node-btn ${isSelected ? 'selected' : ''} ${
                    isCompleted ? 'completed' : ''
                  }`}
                  aria-label={`Stage ${stg.number}: ${stg.title}`}
                >
                  <div className="node-icon-circle">
                    {stg.icon}
                    <span className="node-badge-num">{stg.number}</span>
                  </div>
                  <div className="node-title-group">
                    <span className="node-step-label">STAGE {stg.number}</span>
                    <span className="node-step-title">{stg.title}</span>
                  </div>
                  {idx < stages.length - 1 && (
                    <div className={`node-connector-line ${isCompleted ? 'active' : ''}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Stage Detailed Breakdown Panel */}
        <div className="stage-detail-card glass-panel motion-fade-up motion-stagger-2">
          <div className="detail-top-row">
            <div className="stage-meta-left">
              <span className="stage-badge-pill">
                STAGE {currentStage.number} OF 05
              </span>
              <h3 className="stage-headline">{currentStage.title}</h3>
              <p className="stage-subheading">{currentStage.subtitle}</p>
            </div>

            <div className="stage-telemetry-right">
              <div className="telemetry-pill">
                <Cpu size={13} className="text-cyan-primary" />
                <span>{currentStage.telemetryTag}</span>
              </div>
              <div className="latency-pill">
                <span className="dot-live" />
                <span>{currentStage.latency}</span>
              </div>
            </div>
          </div>

          <div className="detail-body-grid">
            <div className="detail-summary-column">
              <p className="stage-summary-text">{currentStage.summary}</p>
              
              <div className="hardware-guarantee-box">
                <ShieldCheck size={18} className="text-cyan-primary" />
                <div>
                  <div className="box-title">Pure Software Architecture</div>
                  <div className="box-desc">
                    Requires no RFID tags, smart shelves, or computer vision cameras. Integrates via standard CSV, JSON, or SQL connectors.
                  </div>
                </div>
              </div>

              {/* Stepper Controls */}
              <div className="stepper-nav-controls">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="btn-secondary stepper-btn"
                  aria-label="Previous Pipeline Stage"
                >
                  <ChevronLeft size={16} />
                  <span>Previous Stage</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-secondary stepper-btn"
                  aria-label="Next Pipeline Stage"
                >
                  <span>Next Stage</span>
                  <ChevronRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={onContinueToFeatures}
                  className="btn-primary continue-btn"
                >
                  <span>Explore Core Features</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="detail-bullets-column">
              <div className="bullets-title">
                <Layers size={14} className="text-cyan-primary" />
                <span>Operational Specifications</span>
              </div>
              <div className="bullets-list">
                {currentStage.details.map((bullet, bIdx) => (
                  <div key={bIdx} className="bullet-item">
                    <span className="bullet-dot" />
                    <span className="bullet-text">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .pipeline-section-viewport {
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
          margin: 0 auto 50px;
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

        /* Stepper Track */
        .pipeline-stepper-track {
          padding: 18px 24px;
          border-radius: 16px;
          background: rgba(10, 20, 38, 0.75);
          border: 1px solid rgba(56, 189, 248, 0.18);
          margin-bottom: 28px;
          overflow-x: auto;
        }

        .stepper-nodes-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-width: 720px;
          position: relative;
        }

        .pipeline-node-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 10px;
          transition: all 0.25s;
          text-align: left;
        }

        .pipeline-node-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .pipeline-node-btn.selected {
          background: rgba(0, 242, 254, 0.1);
          box-shadow: 0 0 16px rgba(0, 242, 254, 0.15);
        }

        .node-icon-circle {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.25s;
          flex-shrink: 0;
        }

        .pipeline-node-btn.selected .node-icon-circle {
          background: linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(37, 99, 235, 0.3));
          border-color: var(--cyan-primary);
          color: var(--cyan-primary);
          box-shadow: 0 0 18px rgba(0, 242, 254, 0.35);
        }

        .pipeline-node-btn.completed .node-icon-circle {
          color: #38bdf8;
          border-color: rgba(56, 189, 248, 0.5);
        }

        .node-badge-num {
          position: absolute;
          top: -6px;
          right: -6px;
          font-family: var(--font-mono);
          font-size: 0.6rem;
          font-weight: 800;
          color: #030712;
          background: var(--cyan-bright);
          border-radius: 6px;
          padding: 1px 4px;
        }

        .node-title-group {
          display: flex;
          flex-direction: column;
        }

        .node-step-label {
          font-family: var(--font-mono);
          font-size: 0.62rem;
          font-weight: 700;
          color: var(--text-dim);
          letter-spacing: 0.08em;
        }

        .node-step-title {
          font-family: var(--font-display);
          font-size: 0.95rem;
          font-weight: 700;
          color: #cbd5e1;
        }

        .pipeline-node-btn.selected .node-step-title {
          color: #ffffff;
        }

        .node-connector-line {
          position: absolute;
          right: -24px;
          width: 24px;
          height: 2px;
          background: rgba(255, 255, 255, 0.1);
        }

        .node-connector-line.active {
          background: var(--cyan-primary);
          box-shadow: 0 0 8px var(--cyan-primary);
        }

        /* Detail Card */
        .stage-detail-card {
          padding: 36px;
          border-radius: 20px;
          background: rgba(10, 20, 38, 0.88);
          border: 1px solid rgba(56, 189, 248, 0.22);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
        }

        .detail-top-row {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 28px;
        }

        .stage-badge-pill {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--cyan-primary);
          margin-bottom: 6px;
        }

        .stage-headline {
          font-family: var(--font-display);
          font-size: 1.85rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
          margin-bottom: 4px;
        }

        .stage-subheading {
          font-size: 0.92rem;
          color: var(--text-muted);
        }

        .stage-telemetry-right {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
        }

        @media (min-width: 768px) {
          .stage-telemetry-right {
            align-items: flex-end;
          }
        }

        .telemetry-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--cyan-bright);
          background: rgba(14, 116, 144, 0.2);
          border: 1px solid rgba(56, 189, 248, 0.3);
          padding: 5px 10px;
          border-radius: 8px;
        }

        .latency-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: #e2e8f0;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 4px 10px;
          border-radius: 8px;
        }

        .dot-live {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
        }

        .detail-body-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 36px;
        }

        @media (min-width: 1024px) {
          .detail-body-grid {
            grid-template-columns: 1.15fr 1fr;
            gap: 48px;
          }
        }

        .stage-summary-text {
          font-size: 1.1rem;
          line-height: 1.6;
          color: #f1f5f9;
          margin-bottom: 22px;
        }

        .hardware-guarantee-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 10px;
          background: rgba(14, 116, 144, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.25);
          margin-bottom: 30px;
        }

        .box-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 3px;
        }

        .box-desc {
          font-size: 0.74rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        .stepper-nav-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
        }

        .stepper-btn {
          font-size: 0.82rem;
          padding: 10px 16px;
        }

        .continue-btn {
          font-size: 0.85rem;
          padding: 10px 20px;
        }

        .detail-bullets-column {
          display: flex;
          flex-direction: column;
        }

        .bullets-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: 16px;
        }

        .bullets-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .bullet-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .bullet-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--cyan-primary);
          box-shadow: 0 0 6px var(--cyan-primary);
          margin-top: 7px;
          flex-shrink: 0;
        }

        .bullet-text {
          font-size: 0.82rem;
          line-height: 1.5;
          color: #cbd5e1;
        }
      `}</style>
    </section>
  );
};
