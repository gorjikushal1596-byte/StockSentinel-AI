import React, { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  WarehouseRackingSystem,
  CleanEmptyShelfAnomaly,
  OverheadAisleFixtures,
  PolishedWarehouseFloor,
  RefinedAtmosphericParticles,
} from './WarehouseModels';

interface WarehouseSceneProps {
  mode?: 'telemetry-overlay' | 'procedural-3d';
}

/**
 * Camera controller with smooth pointer-based parallax and subtle scroll-linked forward dolly
 */
const CinematicCameraRig: React.FC = () => {
  const { camera, pointer } = useThree();
  const basePos = useRef(new THREE.Vector3(1.2, 1.8, 6.0));
  const targetLook = useRef(new THREE.Vector3(0.8, 1.4, 0));

  useFrame((_, delta) => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    if (!prefersReducedMotion && !isMobile) {
      // Calculate normalized hero scroll progress (0 at top, ~1 when scrolled past hero)
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight || 800 : 800;
      const scrollProgress = Math.min(1.2, Math.max(0, scrollY / windowHeight));

      // Subtle forward dolly into aisle (Z moves from 6.0 towards 4.8) and gentle vertical tracking
      const targetZ = basePos.current.z - scrollProgress * 1.2;
      const targetX = basePos.current.x + pointer.x * 0.25 + scrollProgress * 0.15;
      const targetY = basePos.current.y + pointer.y * 0.15 - scrollProgress * 0.35;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 2.0, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 2.0, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 2.0, delta);
    } else {
      camera.position.copy(basePos.current);
    }

    camera.lookAt(targetLook.current);
  });

  return null;
};

/**
 * Sweeping LiDAR laser scan line overlay in 3D
 */
const SweepingScanPlane: React.FC = () => {
  const planeRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (planeRef.current) {
      const t = clock.getElapsedTime() * 0.8;
      // Gently sweep vertically between y = -0.5 and y = 3.2
      planeRef.current.position.y = 1.35 + Math.sin(t) * 1.6;
      const mat = planeRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.25 + Math.sin(t * 2) * 0.15;
      }
    }
  });

  return (
    <mesh ref={planeRef} position={[1.5, 1.35, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[5.2, 0.04]} />
      <meshBasicMaterial
        color="#00f2fe"
        transparent
        opacity={0.35}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * 3D Holographic Anomaly Marker for Telemetry Mode (Aligned over empty bay area)
 */
const HolographicAnomalyMarker: React.FC<{ position: [number, number, number] }> = ({
  position,
}) => {
  const markerRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (markerRef.current) {
      const scale = 1 + Math.sin(t * 2.5) * 0.03;
      markerRef.current.scale.set(scale, scale, scale);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.6;
    }
  });

  return (
    <group ref={markerRef} position={position}>
      {/* Red Alert Wireframe Bounding Box */}
      <mesh>
        <boxGeometry args={[2.0, 1.2, 0.8]} />
        <meshBasicMaterial color="#ef4444" wireframe transparent opacity={0.65} />
      </mesh>

      {/* Center Targeting Reticle Ring */}
      <mesh ref={ringRef} position={[0, 0, 0.42]}>
        <ringGeometry args={[0.22, 0.26, 32]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Reticle Crosshairs */}
      <mesh position={[0, 0, 0.42]}>
        <planeGeometry args={[0.65, 0.02]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.42]}>
        <planeGeometry args={[0.02, 0.65]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.7} />
      </mesh>

      {/* Gentle Red Point Light illuminating the region */}
      <pointLight color="#ef4444" intensity={2.2} distance={3.5} decay={2} />
    </group>
  );
};

/**
 * Telemetry Overlay Scene: Non-competing 3D LiDAR HUD & Particle layer designed for the video background
 */
const TelemetryOverlayContent: React.FC = () => {
  return (
    <>
      <CinematicCameraRig />

      {/* Ambient Fill */}
      <ambientLight color="#0d1b38" intensity={1.8} />

      {/* Cyan Rim & Spotlight */}
      <directionalLight position={[3, 6, 4]} intensity={2.0} color="#38bdf8" />
      <pointLight position={[1.5, 2.5, 3]} color="#00f2fe" intensity={1.5} distance={7} />

      {/* 3D Holographic Reticle hovering in 3D space above the empty bay region */}
      <HolographicAnomalyMarker position={[1.6, 1.35, 1.2]} />

      {/* Sweeping LiDAR horizontal laser scan line */}
      <SweepingScanPlane />

      {/* Subtle floating 3D atmospheric data particles catching light */}
      <RefinedAtmosphericParticles count={45} />
    </>
  );
};

/**
 * Full Procedural 3D Scene Content: Used when mode is procedural-3d
 */
