## 2026-06-17 - [Precomputing Trigonometry in Hot Loops]
**Learning:** In a high-frequency loop (120Hz), redundant calls to `Math.cos` for constant values like motor angles add unnecessary overhead. Precomputing these in a constant array significantly reduces per-step computation.
**Action:** Always check for constant trigonometric or mathematical expressions inside tight loops (physics steps, animation frames) and move them to module-level constants.

## 2026-06-17 - [Efficient Time-Series Filtering for Rendering]
**Learning:** Using `Array.prototype.filter` to find a visible window in a large chronological history array is $O(N)$ and expensive at 60fps. Since the data is sorted by time, a reverse linear search to find the start index followed by `Array.prototype.slice` is much faster.
**Action:** Use binary search or reverse linear search for time-windowed data instead of `filter()` when processing sorted history buffers for UI updates.

## 2026-06-21 - [Reducing GC Pressure in Simulation Loops]
**Learning:** Allocating object literals in high-frequency loops (like the 120Hz physics/metrics loop) creates significant garbage collection pressure. Refactoring internal functions to accept primitive arguments instead of objects allows the engine to avoid these allocations entirely.
**Action:** In simulation hotspots or high-frequency update loops, prefer passing primitives directly rather than wrapping them in transient objects.

## 2026-06-21 - [Optimizing Heavy Simulation Loops via Pre-calculation and Object Reuse]
**Learning:** The `autoTune` process executes over 500 simulations (~650,000 physics steps). Repeating expensive `Math.sin` calculations for wind and sensor noise in every iteration is a major bottleneck. Pre-calculating these into `Float32Array` buffers and reusing a single `PIDController` instance (resetting it between runs) accelerates the process by ~4x.
**Action:** In iterative simulation tasks with invariant environment parameters, pre-calculate expensive computations into typed arrays and reuse stateful objects to minimize CPU cycles and GC overhead.

## 2026-06-25 - [Optimizing Simulation "Hot Paths" with Selective Logic Bypassing]
**Learning:** Headless simulations (like ) often don't need secondary outputs like individual motor thrusts or heat state. Adding a `skipSecondary` flag to the core physics engine (`stepPhysics`) allows bypassing these (M)$ calculations (where $ is the number of motors), providing a significant speedup in batch processing.
**Action:** When designing core simulation logic, identify non-essential calculations for headless runs and implement flags to skip them.

## 2026-06-25 - [Eliminating GC Pressure in Simulation Loops with Reusable Result Objects]
**Learning:** Even when skipping complex calculations, returning a new result object in a high-frequency loop (120Hz) over hundreds of simulations creates significant GC pressure. Using a static, reusable result object for headless runs maintains API compatibility while reducing the benchmark time from ~365ms to ~50ms (a 7x speedup).
**Action:** In simulation "hot paths," if a return object is required for API consistency but its contents are ignored, return a static reusable object instead of allocating a new one every frame.
