# PID Trainer — Drone Tuning Simulator

An interactive, browser-based simulator for learning to tune a **PID controller**.
You adjust the Proportional, Integral, and Derivative gains and watch a drone try
to hold a target altitude — across seven scenarios that each isolate a classic
tuning problem (oscillation, sluggishness, steady-state error, integral windup,
over-damping, and wind-disturbance rejection).

Built with React, Vite, and `@react-three/fiber` (Three.js) for the 3D scene.

## Running locally

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## How it works

- **`src/physics/DronePhysics.js`** — a 1-D vertical flight model: thrust vs.
  gravity, aerodynamic drag, and an external wind force, integrated each step.
- **`src/physics/PIDController.js`** — a standard PID controller with output and
  integral clamping (anti-windup).
- **`src/App.jsx`** — the simulation loop. Physics runs on a **fixed timestep**
  (1/120 s) via an accumulator, so the outcome is identical regardless of the
  device's frame rate. Wind is fully **deterministic** (a steady bias + layered
  turbulence + hash-seeded gusts), so a given set of gains always produces the
  same result and the same score.
- **`src/scoring/scoring.js`** — grades each run on four metrics, equally
  weighted: overshoot, settling time (dwell-based, so it's robust to isolated
  gusts), steady-state error, and ITAE (cumulative time-weighted error).
- **`src/components/`** — the 3D scene, the live altitude-response graph, the
  gain sliders (drag *or* type a value), scenario picker, and score panel.

## Scenarios

| # | Name | Problem to fix |
|---|------|----------------|
| 0 | The Bouncy Castle | P too high → oscillation |
| 1 | The Sloth | P too low → sluggish |
| 2 | The Wanderer | I too low → steady-state error (steady breeze) |
| 3 | The Tsunami | I too high → integral windup |
| 4 | The Slow Pour | D too high → over-damped / sluggish |
| 5 | The Storm | strong wind → disturbance rejection |
| 6 | Final Exam | multiple issues, no hints |

Each scenario is solvable to a 3-star (≥90) score; the documented `idealP/I/D`
values in `src/scenarios/scenarios.js` are verified to earn three stars.

## Live tools

- **Live tuning** — adjust the PID gains (and the physics) while a run is in
  progress and watch the response change immediately.
- **Step Response HUD** — live Rise / Overshoot / Settle / SS Err readout.
- **PID Output HUD** — diverging bars showing how much the P, I and D terms each
  contribute to the thrust command right now.
- **Physics panel** — Mass, Drag, Delay (actuator lag), Noise (sensor noise) and
  CG (center-of-gravity offset). Defaults match the tuned scenarios.
- **Per-motor heat** — each of the four motors heats with load and cools over
  time; shown as a HUD and as a red-hot glow on the 3D model. CG offset loads
  one side harder.
- **Auto-tune** — searches for good gains against the current scenario *and* the
  current physics, then applies them.
- **Disturb** — injects a sudden shove mid-run so you can watch the controller
  recover.
- **Ghost comparison** — your previous completed run is overlaid on the graph
  (toggle in the graph header) so you can see whether a change actually helped.

## Tips

- **Space** plays/pauses, **R** resets.
- Best score/stars per scenario are saved locally, and the scenario picker shows
  your total stars.
- Drag the seams between panels to resize them (double-click a seam to reset).
- Watch the live graph: overshoot points to P (or I), a persistent gap points to
  I, and a slow, laggy climb points to too much D.
