import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Activity, Eye, Zap, ShieldCheck, Play, Pause } from 'lucide-react';
import { FloatingInventoryPanel } from '@/components/ui/FloatingInventoryPanel';
import { SalesStockChart } from '@/features/dashboard/SalesStockChart';
import { DetectionAlertPanel } from '@/components/ui/DetectionAlertPanel';
import { Top20QueuePreviewPanel } from '@/components/ui/Top20QueuePreviewPanel';

const WarehouseScene = lazy(() => import('@/components/3d/WarehouseScene'));

interface HeroSectionProps {
  onOpenDemo: () => void;
  onOpenDashboard: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenDemo,
  onOpenDashboard,
}) => {
  const [stage, setStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const sceneMode = 'telemetry-overlay';
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setStage(6);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
      return;
    }

    // Sequence stages on initial load:
    const timers = [
      setTimeout(() => setStage(1), 100),
      setTimeout(() => setStage(2), 300),
      setTimeout(() => setStage(3), 600),
      setTimeout(() => setStage(4), 900),
      setTimeout(() => setStage(5), 1200),
      setTimeout(() => setStage(6), 1500),
    ];

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  // Toggle video playback
  const handleTogglePlayback = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <section id="hero" className="hero-viewport" aria-label="Hero Section">
      {/* =======================================================
          CINEMATIC VIDEO BACKGROUND LAYER
         ======================================================= */}
      <div className={`hero-video-backdrop stage-fade-${stage >= 1 ? 'in' : 'out'}`}>
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/videos/stocksentinel-warehouse-poster.jpg"
          onLoadedData={() => setVideoLoaded(true)}
          className="hero-background-video"
          aria-hidden="true"
        >
          <source src="/videos/stocksentinel-warehouse.mp4" type="video/mp4" />
          <source src="/videos/stocksentinel-backup.mp4" type="video/mp4" />
        </video>

        {/* Cinematic dark gradient overlay: guarantees headline & copy have 100% crystal contrast */}
        <div className="hero-video-gradient-overlay" />
      </div>

      {/* =======================================================
          IN-SITU WAREHOUSE SHELF RETICLE & RED PHANTOM ALERT
         ======================================================= */}
      <div className={`hero-shelf-focal-target stage-fade-${stage >= 3 ? 'in' : 'out'}`} aria-hidden="true">
        <div className="shelf-target-bracket">
          <div className="bracket-tag">
            <span className="target-dot" />
            <span>UNIT 74B // VOID [EMPTY SHELF DETECTED]</span>
          </div>
          <div className="bracket-box">
            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />
            <div className="bracket-reticle" />
          </div>
          <div className="bracket-callout">
            <span className="ledger-stat">LEDGER: +6</span>
            <span className="divider">/</span>
            <span className="shelf-stat">SHELF: 0</span>
          </div>
        </div>
      </div>

      {/* =======================================================
          THREE.JS 3D TELEMETRY & SCANNER OVERLAY
         ======================================================= */}
      <div className={`hero-3d-stage stage-fade-${stage >= 2 ? 'in' : 'out'}`}>
        <Suspense fallback={null}>
          <WarehouseScene mode={sceneMode} />
        </Suspense>
      </div>

      {/* Decorative ambient background flares */}
      <div className="ambient-glow-top" />
      <div className="ambient-grid" />

      {/* Continuous Cyan Pathway Motif: Hero Outflow Connector */}
      <div className="cyan-pathway-motif">
        <div className="pathway-spine" style={{ top: '65%' }}>
          <div className="pathway-light-pulse" />
        </div>
        <div className="pathway-node pathway-node-bottom">
          <span className="node-diamond" />
        </div>
      </div>

      {/* =======================================================
          HERO FOREGROUND CONTENT CONTAINER
         ======================================================= */}
      <div className="hero-container">
        <div className="hero-grid">
          {/* =======================================================
              LEFT SIDE: Product Value Proposition & Headline
             ======================================================= */}
          <div className="hero-left-column">
            {/* Eyebrow */}
            <div className={`hero-eyebrow stage-anim ${stage >= 4 ? 'stage-active' : ''}`}>
              <div className="eyebrow-chip">
                <span className="eyebrow-radar-dot" />
                <span className="eyebrow-text">AI-POWERED RETAIL INTELLIGENCE</span>
              </div>
            </div>

            {/* Headline */}
            <h1 className={`hero-headline stage-anim ${stage >= 5 ? 'stage-active' : ''}`}>
              Detect What Your Inventory{' '}
              <span className="hero-headline-accent">Can't See.</span>
            </h1>

            {/* Description */}
            <p className={`hero-description stage-anim ${stage >= 5 ? 'stage-active' : ''}`}>
              Identify phantom stock-outs before they become lost sales. Discover the products your inventory system thinks are available but your customers can't find.
            </p>

            {/* Central Contradiction Highlight Badge */}
            <div className={`contradiction-summary-strip glass-panel stage-anim ${stage >= 5 ? 'stage-active' : ''}`}>
              <div className="contra-icon-wrap">
                <Zap size={16} className="text-alert-orange" />
              </div>
              <div className="contra-text">
                <span className="contra-title">The Phantom Dilemma:</span>
                <span className="contra-desc">
                  Recorded stock is <strong>positive</strong>, yet register sales have collapsed to <strong>zero</strong>.
                </span>
              </div>
            </div>

            {/* Call To Actions */}
            <div className={`hero-cta-group stage-anim ${stage >= 6 ? 'stage-active' : ''}`}>
              <button
                type="button"
                onClick={onOpenDemo}
                className="btn-primary"
                id="hero-primary-cta"
                title="Launch working demo walkthrough"
              >
                <Play size={16} fill="currentColor" />
                <span>Watch Demo</span>
              </button>

              <button
                type="button"
                onClick={onOpenDashboard}
                className="btn-secondary"
                id="hero-secondary-cta"
                title="Explore Top-20 verification dashboard"
              >
                <Activity size={17} />
                <span>Explore Dashboard</span>
              </button>
            </div>

            {/* Trust badge */}
            <div className={`hero-trust-row stage-anim ${stage >= 6 ? 'stage-active' : ''}`}>
              <div className="trust-item">
                <ShieldCheck size={14} className="text-cyan-primary" />
                <span>Non-invasive POS & ERP sync</span>
              </div>
              <span className="trust-sep">•</span>
              <div className="trust-item">
                <Eye size={14} className="text-cyan-primary" />
                <span>Sub-daily anomaly isolation</span>
              </div>
            </div>
          </div>

          {/* =======================================================
              RIGHT SIDE: Layered 3D Overlays & Analytics Glass Panels
             ======================================================= */}
          <div className="hero-right-column">
            {/* Overlay Panels Container (Layered above video and 3D scene) */}
            <div className={`analytics-overlays-cluster stage-anim ${stage >= 4 ? 'stage-active' : ''}`}>
              {/* Panel A: Inventory Telemetry */}
              <div className="floating-panel-wrap panel-a-wrap animate-float">
                <FloatingInventoryPanel />
              </div>

              {/* Panel B: Sales vs Stock Divergence Chart */}
              <div className="floating-panel-wrap panel-b-wrap">
                <SalesStockChart />
              </div>

              {/* Panel C: Detection Alert (Positioned to align visually with the empty shelf region) */}
              <div className="floating-panel-wrap panel-c-wrap animate-float-delayed">
                <DetectionAlertPanel onInvestigate={onOpenDemo} />
              </div>

              {/* Panel D: Top-20 Verification Queue Preview */}
              <div className="floating-panel-wrap panel-d-wrap">
                <Top20QueuePreviewPanel onOpenDashboard={onOpenDashboard} />
              </div>
            </div>
          </div>
        </div>

        {/* Background Stream & Telemetry Controls Strip */}
        <div className={`hero-media-hud stage-anim ${stage >= 6 ? 'stage-active' : ''}`}>
          <div className="hud-status-group">
            <span className="hud-dot-live" />
            <span className="hud-label">
              {videoLoaded ? 'CINEMATIC SENTINEL STREAM' : 'STREAM BUFFERING'}
            </span>
            <span className="hud-sep">|</span>
            <span className="hud-sub">BAY 4-B ANOMALY MONITORED</span>
          </div>

          <div className="hud-actions-group">
            <button
              type="button"
              onClick={handleTogglePlayback}
              className="hud-ctrl-btn"
              title={isPlaying ? 'Pause Background Animation' : 'Play Background Animation'}
              aria-label={isPlaying ? 'Pause background video' : 'Play background video'}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
              <span>{isPlaying ? 'Pause Video' : 'Play Video'}</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .hero-viewport {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          padding-top: 88px;
          padding-bottom: 24px;
          overflow: hidden;
        }

        /* Video Backdrop: Full-width, full-height edge-to-edge warehouse background */
        .hero-video-backdrop {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
          background: #030712;
          pointer-events: none;
          transition: opacity 1.2s ease-out;
        }

        .hero-background-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center; /* Full-width aisle depth & symmetry across whole hero */
          opacity: 1;
          pointer-events: none;
        }

        /* Soft horizontal gradient overlay: darker behind text, translucent toward right */
        .hero-video-gradient-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          background: linear-gradient(
            90deg,
            rgba(3, 7, 18, 0.65) 0%,
            rgba(3, 7, 18, 0.48) 32%,
            rgba(3, 7, 18, 0.18) 62%,
            rgba(3, 7, 18, 0.08) 100%
          );
        }

        @media (max-width: 1024px) {
          .hero-video-gradient-overlay {
            background: linear-gradient(
              180deg,
              rgba(3, 7, 18, 0.76) 0%,
              rgba(3, 7, 18, 0.42) 45%,
              rgba(3, 7, 18, 0.80) 100%
            );
          }
        }

        /* 3D Stage */
        .hero-3d-stage {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
          pointer-events: none;
          transition: opacity 1.2s ease-out;
        }

        .stage-fade-out {
          opacity: 0;
        }

        .stage-fade-in {
          opacity: 1;
        }

        .hero-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 24px;
          pointer-events: none;
        }

        .hero-left-column,
        .floating-panel-wrap,
        .hero-media-hud,
        button,
        a {
          pointer-events: auto;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
          align-items: center;
          min-height: calc(100vh - 160px);
        }

        @media (min-width: 1080px) {
          .hero-grid {
            grid-template-columns: 1.15fr 1fr;
            gap: 48px;
          }
        }

        /* Left Column Styles */
        .hero-left-column {
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 650px;
          padding: 20px 0;
        }

        .stage-anim {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .stage-active {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-eyebrow {
          margin-bottom: 18px;
        }

        .eyebrow-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(14, 116, 144, 0.25);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(0, 242, 254, 0.4);
          box-shadow: 0 0 16px rgba(0, 242, 254, 0.18);
        }

        .eyebrow-radar-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--cyan-primary);
          box-shadow: 0 0 8px var(--cyan-primary);
          animation: pulseGlow 2s infinite;
        }

        .eyebrow-text {
          font-family: var(--font-mono);
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--cyan-primary);
        }

        .hero-headline {
          font-family: var(--font-display);
          font-size: 2.75rem;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -0.035em;
          color: #ffffff;
          margin-bottom: 22px;
          text-shadow: 0 4px 28px rgba(0, 0, 0, 0.9), 0 2px 6px rgba(0, 0, 0, 0.95);
        }

        .hero-headline-accent {
          color: #38bdf8;
          background: linear-gradient(135deg, #00f2fe 0%, #38bdf8 50%, #60a5fa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 20px rgba(0, 242, 254, 0.4));
        }

        @media (min-width: 768px) {
          .hero-headline {
            font-size: 3.6rem;
          }
        }

        @media (min-width: 1200px) {
          .hero-headline {
            font-size: 4.1rem;
          }
        }

        /* In-situ Warehouse Shelf Target Reticle */
        .hero-shelf-focal-target {
          position: absolute;
          top: 42%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 3;
          pointer-events: none;
          transition: opacity 1.2s ease-out;
        }

        @media (max-width: 1080px) {
          .hero-shelf-focal-target {
            display: none;
          }
        }

        .shelf-target-bracket {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .bracket-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 4px;
          background: rgba(239, 68, 68, 0.25);
          border: 1px solid rgba(239, 68, 68, 0.6);
          font-family: var(--font-mono);
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #fca5a5;
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.35);
          backdrop-filter: blur(8px);
        }

        .target-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 8px #ef4444;
          animation: alertBlink 1.4s infinite;
        }

        .bracket-box {
          position: relative;
          width: 180px;
          height: 100px;
          border: 1px dashed rgba(239, 68, 68, 0.45);
          border-radius: 6px;
          background: rgba(239, 68, 68, 0.05);
          box-shadow: inset 0 0 20px rgba(239, 68, 68, 0.18), 0 0 18px rgba(239, 68, 68, 0.15);
        }

        .bracket-box .corner {
          position: absolute;
          width: 10px;
          height: 10px;
          border-color: #ef4444;
          border-style: solid;
        }

        .bracket-box .corner.tl {
          top: -1px;
          left: -1px;
          border-width: 2px 0 0 2px;
        }

        .bracket-box .corner.tr {
          top: -1px;
          right: -1px;
          border-width: 2px 2px 0 0;
        }

        .bracket-box .corner.bl {
          bottom: -1px;
          left: -1px;
          border-width: 0 0 2px 2px;
        }

        .bracket-box .corner.br {
          bottom: -1px;
          right: -1px;
          border-width: 0 2px 2px 0;
        }

        .bracket-reticle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 20px;
          height: 20px;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(239, 68, 68, 0.7);
          border-radius: 50%;
        }

        .bracket-callout {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(3, 7, 18, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .ledger-stat {
          color: #38bdf8;
        }

        .bracket-callout .divider {
          color: #64748b;
        }

        .shelf-stat {
          color: #f87171;
        }

        .hero-description {
          font-size: 1.12rem;
          line-height: 1.6;
          color: #f1f5f9;
          margin-bottom: 24px;
          font-weight: 400;
          text-shadow: 0 2px 16px rgba(0, 0, 0, 0.9), 0 1px 4px rgba(0, 0, 0, 0.95);
        }

        .contradiction-summary-strip {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(56, 189, 248, 0.24);
          margin-bottom: 30px;
        }

        .contra-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(249, 115, 22, 0.15);
          border: 1px solid rgba(249, 115, 22, 0.35);
          flex-shrink: 0;
        }

        .text-alert-orange {
          color: #f97316;
        }

        .contra-text {
          font-size: 0.85rem;
          color: #e2e8f0;
          line-height: 1.4;
        }

        .contra-title {
          font-weight: 700;
          color: #fca5a5;
          margin-right: 6px;
        }

        .hero-cta-group {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          margin-bottom: 28px;
        }

        .hero-trust-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: var(--font-sans);
          font-size: 0.8rem;
          color: var(--text-dim);
        }

        .trust-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
        }

        .text-cyan-primary {
          color: var(--cyan-primary);
        }

        .trust-sep {
          opacity: 0.3;
        }

        /* Right Column Overlays */
        .hero-right-column {
          position: relative;
          min-height: 540px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .analytics-overlays-cluster {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 380px;
          margin: 0 auto;
          position: relative;
          z-index: 20;
        }

        @media (min-width: 1080px) {
          .analytics-overlays-cluster {
            max-width: 620px;
            height: 600px;
            display: block;
            position: relative;
          }

          .floating-panel-wrap {
            position: absolute;
            transition: all 0.3s;
          }

          .panel-a-wrap {
            top: 0px;
            left: 0px;
            z-index: 22;
          }

          .panel-b-wrap {
            bottom: 10px;
            left: 0px;
            z-index: 23;
          }

          /* Aligns visually with the empty shelf focal zone */
          .panel-c-wrap {
            top: 25px;
            right: 0px;
            z-index: 24;
          }

          .panel-d-wrap {
            bottom: 10px;
            right: 0px;
            z-index: 25;
          }
        }

        .animate-float-delayed {
          animation: floatGentle 5.5s ease-in-out 1.2s infinite;
        }

        /* Bottom Media HUD Bar */
        .hero-media-hud {
          margin-top: 16px;
          padding: 8px 16px;
          border-radius: 12px;
          background: rgba(8, 16, 32, 0.65);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(56, 189, 248, 0.16);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          max-width: 800px;
        }

        .hud-status-group {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 0.7rem;
        }

        .hud-dot-live {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
        }

        .hud-label {
          color: #e2e8f0;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .hud-sep {
          color: var(--text-dim);
          opacity: 0.5;
        }

        .hud-sub {
          color: var(--cyan-bright);
        }

        .hud-actions-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hud-ctrl-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(56, 189, 248, 0.25);
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .hud-ctrl-btn:hover {
          color: #ffffff;
          background: rgba(56, 189, 248, 0.15);
          border-color: var(--cyan-primary);
        }
      `}</style>
    </section>
  );
};
