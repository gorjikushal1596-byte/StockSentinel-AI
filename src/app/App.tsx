import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/features/hero/HeroSection';
import { HeroMetrics } from '@/components/ui/HeroMetrics';
import { PhantomProblemSection } from '@/features/problem/PhantomProblemSection';
import { ProcessPipelineSection } from '@/features/pipeline/ProcessPipelineSection';
import { FeatureExplorerSection } from '@/features/features/FeatureExplorerSection';
import { LiveDetectionDemoSection } from '@/features/scanner/LiveDetectionDemoSection';
import { Top20VerificationSection } from '@/features/verification/Top20VerificationSection';
import { BusinessImpactSection } from '@/features/impact/BusinessImpactSection';
import { TeamSection } from '@/features/team/TeamSection';
import { FinalCtaSection } from '@/features/cta/FinalCtaSection';
import { InteractiveSimulationModal } from '@/components/ui/InteractiveSimulationModal';
import { DashboardPreviewModal } from '@/components/ui/DashboardPreviewModal';
import { DatasetManagerModal } from '@/components/ui/DatasetManagerModal';
import { scrollToSection } from '@/utils/scroll';

export const App: React.FC = () => {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);
  const [datasetModalOpen, setDatasetModalOpen] = useState(false);

  // Active dataset, scan, and evaluation date shared between Top-20 Verification and Business Impact
  const [activeDatasetId, setActiveDatasetId] = useState<string>('');
  const [activeScanId, setActiveScanId] = useState<string>('');
  const [activeEvaluationDate, setActiveEvaluationDate] = useState<string>('2025-04-18');
  const [impactRefreshTrigger, setImpactRefreshTrigger] = useState<number>(0);

  // Synchronize browser history (Back / Forward) and initial URL hash
  useEffect(() => {
    // Scroll to initial hash on mount if present
    if (window.location.hash) {
      const initialId = window.location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(initialId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    }

    // Handle popstate events (browser back / forward button clicks)
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Subtle, single-pass scroll reveal observer for section elements and cards
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealElements = document.querySelectorAll(
      '.motion-fade-up, .motion-fade-in, .motion-scale-up'
    );

    if (prefersReducedMotion) {
      revealElements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Unobserve so elements never animate repeatedly or trigger layout shifts
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    revealElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="stocksentinel-app">
      {/* Top Fixed Global Navigation Bar */}
      <Navbar
        onNavigateToSection={scrollToSection}
        onOpenDemo={() => setDemoModalOpen(true)}
        onOpenDashboard={() => scrollToSection('dashboard')}
        onOpenDataset={() => setDatasetModalOpen(true)}
      />

      {/* Main Website Flow: Connected Frames */}
      <main id="main-content">
        {/* FRAME 1: Hero Command Center */}
        <HeroSection
          onOpenDemo={() => setDemoModalOpen(true)}
          onOpenDashboard={() => scrollToSection('dashboard')}
        />

        {/* Hero Problem-Statement Metrics Strip */}
        <HeroMetrics />

        {/* FRAME 2: The Phantom Problem (Contradiction & 3D Shelf) */}
        <PhantomProblemSection
          onContinueToNext={() => scrollToSection('architecture')}
        />

        {/* FRAME 3: How StockSentinel Works (5-Stage Pipeline) */}
        <ProcessPipelineSection
          onContinueToFeatures={() => scrollToSection('features')}
        />

        {/* FRAME 4: Interactive Feature Explorer (6 Deep-Dive Cards) */}
        <FeatureExplorerSection
          onLaunchScanner={() => scrollToSection('demo')}
        />

        {/* FRAME 5: Live Detection Demo (Interactive Client-Side Scanner) */}
        <LiveDetectionDemoSection
          onExploreDashboard={() => scrollToSection('dashboard')}
        />

        {/* FRAME 6: Top-20 Verification Dashboard (Daily Store Queue) */}
        <Top20VerificationSection
          onLaunchScanner={() => scrollToSection('demo')}
          onOpenDataset={() => setDatasetModalOpen(true)}
          datasetId={activeDatasetId}
          onScanExecuted={(scanId, datasetId, evalDate) => {
            setActiveScanId(scanId);
            if (datasetId) setActiveDatasetId(datasetId);
            if (evalDate) setActiveEvaluationDate(evalDate);
            setImpactRefreshTrigger((prev) => prev + 1);
          }}
          onFindingStatusChanged={() => {
            setImpactRefreshTrigger((prev) => prev + 1);
          }}
        />

        {/* FRAME 7: Business Impact & Empirical ROI Model */}
        <BusinessImpactSection
          onLaunchScanner={() => scrollToSection('demo')}
          datasetId={activeDatasetId}
          scanId={activeScanId}
          evaluationDate={activeEvaluationDate}
          refreshTrigger={impactRefreshTrigger}
        />

        {/* FRAME 8: Multidisciplinary Team & Operational Pillars */}
        <TeamSection />

        {/* FRAME 9: Final CTA, 3D Emblem & Global Footer */}
        <FinalCtaSection
          onLaunchDemo={() => setDemoModalOpen(true)}
          onOpenDashboard={() => scrollToSection('dashboard')}
        />
      </main>

      {/* Modals for Quick CTA Launches */}
      <InteractiveSimulationModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
      />

      <DashboardPreviewModal
        isOpen={dashboardModalOpen}
        onClose={() => setDashboardModalOpen(false)}
      />

      <DatasetManagerModal
        isOpen={datasetModalOpen}
        onClose={() => setDatasetModalOpen(false)}
        onDatasetImported={(dsId) => {
          setActiveDatasetId(dsId);
          setImpactRefreshTrigger((prev) => prev + 1);
          scrollToSection('dashboard');
        }}
      />

      <style>{`
        .stocksentinel-app {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: #030712;
          overflow-x: hidden;
        }

        main {
          flex: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default App;
