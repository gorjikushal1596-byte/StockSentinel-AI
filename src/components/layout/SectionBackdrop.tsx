import React, { useState, useEffect, useRef } from 'react';

export interface SectionBackdropProps {
  mediaType?: 'image' | 'video' | 'none';
  mediaSrc?: string;
  posterSrc?: string;
  videoSources?: { src: string; type: string }[];
  accentColor?: 'cyan' | 'red' | 'navy';
  frameIndex?: number;
  overlayOpacity?: number;
  showPathway?: boolean;
  topTransition?: boolean;
  bottomTransition?: boolean;
}

export const SectionBackdrop: React.FC<SectionBackdropProps> = ({
  mediaType = 'image',
  mediaSrc,
  posterSrc,
  videoSources,
  accentColor = 'cyan',
  frameIndex,
  overlayOpacity = 0.52,
  showPathway = true,
  topTransition = true,
  bottomTransition = true,
}) => {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLElement | null>(null);

  // Lightweight passive scroll parallax (GPU translate3d, 60fps RAF throttled)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;
    if (prefersReducedMotion || isMobile) {
      if (mediaRef.current) {
        mediaRef.current.style.transform = 'none';
      }
      return;
    }

    let rafId: number | null = null;

    const updateParallax = () => {
      if (!containerRef.current || !mediaRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Only calculate when section is visible in or immediately near viewport
      if (rect.bottom >= -80 && rect.top <= windowHeight + 80) {
        const progress = (windowHeight - rect.top) / (windowHeight + rect.height);
        // Subtle restrained translation: -22px to +22px with slight scale to prevent edge bleed
        const translateY = (progress - 0.5) * 44;
        mediaRef.current.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0) scale(1.06)`;
      }
    };

    const onScrollOrResize = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          updateParallax();
          rafId = null;
        });
      }
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    updateParallax();

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [mediaLoaded]);

  // Dynamic glow depending on section tone
  const accentGlow =
    accentColor === 'red'
      ? 'radial-gradient(ellipse 70% 45% at 50% 25%, rgba(239, 68, 68, 0.14) 0%, rgba(249, 115, 22, 0.05) 50%, transparent 75%)'
      : accentColor === 'navy'
      ? 'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(37, 99, 235, 0.12) 0%, rgba(14, 116, 144, 0.05) 60%, transparent 80%)'
      : 'radial-gradient(ellipse 75% 50% at 50% 25%, rgba(0, 242, 254, 0.13) 0%, rgba(37, 99, 235, 0.08) 50%, transparent 75%)';

  return (
    <div
      ref={containerRef}
      className="section-backdrop-layer"
      aria-hidden="true"
      data-frame={frameIndex}
    >
      {/* 1. Base Dark Navy Gradient & Ambient Glow Fallback */}
      <div className="backdrop-base-gradient" />
      <div
        className="backdrop-ambient-glow"
        style={{ backgroundImage: accentGlow }}
      />
      <div className="backdrop-grid-overlay" />

      {/* 2. Optional Media Layer: Image or Video with graceful failure handling */}
      {!mediaFailed && mediaSrc && mediaType === 'image' && (
        <img
          ref={mediaRef as React.RefObject<HTMLImageElement>}
          src={mediaSrc}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setMediaLoaded(true)}
          onError={() => setMediaFailed(true)}
          className={`backdrop-media-element backdrop-image ${
            mediaLoaded ? 'media-visible' : 'media-hidden'
          }`}
        />
      )}

      {!mediaFailed && mediaType === 'video' && (videoSources || mediaSrc) && (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          autoPlay
          loop
          muted
          playsInline
          poster={posterSrc}
          onLoadedData={() => setMediaLoaded(true)}
          onError={() => setMediaFailed(true)}
          className={`backdrop-media-element backdrop-video ${
            mediaLoaded ? 'media-visible' : 'media-hidden'
          }`}
        >
          {videoSources?.map((source, idx) => (
            <source key={idx} src={source.src} type={source.type} />
          ))}
          {mediaSrc && <source src={mediaSrc} type="video/mp4" />}
        </video>
      )}

      {/* 3. High-Contrast Cinematic Dark Readability Overlay */}
      <div
        className="backdrop-darkness-scrim"
        style={{
          background: `radial-gradient(ellipse 95% 75% at 50% 40%, rgba(3, 7, 18, ${Math.max(0.32, overlayOpacity - 0.15)}) 0%, rgba(3, 7, 18, ${overlayOpacity}) 100%)`,
        }}
      />

      {/* 4. Smooth Section Boundary Feathers (Seamless Vertical Blend) */}
      {topTransition && <div className="backdrop-edge-feather-top" />}
      {bottomTransition && <div className="backdrop-edge-feather-bottom" />}

      {/* 5. Continuous Cyan Pathway Motif */}
      {showPathway && (
        <div className={`cyan-pathway-motif accent-${accentColor}`}>
          <div className="pathway-spine">
            <div className="pathway-light-pulse" />
          </div>
          {topTransition && (
            <div className="pathway-node pathway-node-top">
              <span className="node-diamond" />
            </div>
          )}
          {bottomTransition && (
            <div className="pathway-node pathway-node-bottom">
              <span className="node-diamond" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
