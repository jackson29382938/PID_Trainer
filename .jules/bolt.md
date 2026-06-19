## 2026-06-17 - [Precomputing Trigonometry in Hot Loops]
**Learning:** In a high-frequency loop (120Hz), redundant calls to `Math.cos` for constant values like motor angles add unnecessary overhead. Precomputing these in a constant array significantly reduces per-step computation.
**Action:** Always check for constant trigonometric or mathematical expressions inside tight loops (physics steps, animation frames) and move them to module-level constants.

## 2026-06-17 - [Efficient Time-Series Filtering for Rendering]
**Learning:** Using `Array.prototype.filter` to find a visible window in a large chronological history array is $O(N)$ and expensive at 60fps. Since the data is sorted by time, a reverse linear search to find the start index followed by `Array.prototype.slice` is much faster.
**Action:** Use binary search or reverse linear search for time-windowed data instead of `filter()` when processing sorted history buffers for UI updates.

## 2026-06-18 - [Optimizing Headless Simulations via Pre-calculation and Skip-flags]
**Learning:** Thousands of headless simulations (as in an auto-tuner) benefit significantly from pre-calculating deterministic environmental factors like wind and noise into arrays. Additionally, using "skip" flags to bypass non-essential side effects (like thermal modeling) in core physics steps reduces per-step overhead. Reducing object allocation in hot loops by passing primitives also measurably lowers GC pressure.
**Action:** When running batch simulations, look for deterministic calls to `Math.sin` or PRNGs that can be pre-calculated, and provide paths to skip UI-only or non-critical physics calculations.
