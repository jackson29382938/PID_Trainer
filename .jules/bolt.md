## 2024-05-23 - [Auto-tuner Memory Optimization]
**Learning:** The auto-tuner runs ~550 simulations in a single synchronous block. Each simulation lasts 15s at 120Hz, generating 1,800 history objects. This results in ~1 million object allocations (`{time, position, error}`) in a short burst, causing significant GC pressure and potentially stuttering the UI if it were to run more frequently or on lower-end devices.
**Action:** Implement an incremental metrics calculator that doesn't require storing history objects, reducing memory allocation by >99% during auto-tuning.

## 2024-05-23 - [Physics Loop Trig Optimization]
**Learning:** `Math.cos(MOTOR_ANGLES[i])` is calculated 4 times every physics step (120Hz). Since `MOTOR_ANGLES` is constant, these values are also constant.
**Action:** Precompute the cosines to save cycles in the hot physics loop.
