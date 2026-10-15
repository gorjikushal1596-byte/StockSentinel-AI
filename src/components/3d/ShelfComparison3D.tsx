import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

/**
 * 3D Shelf Bay Component with interactive rotation, scroll tilt, and click state
 */
const InteractiveShelfBay: React.FC<{
  isAnomalySelected: boolean;
  onSelectAnomaly: () => void;
  isInteracting: boolean;
}> = ({ isAnomalySelected, onSelectAnomaly, isInteracting }) => {
  const groupRef = useRef<THREE.Group>(null);
  const alertLightRef = useRef<THREE.PointLight>(null);
  const reticleRef = useRef<THREE.Group>(null);
  const { pointer, gl } = useThree();

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    if (alertLightRef.current) {
      alertLightRef.current.intensity = isAnomalySelected
        ? 3.8 + Math.sin(t * 4) * 1.2
        : 2.4 + Math.sin(t * 3) * 0.8;
    }
    if (reticleRef.current) {
      const pulse = 1 + Math.sin(t * 3.5) * (isAnomalySelected ? 0.06 : 0.03);
      reticleRef.current.scale.set(pulse, pulse, pulse);
    }

    if (groupRef.current) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      if (!prefersReducedMotion && !isMobile) {
        // Calculate scroll-linked tilt based on shelf position in viewport
        const rect = gl.domElement.getBoundingClientRect();
        const windowHeight = typeof window !== 'undefined' ? window.innerHeight || 800 : 800;
        const centerY = windowHeight / 2;
        const canvasCenterY = rect.top + rect.height / 2;
        const scrollTiltX = Math.max(-0.14, Math.min(0.14, (centerY - canvasCenterY) * 0.00035));

        // Interactive pointer rotation when active; smoothly eases back to neutral [0,0,0] when not interacting
        const targetRotY = isInteracting ? pointer.x * 0.28 : 0;
        const targetRotX = isInteracting ? -pointer.y * 0.16 + scrollTiltX : scrollTiltX;

        groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, 3.5, delta);
        groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX, 3.5, delta);
      } else if (!prefersReducedMotion && isMobile) {
        const targetRotY = isInteracting ? pointer.x * 0.2 : 0;
        groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, 3.5, delta);
        groupRef.current.rotation.x = 0;
      } else {
        groupRef.current.rotation.set(0, 0, 0);
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.6, 0]}>
      {/* Heavy Industrial Metal Uprights */}
      {[-1.8, 1.8].map((x, i) => (
        <group key={i} position={[x, 1.2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.09, 3.2, 0.09]} />
            <meshStandardMaterial color="#1e3a5f" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, -1.6, 0]}>
            <boxGeometry args={[0.18, 0.03, 0.18]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      ))}

      {/* Crossbeams (Orange) */}
      {[0, 1.4, 2.8].map((y, idx) => (
        <group key={idx} position={[0, y, 0]}>
          <mesh position={[0, 0, 0.45]} castShadow>
            <boxGeometry args={[3.6, 0.09, 0.06]} />
            <meshStandardMaterial color="#ea580c" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, -0.45]} castShadow>
            <boxGeometry args={[3.6, 0.09, 0.06]} />
            <meshStandardMaterial color="#ea580c" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Wire decking */}
          <mesh position={[0, 0.04, 0]} receiveShadow>
            <boxGeometry args={[3.5, 0.02, 0.85]} />
            <meshStandardMaterial color="#94a3b8" wireframe roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* TOP SHELF (Stocked Normally - Level 2) */}
      <group position={[0, 1.45, 0]}>
        {[-1.1, -0.4, 0.3, 1.0].map((x, idx) => (
          <mesh key={idx} position={[x, 0.22, (idx % 2 ? 0.1 : -0.1)]} castShadow>
            <boxGeometry args={[0.55, 0.4, 0.45]} />
            <meshStandardMaterial
              color={idx % 2 ? '#b48a56' : '#1e293b'}
              roughness={0.5}
            />
          </mesh>
        ))}
      </group>

      {/* BOTTOM SHELF LEFT BAY (Stocked Normally - Level 1 Left) */}
      <group position={[-0.9, 0.05, 0]}>
        <mesh position={[-0.3, 0.25, 0]} castShadow>
          <boxGeometry args={[0.5, 0.46, 0.5]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
        <mesh position={[0.28, 0.25, 0]} castShadow>
          <boxGeometry args={[0.48, 0.46, 0.48]} />
          <meshStandardMaterial color="#9a7140" roughness={0.6} />
        </mesh>
      </group>

      {/* BOTTOM SHELF RIGHT BAY: THE PHANTOM EMPTY SHELF (Level 1 Right) */}
      <group
        position={[0.9, 0.05, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectAnomaly();
        }}
      >
        {/* Invisible Click Target */}
        <mesh position={[0, 0.6, 0]} visible={false}>
          <boxGeometry args={[1.6, 1.2, 0.9]} />
        </mesh>

        {/* Pulsing Alert Light */}
        <pointLight
          ref={alertLightRef}
          color="#ef4444"
          intensity={isAnomalySelected ? 3.5 : 2.2}
          distance={3.2}
          position={[0, 0.5, 0.4]}
        />

        {/* Reticle & Warning Bounds */}
        <group ref={reticleRef}>
          {/* Holographic Wireframe bounding box */}
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[1.5, 1.15, 0.8]} />
            <meshBasicMaterial
              color="#ef4444"
              wireframe
              transparent
              opacity={isAnomalySelected ? 0.9 : 0.6}
            />
          </mesh>

          {/* Glowing Red Floor Zone */}
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.45, 0.75]} />
            <meshBasicMaterial
              color="#ef4444"
              transparent
              opacity={isAnomalySelected ? 0.35 : 0.18}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Electronic Shelf Tag on Beam */}
          <mesh position={[0, -0.04, 0.48]}>
            <boxGeometry args={[0.85, 0.065, 0.02]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      </group>

      {/* Floor */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#060c18" roughness={0.2} metalness={0.6} />
      </mesh>
    </group>
  );
};

