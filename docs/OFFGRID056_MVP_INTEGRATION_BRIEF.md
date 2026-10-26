# 056 ProConnect MVP — implementation brief
Date: 2026-10-26. Status: prototype-only; no live launch or payment acceptance authorised.

## Goal
Reuse the existing ProConnect professional marketplace as a shared 056 capability, with OffGrid056 as the first specialist pilot. Preserve the existing main branch and production deployment.

## Existing baseline
- React/Vite frontend, Express/TypeScript API, SQLite.
- Directory, verified professional profiles, hourly rates, job-request bookings, dashboards, messages, invoices and Stripe Checkout code.
- TidyCal/Zoom consultations, Stripe Connect payouts and automatic subscriptions are not demonstrated in the current code.
- Demo credentials and demo payments present production risks; historical assessment also flagged security issues. Recheck current source.
- Existing seed data and currency conventions are UK/pence-oriented; New Zealand/NZD support requires implementation and tests.

## MVP customer journeys
1. Customer enters from OffGrid056 and searches verified resilience specialists by service and location.
2. Customer chooses a professional consultation (future TidyCal/Zoom verified integration) or on-site service request (existing ProConnect workflow).
3. Professional reviews and accepts/declines; pricing must be shown and recorded accurately.
4. Simply Services coordinates qualified trades for approved on-site work.
5. Consented outcomes and service references return to OffGrid056 OS; no automatic sharing of private records.

## Proposed specialisms
Water and qualified plumbing; energy and licensed electrical/solar/battery; food growing and greenhouses; shelter/building professionals; air safety and ventilation; resilience planning and training; community coordination.

## MVP execution order
Phase 1: Run tests, typecheck, build; inspect current source and blockers; no production writes.
Phase 2: On this branch add OffGrid056 category/entry filtering and feature flags, with tests.
Phase 3: Document and validate TidyCal payment, booking and Zoom integration; sandbox only until independently verified.
Phase 4: Define minimal, consented OffGrid056 OS handoff contract using reference IDs; mock endpoints first.
Phase 5: Security, privacy, consumer-law, payment integrity, NZD, GST, qualifications and end-to-end checks before owner go-live approval.

## Release gates
- Remove or disable seeded production credentials and demo login disclosure.
- Never allow a no-charge demo checkout to mark production invoices paid.
- Verify actual settled payment; prevent duplicate webhook/return processing.
- Audit dependencies, auth/session, abuse protection, CORS, upload security, security headers and backups.
- Validate TidyCal/Zoom permissions, errors, cancellations, no-shows and reconciliation, if enabled.
- Test NZD monetary units and actual professional rates; do not merely relabel pence.
- Qualified trade credential review, accurate terms, refunds/complaints/payout responsibilities.
- Passing integration, typecheck, build and browser tests; documented owner acceptance.

## Developer deliverables
Current-state report; MVP feature matrix; implementation and test report; customer/pro/admin demo flows; TidyCal and OffGrid056 OS integration contracts; release blockers register.

Do not merge to main, deploy publicly, connect live payments or advertise availability without explicit owner signoff.