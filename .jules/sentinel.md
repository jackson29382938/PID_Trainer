## 2026-06-18 - [Validate and sanitize localStorage data]
**Vulnerability:** Data retrieved from `localStorage` for `bestScores` and `layout` was parsed via `JSON.parse` but not validated before being used in the application state.
**Learning:** Untrusted data from `localStorage` can lead to Denial of Service (DoS) if malformed data is used in operations like `String.prototype.repeat`, or can potentially be used for CSS injection if inserted into style attributes.
**Prevention:** Always strictly validate and sanitize data retrieved from persistent client-side storage before using it in the application logic or UI.

## 2026-06-19 - [Defense-in-depth for Persistent Storage]
**Vulnerability:** Even after basic validation, state objects populated from `localStorage` remained vulnerable to prototype pollution if keys were not strictly restricted to expected patterns (e.g. numeric IDs).
**Learning:** Using `Object.create(null)` for state objects derived from external input prevents inherited property collisions. Strict key validation (regex) and explicit property picking (avoiding `...spread`) are essential for hardening against untrusted storage data.
**Prevention:** Use null-prototype objects for data maps and always whitelist properties when hydrating state from persistent storage.
