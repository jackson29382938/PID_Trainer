import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import DroneModel from './DroneModel';
import Ground from './Ground';

function TargetRing({ targetAltitude }) {
  const ringRef = useRef(null);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group position={[0, targetAltitude, 0]}>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.6, 0.7, 32]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.3} side={2} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.65, 0.7, 32]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.6} side={2} />
      </mesh>
      <Text
        position={[0.9, 0, 0]}
        fontSize={0.25}
        color="#00ff88"
        anchorX="left"
        anchorY="middle"
        transparent
        opacity={0.6}
      >
        TARGET
      </Text>
    </group>
  );
}

function AltitudeBeam({ yRef, targetAltitude }) {
  const points = useMemo(() => {
    const p = [];
    p.push(new THREE.Vector3(0, -0.1, 0.4));
    p.push(new THREE.Vector3(0, targetAltitude, 0.4));
    return p;
  }, [targetAltitude]);

  const lineRef = useRef(null);

  useFrame(() => {
    if (lineRef.current) {
      const positions = lineRef.current.geometry.attributes.position;
      positions.setXYZ(0, 0, -0.1, 0.4);
      positions.setXYZ(1, 0, yRef.current, 0.4);
      positions.needsUpdate = true;
    }
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array([0, -0.1, 0.4, 0, targetAltitude, 0.4])}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#00ff88" transparent opacity={0.15} />
    </line>
  );
}

function AltitudeLabels({ yRef, targetAltitude }) {
  return (
    <group>
      <Text
        position={[-1.2, targetAltitude, 0]}
        fontSize={0.2}
        color="#00ff88"
        anchorX="right"
        anchorY="middle"
        transparent
        opacity={0.4}
      >
        {targetAltitude.toFixed(1)}m
      </Text>
      <Text
        position={[-1.2, 0, 0]}
        fontSize={0.2}
        color="#8892b0"
        anchorX="right"
        anchorY="middle"
        transparent
        opacity={0.3}
      >
        0.0m
      </Text>
    </group>
  );
}

function HazeRing({ targetAltitude }) {
  const ringRef = useRef(null);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 0.1;
    }
  });

  if (targetAltitude < 1) return null;

  return (
    <mesh ref={ringRef} position={[0, targetAltitude, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.5, 2.0, 64]} />
      <meshBasicMaterial color="#00ff88" transparent opacity={0.04} side={2} />
    </mesh>
  );
}

function WindParticles({ windStrength }) {
  const count = Math.min(Math.floor(windStrength * 3), 40);
  const particlesRef = useRef(null);
  const startTime = useRef(Date.now());

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;
    }
    return pos;
  }, [count]);

  useFrame(() => {
    if (!particlesRef.current || windStrength <= 0) return;
    const pos = particlesRef.current.geometry.attributes.position;
    const elapsed = (Date.now() - startTime.current) / 1000;
    for (let i = 0; i < count; i++) {
      let x = pos.array[i * 3];
      const y = pos.array[i * 3 + 1];
      const z = pos.array[i * 3 + 2];
      x += windStrength * 0.03;
      if (x > 10) x = -8;
      pos.array[i * 3] = x;
      pos.array[i * 3 + 1] = y + Math.sin(elapsed + i) * 0.01;
    }
    pos.needsUpdate = true;
  });

  if (windStrength <= 0) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#88ccff"
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  );
}

function CameraController({ targetAltitude }) {
  const { camera } = useThree();

  useFrame(() => {
    const idealY = Math.max(2.5, targetAltitude * 0.6);
    camera.position.y += (idealY - camera.position.y) * 0.02;
    camera.lookAt(0, targetAltitude * 0.4, 0);
  });

  return null;
}

export default function DroneScene({
  yRef,
  targetAltitude,
  thrustRef,
  isRunning,
  windStrength,
}) {
  const sceneRef = useRef(null);
  const targetYRef = useRef(targetAltitude);
  targetYRef.current = targetAltitude;

  return (
    <div ref={sceneRef} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        shadows
        camera={{ position: [6, 4, 6], fov: 45, near: 0.1, far: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0e17');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <fog attach="fog" args={['#0a0e17', 12, 25]} />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[8, 12, 6]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={20}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <directionalLight position={[-4, 6, -4]} intensity={0.3} color="#4488ff" />
        <pointLight position={[0, targetAltitude + 2, 0]} intensity={0.2} color="#00ff88" />

        <Ground />
        <TargetRing targetAltitude={targetAltitude} />
        <AltitudeBeam yRef={yRef} targetAltitude={targetAltitude} />
        <AltitudeLabels yRef={yRef} targetAltitude={targetAltitude} />
        <HazeRing targetAltitude={targetAltitude} />
        <WindParticles windStrength={windStrength} />

        <DroneModel
          yRef={yRef}
          targetYRef={targetYRef}
          thrustRef={thrustRef}
          isRunning={isRunning}
        />

        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={3}
          maxDistance={16}
          target={[0, targetAltitude * 0.35, 0]}
        />

        <CameraController targetAltitude={targetAltitude} />
      </Canvas>
    </div>
  );
}
