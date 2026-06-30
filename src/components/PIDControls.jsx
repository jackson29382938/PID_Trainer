import React, { useState } from 'react';

const PARAMS = [
  { key: 'p', label: 'P', name: 'Proportional', color: '#ff6b6b', min: 0, max: 10, step: 0.1 },
  { key: 'i', label: 'I', name: 'Integral', color: '#ffa502', min: 0, max: 2.5, step: 0.01 },
  { key: 'd', label: 'D', name: 'Derivative', color: '#00d4ff', min: 0, max: 7, step: 0.1 },
];

const decimalsFor = (key) => (key === 'i' ? 2 : 1);

// Editable numeric field that keeps a local string buffer while focused so the
// user can type intermediate values (e.g. "1.") without React clobbering them.
function GainInput({ paramKey, value, name, min, max, step, color, disabled, onCommit }) {
  const decimals = decimalsFor(paramKey);
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  const commit = (raw) => {
    const num = parseFloat(raw);
    if (Number.isNaN(num)) return;
    onCommit(Math.max(min, Math.min(max, num)));
  };

  return (
    <input
      type="number"
      className="pid-value-input"
      value={focused ? text : value.toFixed(decimals)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={`${name} gain`}
      style={{ color }}
      onFocus={() => { setFocused(true); setText(value.toFixed(decimals)); }}
      onBlur={() => setFocused(false)}
      onChange={(e) => { setText(e.target.value); commit(e.target.value); }}
    />
  );
}

export default function PIDControls({ values, onChange, onReset, isDefault, disabled }) {
  const setValue = (key, num) => {
    if (!Number.isNaN(num)) onChange({ ...values, [key]: num });
  };

  return (
    <div className="pid-controls">
      <div className="pid-header">
        <span className="pid-title">PID Gains</span>
        <button
          className="phys-reset"
          onClick={onReset}
          disabled={disabled || isDefault}
          title="Reset PID gains to scenario defaults"
        >
          Reset
        </button>
      </div>
      {PARAMS.map(({ key, label, name, color, min, max, step }) => (
        <div key={key} className="pid-row">
          <div className="pid-label">
            <span className="pid-param-label" style={{ color }}>{label}</span>
            <span className="pid-param-name">{name}</span>
            <GainInput
              paramKey={key}
              value={values[key]}
              name={name}
              min={min}
              max={max}
              step={step}
              color={color}
              disabled={disabled}
              onCommit={(num) => setValue(key, num)}
            />
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
              disabled={disabled}
              aria-label={`${name} gain slider`}
              style={{
                '--slider-color': color,
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
