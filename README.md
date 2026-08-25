# ProConnect

A marketplace that connects people who need professional help with vetted
lawyers, tradespeople, accountants, real estate agents, coaches and more.

It has three surfaces:

| Surface | Route | Who uses it |
| --- | --- | --- |
| Public marketplace | `/` | Anyone searching for and booking a professional |
| Professional dashboard | `/dashboard` | The lawyer, plumber, accountant, coach, etc. |
| Admin dashboard | `/admin` | The platform operator |

The product is built around two pricing levers:

- **Professionals set their own hourly rate** from their dashboard. It appears
  immediately in search and on their public profile, and a booking always keeps
  the rate it was quoted at, even if the professional raises their price later.
- **Administrators set the monthly membership fee** each professional pays —
  either the list price of their plan, or a bespoke negotiated amount. Changing
  a plan's price re-prices every member on it except those with a negotiated
  fee.

Every change to either figure is written to a pricing history that both the
professional and the administrator can see, along with who made it and why.

## Quick start

Requires Node.js 22.5 or newer (the API uses the built-in `node:sqlite`
module, so there are no native dependencies to compile).

```bash
npm install
npm run dev
```

- Web app: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:4000>

The database is created and seeded automatically on first boot with ten
categories, four membership plans, sixteen professionals, four clients, and a
set of bookings and reviews.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@proconnect.test` | `admin1234` |
| Professional | `james.whitfield@example.com` | `password123` |
| Client | `client@proconnect.test` | `password123` |

Every other seeded professional and client uses `password123`. The sign-in page
lists the three accounts above and fills the form for you.

## What each surface does

### Public marketplace

- Landing page with keyword and location search, category browse, top-rated
  professionals and platform statistics.
- Directory with filters for category, location, maximum hourly rate, minimum
  rating and free consultations, plus six sort orders and pagination.
- Professional profiles with credentials, specialisms, service areas, languages
  and reviews tied to real completed bookings.
- Booking flow that shows the estimate (hours × hourly rate, plus any call-out
  fee) before the request is sent.
- Client area for tracking requests, cancelling, messaging the professional,
  recording payment on completed jobs, reviewing completed work, and viewing
  job invoices.
- Self-service application form that puts a professional into the admin
  verification queue.

### Professional dashboard

- Overview with pending requests, confirmed jobs, completed jobs and lifetime
  earnings.
- **My rates**: hourly rate, call-out fee, minimum engagement and free-
  consultation toggle, with a live preview of how clients will see it and the
  full pricing history underneath.
- Profile editor for the headline, bio, photo, typical hours, specialisms,
  credentials, coverage areas and directory visibility.
- Booking queue: accept, decline, message the client, then complete with the
  hours actually worked. The invoice total uses the rate the job was booked at.
- Job invoices for completed work, plus the membership tab for monthly fees,
  plan comparison, plan switching and invoice history.
- Typical hours on the public profile, with a warning when a request falls
  outside those hours.
- In-app notifications for new bookings, messages, verification and fee changes.

### Admin dashboard

- Overview with monthly recurring revenue, professional and client counts, the
  verification queue, gross booking value, revenue by plan and coverage by
  field.
- **Sign up an expert**: creates the login and the directory profile together,
  sets the initial hourly rate, and applies either the plan price or a
  negotiated monthly fee.
- Per-professional controls: change the monthly fee, override the hourly rate,
  move between plans, verify or reject, publish or unlist, change subscription
  status, suspend the account, raise membership invoices and mark them paid.
- Plan management, where editing a price re-prices every member on that plan
  and reports how many were affected.
- Category management, booking oversight (including the message thread), and a
  full audit log.

## Architecture

```
.
├── server/          Express + TypeScript API
│   └── src/
│       ├── auth/        scrypt password hashing, HMAC session tokens, guards
│       ├── db/          schema, connection helpers, seed data
│       ├── domain/      professional mapping, pricing history, audit trail
│       ├── routes/      auth, directory, professional, bookings, admin
│       └── test/        integration tests against an in-memory database
└── web/             React 19 + Vite + Tailwind CSS 4
    └── src/
        ├── components/  design system, layout shells, shared cards
        ├── lib/         API client, auth context, formatting, data hooks
        └── pages/       public/, client/, pro/, admin/
```

The server runs TypeScript directly through Node's type stripping in
development and tests, and compiles with `tsc` for production. Money is stored
as integer pence throughout; only the presentation layer divides by 100.

### Data model

`users` → `professionals` (one profile per professional account), each in a
`category` and on a `plan`. `bookings` join a client to a professional and
snapshot the hourly rate at request time. `reviews` hang off completed
bookings. `booking_messages` are the thread on a job. `availability_slots`
hold weekday hours. `notifications` are in-app alerts. `rate_changes` records
every hourly-rate and monthly-fee change, `subscription_invoices` records
membership billing, and `audit_events` records administrative actions.

## Commands

Run from the repository root:

```bash
npm run dev         # API and web app together
npm run build       # compile the server and bundle the web app
npm run typecheck   # type-check both packages
npm test            # server integration tests
npm run seed        # seed a database manually (add -- --force to reseed)
```

## Tests

`npm test` runs 75 integration tests against a freshly seeded in-memory
database, covering:

- **auth** — signup, duplicate emails, password rules, tampered tokens, role
  boundaries, password changes.
- **directory** — category counts, verified-only listings, every search filter,
  sorting, pagination, hidden unpublished profiles, applications.
- **pricing** — a professional changing their own rate, an admin setting a
  bespoke fee, a professional being unable to change their own fee, plan
  switching, plan-wide re-pricing skipping negotiated fees, and the audit trail.
- **admin** — onboarding, negotiated fees, verification, unlisting, suspension,
  category and plan management, invoicing.
- **bookings** — rate snapshotting, minimum engagement, permissions, status
  transitions, hour logging, one review per booking, rating aggregation, and
  flagging requests that fall outside typical hours.
- **engagement** — in-app notifications, booking messages (including admin
  replies), weekly availability, local avatar uploads and removal, credential
  edits, client job payment, and admin invoice settlement.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | API port |
| `HOST` | `127.0.0.1` | API bind address |
| `DATABASE_PATH` | `server/data/proconnect.db` | SQLite file |
| `UPLOADS_DIR` | `server/data/uploads` | Local avatar files |
| `AUTH_SECRET` | development default | Session token signing key |
| `TOKEN_TTL_SECONDS` | `43200` | Session lifetime |
| `API_PROXY_TARGET` | `http://127.0.0.1:4000` | Where Vite proxies `/api` and `/uploads` |

`AUTH_SECRET` must be set to a real secret outside local development.

## Not included

This is a working product build, not a production deployment. Payments are
modelled (fees, commissions, invoices and a client “record payment” action)
but no card processor is wired up, and there is no email delivery. Avatar
photos are stored on the local disk under `/uploads`.
