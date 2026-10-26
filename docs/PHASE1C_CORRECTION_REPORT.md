# ProConnect — Phase 1C correction and handover report

Date: 27 October 2026

Repository: `ITEEKAI/proconnect`

Branch: `feature/056-mvp-integration`

Base handover commit: `09e21bf710297a20a1994d95b1a05b087500026b`

## Outcome

Phase 1C is complete as a local development-prototype correction. P1B-001 and P1B-002 are corrected in the shared application and therefore apply to both OffGrid056 and HPLBIZ. The repository now owns a reproducible Playwright acceptance suite. Main, public deployments, live payments and production accounts were not changed or activated.

## Corrections

- Shared form controls now have stable IDs and real programmatic label relationships. Hint/error relationships, invalid state and error announcements are exposed to assistive technology.
- Keyboard order, label-click focus, required-field focus and accessible names are covered in both editions.
- Professional cards now shrink correctly inside the homepage grid. Both editions pass overflow checks at 320, 360, 390, 768 and 1024 pixels.
- The new axe gate identified low-contrast shared footer metadata; that text colour was corrected and now passes the automated WCAG 2 A/AA scan.

## Permanent browser testing

`playwright.config.ts` owns four isolated local test servers: an API and web app for each edition. The suites in `e2e/` cover customer, professional, administrator, consultation, on-site booking, OS mock handoff, HPLBIZ isolation, accessibility and responsive layout. The former one-off Phase 1B browser runner was removed.

See [Phase 1C test results](PHASE1C_TEST_RESULTS.md) for the command-by-command record.

## Updated screenshots

- [Accessible registration label and focus state](screenshots/phase1c/01-offgrid-accessible-signup.png)
- [OffGrid056 homepage at 320 pixels](screenshots/phase1c/02-offgrid-mobile-320.png)
- [HPLBIZ homepage at 390 pixels](screenshots/phase1c/03-hplbiz-mobile-390.png)

All three images contain synthetic demonstration content only and were visually reviewed.

## Owner demonstration readiness

Both Windows launchers were started concurrently and verified against their real local HTTP endpoints. OffGrid056 responded on 5173/4000 and HPLBIZ on 5174/4100; each returned its correct edition configuration. The launchers still open the browser when double-clicked and now also support a developer-only no-browser verification switch. See [Owner local demonstration guide](OWNER_LOCAL_DEMO_GUIDE.md).

## Integration recommendation for Phase 2 decision

- **TidyCal:** begin with a sandbox adapter behind the existing planned integration state. Store only external booking IDs and required scheduling metadata; make creation/cancellation idempotent; verify webhook authenticity where supported; add retry and reconciliation jobs; retain a manual fallback.
- **Zoom:** use a dedicated least-privilege Server-to-Server OAuth application in a non-production account. Create meetings only after an online consultation is confirmed, keep tokens server-side, avoid exposing host links, and reconcile cancellations/reschedules.
- **OffGrid056 OS:** retain the current mock reference handoff until an approved data contract exists. Require explicit customer consent, minimise transferred fields, authenticate and sign requests, use idempotency keys, record an audit trail, and keep `privateRecordTransfer` false until privacy/retention/deletion controls are approved.

No Phase 2 integration work was started.

## Changed-file inventory

### Application and launchers

- `web/src/components/ui.tsx`
- `web/src/components/ProfessionalCard.tsx`
- `web/src/components/Layout.tsx`
- `scripts/Start-OffGrid056.cmd`
- `scripts/Start-HPLBIZ.cmd`
- `scripts/browser-acceptance.cjs` (removed)

### Test ownership and dependencies

- `playwright.config.ts`
- `e2e/helpers.ts`
- `e2e/accessibility-responsive.spec.ts`
- `e2e/hplbiz-isolation.spec.ts`
- `e2e/marketplace-workflows.spec.ts`
- `package.json`
- `package-lock.json`
- `.gitignore`

### Handover material

- `docs/PHASE1C_CORRECTION_REPORT.md`
- `docs/PHASE1C_TEST_RESULTS.md`
- `docs/DEFECTS_AND_RELEASE_BLOCKERS.md`
- `docs/OWNER_LOCAL_DEMO_GUIDE.md`
- `docs/screenshots/phase1c/01-offgrid-accessible-signup.png`
- `docs/screenshots/phase1c/02-offgrid-mobile-320.png`
- `docs/screenshots/phase1c/03-hplbiz-mobile-390.png`

The final commit identifier is supplied in the Coordinator handover because a commit cannot contain its own identifier.
