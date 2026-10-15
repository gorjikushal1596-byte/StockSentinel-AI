import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Creates a realistic corrugated carton / retail box with shipping label & tape
 */
const RetailCarton: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  baseColor: string;
  hasLabel?: boolean;
}> = ({ position, size, baseColor, hasLabel = true }) => {
  const [w, h, d] = size;

  // Pre-created materials for performance
  const boxMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.65,
        metalness: 0.05,
      }),
    [baseColor]
  );

  const labelMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f8fafc',
      }),
    []
  );

  const barcodeMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#0f172a',
      }),
    []
  );

  const tapeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ca8a04',
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.7,
      }),
    []
  );

  return (
    <group position={position}>
      {/* Main Box Body */}
      <mesh castShadow receiveShadow material={boxMaterial}>
        <boxGeometry args={[w, h, d]} />
      </mesh>

      {/* Top Packing Tape Strip */}
      <mesh position={[0, h / 2 + 0.002, 0]} material={tapeMaterial}>
        <planeGeometry args={[w * 0.95, d * 0.18]} />
      </mesh>

      {/* Front Face Shipping Label */}
      {hasLabel && (
        <group position={[w * 0.15, 0, d / 2 + 0.002]}>
          <mesh material={labelMaterial}>
            <planeGeometry args={[w * 0.45, h * 0.38]} />
          </mesh>
          {/* Simulated Barcode lines on label */}
          <mesh position={[0, -h * 0.06, 0.001]} material={barcodeMaterial}>
            <planeGeometry args={[w * 0.35, h * 0.14]} />
          </mesh>
        </group>
      )}
    </group>
  );
};

/**
 * Industrial Pallet with wood slats
 */
