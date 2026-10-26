# Phase 1C defects and release blockers

Date: 27 October 2026  
Scope: local development prototypes only

## Corrected Phase 1B defects

### P1B-001 — form captions were not accessible labels

- Severity: high; formerly a public-pilot release blocker.
- Status: **resolved in Phase 1C** for both OffGrid056 and HPLBIZ.
- Correction: shared text, textarea, select and tag controls now receive stable IDs; captions are real `label` elements with matching `for` attributes; hint and error text is connected with `aria-describedby`; errors announce as alerts; invalid state is exposed with `aria-invalid`.
- Verification: repository Playwright tests assert accessible names, label-click focus, keyboard tab order and required-field focus in both editions. Axe WCAG 2 A/AA scans pass on the registration page.

### P1B-002 — homepage horizontal overflow on mobile

- Severity: high; formerly a public-pilot release blocker.
- Status: **resolved in Phase 1C** for both OffGrid056 and HPLBIZ.
- Correction: professional directory cards and their primary flex row now permit content to shrink within the grid.
- Verification: Playwright asserts `documentElement.scrollWidth <= clientWidth` at 320, 360, 390, 768 and 1024 pixels in both editions. All ten viewport checks pass.

### P1C-001 — footer secondary text contrast

- Severity: medium; found by the new automated accessibility gate.
- Status: **resolved in Phase 1C** for both editions.
- Correction: shared footer secondary text now uses a lighter colour against the dark background. Axe no longer reports the former 3.57:1 contrast failure.

## Outstanding production release blockers

The two Phase 1B interface blockers are closed. The following production-readiness work remains intentionally outside Phase 1C:

- Replace all demo identities, credentials and seeded transactions before any public environment. Add an explicit production seed safeguard.
- Validate TidyCal and Zoom in isolated sandboxes, including permissions, cancellation, rescheduling, no-show handling, webhook verification, retries and reconciliation.
- Define consent, authentication, minimisation, retention, deletion, audit and incident rules for OffGrid056 OS transfers. Keep private-record transfer disabled until approved.
- Complete payment test-mode checks, webhook replay/idempotency, refunds/disputes, commission accounting and provider payout design. Live payments remain disabled.
- Complete New Zealand GST, consumer-law, privacy, terms, complaints and refund review.
- Add rate limiting and abuse controls, document the CSRF/session decision, validate uploads for malware/content, define secrets rotation, and complete a backup/restore drill.
- Add the repository-owned browser suite to CI on a suitable runner. The suite is reproducible locally but no CI or deployment configuration was activated in Phase 1C.
- Replace the one-line source registry with a validated edition manifest if non-developers must add editions.
- Obtain documented owner/coordinator acceptance before merge to `main`, deployment, external advertising or live-payment activation.

## Non-blocking observations

- Axe automation covers detectable WCAG 2 A/AA issues but does not replace manual screen-reader and usability review.
- Full-page mobile screenshots are intentionally tall because the homepage contains the complete marketplace narrative.
- Node's built-in SQLite support emits an experimental warning under the current Node runtime; no functional failure was observed.