export const ShelfComparison3D: React.FC<{
  isAnomalySelected: boolean;
  onSelectAnomaly: () => void;
}> = ({ isAnomalySelected, onSelectAnomaly }) => {
  const [isInteracting, setIsInteracting] = useState(false);

  return (
    <div
      className="shelf-3d-wrapper"
      onPointerEnter={() => setIsInteracting(true)}
      onPointerLeave={() => setIsInteracting(false)}
    >
      <Canvas
        camera={{ position: [0.6, 1.5, 4.4], fov: 42 }}
        dpr={[1, 1.5]}
        style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
      >
        <ambientLight color="#0c182f" intensity={2.0} />
        <directionalLight position={[3, 6, 4]} color="#e0f2fe" intensity={2.5} castShadow />
        <directionalLight position={[-3, 4, 2]} color="#38bdf8" intensity={1.8} />

        <InteractiveShelfBay
          isAnomalySelected={isAnomalySelected}
          onSelectAnomaly={onSelectAnomaly}
          isInteracting={isInteracting}
        />
      </Canvas>

      <div className="shelf-3d-click-hint">
        <span className="hint-pulse" />
        <span>Click the highlighted empty shelf bay to inspect anomaly</span>
      </div>

      <style>{`
        .shelf-3d-wrapper {
          position: relative;
          width: 100%;
          height: 380px;
          border-radius: 16px;
          overflow: hidden;
          background: radial-gradient(circle at 60% 40%, rgba(14, 116, 144, 0.12) 0%, rgba(3, 7, 18, 0.8) 80%);
          border: 1px solid rgba(56, 189, 248, 0.16);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
        }

        .shelf-3d-click-hint {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(10, 20, 38, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(239, 68, 68, 0.35);
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: #fca5a5;
          pointer-events: none;
        }

        .hint-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 8px #ef4444;
          animation: alertBlink 1.5s infinite;
        }
      `}</style>
    </div>
  );
};