const WoodenPallet: React.FC<{
  position: [number, number, number];
  width?: number;
  depth?: number;
}> = ({ position, width = 1.1, depth = 1.0 }) => {
  const woodMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#785332',
        roughness: 0.85,
        metalness: 0.05,
      }),
    []
  );

  return (
    <group position={position}>
      {/* 3 Bottom runners */}
      {[-width * 0.42, 0, width * 0.42].map((x, idx) => (
        <mesh key={idx} position={[x, 0.04, 0]} material={woodMaterial} castShadow receiveShadow>
          <boxGeometry args={[0.07, 0.08, depth]} />
        </mesh>
      ))}

      {/* Top deck boards */}
      {Array.from({ length: 5 }).map((_, i) => {
        const z = -depth * 0.4 + i * (depth * 0.2);
        return (
          <mesh key={i} position={[0, 0.09, z]} material={woodMaterial} castShadow receiveShadow>
            <boxGeometry args={[width, 0.02, 0.14]} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Industrial Warehouse Upright Frame (Two vertical columns + diagonal/horizontal lattice bracing)
 */
const UprightFrame: React.FC<{
  position: [number, number, number];
  height: number;
  depth: number;
}> = ({ position, height, depth }) => {
  const frameMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1e3a5f', // Classic industrial racking blue
        roughness: 0.35,
        metalness: 0.8,
      }),
    []
  );

  const braceCount = 6;

  return (
    <group position={position}>
      {/* Front vertical post */}
      <mesh position={[0, height / 2, depth / 2]} material={frameMaterial} castShadow receiveShadow>
        <boxGeometry args={[0.08, height, 0.08]} />
      </mesh>

      {/* Back vertical post */}
      <mesh position={[0, height / 2, -depth / 2]} material={frameMaterial} castShadow receiveShadow>
        <boxGeometry args={[0.08, height, 0.08]} />
      </mesh>

      {/* Baseplates */}
      <mesh position={[0, 0.015, depth / 2]} material={frameMaterial}>
        <boxGeometry args={[0.16, 0.03, 0.16]} />
      </mesh>
      <mesh position={[0, 0.015, -depth / 2]} material={frameMaterial}>
        <boxGeometry args={[0.16, 0.03, 0.16]} />
      </mesh>

      {/* Diagonal & horizontal lattice cross-bracing */}
      {Array.from({ length: braceCount }).map((_, i) => {
        const y = (i + 0.5) * (height / braceCount);
        const isDiagonal = i % 2 === 1;
        return (
          <mesh
            key={i}
            position={[0, y, 0]}
            rotation={[isDiagonal ? 0.45 : 0, 0, 0]}
            material={frameMaterial}
          >
            <boxGeometry args={[0.04, 0.04, depth - 0.08]} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * High-Fidelity Industrial Warehouse Rack Bay System
 */
export const WarehouseRackingSystem: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  baysCount?: number;
  hasAnomalyBay?: boolean;
  anomalyBayIndex?: number;
  anomalyLevelIndex?: number;
}> = ({
  position,
  rotation = [0, 0, 0],
  baysCount = 3,
  hasAnomalyBay = true,
  anomalyBayIndex = 1,
  anomalyLevelIndex = 1,
}) => {
  const bayWidth = 2.2;
  const rackDepth = 1.1;
  const rackHeight = 5.2;
  const levels = [0.15, 1.6, 3.1, 4.6]; // 4 beam levels

  // Safety Orange load crossbeam material
  const orangeBeamMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ea580c', // Safety Orange
        roughness: 0.35,
        metalness: 0.6,
      }),
    []
  );

  // Wire mesh decking material
  const wireDeckMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        wireframe: true,
        roughness: 0.3,
        metalness: 0.7,
      }),
    []
  );

  // Cyan shelf telemetry LED strip material
  const ledRailMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#00f2fe',
        emissive: '#00f2fe',
        emissiveIntensity: 1.6,
        roughness: 0.2,
      }),
    []
  );

  // Box color library for realistic varied retail packaging
  const boxColors = useMemo(
    () => [
      '#b48a56', // Kraft cardboard tan
      '#9a7140', // Darker kraft
      '#cbd5e1', // White/light gray retail package
      '#1e293b', // Sleek navy retail tech box
      '#334155', // Industrial graphite box
      '#c49a6c', // Warm cardboard
    ],
    []
  );

  // Generate neat, realistic pallet & carton stacks for each bay/level
  const inventoryStacks = useMemo(() => {
    const list: Array<{
      bay: number;
      level: number;
      xCenter: number;
      yBeam: number;
      boxes: Array<{
        pos: [number, number, number];
        size: [number, number, number];
        color: string;
      }>;
    }> = [];

    for (let b = 0; b < baysCount; b++) {
      const xCenter = b * bayWidth + bayWidth / 2;

      for (let lvl = 0; lvl < levels.length - 1; lvl++) {
        // Check if this is the designated PHANTOM STOCK-OUT EMPTY BAY!
        if (hasAnomalyBay && b === anomalyBayIndex && lvl === anomalyLevelIndex) {
          // Leave this bay completely vacant of inventory cartons!
          continue;
        }

        const yBeam = levels[lvl];
        const boxes: Array<{
          pos: [number, number, number];
          size: [number, number, number];
          color: string;
        }> = [];

        // 2 pallets per bay (left pallet & right pallet)
        [-bayWidth * 0.25, bayWidth * 0.25].forEach((palletXOffset, pIdx) => {
          const palletCenter = [xCenter + palletXOffset, yBeam + 0.1, 0] as [number, number, number];

          // Neatly stack cartons on this pallet
          const stackPattern = (b + lvl + pIdx) % 3;

          if (stackPattern === 0) {
            // 2x2 double layer of matching retail cartons
            const boxW = 0.44;
            const boxH = 0.38;
            const boxD = 0.42;
            const col = boxColors[(b * 3 + lvl + pIdx) % boxColors.length];

            [-0.22, 0.22].forEach((bx) => {
              [-0.21, 0.21].forEach((bz) => {
                boxes.push({
                  pos: [palletCenter[0] + bx, palletCenter[1] + 0.1 + boxH / 2, palletCenter[2] + bz],
                  size: [boxW, boxH, boxD],
                  color: col,
                });
                // Top layer box
                boxes.push({
                  pos: [palletCenter[0] + bx, palletCenter[1] + 0.1 + boxH * 1.5, palletCenter[2] + bz],
                  size: [boxW, boxH, boxD],
                  color: col,
                });
              });
            });
          } else if (stackPattern === 1) {
            // Larger heavy cartons (2 side by side)
            const boxW = 0.52;
            const boxH = 0.65;
            const boxD = 0.85;
            const col = boxColors[(b * 2 + lvl + 1) % boxColors.length];

            [-0.24, 0.24].forEach((bx) => {
              boxes.push({
                pos: [palletCenter[0] + bx, palletCenter[1] + 0.1 + boxH / 2, palletCenter[2]],
                size: [boxW, boxH, boxD],
                color: col,
              });
            });
          } else {
            // 3 neat long packages
            const boxW = 0.88;
            const boxH = 0.32;
            const boxD = 0.28;
            const col = boxColors[(lvl * 2 + pIdx) % boxColors.length];

            [-0.28, 0, 0.28].forEach((bz) => {
              boxes.push({
                pos: [palletCenter[0], palletCenter[1] + 0.1 + boxH / 2, palletCenter[2] + bz],
                size: [boxW, boxH, boxD],
                color: col,
              });
              boxes.push({
                pos: [palletCenter[0], palletCenter[1] + 0.1 + boxH * 1.5, palletCenter[2] + bz],
                size: [boxW, boxH, boxD],
                color: col,
              });
            });
          }
        });

        list.push({ bay: b, level: lvl, xCenter, yBeam, boxes });
      }
    }

    return list;
  }, [baysCount, bayWidth, boxColors, hasAnomalyBay, anomalyBayIndex, anomalyLevelIndex]);

  return (
    <group position={position} rotation={rotation}>
      {/* Upright Frames separating each bay + ends */}
      {Array.from({ length: baysCount + 1 }).map((_, i) => (
        <UprightFrame
          key={i}
          position={[i * bayWidth, 0, 0]}
          height={rackHeight}
          depth={rackDepth}
        />
      ))}

      {/* Horizontal Load Beams & Wire Decking for each bay */}
      {Array.from({ length: baysCount }).map((_, b) => {
        const xBay = b * bayWidth + bayWidth / 2;
        return (
          <group key={b} position={[xBay, 0, 0]}>
            {levels.map((y, lIdx) => (
              <group key={lIdx} position={[0, y, 0]}>
                {/* Front Heavy Orange Load Beam */}
                <mesh position={[0, 0.05, rackDepth / 2]} material={orangeBeamMaterial} castShadow>
                  <boxGeometry args={[bayWidth - 0.04, 0.1, 0.06]} />
                </mesh>

                {/* Back Load Beam */}
                <mesh position={[0, 0.05, -rackDepth / 2]} material={orangeBeamMaterial} castShadow>
                  <boxGeometry args={[bayWidth - 0.04, 0.1, 0.06]} />
                </mesh>

                {/* Wire Decking Grid on Shelf Level */}
                <mesh position={[0, 0.09, 0]} material={wireDeckMaterial} receiveShadow>
                  <boxGeometry args={[bayWidth - 0.08, 0.02, rackDepth - 0.06]} />
                </mesh>

                {/* Cyan LED Guide Strip along front beam edge */}
                <mesh position={[0, 0.09, rackDepth / 2 + 0.025]} material={ledRailMaterial}>
                  <boxGeometry args={[bayWidth - 0.1, 0.018, 0.015]} />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}

      {/* Stored Pallets & Cartons */}
      {inventoryStacks.map((stack, sIdx) => (
        <group key={sIdx}>
          {/* Pallets under the stack */}
          <WoodenPallet position={[stack.xCenter - bayWidth * 0.25, stack.yBeam + 0.09, 0]} />
          <WoodenPallet position={[stack.xCenter + bayWidth * 0.25, stack.yBeam + 0.09, 0]} />

          {/* Neatly arranged cartons */}
          {stack.boxes.map((box, bIdx) => (
            <RetailCarton
              key={bIdx}
              position={box.pos}
              size={box.size}
              baseColor={box.color}
            />
          ))}
        </group>
      ))}
    </group>
  );
};

/**
 * Refined Phantom Stock-Out Anomaly Focal Point
 * Conspicuously empty shelf bay with restrained red warning light, digital shelf tag, and clean perimeter
 */
export const CleanEmptyShelfAnomaly: React.FC<{
  position: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
}> = ({ position, width = 2.1, height = 1.35, depth = 1.05 }) => {
  const pulseGroupRef = useRef<THREE.Group>(null);
  const redLightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Subtle, slow, restrained breathing pulse (NOT rapid flashing)
    const pulse = 0.8 + Math.sin(t * 2.2) * 0.2;

    if (pulseGroupRef.current) {
      pulseGroupRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.opacity = pulse;
        }
      });
    }

    if (redLightRef.current) {
      redLightRef.current.intensity = 2.2 + Math.sin(t * 2.2) * 0.6;
    }
  });

  return (
    <group position={position}>
      {/* 1. Restrained Red Warning Light inside the empty bay cavity */}
      <pointLight
        ref={redLightRef}
        color="#ef4444"
        intensity={2.6}
        distance={3.8}
        decay={2}
        position={[0, height * 0.35, depth * 0.2]}
      />

      {/* 2. Sleek Architectural Alert Frame outlining the empty shelf void */}
      <group ref={pulseGroupRef}>
        {/* Top, Bottom, Left, Right perimeter glowing laser lines */}
        {/* Bottom front line */}
        <mesh position={[0, 0.02, depth / 2]}>
          <boxGeometry args={[width, 0.025, 0.025]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.85} />
        </mesh>
        {/* Top front line */}
        <mesh position={[0, height - 0.02, depth / 2]}>
          <boxGeometry args={[width, 0.025, 0.025]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.85} />
        </mesh>
        {/* Left front vertical */}
        <mesh position={[-width / 2, height / 2, depth / 2]}>
          <boxGeometry args={[0.025, height, 0.025]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.85} />
        </mesh>
        {/* Right front vertical */}
        <mesh position={[width / 2, height / 2, depth / 2]}>
          <boxGeometry args={[0.025, height, 0.025]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.85} />
        </mesh>

        {/* 4 Corner 'L' Target Brackets */}
        {[
          [-width / 2 + 0.12, 0.12, depth / 2 + 0.01],
          [width / 2 - 0.12, 0.12, depth / 2 + 0.01],
          [-width / 2 + 0.12, height - 0.12, depth / 2 + 0.01],
          [width / 2 - 0.12, height - 0.12, depth / 2 + 0.01],
        ].map(([cx, cy, cz], idx) => (
          <mesh key={idx} position={[cx, cy, cz]}>
            <planeGeometry args={[0.18, 0.18]} />
            <meshBasicMaterial color="#ff4444" wireframe transparent opacity={0.9} />
          </mesh>
        ))}

        {/* Subtle red hazard floor wash on the bare wire deck */}
        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width * 0.95, depth * 0.9]} />
          <meshBasicMaterial
            color="#ef4444"
            transparent
            opacity={0.16}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* 3. Electronic Shelf Tag (ESL) mounted on the orange beam */}
      <group position={[0, -0.04, depth / 2 + 0.04]}>
        {/* Tag casing */}
        <mesh>
          <boxGeometry args={[0.9, 0.08, 0.02]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Tag glowing display */}
        <mesh position={[0, 0, 0.012]}>
          <planeGeometry args={[0.86, 0.065]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* 4. Small, elegant downward alert cone illuminating the bare shelf */}
      <mesh position={[0, height * 0.7, 0]}>
        <coneGeometry args={[0.65, 0.9, 16, 1, true]} />
        <meshBasicMaterial
          color="#ef4444"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

