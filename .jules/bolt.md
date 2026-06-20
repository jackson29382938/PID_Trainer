## 2026-06-17 - [Precomputing Trigonometry in Hot Loops]
**Learning:** In a high-frequency loop (120Hz), redundant calls to `Math.cos` for constant values like motor angles add unnecessary overhead. Precomputing these in a constant array significantly reduces per-step computation.
**Action:** Always check for constant trigonometric or mathematical expressions inside tight loops (physics steps, animation frames) and move them to module-level constants.

## 2026-06-17 - [Efficient Time-Series Filtering for Rendering]
**Learning:** Using `Array.prototype.filter` to find a visible window in a large chronological history array is $O(N)$ and expensive at 60fps. Since the data is sorted by time, a reverse linear search to find the start index followed by `Array.prototype.slice` is much faster.
**Action:** Use binary search or reverse linear search for time-windowed data instead of `filter()` when processing sorted history buffers for UI updates.

## 2026-06-20 - [Auto-Tune Simulation Bottleneck]
**Learning:** Pre-calculating deterministic arrays for wind and noise, and reusing objects (PID controller) in a tight simulation loop (550+ runs per click) reduced auto-tune time by ~2.2x. Object allocation and trigonometric functions were the primary bottlenecks.
**Action:** For iterative search algorithms that run many simulations, always hoist deterministic calculations and reuse stateful objects with a reset method.
