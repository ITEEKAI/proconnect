# ProConnect — Phase 1B acceptance-test report

Date: 27 October 2026  
Branch: `feature/056-mvp-integration`  
Status: local prototype acceptance work complete; stopped for Coordinator review. Not production-ready.

## Outcome

OffGrid056 and HPLBIZ were run simultaneously from the same software in installed Chrome 156 using isolated local databases and credentials. Nineteen browser checkpoints passed and one mobile-layout checkpoint failed. Two browser defects are recorded as public-release blockers; neither prevents the desktop prototype demonstration.

No merge, deployment, external integration, live payment or production-data action was performed.

## Browser acceptance results

| Area | Result | Evidence |
| --- | --- | --- |
| OffGrid056 homepage/prototype notice | Pass | `01-offgrid-home-desktop.png` |
| Seven specialist categories | Pass | `02-offgrid-seven-categories.png` |
| Directory and seven demo labels | Pass | `03-offgrid-directory-demo-labels.png` |
| Profile demo warning and NZD pricing | Pass | `04-offgrid-profile-nzd.png` |
| Customer registration/login | Pass | `05-offgrid-customer-registration.png` |
| Online consultation request | Pass; internal only | `06-offgrid-online-consultation-request.png` |
| On-site service request | Pass | `07-offgrid-onsite-request.png` |
| Customer booking list | Pass | `08-offgrid-customer-bookings.png` |
| OffGrid056 OS handoff | Pass; reference-only mock, private transfer false | Browser/API assertion |
| Professional dashboard | Pass | `09-offgrid-professional-dashboard.png` |
| Booking acceptance | Pass | `10-offgrid-professional-booking-accepted.png` |
| Rate management | Pass | `11-offgrid-professional-rates.png` |
| Professional application | Pass; created pending | `12-offgrid-professional-application.png` |
| Admin dashboard | Pass | `13-offgrid-admin-dashboard.png` |
| Admin verification/publishing | Pass | `14-offgrid-admin-verification.png` |
| Mobile at 390 × 844 | Fail; horizontal overflow | `15-offgrid-mobile-home.png`, P1B-002 |
| HPLBIZ identity/branding | Pass | `16-hplbiz-home.png` |
| HPLBIZ categories | Pass | `17-hplbiz-categories.png` |
| HPLBIZ directory/sample data | Pass | `18-hplbiz-directory.png` |
| HPLBIZ credential separation | Pass | HPLBIZ login accepted; OffGrid056 login returned 401 |

The reusable runner is `scripts/browser-acceptance.cjs`. Its latest machine-readable output reported 19 passed, one failed and zero browser console/page errors. The local `test-results` and acceptance databases are ignored by Git.

## HPLBIZ cloning proof

HPLBIZ has separate navy/gold branding, seven business-advisory categories, seven demo advisers, membership plans, search copy and credentials. It ran on ports 5174/4100 while OffGrid056 ran on 5173/4000. Each used a different `DATA_DIR`; an automated child-process test also proved that OffGrid056 credentials are rejected by HPLBIZ.

Detailed evidence and future configuration recommendations are in `HPLBIZ_CLONING_PROOF.md` and `BUSINESS_EDITION_CLONING.md`.

## Quality checks

| Check | Result |
| --- | --- |
| `npm test` | Pass — 85/85 tests, including HPLBIZ isolation |
| `npm run typecheck` | Pass — server and web |
| `npm run build` | Pass — server compile and Vite production bundle |
| `npm audit --audit-level=low` | Pass — zero known vulnerabilities |
| Real-browser acceptance | 19 pass, one fail, zero browser errors |

Recommended coverage addition: adopt `@playwright/test` as a repository dev dependency and run an edition matrix in CI for customer, professional, admin, cloning, mobile and accessibility journeys. The current runner proves the flows but relies on the Codex workspace Playwright runtime rather than a project-owned test dependency.

## Integration recommendation

### TidyCal

Keep the current internal consultation request as the source of truth. In Phase 2, add a sandbox adapter that creates or links a TidyCal booking only after the customer confirms a slot. Store only external booking IDs and synchronisation status. Verify signed webhooks or polling reconciliation, idempotency, reschedule/cancellation/no-show handling and time zones before enabling any production credential. Do not let TidyCal independently settle marketplace money.

### Zoom

Create a Zoom meeting only after an accepted consultation has a confirmed slot. Prefer a verified TidyCal-to-Zoom connection if it exposes reliable meeting identifiers and lifecycle events; otherwise use a least-privilege Zoom Server-to-Server OAuth app behind the same adapter boundary. Never expose host credentials, and test cancellation, meeting deletion, retries and participant privacy.

### OffGrid056 OS

Retain the current reference-only mock contract. After explicit customer consent and an approved data map, emit idempotent handoff events containing opaque customer/assessment/booking references and status—not assessment content or private records. Use authenticated/signed requests, an allow-list, audit history, retry/dead-letter handling and retention/deletion controls. Keep `privateRecordTransfer` false until a separate security/privacy acceptance review.

## Repository safety confirmation

- Working branch remained `feature/056-mvp-integration`.
- Local `main` and `origin/main` both remained at `58d1ad9db99c56b4320c75586cac66c5f7538f52` during validation.
- Existing production deployment configuration was not changed or invoked.
- Live payments remain disabled; only local/test checkout behavior exists.
- No public deployment, merge or payment activation occurred.

## Owner demonstration

Use the double-click launchers and role-by-role checklist in `OWNER_LOCAL_DEMO_GUIDE.md`. Each launcher selects its edition, ports and local database automatically; the owner does not edit source code.

## Coordinator decision requested

Accept Phase 1B as a desktop prototype/cloning proof, with P1B-001 and P1B-002 required before any public pilot. Confirm whether those two fixes and repository-owned Playwright coverage should be the next work package.
