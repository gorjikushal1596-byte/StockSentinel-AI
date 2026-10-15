# StockSentinel AI — Architecture & Systems Overview

StockSentinel AI is a high-performance retail intelligence web platform designed to isolate and eliminate **phantom stock-outs** (inventory items recorded as positive on ERP ledgers but showing zero sales across physical retail checkout lanes).

---

## 1. Architectural Structure

The codebase is organized into domain-driven layers prioritizing the **YAGNI (You Aren't Gonna Need It)** philosophy and standard library primitives:

```text
src/
├── app/                  # Application initialization & layout orchestration
│   ├── App.tsx           # Global scroll coordinator, observer & section assembler
│   └── main.tsx          # React 19 root mount point
├── components/
│   ├── 3d/               # Three.js scenes, procedural warehouse models & 3D markers
│   │   ├── WarehouseScene.tsx
│   │   ├── WarehouseModels.tsx
│   │   ├── ShelfComparison3D.tsx
│   │   └── Sentinel3DEmblem.tsx
│   ├── layout/           # Global chrome & navigation
│   │   ├── Navbar.tsx
│   │   └── SectionBackdrop.tsx
│   └── ui/               # Reusable telemetry cards, metrics strips & modals
│       ├── HeroMetrics.tsx
│       ├── DetectionAlertPanel.tsx
│       ├── FloatingInventoryPanel.tsx
│       ├── DashboardPreviewModal.tsx
│       └── InteractiveSimulationModal.tsx
├── features/             # Feature sections mapped to narrative frames
│   ├── hero/             # Frame 1: Hero Command Center
│   ├── problem/          # Frame 2: The Core Contradiction
│   ├── pipeline/         # Frame 3: 5-Stage Intelligence Pipeline
│   ├── features/         # Frame 4: Feature Explorer
│   ├── scanner/          # Frame 5: Live Anomaly Scanner & Poisson Engine
│   ├── verification/     # Frame 6: Top-20 Daily Store Queue
│   ├── dashboard/        # Stock vs Sales Divergence Telemetry Chart
│   ├── impact/           # Frame 7: Empirical ROI & Revenue Protection Model
│   └── cta/              # Frame 8: Final Call to Action & Emblem
├── styles/               # Design token palette, glassmorphism & typography
│   └── index.css
├── types/                # Shared TypeScript data contracts
│   ├── inventory.ts
│   ├── scanner.ts
│   └── verification.ts
└── utils/                # Standardized DOM & formatting helpers
    ├── formatters.ts
    └── scroll.ts
```

---

## 2. The 8 Connected Visual Frames

1. **Frame 1 — Hero Command Center (`#hero`)**:
   - High-definition warehouse video hero (`/videos/stocksentinel-warehouse.mp4`) with automatic fallback (`/videos/stocksentinel-backup.mp4`).
   - Dynamic Three.js overlay (`WarehouseScene`) with interactive LiDAR sweep and bay marker.
   - Live telemetry cluster: `FloatingInventoryPanel`, `SalesStockChart`, and `DetectionAlertPanel`.
2. **Frame 2 — The Phantom Dilemma (`#problem`)**:
   - Discrepancy analysis showing positive ledger (+6 units) vs. actual shelf reality (0 units).
   - Interactive 3D shelf inspection (`ShelfComparison3D`) with raycast selection.
3. **Frame 3 — 5-Stage Pipeline (`#architecture`)**:
   - Ingestion $\to$ Anomaly Detection $\to$ Priority Ranking $\to$ Daily Dispatch $\to$ Closed-Loop Feedback.
4. **Frame 4 — Capabilities Explorer (`#features`)**:
   - 6 specialized retail operations cards (Bayesian filtering, promo normalization, audit evaluation).
5. **Frame 5 — Live Anomaly Scanner (`#demo`)**:
   - Client-side interactive simulator with real-time parameter tuning and animated telemetry.
6. **Frame 6 — Top-20 Verification Queue (`#dashboard`)**:
   - Daily store dispatch roster strictly constrained to 20 actionable checks per store-day to prevent associate alert fatigue.
7. **Frame 7 — Business Impact & ROI (`#impact`)**:
   - Transparent empirical calculation modeling annual dollars saved based on network store count and recovery capture rate.
8. **Frame 8 — Final CTA & 3D Emblem (`#cta`)**:
   - Orbital Three.js emblem (`Sentinel3DEmblem`) with scroll-linked reveal and global footer.

---

## 3. Mathematical Anomaly Detection Engine

The detection algorithm in `src/features/scanner/scannerEngine.ts` models inter-arrival purchase times using a Poisson probability distribution:

$$P(0 \text{ sales across } D \text{ days} \mid \text{rate } \lambda) = e^{-\lambda \cdot D}$$

Where:
- $\lambda = \frac{\text{normalWeeklyVelocity}}{7}$
- $D = \text{zeroSalesDays}$

The system flags an anomaly with confidence:

$$\text{Confidence} = \min(99.8, \max(12.0, (1 - e^{-\lambda \cdot D}) \times 100))$$

---

## 4. Performance & Rendering Principles

- **Zero Unnecessary Layout Shifts**: Background videos and images use absolute container positioning with hardware-accelerated CSS `transform: translate3d(...)` throttled to RequestAnimationFrame (RAF).
- **Reduced Motion Support**: Components listen to `(prefers-reduced-motion: reduce)` to disable heavy 3D orbital rotations and video auto-play, falling back to static presentation.
- **Single-Pass Scroll Reveal**: Scroll animation classes (`.motion-fade-up`, `.motion-fade-in`) are observed via a single native `IntersectionObserver` that calls `unobserve(entry.target)` immediately upon entry to prevent repeated reflows.
