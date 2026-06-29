# Agent instructions

These rules are intended for Jules, Codex, Cursor Agent, and any other automated coding agent working in this repository.

## Avoid duplicate retry PRs

Before opening a new PR, inspect the current `main` branch and the recent closed PR history. Do not recreate a closed PR idea unless the actual behavior is still missing from `main`.

The following areas have already been implemented or intentionally superseded:

- Auto-tune hot-path optimizations, including precomputed buffers, reduced allocations, object reuse, and `skipSecondary`/headless simulation bypasses.
- CSP and localStorage hardening, including strict localStorage validation and defense-in-depth CSP directives.
- Keyboard shortcuts and accessibility improvements for speed controls, ghost overlay, star ratings, gauges, and screen-reader labels.

If improving one of those areas, make a small incremental change and explain exactly what is still missing. Do not submit another broad retry PR for the same theme.

## Keep PRs small

Separate security, performance, UX, and CI changes into different PRs unless they are tightly coupled. Avoid bundling unrelated refactors, generated files, or dependency trees into focused fixes.

## Validate current source, not stale assumptions

Closed-unmerged PRs may be stale or superseded. Treat `main` as the source of truth, compare behavior directly, and only change what is still missing.
