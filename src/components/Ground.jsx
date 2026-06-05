import React, { useMemo } from 'react';

const CELL_SIZE = 1;
const GRID_SIZE = 20;

export default function Ground() {
  const gridCells = useMemo(() => {
    const cells = [];
    const half = GRID_SIZE / 2;
    for (let x = -half; x < half; x += CELL_SIZE) {
      for (let z = -half; z < half; z += CELL_SIZE) {
        const isEven = (Math.floor(x / CELL_SIZE) + Math.floor(z / CELL_SIZE)) % 2 === 0;
        cells.push({ x: x + CELL_SIZE / 2, z: z + CELL_SIZE / 2, dark: isEven });
      }
    }
    return cells;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshStandardMaterial color="#0d1420" />
      </mesh>

      {gridCells.map((cell, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[cell.x, 0, cell.z]} receiveShadow>
          <planeGeometry args={[CELL_SIZE * 0.95, CELL_SIZE * 0.95]} />
          <meshStandardMaterial
            color={cell.dark ? '#0f1625' : '#141c2e'}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}

      <gridHelper args={[GRID_SIZE, GRID_SIZE, '#1a2a4a', '#1a2a4a']} position={[0, 0.001, 0]} />
    </group>
  );
}
