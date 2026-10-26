# ProConnect 056 Universal Marketplace — Phase 1 report

Date: 2026-10-26  
Branch: `feature/056-mvp-integration`  
Status: prototype complete for coordinator review; not production-ready.

## Implemented

- Reusable single-business edition configuration for identity, brand colours, categories, locale, currency, membership plans, commission, booking pathways and integrations.
- OffGrid056 public edition with all seven required resilience categories.
- Seven clearly labelled demonstration profiles. They are test records and are never presented as real providers.
- Public category browse, profile inspection and service-request workflow retained.
- Explicit online-consultation and on-site pathways. Consultation requests remain internal because TidyCal and Zoom are not verified.
- NZD stored as integer cents and formatted through `Intl.NumberFormat`; new plans, applications, admin onboarding, invoices and bookings use NZD.
- Reference-only OffGrid056 OS mock handoff with role checks and no private-record transfer.
- Existing registration/approval, admin, customer and professional dashboards, rate management, booking acceptance, messages, completion, invoicing, reviews and notifications retained.
- Production safety: test checkout cannot settle invoices when `NODE_ENV=production`; production CORS is restricted to the configured public origin; baseline security headers are set.
- Dependency security updates for Express, Zod, React Router, Vite, Concurrently and transitive packages.

## Feature matrix

| Capability | Status | Evidence/limit |
| --- | --- | --- |
| OffGrid056 categories and browsing | Implemented | Seven configured public categories. |
| Demo specialist profiles | Implemented | Prominent demo label and warning; no real-provider claim. |
| Professional application and approval | Retained/tested | Pending until administrator review. |
| Customer/pro/admin dashboards | Retained/tested | Existing role controls unchanged. |
| On-site request | Implemented/tested | Existing booking lifecycle plus SimplyServices coordination copy. |
| Online consultation | Prototype only | Internal request type; no TidyCal/Zoom event is created. |
| NZD | Implemented/tested | Integer cents and ISO currency on new records. |
| OffGrid056 OS handoff | Mock/tested | Opaque references and status only. |
| Payments | Test-only | No live activation; production demo settlement is blocked. |
| Stripe Connect payouts | Not implemented | Phase 2+ blocker. |

## Demonstration workflows

### Customer

1. Open the marketplace and note the prototype banner.
2. Browse one of the seven resilience categories.
3. Open a profile and confirm the demo warning and NZD rate.
4. Sign in as a test client and choose online consultation or on-site service.
5. Add optional customer/assessment reference IDs only; do not paste private records.
6. Send the request and follow it through the customer dashboard, messages, invoice and review lifecycle.

### Professional

1. Apply through `/join`, selecting an OffGrid056 category and NZD hourly rate.
2. Sign in to complete the profile while approval is pending.
3. After admin approval, manage rates, availability and incoming requests.
4. Accept/decline, message, complete work and log hours. Existing bookings retain their quoted rate.

### Administrator

1. Review applications and relevant qualifications.
2. Publish only after credential checks; demo profiles remain visibly marked.
3. Manage plans, fees, categories, professionals, bookings, invoices, notifications and audit history.
4. Inspect or update a mock OffGrid056 handoff through the authenticated integration endpoint.

## Integration status

- TidyCal: planned, not connected or capability-verified.
- Zoom: planned, not connected or capability-verified.
- OffGrid056 OS: mock reference contract only.
- Payments: local/test checkout only; no live keys or payouts.

## QA

Pre-change baseline: 79/79 server integration tests passed; typecheck and production build passed. The initial dependency audit reported 12 vulnerabilities overall, including production dependency issues.

Post-change validation:

- `npm test`: 84/84 integration tests passed.
- `npm run typecheck`: server and web passed.
- `npm run build`: server compilation and Vite production bundle passed.
- `npm audit`: zero known vulnerabilities after supported dependency updates.

New automated tests cover edition configuration, category isolation, demo labelling, NZD, consultation requests and mock handoff access/update.

## Production-release blockers

- Replace all demo users, profiles, passwords and seeded activity; do not expose test credentials publicly.
- Complete independent identity, licence and credential-verification operations.
- Verify TidyCal and Zoom APIs, permissions, cancellation/no-show/error handling and reconciliation in sandboxes.
- Complete Stripe test-mode end-to-end checks, webhook replay/idempotency review, refunds, disputes, commission accounting and Stripe Connect/payout design.
- Complete New Zealand GST, pricing, consumer-law, terms, complaints and refund review.
- Add abuse controls/rate limiting, CSRF decision, session/cookie deployment review, upload malware/content validation, backup/restore drill and secrets rotation.
- Define production OffGrid056 OS consent, retention, deletion, authentication and incident handling.
- Run browser automation and accessibility testing against realistic NZ content and real credential-review scenarios.
- Obtain documented owner acceptance before deployment, public advertising, live payments or merge to `main`.

## Phase 2 recommendations

1. Replace demonstration identities with an owner-approved pilot cohort and qualification checklist.
2. Implement browser-level customer/pro/admin journeys and accessibility gates.
3. Validate TidyCal/Zoom in isolated sandboxes, then implement idempotent booking reconciliation.
4. Formalise the OffGrid056 OS consent screen and event contract before any real API connection.
5. Complete payment/legal controls, then run an owner-observed sandbox acceptance test.
6. Keep each future 056 edition as a separate configuration and deployment until true multi-tenancy has a justified business case.
