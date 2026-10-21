import React, { useState, useEffect } from 'react';
import { ShieldAlert, ChevronRight, Sparkles, Menu, X, Database, Activity } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface NavbarProps {
  onOpenDemo?: () => void;
  onOpenDashboard?: () => void;
  onOpenDataset?: () => void;
  onNavigateToSection?: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenDemo, 
  onOpenDashboard,
  onOpenDataset,
  onNavigateToSection 
}) => {
  const [activeSection, setActiveSection] = useState('hero');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isBackendLive, setIsBackendLive] = useState(false);

  useEffect(() => {
    let isMounted = true;
    apiClient.checkHealth().then((res) => {
      if (isMounted && res.online) {
        setIsBackendLive(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const navLinks = [
    { label: 'Home', href: '#hero' },
    { label: 'Problem', href: '#problem' },
    { label: 'How It Works', href: '#architecture' },
    { label: 'Dashboard', href: '#dashboard' },
    { label: 'Impact', href: '#impact' },
    { label: 'Team', href: '#team' },
  ];

  // Observe which section is active using native IntersectionObserver
  useEffect(() => {
    const sectionIds = [
      'hero',
      'problem',
      'architecture',
      'features',
      'demo',
      'dashboard',
      'impact',
      'team',
      'cta',
    ];

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Sort by proximity to header offset (80px)
          visibleEntries.sort((a, b) => {
            const aDist = Math.abs(a.boundingClientRect.top - 80);
            const bDist = Math.abs(b.boundingClientRect.top - 80);
            return aDist - bDist;
          });
          const targetSection = visibleEntries[0].target.id;
          setActiveSection(targetSection);
        }
      },
      {
        root: null,
        rootMargin: '-80px 0px -45% 0px',
        threshold: [0, 0.15, 0.5, 0.8],
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleScrollTo = (
    e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
    href: string
  ) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const targetId = href.replace('#', '');
    setActiveSection(targetId);

    if (targetId === 'dashboard' && onOpenDashboard) {
      onOpenDashboard();
    } else if (onNavigateToSection) {
      onNavigateToSection(targetId);
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        if (window.location.hash !== href) {
          window.history.pushState(null, '', href);
        }
      }
    }
  };

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand Logo */}
        <a 
          href="#hero" 
          onClick={(e) => handleScrollTo(e, '#hero')}
          className="brand-logo"
        >
          <div className="logo-icon-wrapper">
            <ShieldAlert className="logo-icon" size={20} />
            <span className="logo-radar-ping" />
          </div>
          <div className="logo-text-group">
            <span className="logo-title">
              StockSentinel<span className="text-cyan-accent">.AI</span>
            </span>
            <span className="logo-badge">RETAIL INTELLIGENCE</span>
          </div>
        </a>

        {/* Desktop Global Navigation Links */}
        <nav className="desktop-nav-menu" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const targetId = link.href.replace('#', '');
            const isActive = activeSection === targetId;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className={`nav-menu-link ${isActive ? 'active' : ''}`}
              >
                {link.label}
                {isActive && <span className="active-pill" />}
              </a>
            );
          })}
        </nav>

        {/* Live System Indicator */}
        <div className="system-status-indicator">
          <span className="status-dot-pulse">
            <span className="dot-core" />
            <span className="dot-ripple" />
          </span>
          <span className="status-label">{isBackendLive ? 'FASTAPI LIVE' : 'SENTINEL RADAR ACTIVE'}</span>
          <span className="status-divider">/</span>
          <span className="status-metric">25 STORES</span>
        </div>

        {/* Action Controls */}
        <div className="navbar-actions">
          {onOpenDataset && (
            <button
              type="button"
              onClick={onOpenDataset}
              className="nav-cta-btn"
              id="nav-get-started-btn"
              title="Open dataset upload and import wizard"
            >
              <Sparkles size={14} />
              <span>Get Started</span>
              <ChevronRight size={14} />
            </button>
          )}

          <button 
            type="button" 
            onClick={(e) => {
              if (onOpenDemo) {
                onOpenDemo();
              } else {
                handleScrollTo(e, '#demo');
              }
            }}
            className="nav-link-btn dataset-trigger-btn"
            title="Navigate to live anomaly scanner"
          >
            <Activity size={14} className="text-cyan-400" />
            <span className="btn-text-desktop">Scanner</span>
          </button>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-toggle"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer glass-panel animate-fade-in">
          <div className="mobile-nav-links">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="mobile-nav-item"
              >
                {link.label}
              </a>
            ))}
            <div className="mobile-actions-divider" />
            {onOpenDataset && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDataset();
                }}
                className="btn-secondary w-full"
              >
                <Database size={15} />
                <span>Manage Datasets</span>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                setMobileMenuOpen(false);
                if (onOpenDemo) {
                  onOpenDemo();
                } else {
                  handleScrollTo(e, '#demo');
                }
              }}
              className="btn-primary w-full"
            >
              <Sparkles size={15} />
              <span>Launch Live Scanner</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .navbar-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 72px;
          z-index: 50;
          background: rgba(3, 7, 18, 0.82);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(56, 189, 248, 0.14);
        }

        .navbar-inner {
          max-width: 1440px;
          margin: 0 auto;
          height: 100%;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          cursor: pointer;
          flex-shrink: 0;
        }

        .logo-icon-wrapper {
          position: relative;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(37, 99, 235, 0.25));
          border: 1px solid rgba(0, 242, 254, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--cyan-primary);
          box-shadow: 0 0 16px rgba(0, 242, 254, 0.25);
        }

        .logo-radar-ping {
          position: absolute;
          inset: -4px;
          border-radius: 14px;
          border: 1px solid rgba(0, 242, 254, 0.4);
          animation: pulseGlow 2.5s infinite;
          pointer-events: none;
        }

        .logo-text-group {
          display: flex;
          flex-direction: column;
        }

        .logo-title {
          font-family: var(--font-display);
          font-size: 1.22rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #ffffff;
        }

        .text-cyan-accent {
          color: var(--cyan-primary);
        }

        .logo-badge {
          font-family: var(--font-mono);
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: var(--cyan-bright);
          opacity: 0.85;
        }

        /* Desktop Nav Menu */
        .desktop-nav-menu {
          display: none;
          align-items: center;
          gap: 6px;
        }

        @media (min-width: 1024px) {
          .desktop-nav-menu {
            display: flex;
          }
        }

        .nav-menu-link {
          position: relative;
          padding: 6px 12px;
          font-family: var(--font-sans);
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-muted);
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .nav-menu-link:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }

        .nav-menu-link.active {
          color: var(--cyan-primary);
          background: rgba(0, 242, 254, 0.08);
        }

        .active-pill {
          position: absolute;
          bottom: -2px;
          left: 12px;
          right: 12px;
          height: 2px;
          background: var(--cyan-primary);
          box-shadow: 0 0 8px var(--cyan-primary);
          border-radius: 2px;
        }

        .system-status-indicator {
          display: none;
          align-items: center;
          gap: 8px;
          padding: 5px 12px;
          border-radius: 20px;
          background: rgba(10, 20, 38, 0.65);
          border: 1px solid rgba(56, 189, 248, 0.2);
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--text-muted);
        }

        @media (min-width: 1280px) {
          .system-status-indicator {
            display: flex;
          }
        }

        .status-dot-pulse {
          position: relative;
          width: 7px;
          height: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .dot-core {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
        }

        .dot-ripple {
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 1px solid #10b981;
          animation: pulseGlow 2s infinite;
        }

        .status-label {
          color: #e2e8f0;
          font-weight: 600;
          letter-spacing: 0.03em;
        }

        .status-divider {
          opacity: 0.3;
        }

        .status-metric {
          color: var(--cyan-bright);
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-family: var(--font-sans);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          padding: 7px 10px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .nav-link-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
        }

        @media (max-width: 768px) {
          .btn-text-desktop {
            display: none;
          }
        }

        .nav-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 242, 254, 0.12);
          border: 1px solid rgba(0, 242, 254, 0.4);
          color: var(--cyan-primary);
          padding: 7px 14px;
          border-radius: 8px;
          font-family: var(--font-sans);
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
          box-shadow: 0 0 12px rgba(0, 242, 254, 0.15);
        }

        .nav-cta-btn:hover {
          background: rgba(0, 242, 254, 0.22);
          border-color: var(--cyan-primary);
          color: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 0 18px rgba(0, 242, 254, 0.35);
        }

        .mobile-menu-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
        }

        @media (min-width: 1024px) {
          .mobile-menu-toggle {
            display: none;
          }
        }

        .mobile-nav-drawer {
          position: absolute;
          top: 72px;
          left: 0;
          right: 0;
          background: rgba(8, 14, 28, 0.98);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(56, 189, 248, 0.2);
          padding: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
        }

        .mobile-nav-links {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mobile-nav-item {
          color: #cbd5e1;
          font-family: var(--font-sans);
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          padding: 8px 12px;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .mobile-nav-item:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--cyan-primary);
        }

        .mobile-actions-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 8px 0;
        }

        .w-full {
          width: 100%;
        }
      `}</style>
    </header>
  );
};
