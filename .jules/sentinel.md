## 2026-06-18 - [Validate and sanitize localStorage data]
**Vulnerability:** Data retrieved from `localStorage` for `bestScores` and `layout` was parsed via `JSON.parse` but not validated before being used in the application state.
**Learning:** Untrusted data from `localStorage` can lead to Denial of Service (DoS) if malformed data is used in operations like `String.prototype.repeat`, or can potentially be used for CSS injection if inserted into style attributes.
**Prevention:** Always strictly validate and sanitize data retrieved from persistent client-side storage before using it in the application logic or UI.

## 2026-07-01 - [Harden critical configuration constants]
**Vulnerability:** Critical application configuration (scenarios, physics constants) were defined as mutable objects/arrays, making them susceptible to accidental or malicious runtime modification.
**Learning:** Even internal constants should be hardened using `Object.freeze` (and deep-freezing for arrays of objects) to prevent prototype pollution or other runtime manipulation that could alter core simulation behavior.
**Prevention:** Use `Object.freeze` on all global configuration objects to ensure immutability and provide defense-in-depth against runtime tampering.
