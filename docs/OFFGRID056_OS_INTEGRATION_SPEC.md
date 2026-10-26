# OffGrid056 OS integration specification — MVP

Status: mock/reference-only. No OffGrid056 OS API or private-record transfer is enabled.

## Purpose

The contract links a marketplace request to an OffGrid056 resilience workflow without copying assessments, Resource Library content, contact records or case notes into ProConnect.

## Reference contract

Each booking may carry:

| Field | Meaning |
| --- | --- |
| `customerReference` | Opaque OffGrid056 customer reference. Optional. |
| `assessmentReference` | Opaque resilience-assessment reference. Optional. |
| `requestedService` | Short human-readable service requested. |
| `professionalReferral` | ProConnect reference in the form `professional:{id}`. |
| `serviceType` | `consultation` or `onsite`. |
| `bookingStatus` | Existing ProConnect booking lifecycle status. |
| `projectHandoff` | `not_started`, `referred`, `accepted` or `closed`. |
| `completionFollowUp` | `not_started`, `due` or `complete`. |

References are identifiers, not permission to retrieve or disclose underlying records.

## Prototype endpoints

- `GET /api/integrations/status` — public capability status. Reports OffGrid056 OS as `mock`, TidyCal and Zoom as `planned`, and live payments as disabled.
- `GET /api/integrations/offgrid056/handoffs/:bookingId` — authenticated client, assigned professional or administrator reads the reference-only handoff.
- `PATCH /api/integrations/offgrid056/handoffs/:bookingId` — administrator updates project-handoff and follow-up states.

Creating `POST /api/bookings` accepts `serviceType`, `customerReference`, `assessmentReference` and `requestedService`. Existing role and booking-access checks apply.

## Future authenticated exchange

Before replacing mock mode:

1. Agree source-of-truth ownership for each field.
2. Use service authentication, least-privilege scopes and allowlisted origins.
3. Define idempotency keys, retries, conflict handling and an audit event for every state change.
4. Validate consent at referral and again before any additional data exchange.
5. Encrypt transport and stored integration credentials; never log private payloads.
6. Define deletion, retention, breach and subject-access processes.
7. Test duplicate events, reordered events, unavailable systems and revoked consent.

No customer profile, assessment body, Resource Library document, message or invoice should cross the boundary under this MVP contract.
