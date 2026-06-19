## 2026-06-18 - [Validate and sanitize localStorage data]
**Vulnerability:** Data retrieved from `localStorage` for `bestScores` and `layout` was parsed via `JSON.parse` but not validated before being used in the application state.
**Learning:** Untrusted data from `localStorage` can lead to Denial of Service (DoS) if malformed data is used in operations like `String.prototype.repeat`, or can potentially be used for CSS injection if inserted into style attributes.
**Prevention:** Always strictly validate and sanitize data retrieved from persistent client-side storage before using it in the application logic or UI.

## 2026-06-19 - [Strict LocalStorage Validation and CSP Hardening]
**Vulnerability:** Untrusted data from `localStorage` was spread into the application state, and the CSP was missing modern defense-in-depth directives.
**Learning:** Even with existing validation, using the spread operator (`...`) on untrusted objects can leak unvalidated properties into the state. Using `Object.create(null)` prevents prototype pollution via untrusted keys.
**Prevention:** Never use spread on untrusted objects; explicitly pick required fields. Harden CSP with `object-src 'none'` and `base-uri 'self'`.
