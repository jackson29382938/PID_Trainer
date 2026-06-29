export function initMetricsState(targetAltitude, simDuration) {
  return {
    target: targetAltitude,
    simDuration: simDuration,
    startIdxTime: simDuration * 0.1,
    peak: -Infinity,
    settlingTime: simDuration,
    bandEntry: null,
    settleBand: targetAltitude * 0.05,
    SETTLE_DWELL: 1.5,
    sseSum: 0,
    sseCount: 0,
    itaeSum: 0,
    relevantCount: 0,
  };
}

export function updateMetricsState(state, time, position, error) {
  if (time < state.startIdxTime) return;

  const absError = Math.abs(error);
  if (position > state.peak) state.peak = position;

  if (absError < state.settleBand) {
    if (state.bandEntry === null) state.bandEntry = time;
    if (state.settlingTime === state.simDuration && time - state.bandEntry >= state.SETTLE_DWELL) {
      state.settlingTime = state.bandEntry;
    }
  } else {
    state.bandEntry = null;
  }

  if (time > state.simDuration - 3) {
    state.sseSum += absError;
    state.sseCount++;
  }

  state.itaeSum += time * absError;
  state.relevantCount++;
}

export function finalizeMetricsState(state) {
  const { target, peak, settlingTime, sseSum, sseCount, itaeSum, relevantCount } = state;

  const overshootPct = target > 0
    ? Math.max(0, ((peak - target) / target) * 100)
    : 0;

  const steadyStateError = sseCount > 0
    ? sseSum / sseCount
    : Infinity;

  const itae = relevantCount > 0
    ? (itaeSum / relevantCount) * 0.01
    : Infinity;

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

  const state = initMetricsState(targetAltitude, simDuration);
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    updateMetricsState(state, h.time, h.position, h.error);
  }
  return finalizeMetricsState(state);
}

// Lightweight step-response readout for the live HUD. Returns null until there
// is enough data; individual fields are null until that milestone is reached.
export function computeLiveMetrics(history, target) {
  if (!history || history.length < 2 || target <= 0) return null;

  // Combine multiple forward passes (rise time, peak, settling time) into one
  // loop to reduce iteration overhead.
  const band = target * 0.05;
  let rise = null;
  let peak = -Infinity;
  let settle = null;
  let entry = null;

  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    const pos = h.position;
    const t = h.time;

    if (pos > peak) peak = pos;
    if (rise === null && pos >= 0.9 * target) rise = t;

    if (settle === null) {
      if (Math.abs(pos - target) < band) {
        if (entry === null) entry = t;
        if (t - entry >= 1.5) settle = entry;
      } else {
        entry = null;
      }
    }
  }

  const overshoot = Math.max(0, ((peak - target) / target) * 100);

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
  const len = history.length;
  if (!history || len < 30) return [];

  const target = targetAltitude;

  // Performance Optimization: Calculate average error, jitter, and peaks in a
  // single pass over the recent window to avoid multiple array allocations.
  const windowSize = Math.min(len, 120);
  const startIdx = len - windowSize;

  let sumError = 0;
  let sumJitter = 0;
  const peaks = [];

  for (let i = startIdx; i < len; i++) {
    const h = history[i];
    sumError += Math.abs(h.error);
    sumJitter += Math.abs(h.velocity || 0);

    // Peak detection: requires looking at neighbors.
    if (i > startIdx && i < len - 1) {
      const prev = history[i - 1].position;
      const curr = h.position;
      const next = history[i + 1].position;
      if (curr > prev && curr > next) {
        peaks.push(curr);
      }
    }
  }

  const avgError = sumError / windowSize;
  const jitter = windowSize > 10 ? sumJitter / windowSize : 0;

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
