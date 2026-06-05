import React from 'react';
import SCENARIOS from '../scenarios/scenarios';

export default function ScenarioPanel({ scenarioId, onSelect, disabled }) {
  const scenario = SCENARIOS[scenarioId];

  return (
    <div className="scenario-panel">
      <div className="scenario-header">
        <span className="scenario-title">Scenario</span>
      </div>
      <select
        className="scenario-select"
        value={scenarioId}
        onChange={e => onSelect(parseInt(e.target.value))}
        disabled={disabled}
      >
        {SCENARIOS.map((s, i) => (
          <option key={s.id} value={i}>
            {s.icon} {s.name}
          </option>
        ))}
      </select>
      {scenario && (
        <div className="scenario-description">
          <div className="scenario-short">
            {scenario.icon} <strong>{scenario.name}</strong> — {scenario.shortDesc}
          </div>
          <div className="scenario-detail">{scenario.description}</div>
        </div>
      )}
    </div>
  );
}
