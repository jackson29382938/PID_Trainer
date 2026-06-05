import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';

const ARM_LENGTH = 0.7;
const ARM_ANGLES = [45, 135, 225, 315].map(deg => (deg * Math.PI) / 180);

const PROPELLER_RADIUS = 0.2;
const PROPELLER_SEGMENTS = 16;

function Propeller({ position, spinSpeed }) {
  const meshRef = useRef(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += spinSpeed * delta * 20;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[PROPELLER_RADIUS, PROPELLER_RADIUS, 0.015, PROPELLER_SEGMENTS]} />
        <meshStandardMaterial
          color="#556677"
          transparent
          opacity={0.7}
          metalness={0.3}
          roughness={0.4}
          side={2}
        />
      </mesh>
      <mesh rotation={[0, 0, 0]} position={[0, -0.01, 0]}>
        <cylinderGeometry args={[PROPELLER_RADIUS * 0.6, PROPELLER_RADIUS * 0.6, 0.008, PROPELLER_SEGMENTS]} />
        <meshStandardMaterial
          color="#7788aa"
          transparent
          opacity={0.4}
          side={2}
        />
      </mesh>
    </group>
  );
}

function Arm({ angle, spinSpeed }) {
  const tipX = Math.cos(angle) * ARM_LENGTH;
  const tipZ = Math.sin(angle) * ARM_LENGTH;
  const midX = tipX / 2;
  const midZ = tipZ / 2;

  return (
    <group>
      <mesh position={[midX, 0, midZ]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[ARM_LENGTH, 0.04, 0.04]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.6} roughness={0.3} />
      </mesh>

      <mesh position={[tipX, -0.04, tipZ]}>
        <cylinderGeometry args={[0.06, 0.07, 0.08, 8]} />
        <meshStandardMaterial color="#222244" metalness={0.5} roughness={0.4} />
      </mesh>

      <Propeller position={[tipX, 0.06, tipZ]} spinSpeed={spinSpeed} />
    </group>
  );
}

function BatteryIndicator({ thrustRef }) {
  const fillRef = useRef(null);
  const materialRef = useRef(null);

  useFrame(() => {
    if (!fillRef.current || !materialRef.current) return;
    const pct = thrustRef.current;
    const width = Math.max(0.001, (pct / 100) * 0.18);
    fillRef.current.scale.x = width / 0.18;
    fillRef.current.position.x = -0.09 + width / 2;
    materialRef.current.color.set(pct > 50 ? '#00ff88' : pct > 20 ? '#ffa502' : '#ff4757');
  });

  return (
    <group position={[0, -0.16, 0]}>
      <mesh>
        <boxGeometry args={[0.2, 0.04, 0.1]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh ref={fillRef}>
        <boxGeometry args={[0.18, 0.02, 0.08]} />
        <meshStandardMaterial ref={materialRef} color="#00ff88" />
      </mesh>
    </group>
  );
}

export default function DroneModel({ yRef, targetYRef, thrustRef, isRunning }) {
  const groupRef = useRef(null);
  const bodyRef = useRef(null);
  const spinSpeedRef = useRef(0);
  const currentTilt = useRef(0);
  const visualY = useRef(0);

  useFrame((_, delta) => {
    const targetY = yRef.current;
    const thrust = thrustRef.current;

    visualY.current += (targetY - visualY.current) * Math.min(1, delta * 15);
    spinSpeedRef.current += ((thrust / 100) * 8 - spinSpeedRef.current) * delta * 5;

    const tiltTarget = isRunning ? Math.max(-0.2, Math.min(0.2, (thrust - 45) * 0.008)) : 0;
    currentTilt.current += (tiltTarget - currentTilt.current) * delta * 8;

    if (groupRef.current) {
      groupRef.current.position.y = visualY.current;
      groupRef.current.rotation.x = currentTilt.current * 0.3;
      groupRef.current.rotation.z = -currentTilt.current * 0.15;
    }

    if (bodyRef.current) {
      const glowIntensity = isRunning ? Math.min(1, (thrust / 60) * 0.5) : 0;
      bodyRef.current.material.emissiveIntensity = glowIntensity;
    }
  });

  const spinSpeed = spinSpeedRef.current;

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh ref={bodyRef} castShadow>
        <boxGeometry args={[0.35, 0.12, 0.35]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.7}
          roughness={0.2}
          emissive="#00d4ff"
          emissiveIntensity={0}
        />
      </mesh>

      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.38, 0.02, 0.38]} />
        <meshStandardMaterial color="#222244" metalness={0.4} roughness={0.3} />
      </mesh>

      {ARM_ANGLES.map((angle, i) => (
        <Arm key={i} angle={angle} spinSpeed={spinSpeed} />
      ))}

      <BatteryIndicator thrustRef={thrustRef} />

      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.05, 0.04, 0.05]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}
