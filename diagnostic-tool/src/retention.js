// How long data is kept (GDPR storage limitation, Article 5(1)(e)).
//
// GDPR itself sets no fixed periods: data may be kept "no longer than is
// necessary", unless a law requires keeping it (Article 17(3)). For patient
// records in Sweden, Patientdatalagen (3 kap. 17 §) requires keeping the
// record for at least 10 years after the last entry. All periods below can be
// changed in .env; check them with your data protection officer.
//
//   RECORD_RETENTION_YEARS  patient records, counted from the last entry (default 10)
//   UNUSED_RETENTION_DAYS   questionnaires never completed, including saved
//                           drafts, after the link expired or was cancelled (default 30)
//   AUDIT_RETENTION_YEARS   audit log entries (default 10)
//
// Patient records past their period are NOT deleted automatically: they are
// listed for the treating clinician, who checks that nothing (ongoing care,
// a complaint, a legal hold) requires keeping them, and then deletes them.
// Short-lived data (expired logins, unused questionnaires, old audit entries)
// is deleted automatically every day.

import { db } from './db.js';

const number = (value, fallback) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback);

export function policy(env = process.env) {
  return {
    recordYears: number(env.RECORD_RETENTION_YEARS, 10),
    unusedDays: number(env.UNUSED_RETENTION_DAYS, 30),
    auditYears: number(env.AUDIT_RETENTION_YEARS, 10),
  };
}

const DAY = 24 * 3600 * 1000;
const yearsBefore = (date, years) => {
  const d = new Date(date);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d;
};
const yearsAfter = (date, years) => yearsBefore(date, -years);

// Dates in the database come in a few formats ("2026-11-06 10:05",
// "2026-11-06 10:05:30", ISO). This reads all of them as UTC.
export function parseDate(text) {
  if (!text) return null;
  const iso = text.includes('T') ? text : `${text.replace(' ', 'T')}${text.length <= 16 ? ':00' : ''}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
const sqlDate = (d) => d.toISOString().slice(0, 19).replace('T', ' '); // the datetime('now') format

// The most recent entry in a patient's record.
export function lastEntry(patientId) {
  const dates = [
    db.prepare('SELECT created_at FROM patients WHERE id = ?').get(patientId)?.created_at,
    ...db.prepare('SELECT created_at, completed_at, finalized_at FROM assessments WHERE patient_id = ?').all(patientId)
      .flatMap((a) => [a.created_at, a.completed_at, a.finalized_at]),
    ...db.prepare('SELECT created_at, completed_at FROM followups WHERE patient_id = ?').all(patientId)
      .flatMap((f) => [f.created_at, f.completed_at]),
  ].map(parseDate).filter(Boolean);
  return dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
}

// When the record may be deleted at the earliest.
export function keptUntil(patientId, p = policy()) {
  const last = lastEntry(patientId);
  return last ? yearsAfter(last, p.recordYears) : null;
}

// Patient records whose retention period has ended (for review).
export function recordsDue(ownerId, now = new Date(), p = policy()) {
  return db
    .prepare('SELECT id, first_name, last_name FROM patients WHERE clinician_id = ?')
    .all(ownerId)
    .map((patient) => ({ ...patient, lastEntry: lastEntry(patient.id), keptUntil: keptUntil(patient.id, p) }))
    .filter((r) => r.keptUntil && r.keptUntil <= now);
}

// Deletes short-lived data. Returns how many rows were deleted of each kind.
export function cleanup(now = new Date(), p = policy()) {
  const unusedCutoff = new Date(now.getTime() - p.unusedDays * DAY);
  const counts = {};
  counts.sessions = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now.toISOString()).changes;
  // Never completed, and the link expired (or was cancelled) long enough ago.
  counts.unusedAssessments = db
    .prepare(
      `DELETE FROM assessments WHERE completed_at IS NULL
         AND (expires_at < :cutoffIso OR (revoked = 1 AND created_at < :cutoffSql))`
    )
    .run({ cutoffIso: unusedCutoff.toISOString(), cutoffSql: sqlDate(unusedCutoff) }).changes;
  counts.unusedFollowups = db
    .prepare(
      `DELETE FROM followups WHERE completed_at IS NULL
         AND (expires_at < :cutoffIso OR (revoked = 1 AND created_at < :cutoffSql))`
    )
    .run({ cutoffIso: unusedCutoff.toISOString(), cutoffSql: sqlDate(unusedCutoff) }).changes;
  counts.auditEntries = db.prepare('DELETE FROM audit_log WHERE at < ?').run(sqlDate(yearsBefore(now, p.auditYears))).changes;
  // Access grants that ended more than the audit period ago are no longer needed either.
  counts.oldGrants = db
    .prepare('DELETE FROM patient_access WHERE COALESCE(revoked_at, expires_at) < ?')
    .run(yearsBefore(now, p.auditYears).toISOString()).changes;
  return counts;
}
