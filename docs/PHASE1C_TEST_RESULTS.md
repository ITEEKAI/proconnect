# Phase 1C automated and browser test results

Date: 27 October 2026

Branch: `feature/056-mvp-integration`

Environment: local Windows development workspace; in-memory databases for Playwright

| Gate | Command | Result |
| --- | --- | --- |
| Automated server tests | `npm test` | **Pass — 85/85** |
| Type checking | `npm run typecheck` | **Pass — server and web** |
| Production build | `npm run build` | **Pass — server and Vite web build** |
| Dependency audit | `npm audit --audit-level=low` | **Pass — 0 vulnerabilities** |
| Browser acceptance | `npm run test:browser` | **Pass — 16/16** |
| Windows launchers | `Start-OffGrid056.cmd`, `Start-HPLBIZ.cmd` | **Pass — both ran concurrently with isolated identities and ports** |

## Browser coverage

The repository-owned Playwright suite starts both editions with independent in-memory databases and verifies:

- OffGrid056 customer registration and login.
- Online consultation and on-site service requests.
- Booking visibility and OffGrid056 OS mock handoff with private-record transfer disabled.
- Professional login, acceptance of a request, and rate management.
- Professional application, administrator login, verification and directory publication.
- HPLBIZ branding, categories, demo profiles and credential isolation from OffGrid056.
- Programmatic form labels, accessible names, label-click focus, keyboard order, required-field focus and axe WCAG 2 A/AA scans in both editions.
- Homepage horizontal-overflow regression at 320, 360, 390, 768 and 1024 pixels in both editions.

Playwright retains a trace, screenshot and video on failure. Generated reports and transient test data are ignored by Git.

## Result

No regression was observed in the tested Phase 1 functionality. The Node SQLite experimental warning remains informational. Automated accessibility testing does not replace a later manual screen-reader review.
