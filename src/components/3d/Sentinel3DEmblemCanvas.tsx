import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Sentinel3DEmblem } from './Sentinel3DEmblem';

export const Sentinel3DEmblemCanvas: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.2], fov: 42 }}
      dpr={[1, 1.5]}
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <ambientLight color="#0c182f" intensity={1.5} />
      <directionalLight position={[2, 4, 3]} color="#38bdf8" intensity={1.8} />
      <Sentinel3DEmblem />
    </Canvas>
  );
};

export default Sentinel3DEmblemCanvas;