/**
 * Overhead High-Bay Industrial Linear LED Lights
 * Provides authentic warehouse down-lighting and structural ceiling lines
 */
export const OverheadAisleFixtures: React.FC<{
  position: [number, number, number];
  length?: number;
}> = ({ position, length = 16 }) => {
  const housingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1e293b',
        metalness: 0.8,
        roughness: 0.3,
      }),
    []
  );

  const ledMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e0f2fe',
        emissive: '#38bdf8',
        emissiveIntensity: 3.0,
      }),
    []
  );

  return (
    <group position={position}>
      {/* Long fixture housing */}
      <mesh position={[0, 0, 0]} material={housingMat}>
        <boxGeometry args={[0.18, 0.1, length]} />
      </mesh>

      {/* Emissive LED strip face */}
      <mesh position={[0, -0.051, 0]} material={ledMat}>
        <boxGeometry args={[0.12, 0.01, length - 0.2]} />
      </mesh>

      {/* Suspension wire cables from ceiling */}
      {[-length * 0.35, 0, length * 0.35].map((z, idx) => (
        <mesh key={idx} position={[0, 0.8, z]} material={housingMat}>
          <cylinderGeometry args={[0.008, 0.008, 1.6, 6]} />
        </mesh>
      ))}

      {/* Downward cool white/cyan aisle spotlight */}
      <pointLight
        color="#38bdf8"
        intensity={2.8}
        distance={12}
        decay={2}
        position={[0, -0.4, 0]}
      />
    </group>
  );
};

