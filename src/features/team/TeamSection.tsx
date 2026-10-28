import React from 'react';
import {
  Cpu,
  BrainCircuit,
  Database,
  Palette,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { SectionBackdrop } from '@/components/layout/SectionBackdrop';

export const TeamSection: React.FC = () => {
  const teamMembers = [
    {
      name: 'Kushal Gorji',
      role: 'Lead Architect & ML Systems Engineer',
      focus: 'Statistical Anomaly Engines, Poisson Modeling & FastAPI Infrastructure',
      icon: <BrainCircuit size={20} className="text-cyan-primary" />,
      contributions: [
        'Engineered Poisson inter-arrival detection algorithm with slow-mover and promotion guards',
        'Implemented universal multi-format tabular ingestion pipeline (CSV, XLSX, Parquet, JSON)',
        'Built deterministic Top-20 daily ranking engine enforcing strict associate anti-fatigue rules',
      ],
      tag: 'LEAD ARCHITECT',
    },
    {
      name: 'Retail Intelligence Unit',
      role: 'Operations & Algorithmic Design',
      focus: 'Phantom Stock-Out Research, POS-ERP Synchronization & Shrink Dynamics',
      icon: <Cpu size={20} className="text-cyan-primary" />,
      contributions: [
        'Formulated empirical revenue recovery model with visible arithmetic and defensible assumptions',
        'Isolated root-cause taxonomy: misplacement, barcode occlusion, unrecorded shrinkage, and returns',
        'Established held-out ground truth evaluation methodology for precision@20 and recall isolation',
      ],
      tag: 'OPERATIONS RESEARCH',
    },
    {
      name: 'Full-Stack Integration Core',
      role: 'API Engineering & Data Persistence',
      focus: 'FastAPI Backend, SQLite/PostgreSQL ORM & Resilient State Hydration',
      icon: <Database size={20} className="text-cyan-primary" />,
      contributions: [
        'Architected REST API routes for /scans, /findings, /evaluation, /datasets, and /recovery-estimate',
        'Built persistent store verification state surviving browser reloads and rescan updates',
        'Developed end-to-end automated test suite across 34 backend pytest specs and Vitest suites',
      ],
      tag: 'BACKEND ARCHITECTURE',
    },
    {
      name: 'UI/UX & Spatial Systems Unit',
      role: 'Design Engineering & Interactive HUD',
      focus: 'Cinematic Visuals, Three.js Spatial Telemetry & Accessibility Ergonomics',
      icon: <Palette size={20} className="text-cyan-primary" />,
      contributions: [
        'Created cinematic dark navy warehouse aesthetic with realistic lighting and focal shelf reticle',
        'Designed glassmorphic telemetry cards: floating inventory, sales vs stock chart, and Top-20 queue',
        'Implemented accessible keyboard controls, WCAG AA contrast, and reduced-motion fallbacks',
      ],
      tag: 'DESIGN & FRONTEND',
    },
  ];

  const corePillars = [
    {
      title: 'Zero Alert Fatigue Protocol',
      desc: 'Strictly capped at <=20 verification candidates per store per day so floor associates take every alert seriously.',
      icon: <ShieldCheck size={18} className="text-emerald-400" />,
    },
    {
      title: 'Empirical Transparency',
      desc: 'Visible, auditable arithmetic for all annual recovery figures. Never fabricate precision, recall, or currency estimates.',
      icon: <CheckCircle2 size={18} className="text-cyan-primary" />,
    },
    {
      title: 'Strict Ground-Truth Isolation',
      desc: 'Evaluation labels are quarantined exclusively for offline benchmark verification and never leak into detection features.',
      icon: <Layers size={18} className="text-sky-400" />,
    },
  ];

  return (
    <section id="team" className="team-section-viewport" aria-label="Team and System Architects">
      {/* Visual Backdrop */}
      <SectionBackdrop
        frameIndex={7}
        mediaSrc="/images/backgrounds/frame-07-business-impact.webp"
        accentColor="cyan"
        topTransition={true}
        bottomTransition={true}
      />

      <div className="section-container">
        {/* Section Header */}
        <div className="section-header-centered motion-fade-up">
          <div className="section-eyebrow">
            <span className="eyebrow-dot" />
            <span>MULTIDISCIPLINARY ARCHITECTURE</span>
          </div>
          <h2 className="section-headline">
            The Team & Systems Behind StockSentinel AI
          </h2>
          <p className="section-subheadline">
            Engineered at the intersection of retail operations research, probabilistic anomaly modeling, and production full-stack systems.
          </p>
        </div>

        {/* Team Grid */}
        <div className="team-grid">
          {teamMembers.map((member, idx) => (
            <div
              key={member.name}
              className={`team-card glass-panel motion-fade-up motion-stagger-${idx + 1}`}
            >
              <div className="card-top">
                <div className="member-avatar-box">
                  {member.icon}
                </div>
                <div className="member-meta">
                  <span className="member-tag">{member.tag}</span>
                  <h3 className="member-name">{member.name}</h3>
                  <div className="member-role">{member.role}</div>
                </div>
              </div>

              <div className="member-focus">
                <span className="focus-label">CORE DOMAIN:</span>
                <span className="focus-text">{member.focus}</span>
              </div>

              <div className="contributions-list">
                {member.contributions.map((c, i) => (
                  <div key={i} className="contribution-item">
                    <span className="bullet-dot" />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Architecture Principles Banner */}
        <div className="pillars-strip glass-panel motion-fade-up">
          <div className="pillars-header">
            <Sparkles size={16} className="text-cyan-primary" />
            <span className="pillars-title">ENGINEERING GUARANTEES & OPERATIONAL PILLARS</span>
          </div>
          <div className="pillars-grid">
            {corePillars.map((pillar, i) => (
              <div key={i} className="pillar-item">
                <div className="pillar-icon-box">{pillar.icon}</div>
                <div className="pillar-content">
                  <h4 className="pillar-heading">{pillar.title}</h4>
                  <p className="pillar-desc">{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .team-section-viewport {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          padding: 110px 0 90px;
          overflow: hidden;
          background: #030712;
        }

        .section-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1360px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .section-header-centered {
          text-align: center;
          max-width: 820px;
          margin: 0 auto 56px;
        }

        .section-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(0, 242, 254, 0.1);
          border: 1px solid rgba(0, 242, 254, 0.25);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
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
          font-size: 2.6rem;
          font-weight: 800;
          line-height: 1.15;
          color: #ffffff;
          margin-bottom: 16px;
          letter-spacing: -0.025em;
        }

        @media (min-width: 768px) {
          .section-headline {
            font-size: 3.2rem;
          }
        }

        .section-subheadline {
          font-size: 1.05rem;
          line-height: 1.6;
          color: #94a3b8;
          max-width: 700px;
          margin: 0 auto;
        }

        .team-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin-bottom: 48px;
        }

        @media (min-width: 768px) {
          .team-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1200px) {
          .team-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .team-card {
          padding: 24px 20px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }

        .team-card:hover {
          transform: translateY(-4px);
          border-color: rgba(0, 242, 254, 0.35);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 242, 254, 0.12);
        }

        .card-top {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
        }

        .member-avatar-box {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(0, 242, 254, 0.1);
          border: 1px solid rgba(0, 242, 254, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .member-meta {
          flex: 1;
        }

        .member-tag {
          font-family: var(--font-mono);
          font-size: 0.64rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--cyan-primary);
          display: block;
          margin-bottom: 3px;
        }

        .member-name {
          font-size: 1.12rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 2px 0;
        }

        .member-role {
          font-size: 0.76rem;
          color: #94a3b8;
          font-family: var(--font-sans);
        }

        .member-focus {
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(3, 7, 18, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 16px;
        }

        .focus-label {
          display: block;
          font-family: var(--font-mono);
          font-size: 0.62rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.06em;
          margin-bottom: 2px;
        }

        .focus-text {
          font-size: 0.75rem;
          color: #cbd5e1;
          line-height: 1.4;
          font-weight: 500;
        }

        .contributions-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: auto;
        }

        .contribution-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.76rem;
          line-height: 1.45;
          color: #94a3b8;
        }

        .bullet-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--cyan-primary);
          margin-top: 6px;
          flex-shrink: 0;
        }

        .pillars-strip {
          padding: 24px 28px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .pillars-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .pillars-title {
          font-family: var(--font-mono);
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #e2e8f0;
        }

        .pillars-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        @media (min-width: 900px) {
          .pillars-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .pillar-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .pillar-icon-box {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .pillar-heading {
          font-size: 0.88rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 4px 0;
        }

        .pillar-desc {
          font-size: 0.78rem;
          line-height: 1.45;
          color: #94a3b8;
          margin: 0;
        }
      `}</style>
    </section>
  );
};
