## 2025-05-22 - [Insecure localStorage Deserialization]
**Vulnerability:** Data from `localStorage` was parsed with `JSON.parse` and used directly in React state, which was then applied to inline styles (`--panel-width`).
**Learning:** `localStorage` is not a trusted source. Malicious or corrupted data could cause the application to crash on boot (DoS) or allow for CSS injection if values are not validated and clamped.
**Prevention:** Always validate, type-check, and clamp/sanitize any data retrieved from persistent client-side storage before using it in the application logic or UI.
