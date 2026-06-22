## 2026-06-18 - [Validate and sanitize localStorage data]
**Vulnerability:** Data retrieved from `localStorage` for `bestScores` and `layout` was parsed via `JSON.parse` but not validated before being used in the application state.
**Learning:** Untrusted data from `localStorage` can lead to Denial of Service (DoS) if malformed data is used in operations like `String.prototype.repeat`, or can potentially be used for CSS injection if inserted into style attributes.
**Prevention:** Always strictly validate and sanitize data retrieved from persistent client-side storage before using it in the application logic or UI.

## 2026-06-19 - [Prototype Pollution Defense in Persistent State]
**Vulnerability:** Loading objects from `localStorage` into the application state can be vulnerable to prototype pollution if keys or property spreads are not strictly controlled.
**Learning:** Using `Object.create(null)` for state objects derived from external input prevents inheritance of malicious properties. Combined with strict key validation (e.g., regex for numeric IDs) and explicit property picking (avoiding `...spread`), this creates a robust defense-in-depth.
**Prevention:** Use `Object.create(null)` for collections loaded from untrusted JSON and never use spread operators on unvalidated external objects.
