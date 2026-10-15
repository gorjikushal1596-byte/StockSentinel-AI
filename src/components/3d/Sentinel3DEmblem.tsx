import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * 3D Holographic StockSentinel Emblem with continuous orbital motion and scroll-linked reveal
 */
export const Sentinel3DEmblem: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const { gl } = useThree();

  useFrame(({ clock }, delta) => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      if (groupRef.current) {
        groupRef.current.rotation.set(0.12, 0.22, 0);
        groupRef.current.scale.set(1, 1, 1);
      }
      return;
    }

    const t = clock.getElapsedTime();

    // Subtle continuous rotation & orbital precession of rings
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 0.35;
      outerRingRef.current.rotation.x = Math.sin(t * 0.45) * 0.25;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = -t * 0.5;
      innerRingRef.current.rotation.y = Math.cos(t * 0.55) * 0.3;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.75;
      coreRef.current.rotation.x = Math.sin(t * 0.4) * 0.15;
      const corePulse = 1 + Math.sin(t * 2.8) * 0.04;
      coreRef.current.scale.set(corePulse, corePulse, corePulse);
    }

    // Restrained cyan light pulse matching StockSentinel AI theme
    if (lightRef.current) {
      lightRef.current.intensity = 2.4 + Math.sin(t * 2.2) * 0.7;
    }
    if (auraRef.current) {
      const auraMat = auraRef.current.material as THREE.MeshBasicMaterial;
      if (auraMat) {
        auraMat.opacity = 0.12 + Math.sin(t * 2.2) * 0.06;
      }
      const auraScale = 1 + Math.sin(t * 1.8) * 0.05;
      auraRef.current.scale.set(auraScale, auraScale, 1);
    }

    // Scroll-linked rotation and gentle scale transition as section enters view
    if (groupRef.current) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      if (isMobile) {
        groupRef.current.scale.set(1, 1, 1);
        groupRef.current.rotation.y = t * 0.2;
        groupRef.current.rotation.x = 0.1;
      } else {
        const rect = gl.domElement.getBoundingClientRect();
        const windowHeight = typeof window !== 'undefined' ? window.innerHeight || 800 : 800;
        // Reveal progress: 0 when top is at bottom of viewport, 1 when section is well centered/visible
        const enterProgress = Math.max(0, Math.min(1, (windowHeight - rect.top) / (windowHeight * 0.85)));

        // Gentle scale transition from 0.82 to 1.05 based on scroll reveal
        const targetScale = 0.82 + enterProgress * 0.23;
        // Scroll-linked tilt & yaw
        const scrollTiltX = (0.5 - rect.top / windowHeight) * 0.22;
        const scrollYawY = (0.5 - rect.top / windowHeight) * 0.28;

        // Continuous orbital floating tumbling + scroll-linked reveal
        const targetRotY = t * 0.2 + scrollYawY;
        const targetRotX = Math.sin(t * 0.3) * 0.12 + scrollTiltX;

        groupRef.current.scale.setScalar(
          THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 4.0, delta)
        );
        groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, 3.5, delta);
        groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX, 3.5, delta);
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Restrained Cyan Aura Glow Halo in 3D */}
      <mesh ref={auraRef} position={[0, 0, -0.15]}>
        <ringGeometry args={[0.7, 1.85, 48]} />
        <meshBasicMaterial
          color="#00f2fe"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer Cyan Radar Ring */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[1.5, 0.025, 16, 64]} />
        <meshStandardMaterial color="#00f2fe" emissive="#00f2fe" emissiveIntensity={2.5} />
      </mesh>

      {/* Inner Blue Orbital Ring */}
      <mesh ref={innerRingRef} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[1.1, 0.018, 16, 48]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.8} />
      </mesh>

      {/* Central Floating Polyhedron Sensor Core */}
      <mesh ref={coreRef}>
        <octahedronGeometry args={[0.65, 0]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.9}
          roughness={0.15}
          emissive="#00f2fe"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Alert Core Accent Node */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Dynamic Restrained Cyan & Alert Point Lights */}
      <pointLight ref={lightRef} color="#00f2fe" intensity={2.5} distance={6} />
      <pointLight color="#ef4444" intensity={1.2} distance={3} />
    </group>
  );
};
