import React from 'react';
import SCENARIOS from '../scenarios/scenarios';

export default function ScenarioPanel({ scenarioId, onSelect, disabled, bestScores = {} }) {
  const scenario = SCENARIOS[scenarioId];

  const totalStars = SCENARIOS.reduce((sum, s, i) => sum + (bestScores[i]?.stars || 0), 0);
  const maxStars = SCENARIOS.length * 3;

  return (
    <div className="scenario-panel">
      <div className="scenario-header">
        <label className="scenario-title" htmlFor="scenario-select">Scenario</label>
        <span className="scenario-progress" title="Total stars earned">
          ★ {totalStars}/{maxStars}
        </span>
      </div>
      <select
        id="scenario-select"
        className="scenario-select"
        value={scenarioId}
        onChange={e => onSelect(parseInt(e.target.value))}
        disabled={disabled}
      >
        {SCENARIOS.map((s, i) => {
          const stars = bestScores[i]?.stars || 0;
          const badge = stars > 0 ? '  ' + '★'.repeat(stars) : '';
          return (
            <option key={s.id} value={i}>
              {s.icon} {s.name}{badge}
            </option>
          );
        })}
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