const Procedural3DContent: React.FC = () => {
  const rackPos: [number, number, number] = [0.4, 0, 0.6];
  const rackRot: [number, number, number] = [0, -0.18, 0];

  const bayLocalX = 3.3;
  const bayLocalY = 1.6;
  const bayLocalZ = 0;

  const cosR = Math.cos(rackRot[1]);
  const sinR = Math.sin(rackRot[1]);

  const anomalyWorldPos: [number, number, number] = [
    rackPos[0] + bayLocalX * cosR + bayLocalZ * sinR,
    rackPos[1] + bayLocalY,
    rackPos[2] - bayLocalX * sinR + bayLocalZ * cosR,
  ];

  return (
    <>
      <CinematicCameraRig />
      <fog attach="fog" args={['#030712', 14, 36]} />

      <ambientLight color="#0d1b38" intensity={2.4} />
      <directionalLight
        position={[4, 9, 5]}
        intensity={3.2}
        color="#e0f2fe"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-4, 5, 2]} intensity={2.2} color="#38bdf8" />
      <directionalLight position={[2, 6, -8]} intensity={1.8} color="#1d4ed8" />

      <WarehouseRackingSystem
        position={rackPos}
        rotation={rackRot}
        baysCount={3}
        hasAnomalyBay={true}
        anomalyBayIndex={1}
        anomalyLevelIndex={1}
      />

      <CleanEmptyShelfAnomaly
        position={anomalyWorldPos}
        width={2.1}
        height={1.38}
        depth={1.05}
      />

      <WarehouseRackingSystem
        position={[1.5, 0, -5.8]}
        rotation={rackRot}
        baysCount={3}
        hasAnomalyBay={false}
      />

      <WarehouseRackingSystem
        position={[-4.8, 0, -1.8]}
        rotation={[0, 0.32, 0]}
        baysCount={4}
        hasAnomalyBay={false}
      />

      <OverheadAisleFixtures position={[-0.8, 5.3, -0.5]} length={20} />
      <PolishedWarehouseFloor />
      <RefinedAtmosphericParticles count={55} />
    </>
  );
};

/**
 * WebGL Error Fallback UI in case WebGL is unavailable
 */
export const WebGLFallback: React.FC = () => (
  <div className="webgl-fallback-container">
    <div className="fallback-grid" />
    <div className="fallback-anomaly-card">
      <div className="fallback-badge">ANOMALY SIMULATION ACTIVE</div>
      <div className="fallback-shelf-graphic">
        <div className="shelf-bar" />
        <div className="shelf-slots">
          <div className="slot filled" />
          <div className="slot empty-alert">
            <span className="empty-text">PHANTOM STOCK-OUT</span>
          </div>
          <div className="slot filled" />
        </div>
        <div className="shelf-bar" />
      </div>
      <p className="fallback-caption">
        3D Hardware Acceleration Offline. Visualizing Retail Anomaly Vector.
      </p>
    </div>

    <style>{`
      .webgl-fallback-container {
        width: 100%;
        height: 100%;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at 65% 45%, #0d1b38 0%, #030712 85%);
      }
      .fallback-anomaly-card {
        padding: 30px;
        background: rgba(10, 20, 38, 0.9);
        border: 1px solid rgba(239, 68, 68, 0.5);
        border-radius: 16px;
        box-shadow: 0 0 30px rgba(239, 68, 68, 0.25);
        text-align: center;
        max-width: 380px;
      }
      .fallback-badge {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: #ef4444;
        font-weight: 700;
        letter-spacing: 0.1em;
        margin-bottom: 16px;
      }
      .fallback-shelf-graphic {
        padding: 20px 0;
      }
      .shelf-bar {
        height: 4px;
        background: #38bdf8;
        box-shadow: 0 0 8px #00f2fe;
        border-radius: 2px;
      }
      .shelf-slots {
        display: flex;
        gap: 12px;
        padding: 16px 0;
        justify-content: center;
      }
      .slot {
        height: 60px;
        border-radius: 6px;
      }
      .slot.filled {
        width: 45px;
        background: #1e3a8a;
        border: 1px solid #38bdf8;
      }
      .slot.empty-alert {
        width: 140px;
        border: 2px dashed #ef4444;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(239, 68, 68, 0.12);
      }
      .empty-text {
        font-family: var(--font-mono);
        font-size: 0.65rem;
        color: #ef4444;
        font-weight: 800;
      }
      .fallback-caption {
        font-size: 0.82rem;
        color: #94a3b8;
      }
    `}</style>
  </div>
);

/**
 * Main 3D Warehouse Scene Component with Fallback Boundary & Mode Support
 */
export const WarehouseScene: React.FC<WarehouseSceneProps> = ({
  mode = 'telemetry-overlay',
}) => {
  return (
    <div className="warehouse-scene-wrapper">
      <Suspense fallback={<WebGLFallback />}>
        <Canvas
          shadows={mode === 'procedural-3d'}
          dpr={[1, 1.5]}
          camera={{
            position: [1.2, 1.8, 6.0],
            fov: 44,
            near: 0.1,
            far: 45,
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
        >
          {mode === 'telemetry-overlay' ? (
            <TelemetryOverlayContent />
          ) : (
            <Procedural3DContent />
          )}
        </Canvas>
      </Suspense>

      <style>{`
        .warehouse-scene-wrapper {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
          overflow: hidden;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};
