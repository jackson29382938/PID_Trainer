export function computeMetrics(history, targetAltitude, simDuration) {
  if (!history || history.length < 10) {
    return {
      overshootPct: 0,
      settlingTime: simDuration,
      steadyStateError: Infinity,
      itae: Infinity,
      total: 0,
      stars: 0,
      analysis: [],
    };
  }

  const target = targetAltitude;
  const startIdx = Math.floor(history.length * 0.1);
  const relevantHistory = history.slice(startIdx);

  const peak = Math.max(...relevantHistory.map(h => h.position));
  const overshootPct = target > 0
    ? Math.max(0, ((peak - target) / target) * 100)
    : 0;

  // Settling time = the first moment the response enters the ±5% band and then
  // holds it for a sustained dwell. A dwell test (rather than "in band until the
  // very end") is robust to isolated wind gusts in disturbance scenarios, while
  // still penalising genuine oscillation — which never holds the band that long.
  const settleBand = target * 0.05;
  const SETTLE_DWELL = 1.5;
  let settlingTime = simDuration;
  let bandEntry = null;
  for (let i = 0; i < relevantHistory.length; i++) {
    const h = relevantHistory[i];
    if (Math.abs(h.position - target) < settleBand) {
      if (bandEntry === null) bandEntry = h.time;
      if (h.time - bandEntry >= SETTLE_DWELL) {
        settlingTime = bandEntry;
        break;
      }
    } else {
      bandEntry = null;
    }
  }

  const lastFewSeconds = relevantHistory.filter(h => h.time > Math.max(0, simDuration - 3));
  const steadyStateError = lastFewSeconds.length > 0
    ? lastFewSeconds.reduce((sum, h) => sum + Math.abs(h.error), 0) / lastFewSeconds.length
    : Infinity;

  let itae = 0;
  for (let i = 0; i < relevantHistory.length; i++) {
    const h = relevantHistory[i];
    itae += h.time * Math.abs(h.error);
  }
  itae = (itae / relevantHistory.length) * 0.01;

  const osScore = overshootPct < 5 ? 100 : overshootPct < 15 ? 80 : overshootPct < 30 ? 50 : overshootPct < 50 ? 20 : 0;
  const stScore = settlingTime < 3 ? 100 : settlingTime < 5 ? 80 : settlingTime < 8 ? 50 : settlingTime < 12 ? 20 : 0;
  const sseScore = steadyStateError < 0.05 ? 100 : steadyStateError < 0.15 ? 80 : steadyStateError < 0.4 ? 50 : steadyStateError < 0.8 ? 20 : 0;
  const itaeScore = itae < 2 ? 100 : itae < 5 ? 80 : itae < 10 ? 50 : itae < 20 ? 20 : 0;

  const total = Math.round(osScore * 0.25 + stScore * 0.25 + sseScore * 0.25 + itaeScore * 0.25);

  const stars = total >= 90 ? 3 : total >= 70 ? 2 : total >= 40 ? 1 : 0;

  const analysis = [];
  if (overshootPct > 15) analysis.push("Large overshoot — P gain may be too high or I too high");
  else if (overshootPct > 5) analysis.push("Slight overshoot — acceptable but could be improved");
  if (settlingTime > 8) analysis.push("Slow to settle — try tuning P and D for faster convergence");
  else if (settlingTime > 4) analysis.push("Moderate settling time — some room for improvement");
  if (steadyStateError > 0.3) analysis.push("Steady-state error detected — increase I gain to eliminate it");
  if (itae > 10) analysis.push("High cumulative error — overall response needs improvement");

  return {
    overshootPct: Math.round(overshootPct * 10) / 10,
    settlingTime: Math.round(settlingTime * 10) / 10,
    steadyStateError: Math.round(steadyStateError * 100) / 100,
    itae: Math.round(itae * 10) / 10,
    osScore,
    stScore,
    sseScore,
    itaeScore,
    total,
    stars,
    analysis,
  };
}

// Lightweight step-response readout for the live HUD. Returns null until there
// is enough data; individual fields are null until that milestone is reached.
export function computeLiveMetrics(history, target) {
  if (!history || history.length < 2 || target <= 0) return null;

  // Rise time: first time the response reaches 90% of target.
  let rise = null;
  let peak = -Infinity;
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    if (h.position > peak) peak = h.position;
    if (rise === null && h.position >= 0.9 * target) rise = h.time;
  }

  const overshoot = Math.max(0, ((peak - target) / target) * 100);

  // Settling time: first sustained (1.5s) entry into the ±5% band.
  const band = target * 0.05;
  let settle = null;
  let entry = null;
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    if (Math.abs(h.position - target) < band) {
      if (entry === null) entry = h.time;
      if (h.time - entry >= 1.5) { settle = entry; break; }
    } else {
      entry = null;
    }
  }

  // Steady-state error: average |error| over the most recent second.
  const now = history[history.length - 1].time;
  let sum = 0;
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].time < now - 1) break;
    sum += Math.abs(history[i].error);
    count++;
  }
  const sserr = count > 0 ? sum / count : Math.abs(history[history.length - 1].error);

  return { rise, overshoot, settle, sserr };
}

export function computeHints(history, targetAltitude, pidValues, elapsed) {
  if (!history || history.length < 30) return [];

  const target = targetAltitude;
  const recent = history.slice(-Math.min(history.length, 120));

  const recentErrors = recent.map(h => Math.abs(h.error));
  const avgError = recentErrors.reduce((a, b) => a + b, 0) / recentErrors.length;

  const positions = recent.map(h => h.position);
  const peaks = [];
  for (let i = 1; i < positions.length - 1; i++) {
    if (positions[i] > positions[i - 1] && positions[i] > positions[i + 1]) {
      peaks.push(positions[i]);
    }
  }

  const jitter = recent.length > 10
    ? recent.map(h => Math.abs(h.velocity || 0)).reduce((a, b) => a + b, 0) / recent.length
    : 0;

  const hints = [];
  const firstPeak = peaks.length > 0 ? peaks[0] : 0;

  if (firstPeak > target * 1.3 && elapsed < 5) {
    hints.push("Large initial overshoot — P gain may be too high");
  }
  if (peaks.length >= 4) {
    hints.push("Sustained oscillation — P gain is likely too high");
  }
  if (peaks.length >= 2 && peaks[0] > target * 1.2 && peaks.length <= 3) {
    hints.push("Multiple overshoots — try increasing D gain for more damping");
  }
  if (avgError > 0.5 && elapsed > 8 && peaks.length < 2) {
    if (pidValues.i < 0.15) {
      hints.push("Persistent error — I gain is too low to eliminate steady-state error");
    }
  }
  if (jitter > 1.5 && avgError < 0.3) {
    hints.push("Excessive jitter — D gain may be too high, causing nervous response");
  }
  if (pidValues.i > 1.0 && peaks.length >= 2) {
    hints.push("I gain looks high — integral windup may be causing growing overshoots");
  }
  if (firstPeak < target * 0.3 && elapsed > 5) {
    hints.push("Very slow response — P gain is too low, the drone isn't climbing fast enough");
  }

  return hints.slice(0, 2);
}
