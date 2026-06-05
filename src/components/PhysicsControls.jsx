import React from 'react';

export const PHYSICS_DEFAULTS = { mass: 1.0, drag: 0.2, delay: 0, noise: 0, cg: 0 };

const PARAMS = [
  { key: 'mass',  label: 'MASS',  name: 'Mass',              min: 0.5, max: 3,   step: 0.1,  unit: ' kg', dec: 1 },
  { key: 'drag',  label: 'DRAG',  name: 'Drag coefficient',  min: 0,   max: 1,   step: 0.02, unit: '',    dec: 2 },
  { key: 'delay', label: 'DELAY', name: 'Actuator delay',    min: 0,   max: 0.3, step: 0.01, unit: ' s',  dec: 2 },
  { key: 'noise', label: 'NOISE', name: 'Sensor noise',      min: 0,   max: 1,   step: 0.05, unit: '',    dec: 2 },
  { key: 'cg',    label: 'CG',    name: 'Center-of-gravity offset', min: -1, max: 1, step: 0.05, unit: '', dec: 2 },
];

export default function PhysicsControls({ values, onChange }) {
  const setValue = (key, num) => {
    if (!Number.isNaN(num)) onChange({ ...values, [key]: num });
  };

  const isDefault = PARAMS.every(p => values[p.key] === PHYSICS_DEFAULTS[p.key]);

  return (
    <div className="pid-controls">
      <div className="pid-header">
        <span className="pid-title">Physics</span>
        <button
          className="phys-reset"
          onClick={() => onChange({ ...PHYSICS_DEFAULTS })}
          disabled={isDefault}
          title="Reset physics to defaults"
        >
          Reset
        </button>
      </div>
      {PARAMS.map(({ key, label, name, min, max, step, unit, dec }) => (
        <div key={key} className="pid-row">
          <div className="pid-label">
            <span className="pid-param-label phys-label">{label}</span>
            <span className="pid-param-name">{name}</span>
            <span className="pid-value" style={{ color: 'var(--accent)' }}>
              {values[key].toFixed(dec)}{unit}
            </span>
          </div>
          <div className="pid-slider-container">
            <input
              type="range"
              className="pid-slider"
              min={min}
              max={max}
              step={step}
              value={values[key]}
              onChange={e => setValue(key, parseFloat(e.target.value))}
              aria-label={`${name}`}
              style={{
                '--slider-color': 'var(--accent)',
                '--slider-pct': ((values[key] - min) / (max - min)) * 100 + '%',
              }}
            />
            <div className="pid-slider-range">
              <span>{min}</span>
              <span>{max}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
