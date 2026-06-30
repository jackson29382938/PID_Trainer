## 2026-06-17 - [Keyboard-Accessible Resizers and Shortcuts]
**Learning:** Interactive layout elements like resizers are often overlooked for accessibility. Adding keyboard support (Arrow keys) and semantic ARIA roles makes these features usable for everyone, not just mouse users.
**Action:** Always consider keyboard alternatives for drag-based interactions.

## 2025-05-14 - [PID Reset and Global Focus Indicators]
**Learning:** Users often get lost when experimenting with many parameters. Providing a one-click "Reset" that is context-aware (disabled when already at default) provides a safe path back to a known-good state. Additionally, a global focus-visible style ensures the entire app remains navigable via keyboard without needing per-component focus management.
**Action:** Include 'Reset to Defaults' for complex control panels and ensure base CSS includes global focus-visible indicators.
