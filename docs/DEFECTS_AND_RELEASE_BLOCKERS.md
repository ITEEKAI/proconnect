# Phase 1B defects and release blockers

Date: 27 October 2026  
Scope: local development prototypes only

## Browser defects

### P1B-001 — form captions are not accessible labels

- Severity: high; release blocker for a public pilot.
- Status: open.
- Affected: shared `Field`, `TextInput`, `TextArea` and `Select` controls across registration, login, booking, professional and admin forms.
- Reproduction: inspect a visible caption such as “Full name” on `/signup` and query the input by its accessible label. The caption is a `<span>` with no `for`/`id` relationship, so the control has no accessible name from that caption.
- Impact: screen-reader navigation and voice/label-driven interaction are impaired; browser tests cannot safely locate most controls by label.
- Recommendation: generate stable IDs in each control, render a real `<label for="…">`, preserve explicit `aria-label` overrides, then add an accessibility scan and label-based Playwright tests.

### P1B-002 — horizontal overflow on 390 px mobile homepage

- Severity: high; release blocker for a public pilot.
- Status: open.
- Reproduction: load `/` at 390 × 844. `documentElement.clientWidth` is 390 while `scrollWidth` is 515.
- Cause observed: professional cards in “Top rated this month” retain an approximately 495 px intrinsic width; the card/grid item needs a mobile `min-width: 0` boundary and its title/badge row needs wrapping validation.
- Impact: the page horizontally scrolls and content is rendered outside the viewport. See `15-offgrid-mobile-home.png`.
- Recommendation: constrain the professional-card grid item and inner flex rows, then test 320, 360, 390, 768 and 1024 px widths.

## Production release blockers

- Resolve P1B-001 and P1B-002 and complete keyboard, focus, contrast and screen-reader checks.
- Move the browser script into a supported `@playwright/test` suite in the repository and run both editions in CI. Add trace/video retention on failure and an axe accessibility gate.
- Replace all demo identities, credentials and seeded transactions before any public environment. Demo credentials are suppressed by the production marketplace-config response, but production seed policy still needs an explicit safeguard.
- Validate TidyCal and Zoom in isolated sandboxes, including permissions, cancellation/reschedule/no-show flows, webhook verification, retries and reconciliation.
- Define the consent, authentication, retention, deletion, audit and incident rules for any OffGrid056 OS transfer. Keep private-record transfer disabled until approved.
- Complete payment test-mode checks, webhook replay/idempotency, refunds/disputes, commission accounting and provider payout design. Live payments remain disabled.
- Complete New Zealand GST, consumer-law, privacy, terms, complaints and refund review.
- Add rate limiting/abuse controls, a documented CSRF/session decision, upload malware/content validation, secrets rotation and a backup/restore drill.
- Replace the one-line source registry with a validated edition manifest if non-developers must add editions.
- Obtain documented owner/coordinator acceptance before merge to `main`, deployment, external advertising or live-payment activation.

## Non-blocking observations

- Full-page screenshots are intentionally tall because the homepage contains the complete marketplace narrative; use viewport-specific snapshots in the future visual-regression suite.
- Node’s built-in SQLite support still emits an experimental warning under the current Node runtime; no functional failure was observed.
