import React from 'react';

export default function SimulationControls({
  running,
  completed,
  speed,
  tuning,
  onToggle,
  onReset,
  onSpeedChange,
  onAutoTune,
  onDisturb,
}) {
  return (
    <div className="sim-controls-wrap">
      <div className="sim-controls">
        <button
          className={`sim-btn ${running ? 'btn-pause' : 'btn-play'}`}
          onClick={onToggle}
          title={running ? 'Pause (Space)' : 'Play (Space)'}
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

        <button className="sim-btn btn-reset" onClick={onReset} title="Reset (R)">
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
                aria-pressed={speed === s}
                title={s >= 1 ? `Speed ${s}x (${s})` : `Speed ${s}x`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sim-actions">
        <button
          className="sim-action-btn"
          onClick={onAutoTune}
          disabled={tuning}
          title="Search for good PID gains for this scenario and physics"
        >
          {tuning ? (
            <span className="spinner" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          )}
          <span>{tuning ? 'Tuning…' : 'Auto-tune'}</span>
        </button>

        <button
          className="sim-action-btn"
          onClick={onDisturb}
          disabled={!running}
          title="Apply a sudden disturbance to test rejection"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
          </svg>
          <span>Disturb</span>
        </button>
      </div>
    </div>
  );
}
