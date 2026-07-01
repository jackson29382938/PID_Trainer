export const PHYSICS = {
  gravity: 9.81,
  maxThrust: 22.0,
  groundRestitution: 0.2,
  // Defaults for the user-adjustable parameters. With these values the model
  // behaves exactly as the tuned scenarios were balanced against.
  mass: 1.0,
  dragCoeff: 0.2,
  delay: 0,
  noise: 0,
  cg: 0,
};

// Motor arm angles (must match DroneModel's ARM_ANGLES so the heat readout and
// the 3D props line up).
export const MOTOR_ANGLES = [45, 135, 225, 315].map(d => (d * Math.PI) / 180);
// Precompute cosines to avoid 4 Math.cos calls per physics step (120Hz).
export const MOTOR_COSINES = MOTOR_ANGLES.map(Math.cos);

const NOMINAL_PER_MOTOR = PHYSICS.maxThrust / 4;
const HEAT_GAIN = 0.45;
const HEAT_COOLING = 0.4;
const MAX_HEAT = 1.5;

// Reusable result object for headless simulations to avoid GC pressure.
const SKIP_RESULT = { thrust: 0, thrustPercent: 0, acceleration: 0, netForce: 0 };

export function createDroneState() {
  return {
    position: 0,
    velocity: 0,
    time: 0,
    completed: false,
    thrustBuffer: new Float32Array(64), // circular buffer for actuator delay
    thrustIdx: 0,
    motorHeat: [0, 0, 0, 0],            // per-motor thermal state (0..MAX_HEAT)
  };
}

export function stepPhysics(state, pidOutput, windForce, dt, params = {}) {
  const { gravity, maxThrust, groundRestitution } = PHYSICS;
  const mass = params.mass ?? PHYSICS.mass;
  const dragCoeff = params.drag ?? PHYSICS.dragCoeff;
  const delay = params.delay ?? PHYSICS.delay;
  const cg = params.cg ?? PHYSICS.cg;

  const hoverThrust = mass * gravity;
  let thrustCmd = hoverThrust + pidOutput;
  thrustCmd = Math.max(0, Math.min(maxThrust, thrustCmd));

  // Actuator transport delay: the commanded thrust takes effect `delay` seconds
  // later. Modelled as a circular buffer of past commands.
  let thrust = thrustCmd;
  if (delay > 0) {
    const delaySteps = params.delaySteps ?? Math.round(delay / dt);
    const buf = state.thrustBuffer;
    const len = buf.length;
    buf[state.thrustIdx] = thrustCmd;
    const readIdx = (state.thrustIdx - delaySteps + len) % len;
    thrust = buf[readIdx];
    state.thrustIdx = (state.thrustIdx + 1) % len;
  }

  const drag = dragCoeff * state.velocity * Math.abs(state.velocity);
  const netForce = thrust - mass * gravity - drag + windForce;
  const acceleration = netForce / mass;

  state.velocity += acceleration * dt;
  state.position += state.velocity * dt;
  state.time += dt;

  if (state.position < 0) {
    state.position = 0;
    state.velocity = -state.velocity * groundRestitution;
  }

  if (params.skipSecondary) return SKIP_RESULT;

  const thrustPercent = (thrust / maxThrust) * 100;

  // Distribute total thrust across the four motors. A CG offset loads the
  // motors on one side more heavily than the others.
  let weights = params.weights;
  let wsum = params.wsum;

  if (!weights) {
    const w0 = Math.max(0.05, 1 + cg * MOTOR_COSINES[0]);
    const w1 = Math.max(0.05, 1 + cg * MOTOR_COSINES[1]);
    const w2 = Math.max(0.05, 1 + cg * MOTOR_COSINES[2]);
    const w3 = Math.max(0.05, 1 + cg * MOTOR_COSINES[3]);
    wsum = w0 + w1 + w2 + w3;
    weights = [w0, w1, w2, w3];
  }

  const motorThrust = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    motorThrust[i] = (thrust * weights[i]) / wsum;
    // Heat rises with the square of relative load and cools toward ambient.
    const load = motorThrust[i] / NOMINAL_PER_MOTOR;
    let h = state.motorHeat[i] + (load * load * HEAT_GAIN - HEAT_COOLING * state.motorHeat[i]) * dt;
    if (h < 0) h = 0;
    else if (h > MAX_HEAT) h = MAX_HEAT;
    state.motorHeat[i] = h;
  }

  return {
    thrust,
    thrustPercent,
    acceleration,
    netForce,
    motorThrust,
    motorHeat: state.motorHeat,
  };
}
