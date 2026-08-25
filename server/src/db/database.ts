import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.ts';
import { SCHEMA_SQL } from './schema.ts';

export type Row = Record<string, unknown>;

let instance: DatabaseSync | null = null;

export function openDatabase(databasePath: string = config.databasePath): DatabaseSync {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }
  const db = new DatabaseSync(databasePath);
  db.exec(SCHEMA_SQL);
  migrate(db);
  return db;
}

/** Additive changes for databases that already existed before a schema revision. */
function migrate(db: DatabaseSync): void {
  const bookingCols = db.prepare('PRAGMA table_info(bookings)').all() as Array<{ name: string }>;
  if (!bookingCols.some((col) => col.name === 'payment_status')) {
    db.exec(`ALTER TABLE bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'`);
  }

  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as Array<{ name: string }>;
  if (!tables.some((row) => row.name === 'payment_sessions')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_sessions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        provider        TEXT    NOT NULL CHECK (provider IN ('stripe', 'demo')),
        provider_ref    TEXT    NOT NULL UNIQUE,
        kind            TEXT    NOT NULL CHECK (kind IN ('booking', 'membership')),
        booking_id      INTEGER REFERENCES bookings (id) ON DELETE SET NULL,
        invoice_id      INTEGER REFERENCES subscription_invoices (id) ON DELETE SET NULL,
        payer_user_id   INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        amount_cents    INTEGER NOT NULL CHECK (amount_cents >= 0),
        currency        TEXT    NOT NULL DEFAULT 'GBP',
        description     TEXT    NOT NULL DEFAULT '',
        success_path    TEXT    NOT NULL,
        cancel_path     TEXT    NOT NULL,
        status          TEXT    NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid', 'cancelled')),
        created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_payment_sessions_ref ON payment_sessions (provider_ref);
      CREATE INDEX IF NOT EXISTS idx_payment_sessions_booking ON payment_sessions (booking_id);
    `);
  }

  const slotCount = (db.prepare('SELECT COUNT(*) AS n FROM availability_slots').get() as { n: number }).n;
  if (slotCount === 0) {
    const professionals = db.prepare('SELECT id FROM professionals').all() as Array<{ id: number }>;
    const insert = db.prepare(
      `INSERT OR IGNORE INTO availability_slots (professional_id, weekday, start_minute, end_minute)
       VALUES (?, ?, 540, 1020)`,
    );
    for (const pro of professionals) {
      for (const weekday of [0, 1, 2, 3, 4]) insert.run(pro.id, weekday);
    }
  }
}

export function getDb(): DatabaseSync {
  if (!instance) {
    instance = openDatabase();
  }
  return instance;
}

/** Test/bootstrap hook: swap in an explicit connection (e.g. an in-memory one). */
export function setDb(db: DatabaseSync): void {
  instance = db;
}

export function closeDb(): void {
  instance?.close();
  instance = null;
}

export function all<T = Row>(sql: string, ...params: unknown[]): T[] {
  return getDb()
    .prepare(sql)
    .all(...(params as never[])) as T[];
}

export function get<T = Row>(sql: string, ...params: unknown[]): T | undefined {
  return getDb()
    .prepare(sql)
    .get(...(params as never[])) as T | undefined;
}

export function run(sql: string, ...params: unknown[]): { changes: number; lastInsertRowid: number } {
  const result = getDb()
    .prepare(sql)
    .run(...(params as never[]));
  return {
    changes: Number(result.changes),
    lastInsertRowid: Number(result.lastInsertRowid),
  };
}

export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
