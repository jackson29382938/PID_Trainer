## 2026-06-18 - [Validate and sanitize localStorage data]
**Vulnerability:** Data retrieved from `localStorage` for `bestScores` and `layout` was parsed via `JSON.parse` but not validated before being used in the application state.
**Learning:** Untrusted data from `localStorage` can lead to Denial of Service (DoS) if malformed data is used in operations like `String.prototype.repeat`, or can potentially be used for CSS injection if inserted into style attributes.
**Prevention:** Always strictly validate and sanitize data retrieved from persistent client-side storage before using it in the application logic or UI.

## 2026-06-19 - [Harden CSP and LocalStorage handling]
**Vulnerability:** Overly permissive Content Security Policy and untrusted spreading of objects retrieved from localStorage.
**Learning:** `Object.create(null)` prevents prototype pollution when using objects as maps from untrusted sources. `object-src 'none'` and `base-uri 'self'` are critical CSP additions even in modern SPAs to mitigate legacy plugin exploits and base-tag hijacking.
**Prevention:** Use strict allow-lists for properties when loading from local storage instead of spreading untrusted objects, and maintain a restrictive CSP that follows the principle of least privilege.
