import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import SCENARIOS from './scenarios/scenarios';
import PIDController from './physics/PIDController';
import { createDroneState, stepPhysics } from './physics/DronePhysics';
import { computeMetrics, computeHints, computeLiveMetrics, initMetricsState, updateMetricsState, finalizeMetricsState } from './scoring/scoring';
// The 3D scene pulls in three.js / r3f; load it lazily so the app shell paints
// first and the heavy libraries download in their own chunk.
const DroneScene = lazy(() => import('./components/DroneScene'));
import PIDControls from './components/PIDControls';
import PhysicsControls, { PHYSICS_DEFAULTS } from './components/PhysicsControls';
import ErrorGraph from './components/ErrorGraph';
import ScenarioPanel from './components/ScenarioPanel';
import ScoreDisplay from './components/ScoreDisplay';
import SimulationControls from './components/SimulationControls';
import MetricsHUD from './components/MetricsHUD';
import MotorHeat from './components/MotorHeat';
import OutputHUD from './components/OutputHUD';

// Deterministic high-frequency sensor noise (scaled by the NOISE physics param).
function sensorNoise(time) {
  return (
    Math.sin(time * 41.3) +
    0.7 * Math.sin(time * 67.1 + 1.0) +
    0.5 * Math.sin(time * 113.9 + 2.0)
  );
}

// Headless run of a full scenario with given gains/physics, returning its score.
// Optimized to compute metrics incrementally without allocating a large history
// array, significantly speeding up the auto-tuner's search.
function simulateScore(scenario, physics, gains) {
  const { duration, targetAltitude, windEnabled, windStrength } = scenario;
  const { noise } = physics;

  const sim = createDroneState();
  const c = new PIDController(gains.p, gains.i, gains.d);
  const metricsState = initMetricsState(targetAltitude, duration);

  while (sim.time < duration) {
    const wind = windEnabled ? windForce(windStrength, sim.time) : 0;
    const meas = noise > 0
      ? sim.position + noise * 0.05 * sensorNoise(sim.time)
      : sim.position;
    const out = c.update(targetAltitude, meas, FIXED_DT);
    stepPhysics(sim, out, wind, FIXED_DT, physics);

    updateMetricsState(metricsState, {
      time: sim.time,
      position: sim.position,
      error: targetAltitude - sim.position,
    });
  }
  return finalizeMetricsState(metricsState).total;
}

