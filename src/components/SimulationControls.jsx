import React from 'react';

export default function SimulationControls({
  running,
  completed,
  speed,
  onToggle,
  onReset,
  onSpeedChange,
}) {
  return (
    <div className="sim-controls">
      <button
        className={`sim-btn ${running ? 'btn-pause' : 'btn-play'}`}
        onClick={onToggle}
        title={running ? 'Pause' : 'Play'}
      >
        {running ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
        <span>{running ? 'Pause' : completed ? 'Re-run' : 'Play'}</span>
      </button>

      <button className="sim-btn btn-reset" onClick={onReset} title="Reset">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        <span>Reset</span>
      </button>

      <div className="sim-speed">
        <span className="sim-speed-label">Speed</span>
        <div className="sim-speed-btns">
          {[0.5, 1, 2, 3].map(s => (
            <button
              key={s}
              className={`sim-speed-btn ${speed === s ? 'active' : ''}`}
              onClick={() => onSpeedChange(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
