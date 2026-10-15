import React from 'react';
import { Canvas } from '@react-three/fiber';
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Activity,
  Layers,
  Database,
  Lock,
  ChevronUp,
} from 'lucide-react';
import { SectionBackdrop } from '@/components/layout/SectionBackdrop';
import { Sentinel3DEmblem } from '@/components/3d/Sentinel3DEmblem';

interface FinalCtaSectionProps {
  onLaunchDemo: () => void;
  onOpenDashboard: () => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({
  onLaunchDemo,
  onOpenDashboard,
}) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.location.hash !== '#hero') {
      window.history.pushState(null, '', '#hero');
    }
  };

  const navLinks = [
    { label: 'Problem Statement', href: '#problem' },
    { label: '5-Stage Pipeline', href: '#architecture' },
    { label: 'Feature Explorer', href: '#features' },
    { label: 'Live Scanner Demo', href: '#demo' },
    { label: 'Top-20 Daily Queue', href: '#dashboard' },
    { label: 'ROI Impact Calculator', href: '#impact' },
  ];

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      if (window.location.hash !== href) {
        window.history.pushState(null, '', href);
      }
    }
  };

  return (
    <section id="cta" className="cta-section-viewport" aria-label="Final Call to Action">
      {/* Section Backdrop & Cyan Pathway Motif */}
      <SectionBackdrop
        frameIndex={8}
        mediaSrc="/images/backgrounds/frame-08-final-cta.webp"
        accentColor="cyan"
        topTransition={true}
        bottomTransition={false}
      />

      <div className="section-container">
        {/* Main Banner Card */}
        <div className="final-banner-card glass-panel motion-fade-up">
          <div className="banner-grid">
            {/* Left Column Copy & CTAs */}
            <div className="banner-content-col">
              <div className="banner-eyebrow">
                <span className="dot-pulse" />
                <span>INTELLIGENCE READY FOR ROLLOUT</span>
              </div>

              <h2 className="banner-headline">
                Stop Losing Sales to Products Your Inventory Can't See.
              </h2>

              <p className="banner-description">
                Deploy StockSentinel AI across your retail store network without installing a single in-store camera or RFID reader. Plug directly into your POS transaction stream and ERP inventory ledgers.
              </p>

              <div className="banner-cta-group">
                <button
                  type="button"
                  onClick={onLaunchDemo}
                  className="btn-primary"
                  id="final-primary-cta"
                >
                  <Sparkles size={16} />
                  <span>Launch Live Scanner</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="btn-secondary"
                  id="final-secondary-cta"
                >
                  <Activity size={16} />
                  <span>Open Verification Queue</span>
                </button>
              </div>

              {/* Security & Architecture Badges */}
              <div className="trust-pills-row">
                <div className="trust-pill">
                  <Database size={13} className="text-cyan-primary" />
                  <span>REST / SQL ERP Connectors</span>
                </div>
                <div className="trust-pill">
                  <Lock size={13} className="text-cyan-primary" />
                  <span>Zero PII / SOC2 Compliant</span>
                </div>
                <div className="trust-pill">
                  <Layers size={13} className="text-cyan-primary" />
                  <span>Sub-Daily Inference</span>
                </div>
              </div>
            </div>

            {/* Right Column 3D Holographic Emblem */}
            <div className="banner-emblem-col motion-scale-up motion-stagger-2">
              <div className="emblem-canvas-wrap">
                <Canvas
                  camera={{ position: [0, 0, 4.2], fov: 42 }}
                  dpr={[1, 1.5]}
                  style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                >
                  <ambientLight color="#0c182f" intensity={1.5} />
                  <directionalLight position={[2, 4, 3]} color="#38bdf8" intensity={1.8} />
                  <Sentinel3DEmblem />
                </Canvas>
              </div>
              <div className="emblem-caption font-mono">
                AUTONOMOUS SENTINEL NODE // VERSION 2.4.0
              </div>
            </div>
          </div>
        </div>

        {/* Global Footer */}
        <footer className="complete-site-footer motion-fade-up motion-stagger-3">
          <div className="footer-top-row">
            {/* Brand Logo & Mission */}
            <div className="footer-brand-col">
              <div className="brand-logo" onClick={scrollToTop} role="button" tabIndex={0}>
                <div className="logo-icon-wrapper">
                  <ShieldAlert className="logo-icon" size={20} />
                </div>
                <div className="logo-text-group">
                  <span className="logo-title">
                    StockSentinel<span className="text-cyan-accent">.AI</span>
                  </span>
                  <span className="logo-badge">RETAIL INTELLIGENCE</span>
                </div>
              </div>
              <p className="footer-mission-text">
                Autonomous detection of retail phantom stock-outs, inventory shrinkage, and misplaced shelf facings through statistical demand velocity intelligence.
              </p>
            </div>

            {/* Quick Links Column */}
            <div className="footer-links-col">
              <div className="footer-col-title font-mono">NAVIGATION SECTIONS</div>
              <div className="footer-links-grid">
                {navLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.href}
                    onClick={(e) => handleSmoothScroll(e, link.href)}
                    className="footer-link-item"
                  >
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Return to Top Button */}
            <div className="footer-top-col">
              <button
                type="button"
                onClick={scrollToTop}
                className="btn-return-top font-mono"
              >
                <ChevronUp size={16} />
                <span>Return to Top</span>
              </button>
            </div>
          </div>

          <div className="footer-bottom-row">
            <div className="copyright-text">
              © {new Date().getFullYear()} StockSentinel AI Systems Inc. All rights reserved.
            </div>
            <div className="legal-tags font-mono">
              <span>Illustrative Demonstration Engine</span>
              <span>•</span>
              <span>SOC2 Type II Aligned</span>
              <span>•</span>
              <span>25 Store Pilot Network</span>
            </div>
          </div>
        </footer>
      </div>

      <style>{`
        .cta-section-viewport {
          position: relative;
          width: 100%;
          padding: 100px 0 40px;
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

        .final-banner-card {
          padding: 48px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(14, 116, 144, 0.16), rgba(10, 20, 38, 0.95));
          border: 1px solid rgba(0, 242, 254, 0.35);
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 242, 254, 0.12);
          margin-bottom: 60px;
        }

        .banner-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
          align-items: center;
        }

        @media (min-width: 1080px) {
          .banner-grid {
            grid-template-columns: 1.35fr 1fr;
            gap: 50px;
          }
        }

        .banner-content-col {
          display: flex;
          flex-direction: column;
        }

        .banner-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--cyan-primary);
          margin-bottom: 16px;
        }

        .dot-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--cyan-primary);
          box-shadow: 0 0 8px var(--cyan-primary);
          animation: pulseGlow 2s infinite;
        }

        .banner-headline {
          font-family: var(--font-display);
          font-size: 2.2rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
          margin-bottom: 18px;
          letter-spacing: -0.025em;
        }

        @media (min-width: 768px) {
          .banner-headline {
            font-size: 2.8rem;
          }
        }

        .banner-description {
          font-size: 1.05rem;
          line-height: 1.6;
          color: #cbd5e1;
          margin-bottom: 30px;
          max-width: 620px;
        }

        .banner-cta-group {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .trust-pills-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
        }

        .trust-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .banner-emblem-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .emblem-canvas-wrap {
          width: 100%;
          height: 300px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .emblem-canvas-wrap::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 260px;
          height: 260px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 242, 254, 0.22) 0%, rgba(14, 116, 144, 0.08) 50%, transparent 72%);
          filter: blur(28px);
          pointer-events: none;
          z-index: 0;
          animation: emblemPulseGlow 3.5s ease-in-out infinite alternate;
        }

        @keyframes emblemPulseGlow {
          0% {
            opacity: 0.55;
            transform: translate(-50%, -50%) scale(0.92);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .emblem-canvas-wrap::before {
            animation: none;
            opacity: 0.7;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .emblem-caption {
          font-size: 0.68rem;
          color: var(--text-dim);
          letter-spacing: 0.12em;
          margin-top: 10px;
        }

        /* Footer */
        .complete-site-footer {
          border-top: 1px solid rgba(56, 189, 248, 0.12);
          padding-top: 40px;
        }

        .footer-top-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 36px;
          padding-bottom: 36px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        @media (min-width: 768px) {
          .footer-top-row {
            grid-template-columns: 1.5fr 2fr 1fr;
          }
        }

        .footer-brand-col {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .logo-icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(0, 242, 254, 0.15);
          border: 1px solid rgba(0, 242, 254, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--cyan-primary);
        }

        .logo-text-group {
          display: flex;
          flex-direction: column;
        }

        .logo-title {
          font-family: var(--font-display);
          font-size: 1.15rem;
          font-weight: 800;
          color: #ffffff;
        }

        .text-cyan-accent {
          color: var(--cyan-primary);
        }

        .logo-badge {
          font-family: var(--font-mono);
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--cyan-bright);
        }

        .footer-mission-text {
          font-size: 0.8rem;
          line-height: 1.5;
          color: var(--text-dim);
          max-width: 340px;
        }

        .footer-col-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          margin-bottom: 14px;
        }

        .footer-links-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .footer-link-item {
          font-size: 0.82rem;
          color: #cbd5e1;
          text-decoration: none;
          transition: color 0.2s;
        }

        .footer-link-item:hover {
          color: var(--cyan-primary);
        }

        .footer-top-col {
          display: flex;
          justify-content: flex-end;
          align-items: flex-start;
        }

        .btn-return-top {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(56, 189, 248, 0.2);
          color: var(--text-muted);
          font-size: 0.74rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-return-top:hover {
          color: #ffffff;
          border-color: var(--cyan-primary);
        }

        .footer-bottom-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          padding-top: 24px;
          font-size: 0.72rem;
          color: var(--text-dim);
          gap: 12px;
        }

        .legal-tags {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </section>
  );
};
