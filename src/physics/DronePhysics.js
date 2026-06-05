export const PHYSICS = {
  mass: 1.0,
  gravity: 9.81,
  maxThrust: 22.0,
  // Light aerodynamic drag: enough to be realistic, but low enough that
  // mis-tuned gains (high P, integral windup) actually overshoot and oscillate
  // the way the scenarios describe instead of being silently damped out.
  dragCoeff: 0.2,
  groundRestitution: 0.2,
};

export function createDroneState() {
  return {
    position: 0,
    velocity: 0,
    time: 0,
    completed: false,
  };
}

export function stepPhysics(state, pidOutput, windForce, dt) {
  const { mass, gravity, maxThrust, dragCoeff } = PHYSICS;
  const hoverThrust = mass * gravity;

  const thrustAdjustment = pidOutput;
  let thrust = hoverThrust + thrustAdjustment;
  thrust = Math.max(0, Math.min(maxThrust, thrust));

  const drag = dragCoeff * state.velocity * Math.abs(state.velocity);
  const netForce = thrust - mass * gravity - drag + windForce;
  const acceleration = netForce / mass;

  state.velocity += acceleration * dt;
  state.position += state.velocity * dt;
  state.time += dt;

  if (state.position < 0) {
    state.position = 0;
    state.velocity = -state.velocity * PHYSICS.groundRestitution;
  }

  return {
    thrust,
    thrustPercent: (thrust / maxThrust) * 100,
    acceleration,
    netForce,
  };
}
