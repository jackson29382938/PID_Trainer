import React from 'react';

function Tile({ label, value, color }) {
  return (
    <div className="hud-tile">
      <div className="hud-tile-label">{label}</div>
      <div className="hud-tile-value" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

export default function MetricsHUD({ metrics, target }) {
  const m = metrics || {};
  const rise = m.rise == null ? '—' : m.rise.toFixed(2) + 's';
  const overshoot = m.overshoot == null ? '—' : m.overshoot.toFixed(1) + '%';
  const settle = m.settle == null ? '—' : m.settle.toFixed(2) + 's';
  const sserr = m.sserr == null ? '—' : m.sserr.toFixed(2) + 'm';

  const osColor = m.overshoot == null ? undefined
    : m.overshoot > 15 ? '#ff4757' : m.overshoot > 5 ? '#ffa502' : '#00ff88';
  const sseColor = m.sserr == null ? undefined
    : m.sserr > 0.3 ? '#ff4757' : m.sserr > 0.1 ? '#ffa502' : '#00ff88';

  return (
    <div className="hud hud-metrics">
      <div className="hud-title">Step Response</div>
      <div className="hud-tiles">
        <Tile label="Rise" value={rise} />
        <Tile label="Overshoot" value={overshoot} color={osColor} />
        <Tile label="Settle" value={settle} />
        <Tile label="SS Err" value={sserr} color={sseColor} />
      </div>
    </div>
  );
}
