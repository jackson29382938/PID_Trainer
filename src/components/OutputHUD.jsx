import React from 'react';

// Diverging bar: positive contributions grow right of centre, negative left.
// Scaled against the controller's ±12 output clamp.
const SCALE = 12;

function TermBar({ label, value, color }) {
  const mag = Math.min(1, Math.abs(value) / SCALE) * 50; // % of half-width
  const positive = value >= 0;
  return (
    <div className="out-row">
      <span className="out-label" style={{ color }}>{label}</span>
      <div className="out-track">
        <div className="out-center" />
        <div
          className="out-fill"
          style={{
            width: mag + '%',
            background: color,
            left: positive ? '50%' : undefined,
            right: positive ? undefined : '50%',
          }}
        />
      </div>
      <span className="out-value">{value >= 0 ? '+' : ''}{value.toFixed(1)}</span>
    </div>
  );
}

export default function OutputHUD({ terms }) {
  const t = terms || { p: 0, i: 0, d: 0, output: 0 };
  return (
    <div className="hud hud-output">
      <div className="hud-title">PID Output</div>
      <TermBar label="P" value={t.p} color="#ff6b6b" />
      <TermBar label="I" value={t.i} color="#ffa502" />
      <TermBar label="D" value={t.d} color="#00d4ff" />
      <div className="out-total">
        <span>Thrust cmd</span>
        <span className="out-total-val">{t.output >= 0 ? '+' : ''}{t.output.toFixed(1)} N</span>
      </div>
    </div>
  );
}
