import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
const { db } = await import('../src/db.js');
const { policy, parseDate, lastEntry, keptUntil, recordsDue, cleanup } = await import('../src/retention.js');

const NOW = new Date('2026-11-06T12:00:00Z');
db.prepare("INSERT INTO clinicians (id, name, email, password_hash) VALUES (1, 'Dr A', 'a@example.com', 'x'), (2, 'Dr B', 'b@example.com', 'x')").run();
const addPatient = (id, owner, createdAt) =>
  db.prepare("INSERT INTO patients (id, clinician_id, first_name, last_name, personal_number, gender, age, education, employed, created_at) VALUES (?, ?, 'P', ?, 'x', 'Female', 40, 'Other / unknown', 1, ?)")
    .run(id, owner, `Patient${id}`, createdAt);
const addAssessment = (patientId, token, fields) => {
  const row = { created_at: '2026-01-01 10:00:00', expires_at: '2026-01-15T00:00:00Z', revoked: 0, completed_at: null, ...fields };
  db.prepare('INSERT INTO assessments (patient_id, token_hash, created_at, expires_at, revoked, completed_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(patientId, token, row.created_at, row.expires_at, row.revoked, row.completed_at);
};

test('policy defaults to 10 years / 30 days / 10 years and ignores invalid values', () => {
  assert.deepEqual(policy({}), { recordYears: 10, unusedDays: 30, auditYears: 10 });
  assert.deepEqual(policy({ RECORD_RETENTION_YEARS: '12', UNUSED_RETENTION_DAYS: 'abc', AUDIT_RETENTION_YEARS: '-1' }), { recordYears: 12, unusedDays: 30, auditYears: 10 });
});

test('dates in all stored formats are read as UTC', () => {
  assert.equal(parseDate('2026-11-06 10:05').toISOString(), '2026-11-06T10:05:00.000Z');
  assert.equal(parseDate('2026-11-06 10:05:30').toISOString(), '2026-11-06T10:05:30.000Z');
  assert.equal(parseDate('2026-11-06T10:05:30.000Z').toISOString(), '2026-11-06T10:05:30.000Z');
  assert.equal(parseDate(null), null);
});

test('records are kept 10 years after the LAST entry, then listed for review', () => {
  addPatient(1, 1, '2010-01-01 09:00:00');
  addAssessment(1, 't1', { created_at: '2014-05-01 09:00:00', completed_at: '2014-05-01 10:00' });
  addPatient(2, 1, '2012-01-01 09:00:00');
  addAssessment(2, 't2', { created_at: '2012-01-01 09:00:00', completed_at: '2020-03-01 10:00' }); // recent entry
  addPatient(3, 2, '2010-01-01 09:00:00'); // another clinician's patient

  assert.equal(lastEntry(1).toISOString().slice(0, 10), '2014-05-01');
  assert.equal(keptUntil(1).toISOString().slice(0, 10), '2024-05-01');
  assert.deepEqual(recordsDue(1, NOW).map((r) => r.id), [1], 'patient 2 has an entry from 2020');
  assert.deepEqual(recordsDue(1, NOW, { ...policy({}), recordYears: 20 }), []);
  assert.deepEqual(recordsDue(2, NOW).map((r) => r.id), [3], 'each clinician only sees their own');
});

test('cleanup deletes unused questionnaires, expired logins and old audit entries only', () => {
  addPatient(10, 1, '2026-01-01 09:00:00');
  addAssessment(10, 'old-unused', { expires_at: '2026-09-01T00:00:00Z' }); // expired > 30 days ago
  addAssessment(10, 'recent-unused', { expires_at: '2026-10-20T00:00:00Z' }); // expired < 30 days ago
  addAssessment(10, 'old-cancelled', { created_at: '2026-08-01 10:00:00', expires_at: '2099-01-01T00:00:00Z', revoked: 1 });
  addAssessment(10, 'old-completed', { expires_at: '2026-01-15T00:00:00Z', completed_at: '2026-01-10 10:00' });
  db.prepare("INSERT INTO sessions (token_hash, clinician_id, expires_at) VALUES ('s-old', 1, '2026-11-01T00:00:00Z'), ('s-new', 1, '2026-11-07T00:00:00Z')").run();
  db.prepare("INSERT INTO audit_log (at, clinician_id, action) VALUES ('2015-01-01 10:00:00', 1, 'view_patient'), ('2025-01-01 10:00:00', 1, 'view_patient')").run();

  const counts = cleanup(NOW);
  assert.equal(counts.unusedAssessments, 2);
  assert.equal(counts.sessions, 1);
  assert.equal(counts.auditEntries, 1);
  const left = db.prepare('SELECT token_hash FROM assessments WHERE patient_id = 10 ORDER BY id').all().map((r) => r.token_hash);
  assert.deepEqual(left, ['recent-unused', 'old-completed']);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM patients WHERE id = 1').get().n, 1, 'patient records are never deleted automatically');
});
