// The app's memory: one SQLite file inside DATA_DIR (./data locally, a Render disk when hosted).

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || "./data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS demos (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  auto_pay_limit_cents INTEGER NOT NULL DEFAULT 10000,
  ai_calls_used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  demo_id TEXT NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  is_sample INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  address TEXT NOT NULL,
  report_text TEXT NOT NULL,
  report_photo TEXT,
  summary TEXT,
  uncertain_notes TEXT,
  amount_cents INTEGER,
  status TEXT NOT NULL,
  needs_linda_reason TEXT,
  paypal_order_id TEXT,
  authorization_id TEXT,
  capture_id TEXT,
  payout_batch_id TEXT,
  payout_status TEXT,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  proof_submitted_at TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_demo ON jobs(demo_id);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  label TEXT NOT NULL,
  photo_instruction TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  item_id TEXT,
  path TEXT NOT NULL,
  fingerprint TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  verdict TEXT,
  reason TEXT,
  fix_instruction TEXT,
  reused_of_photo_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_job ON events(job_id);
`;

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as { mendlyDb?: Database.Database };

export function db(): Database.Database {
  if (!globalForDb.mendlyDb) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const conn = new Database(path.join(DATA_DIR, "mendly.db"));
    conn.pragma("journal_mode = WAL");
    conn.pragma("foreign_keys = ON");
    conn.exec(SCHEMA);
    globalForDb.mendlyDb = conn;
  }
  return globalForDb.mendlyDb;
}

export const now = () => new Date().toISOString();
