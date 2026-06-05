export default class PIDController {
  constructor(kp = 0, ki = 0, kd = 0) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.integral = 0;
    this.prevError = 0;
    this.outputMin = -12;
    this.outputMax = 12;
    this.integralMax = 2;
    // Most recent (pre-clamp) contribution of each term, exposed for the live
    // breakdown HUD. `output` is the final clamped command.
    this.pTerm = 0;
    this.iTerm = 0;
    this.dTerm = 0;
    this.output = 0;
  }

  setGains(kp, ki, kd) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
  }

  update(setpoint, measurement, dt) {
    if (dt <= 0) return 0;

    const error = setpoint - measurement;

    this.integral += error * dt;
    this.integral = Math.max(-this.integralMax, Math.min(this.integralMax, this.integral));

    const derivative = dt > 0.001 ? (error - this.prevError) / dt : 0;
    this.prevError = error;

    this.pTerm = this.kp * error;
    this.iTerm = this.ki * this.integral;
    this.dTerm = this.kd * derivative;

    const output = this.pTerm + this.iTerm + this.dTerm;
    this.output = Math.max(this.outputMin, Math.min(this.outputMax, output));
    return this.output;
  }

  reset() {
    this.integral = 0;
    this.prevError = 0;
    this.pTerm = 0;
    this.iTerm = 0;
    this.dTerm = 0;
    this.output = 0;
  }
}
