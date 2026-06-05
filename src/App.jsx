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

function windForce(strength, time) {
  const base = (
    Math.sin(time * 1.73 + 1.2) * 0.35 +
    Math.sin(time * 3.41 + 0.8) * 0.2 +
    Math.sin(time * 0.7 + 3.1) * 0.15
  ) * strength;
  const gust = Math.random() > 0.995 ? (Math.random() - 0.5) * strength * 2.5 : 0;
  return base + gust;
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

  const simStateRef = useRef(createDroneState());
  const controllerRef = useRef(new PIDController(2, 0.1, 0.5));
  const historyRef = useRef([]);
  const animRef = useRef(null);
  const pidRef = useRef(pidValues);
  const scenarioRef = useRef(SCENARIOS[scenarioId]);
  const runningRef = useRef(false);
  const speedRef = useRef(1);
  const droneYRef = useRef(0);
  const thrustRef = useRef(0);
  const lastSnapshotTime = useRef(0);

  pidRef.current = pidValues;
  scenarioRef.current = SCENARIOS[scenarioId];
  runningRef.current = running;
  speedRef.current = speed;

  const scenario = SCENARIOS[scenarioId];

  const reset = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    simStateRef.current = createDroneState();
    controllerRef.current = new PIDController(pidRef.current.p, pidRef.current.i, pidRef.current.d);
    historyRef.current = [];
    droneYRef.current = 0;
    thrustRef.current = 0;
    lastSnapshotTime.current = 0;
    setMetrics(null);
    setHints([]);
    setCompleted(false);
    setRunning(false);
    setHistorySnapshot([]);
  }, []);

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
      simStateRef.current = createDroneState();
      controllerRef.current = new PIDController(
        pidRef.current.p, pidRef.current.i, pidRef.current.d
      );
      historyRef.current = [];
      droneYRef.current = 0;
      thrustRef.current = 0;
      lastSnapshotTime.current = 0;
      setMetrics(null);
      setHints([]);
      setCompleted(false);
      setHistorySnapshot([]);
      setRunning(true);
    } else {
      setRunning(r => !r);
    }
  }, [completed]);

  useEffect(() => {
    if (!running) return;

    let rafId;
    let lastTick = performance.now();

    const tick = (now) => {
      const deltaMs = now - lastTick;
      lastTick = now;

      if (deltaMs > 300) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min((deltaMs / 1000) * speedRef.current, 0.05);
      const sim = simStateRef.current;
      const controller = controllerRef.current;
      const scen = scenarioRef.current;

      if (sim.time >= scen.duration) {
        setRunning(false);
        setCompleted(true);
        const m = computeMetrics(historyRef.current, scen.targetAltitude, scen.duration);
        setMetrics(m);
        setHistorySnapshot([...historyRef.current]);
        setHints([]);
        return;
      }

      const wind = scen.windEnabled ? windForce(scen.windStrength, sim.time) : 0;

      controller.setGains(pidRef.current.p, pidRef.current.i, pidRef.current.d);
      const pidOutput = controller.update(scen.targetAltitude, sim.position, dt);

      const result = stepPhysics(sim, pidOutput, wind, dt);

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

      if (now - lastSnapshotTime.current > 80) {
        lastSnapshotTime.current = now;
        setHistorySnapshot([...historyRef.current]);
      }

      if (historyRef.current.length % 45 === 0) {
        const h = computeHints(
          historyRef.current, scen.targetAltitude, pidRef.current, sim.time
        );
        setHints(h);
      }

      rafId = requestAnimationFrame(tick);
    };

    lastTick = performance.now();
    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [running, reset]);

  return (
    <div className="app">
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
        </div>
        <div className="control-panel">
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
          <ScoreDisplay metrics={metrics} />
        </div>
      </main>

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