/**
 * Polished Warehouse Floor with Aisle Safety Line Marking
 */
export const PolishedWarehouseFloor: React.FC = () => {
  return (
    <group position={[0, 0, 0]}>
      {/* Main Polished Dark Concrete Ground Plane */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[45, 45]} />
        <meshStandardMaterial
          color="#060c18" // Deep navy concrete
          roughness={0.18} // Smooth polished gloss for rich reflections
          metalness={0.55}
        />
      </mesh>

      {/* Painted Yellow Safety Aisle Guide Line */}
      <mesh position={[0.4, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, 40]} />
        <meshBasicMaterial color="#eab308" transparent opacity={0.4} />
      </mesh>

      {/* Painted Cyan Telemetry Aisle Boundary Line */}
      <mesh position={[-0.4, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.06, 40]} />
        <meshBasicMaterial color="#00f2fe" transparent opacity={0.35} />
      </mesh>
    </group>
  );
};

/**
 * Refined Warehouse Floating Dust & Data Specks (Restrained Count)
 */
export const RefinedAtmosphericParticles: React.FC<{ count?: number }> = ({ count = 60 }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);

    const cyan = new THREE.Color('#38bdf8');
    const blue = new THREE.Color('#2563eb');

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.3) * 12;
      pos[i * 3 + 1] = Math.random() * 5 + 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14;

      const c = Math.random() > 0.4 ? cyan : blue;
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }

    return [pos, cols];
  }, [count]);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.45}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