// Coarse grid search followed by a local refine. Cheap enough (~550 short sims)
// to run synchronously on a button press.
function autoTune(scenario, physics) {
  const round = (v, step) => Math.round(v / step) * step;
  let best = -1;
  let bestG = { p: 2, i: 0.1, d: 0.5 };

  const search = (Ps, Is, Ds) => {
    for (const p of Ps) for (const i of Is) for (const d of Ds) {
      const total = simulateScore(scenario, physics, { p, i, d });
      if (total > best) { best = total; bestG = { p, i, d }; }
    }
  };

  search(
    [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
    [0, 0.15, 0.3, 0.45, 0.6, 0.8],
    [0, 0.5, 1, 1.5, 2, 2.5, 3],
  );

  const span = (c, step, lo, hi) => {
    const a = [];
    for (let k = -2; k <= 2; k++) {
      const v = +(c + k * step).toFixed(3);
      if (v >= lo && v <= hi) a.push(v);
    }
    return a;
  };
  search(span(bestG.p, 0.2, 0, 10), span(bestG.i, 0.05, 0, 2.5), span(bestG.d, 0.2, 0, 7));

  return {
    p: clamp(round(bestG.p, 0.1), 0, 10),
    i: clamp(round(bestG.i, 0.05), 0, 2.5),
    d: clamp(round(bestG.d, 0.1), 0, 7),
    total: best,
  };
}

// Keep at most `max` evenly-spaced samples — used to store a lightweight ghost
// of a completed run for overlay.
function downsample(arr, max) {
  if (arr.length <= max) return arr.map(h => ({ time: h.time, position: h.position }));
  const step = arr.length / max;
  const out = [];
  for (let i = 0; i < max; i++) {
    const h = arr[Math.floor(i * step)];
    out.push({ time: h.time, position: h.position });
  }
  out.push({ time: arr[arr.length - 1].time, position: arr[arr.length - 1].position });
  return out;
}

// Fixed physics timestep. Decoupling integration from the render rate keeps the
// simulation deterministic, so identical gains always yield identical scores
// regardless of the device's frame rate.
const FIXED_DT = 1 / 120;
const MAX_FRAME = 0.25; // clamp huge frame gaps (e.g. backgrounded tab)
const BESTS_KEY = 'pidTrainerBests';

// Deterministic pseudo-random in [0, 1) from an integer bucket. Used so wind
// gusts are repeatable from run to run instead of depending on Math.random().
function hash01(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function windForce(strength, time) {
  // A steady directional component (the bias) is what the integral term must
  // learn to cancel — this is what makes the "raise I to reject wind" lessons
  // actually true. Lighter turbulence and rare gusts ride on top of it.
  const bias = -0.18 * strength;
  const turbulence = (
    Math.sin(time * 1.73 + 1.2) * 0.16 +
    Math.sin(time * 3.41 + 0.8) * 0.09 +
    Math.sin(time * 0.7 + 3.1) * 0.07
  ) * strength;
  // A gust holds for ~0.1s windows and is fully determined by the time bucket.
  const bucket = Math.floor(time * 10);
  const gust = hash01(bucket) > 0.99 ? (hash01(bucket + 0.5) - 0.5) * strength : 0;
  return bias + turbulence + gust;
}

function loadBests() {
  try {
    return JSON.parse(localStorage.getItem(BESTS_KEY) || '{}');
  } catch {
    return {};
  }
}

const LAYOUT_KEY = 'pidTrainerLayout';
const LAYOUT_DEFAULTS = { panelWidth: 360, graphHeight: 220 };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Bounds keep each panel usable: the scene always keeps room and panels never
// collapse to nothing or exceed the viewport.
const minPanelWidth = () => 240;
const maxPanelWidth = () => Math.max(260, window.innerWidth - 320);
const minGraphHeight = () => 120;
const maxGraphHeight = () => Math.max(140, window.innerHeight - 220);

function loadLayout() {
  try {
    return { ...LAYOUT_DEFAULTS, ...JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}') };
  } catch {
    return { ...LAYOUT_DEFAULTS };
  }
}

export default function App() {
  const [scenarioId, setScenarioId] = useState(0);
  const [pidValues, setPidValues] = useState({ p: 2, i: 0.1, d: 0.5 });
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [metrics, setMetrics] = useState(null);
  const [hints, setHints] = useState([]);
  const [historySnapshot, setHistorySnapshot] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [bestScores, setBestScores] = useState(loadBests);
  const [layout, setLayout] = useState(loadLayout);
  const [physics, setPhysics] = useState({ ...PHYSICS_DEFAULTS });
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [motorHeat, setMotorHeat] = useState([0, 0, 0, 0]);
  const [pidTerms, setPidTerms] = useState(null);
  const [ghost, setGhost] = useState(null);
  const [showGhost, setShowGhost] = useState(true);
  const [tuning, setTuning] = useState(false);

  const simStateRef = useRef(createDroneState());
  const controllerRef = useRef(new PIDController(2, 0.1, 0.5));
  const historyRef = useRef([]);
  const pidRef = useRef(pidValues);
  const scenarioRef = useRef(SCENARIOS[scenarioId]);
  const speedRef = useRef(1);
  const droneYRef = useRef(0);
  const thrustRef = useRef(0);
  const lastSnapshotTime = useRef(0);
  const accumulatorRef = useRef(0);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const physicsRef = useRef(physics);
  physicsRef.current = physics;
  const motorHeatRef = useRef([0, 0, 0, 0]);
  const pidTermsRef = useRef(null);
  const impulseRef = useRef(0);

  pidRef.current = pidValues;
  scenarioRef.current = SCENARIOS[scenarioId];
  speedRef.current = speed;

  const scenario = SCENARIOS[scenarioId];
  const best = bestScores[scenarioId];

  const recordBest = useCallback((id, m) => {
    if (!m || !m.total) return;
    setBestScores(prev => {
      const prior = prev[id];
      if (prior && prior.total >= m.total) return prev;
      const next = { ...prev, [id]: { total: m.total, stars: m.stars } };
      try { localStorage.setItem(BESTS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Reset the mutable simulation refs to a fresh run with the current gains.
  const resetSimRefs = useCallback(() => {
    simStateRef.current = createDroneState();
    controllerRef.current = new PIDController(pidRef.current.p, pidRef.current.i, pidRef.current.d);
    historyRef.current = [];
    droneYRef.current = 0;
    thrustRef.current = 0;
    lastSnapshotTime.current = 0;
    accumulatorRef.current = 0;
    motorHeatRef.current = [0, 0, 0, 0];
    pidTermsRef.current = null;
    impulseRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    resetSimRefs();
    setMetrics(null);
    setHints([]);
    setCompleted(false);
    setRunning(false);
    setHistorySnapshot([]);
    setLiveMetrics(null);
    setMotorHeat([0, 0, 0, 0]);
    setPidTerms(null);
  }, [resetSimRefs]);

  useEffect(() => {
    setPidValues({
      p: scenario.initialP,
      i: scenario.initialI,
      d: scenario.initialD,
    });
    setGhost(null);
    reset();
  }, [scenarioId]);

  const toggleRunning = useCallback(() => {
    if (completed) {
      resetSimRefs();
      setMetrics(null);
      setHints([]);
      setCompleted(false);
      setHistorySnapshot([]);
      setLiveMetrics(null);
      setMotorHeat([0, 0, 0, 0]);
      setPidTerms(null);
      setRunning(true);
    } else {
      setRunning(r => !r);
    }
  }, [completed, resetSimRefs]);

  // Auto-tune: search for good gains against the current scenario AND the
  // current physics, then apply them. Deferred a tick so the spinner can paint.
  const handleAutoTune = useCallback(() => {
    setTuning(true);
    setTimeout(() => {
      const best = autoTune(scenarioRef.current, physicsRef.current);
      setPidValues({ p: best.p, i: best.i, d: best.d });
      setTuning(false);
    }, 30);
  }, []);

  // Inject a sudden downward shove to test disturbance rejection (only while
  // running). Applied on the next physics step.
  const handleDisturb = useCallback(() => {
    impulseRef.current -= 5;
  }, []);

  // Keyboard shortcuts: Space = play/pause, R = reset. Ignored while typing.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggleRunning();
      } else if (e.key === 'r' || e.key === 'R') {
        reset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleRunning, reset]);

  // Drag-to-resize the panels. 'width' adjusts the control panel, 'height' the
  // graph panel; the scene fills whatever is left.
  const startResize = useCallback((axis) => (e) => {
    e.preventDefault();
    const onMove = (ev) => {
      if (axis === 'width') {
        const w = clamp(window.innerWidth - ev.clientX, minPanelWidth(), maxPanelWidth());
        setLayout(prev => ({ ...prev, panelWidth: w }));
      } else {
        const h = clamp(window.innerHeight - ev.clientY, minGraphHeight(), maxGraphHeight());
        setLayout(prev => ({ ...prev, graphHeight: h }));
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layoutRef.current)); } catch { /* ignore */ }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = axis === 'width' ? 'col-resize' : 'row-resize';
  }, []);

  const resetResize = useCallback((axis) => () => {
    setLayout(prev => {
      const next = axis === 'width'
        ? { ...prev, panelWidth: LAYOUT_DEFAULTS.panelWidth }
        : { ...prev, graphHeight: LAYOUT_DEFAULTS.graphHeight };
      try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Keep panel sizes valid when the window itself is resized.
  useEffect(() => {
    const onResize = () => setLayout(prev => ({
      panelWidth: clamp(prev.panelWidth, minPanelWidth(), maxPanelWidth()),
      graphHeight: clamp(prev.graphHeight, minGraphHeight(), maxGraphHeight()),
    }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!running) return;

    let rafId;
    let lastTick = performance.now();

    const finish = () => {
      setRunning(false);
      setCompleted(true);
      const scen = scenarioRef.current;
      const m = computeMetrics(historyRef.current, scen.targetAltitude, scen.duration);
      setMetrics(m);
      setHistorySnapshot([...historyRef.current]);
      setHints([]);
      recordBest(scen.id, m);
      // Stash this run as the ghost so the next run can be compared against it.
      setGhost({
        data: downsample(historyRef.current, 400),
        gains: { ...pidRef.current },
        total: m.total,
      });
    };

    const tick = (now) => {
      let frameSec = (now - lastTick) / 1000;
      lastTick = now;
      if (frameSec > MAX_FRAME) frameSec = MAX_FRAME;

      accumulatorRef.current = Math.min(accumulatorRef.current + frameSec * speedRef.current, MAX_FRAME);

      const sim = simStateRef.current;
      const controller = controllerRef.current;
      const scen = scenarioRef.current;

      controller.setGains(pidRef.current.p, pidRef.current.i, pidRef.current.d);

      while (accumulatorRef.current >= FIXED_DT) {
        if (sim.time >= scen.duration) {
          finish();
          return;
        }
        const phys = physicsRef.current;
        // Apply a pending manual disturbance as a one-shot velocity impulse.
        if (impulseRef.current !== 0) {
          sim.velocity += impulseRef.current;
          impulseRef.current = 0;
        }
        const wind = scen.windEnabled ? windForce(scen.windStrength, sim.time) : 0;
        // The controller only ever sees the (optionally noisy) measured altitude.
        const measurement = phys.noise > 0
          ? sim.position + phys.noise * 0.05 * sensorNoise(sim.time)
          : sim.position;
        const pidOutput = controller.update(scen.targetAltitude, measurement, FIXED_DT);
        const result = stepPhysics(sim, pidOutput, wind, FIXED_DT, phys);

        droneYRef.current = sim.position;
        thrustRef.current = result.thrustPercent;
        motorHeatRef.current = result.motorHeat;
        pidTermsRef.current = {
          p: controller.pTerm,
          i: controller.iTerm,
          d: controller.dTerm,
          output: controller.output,
        };

        historyRef.current.push({
          time: sim.time,
          position: sim.position,
          target: scen.targetAltitude,
          error: scen.targetAltitude - sim.position,
          pidOutput,
          thrust: result.thrustPercent,
          velocity: sim.velocity,
        });

        accumulatorRef.current -= FIXED_DT;
      }

      // Throttle React state updates (graph, hints, HUD) to the wall clock so
      // the physics rate doesn't flood the render path.
      if (now - lastSnapshotTime.current > 80) {
        lastSnapshotTime.current = now;
        setHistorySnapshot([...historyRef.current]);
        setLiveMetrics(computeLiveMetrics(historyRef.current, scen.targetAltitude));
        setMotorHeat([...motorHeatRef.current]);
        setPidTerms(pidTermsRef.current);
        if (scen.liveHints !== false) {
          setHints(computeHints(historyRef.current, scen.targetAltitude, pidRef.current, sim.time));
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [running, recordBest]);

  return (
    <div
      className="app"
      style={{
        '--panel-width': layout.panelWidth + 'px',
        '--graph-height': layout.graphHeight + 'px',
      }}
    >
      <header className="app-header">
        <div className="header-left">
          <span className="header-icon">⟐</span>
          <h1 className="header-title">PID Trainer</h1>
          <span className="header-subtitle">Drone Tuning Simulator</span>
        </div>
        <div className="header-center">
          <span className="scenario-badge">
            <span className="scenario-badge-icon">{scenario.icon}</span>
            {scenario.name}
          </span>
          {running && (
            <span className="header-status">
              <span className="status-dot" />
              Running — {Math.round(simStateRef.current.time * 10) / 10}s / {scenario.duration}s
            </span>
          )}
          {completed && (
            <span className="header-status status-complete">
              Simulation Complete
            </span>
          )}
        </div>
        <div className="header-right">
          {metrics && (
            <div className="header-score">
              <div className="header-stars">
                {[1, 2, 3].map(i => (
                  <span key={i} className={`star ${i <= metrics.stars ? 'filled' : ''}`}>
                    ★
                  </span>
                ))}
              </div>
              <span
                className="header-score-num"
                style={{
                  color: metrics.total >= 90 ? '#00ff88'
                    : metrics.total >= 70 ? '#ffa502'
                    : metrics.total >= 40 ? '#ff6b6b'
                    : '#ff4757'
                }}
              >
                {metrics.total}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="scene-panel">
          <Suspense fallback={<div className="scene-loading">Loading 3D scene…</div>}>
            <DroneScene
              yRef={droneYRef}
              targetAltitude={scenario.targetAltitude}
              thrustRef={thrustRef}
              motorHeatRef={motorHeatRef}
              isRunning={running || completed}
              windStrength={scenario.windEnabled ? scenario.windStrength : 0}
            />
          </Suspense>
          <div className="hud-anchor tl">
            <MetricsHUD metrics={liveMetrics} target={scenario.targetAltitude} />
            <OutputHUD terms={pidTerms} />
          </div>
          <div className="hud-anchor br">
            <MotorHeat heat={motorHeat} />
          </div>
          {hints.length > 0 && running && (
            <div className="flight-analysis">
              <div className="hints-title">Live Flight Analysis</div>
              {hints.map((h, i) => (
                <div key={i} className="hint-line">{h}</div>
              ))}
            </div>
          )}
          <button
            className="panel-toggle"
            onClick={() => setPanelOpen(o => !o)}
            aria-label={panelOpen ? 'Hide controls' : 'Show controls'}
            aria-expanded={panelOpen}
          >
            {panelOpen ? '✕' : '☰'}
          </button>
        </div>
        <div className={`control-panel ${panelOpen ? 'open' : ''}`}>
          <ScenarioPanel
            scenarioId={scenarioId}
            onSelect={setScenarioId}
            disabled={running}
            bestScores={bestScores}
          />
          <PIDControls
            values={pidValues}
            onChange={setPidValues}
          />
          <PhysicsControls
            values={physics}
            onChange={setPhysics}
          />
          <SimulationControls
            running={running}
            completed={completed}
            speed={speed}
            tuning={tuning}
            onToggle={toggleRunning}
            onReset={reset}
            onSpeedChange={setSpeed}
            onAutoTune={handleAutoTune}
            onDisturb={handleDisturb}
          />
          <ScoreDisplay metrics={metrics} best={best} />
        </div>
        <div
          className="resizer resizer-v"
          onPointerDown={startResize('width')}
          onDoubleClick={resetResize('width')}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize control panel"
          title="Drag to resize · double-click to reset"
        />
      </main>

      <div
        className="resizer resizer-h"
        onPointerDown={startResize('height')}
        onDoubleClick={resetResize('height')}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize graph panel"
        title="Drag to resize · double-click to reset"
      />
      <div className="graph-panel">
        <div className="graph-header">
          <span>Altitude Response</span>
          <span className="graph-legend">
            <span className="legend-item"><span className="legend-dot" style={{ background: '#00d4ff' }} /> Drone</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#00ff88' }} /> Target</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#ff4757', opacity: 0.4 }} /> Error</span>
            {ghost && (
              <button
                className={`graph-ghost-toggle ${showGhost ? 'active' : ''}`}
                onClick={() => setShowGhost(v => !v)}
                title="Toggle the previous run overlay"
              >
                <span className="legend-dot legend-dot-ghost" />
                Previous{ghost.gains ? ` (${ghost.total})` : ''}
              </button>
            )}
          </span>
        </div>
        <ErrorGraph
          history={historySnapshot}
          targetAltitude={scenario.targetAltitude}
          ghost={showGhost && ghost ? ghost.data : null}
        />
      </div>
    </div>
  );
}
