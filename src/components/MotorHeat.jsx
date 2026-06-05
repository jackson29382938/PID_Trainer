import React from 'react';

// Visual layout (2×2) mapped to the physics motor indices, which follow the
// arm angles [45°, 135°, 225°, 315°] = [front-right, front-left, back-left,
// back-right]. Grid order is FL, FR, BL, BR.
const CELLS = [
  { idx: 1, label: 'FL' },
  { idx: 0, label: 'FR' },
  { idx: 2, label: 'BL' },
  { idx: 3, label: 'BR' },
];

const tempC = (h) => Math.round(25 + Math.min(h, 1.2) * 65);
const heatColor = (h) => (h > 1 ? '#ff4757' : h > 0.6 ? '#ffa502' : '#00d4ff');

export default function MotorHeat({ heat }) {
  const h = heat || [0, 0, 0, 0];
  return (
    <div className="hud hud-motors">
      <div className="hud-title">Motor Heat</div>
      <div className="motor-grid">
        {CELLS.map(({ idx, label }) => {
          const v = h[idx] || 0;
          const pct = Math.min(100, (v / 1.2) * 100);
          const color = heatColor(v);
          return (
            <div key={label} className="motor-cell">
              <div className="motor-bar">
                <div className="motor-bar-fill" style={{ height: pct + '%', background: color }} />
              </div>
              <div className="motor-meta">
                <span className="motor-name">{label}</span>
                <span className="motor-temp" style={{ color }}>{tempC(v)}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
