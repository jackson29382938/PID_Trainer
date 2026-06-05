import React from 'react';

const PARAMS = [
  { key: 'p', label: 'P', name: 'Proportional', color: '#ff6b6b', min: 0, max: 10, step: 0.1 },
  { key: 'i', label: 'I', name: 'Integral', color: '#ffa502', min: 0, max: 2.5, step: 0.01 },
  { key: 'd', label: 'D', name: 'Derivative', color: '#00d4ff', min: 0, max: 7, step: 0.1 },
];

export default function PIDControls({ values, onChange, disabled }) {
  const handleSlider = (key, raw) => {
    const num = parseFloat(raw);
    if (!isNaN(num)) onChange({ ...values, [key]: num });
  };

  return (
    <div className="pid-controls">
      <div className="pid-header">
        <span className="pid-title">PID Gains</span>
        <span className="pid-subtitle">Adjust values</span>
      </div>
      {PARAMS.map(({ key, label, name, color, min, max, step }) => (
        <div key={key} className="pid-row">
          <div className="pid-label">
            <span className="pid-param-label" style={{ color }}>{label}</span>
            <span className="pid-param-name">{name}</span>
            <span className="pid-value" style={{ color }}>{values[key].toFixed(key === 'i' ? 2 : 1)}</span>
          </div>
          <div className="pid-slider-container">
            <input
              type="range"
              className="pid-slider"
              min={min}
              max={max}
              step={step}
              value={values[key]}
              onChange={e => handleSlider(key, e.target.value)}
              disabled={disabled}
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
