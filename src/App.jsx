import React, { useState, useRef, useEffect, useCallback } from 'react';
import SCENARIOS from './scenarios/scenarios';
import PIDController from './physics/PIDController';
import { createDroneState, stepPhysics } from './physics/DronePhysics';
import { computeMetrics, computeHints } from './scoring/scoring';
import DroneScene from './components/DroneScene';
import PIDControls from './components/PIDControls';
import ErrorGraph from './components/ErrorGraph';
import ScenarioPanel from './components/ScenarioPanel';
import ScoreDisplay from './components/ScoreDisplay';
import SimulationControls from './components/SimulationControls';

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
  }, []);

  const reset = useCallback(() => {
    resetSimRefs();
    setMetrics(null);
    setHints([]);
    setCompleted(false);
    setRunning(false);
    setHistorySnapshot([]);
  }, [resetSimRefs]);

  useEffect(() => {
    setPidValues({
      p: scenario.initialP,
      i: scenario.initialI,
      d: scenario.initialD,
    });
    reset();
  }, [scenarioId]);

  const toggleRunning = useCallback(() => {
    if (completed) {
      resetSimRefs();
      setMetrics(null);
      setHints([]);
      setCompleted(false);
      setHistorySnapshot([]);
      setRunning(true);
    } else {
      setRunning(r => !r);
    }
  }, [completed, resetSimRefs]);

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
        const wind = scen.windEnabled ? windForce(scen.windStrength, sim.time) : 0;
        const pidOutput = controller.update(scen.targetAltitude, sim.position, FIXED_DT);
        const result = stepPhysics(sim, pidOutput, wind, FIXED_DT);

        droneYRef.current = sim.position;
        thrustRef.current = result.thrustPercent;

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

      // Throttle React state updates (graph + hints) to the wall clock so the
      // physics rate doesn't flood the render path.
      if (now - lastSnapshotTime.current > 80) {
        lastSnapshotTime.current = now;
        setHistorySnapshot([...historyRef.current]);
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
          <DroneScene
            yRef={droneYRef}
            targetAltitude={scenario.targetAltitude}
            thrustRef={thrustRef}
            isRunning={running || completed}
            windStrength={scenario.windEnabled ? scenario.windStrength : 0}
          />
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
          />
          <PIDControls
            values={pidValues}
            onChange={setPidValues}
            disabled={running}
          />
          <SimulationControls
            running={running}
            completed={completed}
            speed={speed}
            onToggle={toggleRunning}
            onReset={reset}
            onSpeedChange={setSpeed}
          />
          {hints.length > 0 && running && (
            <div className="hints-panel">
              <div className="hints-title">Live Flight Analysis</div>
              {hints.map((h, i) => (
                <div key={i} className="hint-line">{h}</div>
              ))}
            </div>
          )}
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
          </span>
        </div>
        <ErrorGraph history={historySnapshot} targetAltitude={scenario.targetAltitude} />
      </div>
    </div>
  );
}
