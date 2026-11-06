// Database setup. Uses SQLite through Node's built-in `node:sqlite` module,
// so there is no separate database server to install. The data lives in a
// single file (data/app.db by default).

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH || 'data/app.db';
if (DB_PATH !== ':memory:') mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  -- People who can log in to the clinician pages.
  CREATE TABLE IF NOT EXISTS clinicians (
    id            INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,  -- results are emailed here
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Logged-in browser sessions. We store a HASH of the cookie value, so a
  -- copy of the database alone cannot be used to log in.
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash   TEXT PRIMARY KEY,
    clinician_id INTEGER NOT NULL REFERENCES clinicians(id) ON DELETE CASCADE,
    expires_at   TEXT NOT NULL
  );

  -- Patient details entered by the clinician. Each patient belongs to one
  -- clinician, and clinicians only ever see their own patients.
  CREATE TABLE IF NOT EXISTS patients (
    id              INTEGER PRIMARY KEY,
    clinician_id    INTEGER NOT NULL REFERENCES clinicians(id),
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    personal_number TEXT NOT NULL,
    gender          TEXT NOT NULL,
    age             INTEGER NOT NULL,
    education       TEXT NOT NULL,
    employed        INTEGER NOT NULL,  -- 1 = yes, 0 = no
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- One row per questionnaire link sent to a patient. The link token itself
  -- is never stored, only its hash (like a password).
  CREATE TABLE IF NOT EXISTS assessments (
    id           INTEGER PRIMARY KEY,
    patient_id   INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    token_hash   TEXT NOT NULL UNIQUE,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at   TEXT NOT NULL,
    revoked      INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    answers_json TEXT,
    results_json TEXT,
    email_status TEXT
  );
`);

// ---------- Migrations ----------
// Columns added after the first version. ALTER TABLE adds them to an existing
// database file; a new database gets them the same way.
const NEW_ASSESSMENT_COLUMNS = {
  mode: "TEXT NOT NULL DEFAULT 'link'", // 'link' = patient answers via link, 'onsite' = with the clinician
  intake_json: 'TEXT', // clinician intake: MoCA scores, observations, notes
  checklists_json: 'TEXT', // in-depth criteria ratings per disorder
  diagnoses_json: 'TEXT', // diagnoses the clinician confirmed
  finalized_at: 'TEXT',
};
const existing = new Set(db.prepare('PRAGMA table_info(assessments)').all().map((c) => c.name));
for (const [name, type] of Object.entries(NEW_ASSESSMENT_COLUMNS)) {
  if (!existing.has(name)) db.exec(`ALTER TABLE assessments ADD COLUMN ${name} ${type}`);
}
