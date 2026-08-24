// Canonical database schema. Applied idempotently at startup by `openDatabase()`.

export const SCHEMA_SQL = String.raw`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  email          TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash  TEXT    NOT NULL,
  role           TEXT    NOT NULL CHECK (role IN ('admin', 'professional', 'client')),
  full_name      TEXT    NOT NULL,
  phone          TEXT,
  status         TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Catalogue: fields of expertise
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT    NOT NULL UNIQUE,
  name         TEXT    NOT NULL,
  description  TEXT    NOT NULL DEFAULT '',
  icon         TEXT    NOT NULL DEFAULT 'briefcase',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Membership plans. A plan carries the recurring monthly fee a professional
-- pays to be listed. Admins can edit plan pricing, or override the fee for an
-- individual professional (see professionals.monthly_fee_cents).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS plans (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT    NOT NULL UNIQUE,
  name              TEXT    NOT NULL,
  description       TEXT    NOT NULL DEFAULT '',
  monthly_fee_cents INTEGER NOT NULL CHECK (monthly_fee_cents >= 0),
  currency          TEXT    NOT NULL DEFAULT 'GBP',
  commission_bps    INTEGER NOT NULL DEFAULT 0 CHECK (commission_bps BETWEEN 0 AND 10000),
  max_listings      INTEGER NOT NULL DEFAULT 1,
  features          TEXT    NOT NULL DEFAULT '[]',
  is_active         INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Professional profiles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS professionals (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id              INTEGER NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  category_id          INTEGER NOT NULL REFERENCES categories (id),
  plan_id              INTEGER NOT NULL REFERENCES plans (id),
  slug                 TEXT    NOT NULL UNIQUE,
  display_name         TEXT    NOT NULL,
  headline             TEXT    NOT NULL DEFAULT '',
  bio                  TEXT    NOT NULL DEFAULT '',
  business_name        TEXT,
  city                 TEXT    NOT NULL DEFAULT '',
  region               TEXT    NOT NULL DEFAULT '',
  country              TEXT    NOT NULL DEFAULT '',
  years_experience     INTEGER NOT NULL DEFAULT 0 CHECK (years_experience >= 0),

  -- Professional-controlled pricing
  hourly_rate_cents    INTEGER NOT NULL DEFAULT 0 CHECK (hourly_rate_cents >= 0),
  currency             TEXT    NOT NULL DEFAULT 'GBP',
  minimum_hours        REAL    NOT NULL DEFAULT 1 CHECK (minimum_hours > 0),
  callout_fee_cents    INTEGER NOT NULL DEFAULT 0 CHECK (callout_fee_cents >= 0),
  free_consultation    INTEGER NOT NULL DEFAULT 0 CHECK (free_consultation IN (0, 1)),

  -- Platform-controlled billing
  monthly_fee_cents    INTEGER NOT NULL DEFAULT 0 CHECK (monthly_fee_cents >= 0),
  fee_is_overridden    INTEGER NOT NULL DEFAULT 0 CHECK (fee_is_overridden IN (0, 1)),
  subscription_status  TEXT    NOT NULL DEFAULT 'trialing'
                       CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'cancelled')),
  next_invoice_date    TEXT,

  specialties          TEXT    NOT NULL DEFAULT '[]',
  languages            TEXT    NOT NULL DEFAULT '["English"]',
  credentials          TEXT    NOT NULL DEFAULT '[]',
  service_areas        TEXT    NOT NULL DEFAULT '[]',
  avatar_url           TEXT,
  website              TEXT,

  verification_status  TEXT    NOT NULL DEFAULT 'pending'
                       CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  is_published         INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  response_time_hours  INTEGER NOT NULL DEFAULT 24,
  rating_avg           REAL    NOT NULL DEFAULT 0,
  rating_count         INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_professionals_category ON professionals (category_id);
CREATE INDEX IF NOT EXISTS idx_professionals_published ON professionals (is_published, verification_status);

-- ---------------------------------------------------------------------------
-- Bookings: a client engages a professional for N hours at the rate that was
-- advertised at the time of booking.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bookings (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  reference           TEXT    NOT NULL UNIQUE,
  client_id           INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  professional_id     INTEGER NOT NULL REFERENCES professionals (id) ON DELETE CASCADE,
  status              TEXT    NOT NULL DEFAULT 'requested'
                      CHECK (status IN ('requested', 'accepted', 'declined', 'completed', 'cancelled')),
  subject             TEXT    NOT NULL,
  details             TEXT    NOT NULL DEFAULT '',
  scheduled_for       TEXT    NOT NULL,
  estimated_hours     REAL    NOT NULL CHECK (estimated_hours > 0),
  hourly_rate_cents   INTEGER NOT NULL CHECK (hourly_rate_cents >= 0),
  callout_fee_cents   INTEGER NOT NULL DEFAULT 0 CHECK (callout_fee_cents >= 0),
  currency            TEXT    NOT NULL DEFAULT 'GBP',
  logged_hours        REAL,
  total_cents         INTEGER,
  commission_cents    INTEGER,
  professional_note   TEXT,
  payment_status      TEXT    NOT NULL DEFAULT 'unpaid'
                      CHECK (payment_status IN ('unpaid', 'paid', 'waived')),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_professional ON bookings (professional_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Reviews (one per completed booking)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reviews (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id      INTEGER UNIQUE REFERENCES bookings (id) ON DELETE SET NULL,
  professional_id INTEGER NOT NULL REFERENCES professionals (id) ON DELETE CASCADE,
  client_id       INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT    NOT NULL DEFAULT '',
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reviews_professional ON reviews (professional_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Pricing history. Every change to an hourly rate (by the professional) or a
-- monthly fee (by an admin) is recorded here and surfaced in both dashboards.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rate_changes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  professional_id INTEGER NOT NULL REFERENCES professionals (id) ON DELETE CASCADE,
  field           TEXT    NOT NULL CHECK (field IN ('hourly_rate_cents', 'monthly_fee_cents', 'callout_fee_cents', 'plan_id')),
  old_value       INTEGER,
  new_value       INTEGER NOT NULL,
  changed_by      INTEGER REFERENCES users (id) ON DELETE SET NULL,
  changed_by_role TEXT    NOT NULL CHECK (changed_by_role IN ('admin', 'professional', 'system')),
  reason          TEXT    NOT NULL DEFAULT '',
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rate_changes_professional ON rate_changes (professional_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Monthly membership invoices
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  professional_id INTEGER NOT NULL REFERENCES professionals (id) ON DELETE CASCADE,
  period_start    TEXT    NOT NULL,
  period_end      TEXT    NOT NULL,
  amount_cents    INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency        TEXT    NOT NULL DEFAULT 'GBP',
  status          TEXT    NOT NULL DEFAULT 'due' CHECK (status IN ('paid', 'due', 'void')),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_professional ON subscription_invoices (professional_id, period_start DESC);

-- ---------------------------------------------------------------------------
-- Admin audit trail
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    INTEGER REFERENCES users (id) ON DELETE SET NULL,
  actor_email TEXT    NOT NULL DEFAULT '',
  action      TEXT    NOT NULL,
  entity_type TEXT    NOT NULL,
  entity_id   INTEGER,
  summary     TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events (created_at DESC);

-- ---------------------------------------------------------------------------
-- Platform-wide settings editable from the admin dashboard
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- In-app notifications (no email provider in this build)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type        TEXT    NOT NULL,
  title       TEXT    NOT NULL,
  body        TEXT    NOT NULL DEFAULT '',
  href        TEXT    NOT NULL DEFAULT '',
  read_at     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Messages on a booking, visible to the client, the professional, and admins
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS booking_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  sender_id   INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_booking_messages ON booking_messages (booking_id, id);

-- ---------------------------------------------------------------------------
-- Weekly availability. weekday 0 = Monday … 6 = Sunday. Minutes from midnight.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS availability_slots (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  professional_id  INTEGER NOT NULL REFERENCES professionals (id) ON DELETE CASCADE,
  weekday          INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_minute     INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute       INTEGER NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  UNIQUE (professional_id, weekday)
);
`;
