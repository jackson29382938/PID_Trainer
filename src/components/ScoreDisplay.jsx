import React from 'react';

function Star({ filled, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block' }}>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? '#ffd700' : 'rgba(255,255,255,0.1)'}
        stroke={filled ? '#ffd700' : 'rgba(255,255,255,0.2)'}
        strokeWidth="1"
      />
    </svg>
  );
}

function ScoreGauge({ value, maxValue, label, color, unit = '' }) {
  const pct = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;
  return (
    <div className="score-gauge">
      <div className="score-gauge-label">
        <span>{label}</span>
        <span style={{ color }}>{value}{unit}</span>
      </div>
      <div className="score-gauge-bar">
        <div
          className="score-gauge-fill"
          style={{ width: pct + '%', backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function ScoreDisplay({ metrics, best }) {
  if (!metrics || !metrics.total) {
    return (
      <div className="score-display">
        <div className="score-empty">Run a simulation to see your score</div>
        {best && (
          <div className="score-best">
            Personal best: <strong>{best.total}</strong>
        <span
          className="score-best-stars"
          role="img"
          aria-label={`${best.stars} out of 3 stars`}
        >
              {[1, 2, 3].map(i => (
            <span key={i} aria-hidden="true">
              <Star filled={i <= best.stars} size={11} />
            </span>
              ))}
            </span>
          </div>
        )}
      </div>
    );
  }

  const { total, stars, overshootPct, settlingTime, steadyStateError, itae, analysis } = metrics;

  const scoreColor = total >= 90 ? '#00ff88' : total >= 70 ? '#ffa502' : total >= 40 ? '#ff6b6b' : '#ff4757';
  const isNewBest = !best || total >= best.total;

  return (
    <div className="score-display">
      <div className="score-main">
        <div
          className="score-stars"
          role="img"
          aria-label={`${stars} out of 3 stars`}
        >
          {[1, 2, 3].map(i => (
            <span key={i} aria-hidden="true">
              <Star filled={i <= stars} size={20} />
            </span>
          ))}
        </div>
        <div className="score-number" style={{ color: scoreColor }}>{total}</div>
        <div className="score-label">Score</div>
        {best && (
          isNewBest
            ? <div className="score-newbest">★ New personal best!</div>
            : <div className="score-best">Best: <strong>{best.total}</strong></div>
        )}
      </div>

      <div className="score-metrics">
        <ScoreGauge
          value={100 - Math.min(100, overshootPct * 3)}
          maxValue={100}
          label="Overshoot"
          color="#ff6b6b"
          unit={`% (${overshootPct}%)`}
        />
        <ScoreGauge
          value={100 - Math.min(100, settlingTime * 8)}
          maxValue={100}
          label="Settling"
          color="#ffa502"
          unit={`s (${settlingTime}s)`}
        />
        <ScoreGauge
          value={100 - Math.min(100, steadyStateError * 150)}
          maxValue={100}
          label="Steady Err"
          color="#00d4ff"
          unit={`m (${steadyStateError}m)`}
        />
        <ScoreGauge
          value={100 - Math.min(100, itae * 6)}
          maxValue={100}
          label="ITAE"
          color="#a855f7"
          unit={` (${itae})`}
        />
      </div>

      {analysis.length > 0 && (
        <div className="score-analysis">
          <div className="score-analysis-title">Analysis</div>
          {analysis.map((a, i) => (
            <div key={i} className="score-analysis-line">{a}</div>
          ))}
        </div>
      )}
    </div>
  );
}
