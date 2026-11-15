// Access to patient records.
//
// Who may see a patient:
// - the clinician the patient is assigned to now (the treating clinician,
//   who may also change the file);
// - clinicians the patient was assigned to before ("have worked with"):
//   read-only, for FORMER_ACCESS_MONTHS months after the end of the
//   assignment, or without a limit when that setting is empty;
// - a supervisor or close colleague the treating clinician names: read-only;
// - administrators (the highest access): read-only for every patient, and
//   they assign and reassign patients to clinicians.
// Everyone else gets "not found", exactly as if the patient did not exist,
// so the app does not even reveal that a record exists. Every view, grant
// and assignment goes into the audit log.

import { db } from './db.js';

export const ROLES = { supervisor: 'Supervisor', colleague: 'Close colleague' };
export const isAdmin = (clinician) => clinician?.role === 'admin';

const nowIso = () => new Date().toISOString();

const FORMER_SQL = `EXISTS (
  SELECT 1 FROM patient_assignments pas
   WHERE pas.patient_id = p.id AND pas.clinician_id = :me AND pas.ended_at IS NOT NULL
     AND (:formerSince IS NULL OR pas.ended_at > :formerSince))`;
const GRANT_SQL = `EXISTS (
  SELECT 1 FROM patient_access pa
   WHERE pa.patient_id = p.id AND pa.clinician_id = :me AND pa.revoked_at IS NULL
     AND (pa.expires_at IS NULL OR pa.expires_at > :now))`;

// The SQL condition "this clinician may see patient p". Used in every query
// that loads patient data, so no page can forget the check.
export const ACCESS_SQL = `(:admin = 1 OR p.clinician_id = :me OR ${FORMER_SQL} OR ${GRANT_SQL})`;

// Former treating clinicians keep access until this date (null: no limit).
function formerSince(env = process.env) {
  const months = Number(env.FORMER_ACCESS_MONTHS || 0);
  if (!(months > 0)) return null;
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString();
}

// Parameters for ACCESS_SQL. `asAdmin: false` leaves out the administrator's
// access to everyone (used for "my patients" on the start page).
export const accessParams = (clinician, { asAdmin = true } = {}) => ({
  me: clinician.id, admin: asAdmin && isAdmin(clinician) ? 1 : 0, now: nowIso(), formerSince: formerSince(),
});

// How this clinician may access this patient: { owner: true }, or read-only
// as { role: 'supervisor' | 'colleague', grant }, { role: 'former', assignment }
// or { role: 'admin' }; null for no access.
export function accessOf(clinician, patient) {
  if (!patient || !clinician) return null;
  if (patient.clinician_id === clinician.id) return { owner: true, role: 'owner' };
  const grant = db
    .prepare(
      `SELECT pa.*, c.name AS granted_by_name FROM patient_access pa JOIN clinicians c ON c.id = pa.granted_by
        WHERE pa.patient_id = ? AND pa.clinician_id = ? AND pa.revoked_at IS NULL
          AND (pa.expires_at IS NULL OR pa.expires_at > ?)
        ORDER BY pa.id DESC LIMIT 1`
    )
    .get(patient.id, clinician.id, nowIso());
  if (grant) return { owner: false, role: grant.role, grant };
  const since = formerSince();
  const assignment = db
    .prepare(
      `SELECT * FROM patient_assignments WHERE patient_id = ? AND clinician_id = ? AND ended_at IS NOT NULL
          AND (? IS NULL OR ended_at > ?) ORDER BY ended_at DESC LIMIT 1`
    )
    .get(patient.id, clinician.id, since, since);
  if (assignment) return { owner: false, role: 'former', assignment };
  if (isAdmin(clinician)) return { owner: false, role: 'admin' };
  return null;
}

// ---------- Assigning patients to clinicians ----------

// A new patient is assigned to the clinician who registers them.
export function startAssignment(patientId, clinicianId) {
  db.prepare('INSERT INTO patient_assignments (patient_id, clinician_id, started_at, assigned_by) VALUES (?, ?, ?, ?)')
    .run(patientId, clinicianId, nowIso(), clinicianId);
}

export function assignmentsFor(patientId) {
  return db
    .prepare(
      `SELECT a.*, c.name AS clinician_name, b.name AS assigned_by_name FROM patient_assignments a
         JOIN clinicians c ON c.id = a.clinician_id LEFT JOIN clinicians b ON b.id = a.assigned_by
        WHERE a.patient_id = ? ORDER BY a.started_at DESC, a.id DESC`
    )
    .all(patientId);
}

// An administrator moves a patient to another clinician. The earlier
// clinician keeps read-only access (see above). Returns { from, to } or { error }.
export function assignPatient({ patient, admin, toClinicianId, reason }) {
  if (!isAdmin(admin)) return { error: 'Only an administrator can assign patients.' };
  const to = db.prepare('SELECT id, name FROM clinicians WHERE id = ?').get(Number(toClinicianId) || 0);
  if (!to) return { error: 'Choose a clinician.' };
  if (to.id === patient.clinician_id) return { error: 'The patient is already assigned to this clinician.' };
  const why = String(reason ?? '').trim().slice(0, 300);
  if (!why) return { error: 'Write why the patient is assigned to another clinician.' };
  const from = db.prepare('SELECT id, name FROM clinicians WHERE id = ?').get(patient.clinician_id);
  const at = nowIso();
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE patient_assignments SET ended_at = ?, ended_by = ? WHERE patient_id = ? AND ended_at IS NULL').run(at, admin.id, patient.id);
    db.prepare('INSERT INTO patient_assignments (patient_id, clinician_id, started_at, assigned_by, reason) VALUES (?, ?, ?, ?, ?)')
      .run(patient.id, to.id, at, admin.id, why);
    db.prepare('UPDATE patients SET clinician_id = ? WHERE id = ?').run(to.id, patient.id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { from, to, reason: why };
}

export function grantsFor(patientId) {
  return db
    .prepare(
      `SELECT pa.*, c.name AS clinician_name, c.email AS clinician_email FROM patient_access pa
         JOIN clinicians c ON c.id = pa.clinician_id
        WHERE pa.patient_id = ? ORDER BY pa.id DESC`
    )
    .all(patientId);
}

// Returns { grant } or { error }.
export function grantAccess({ patient, ownerId, email, role, until, reason }) {
  if (patient.clinician_id !== ownerId) return { error: 'Only the treating clinician can grant access.' };
  if (!Object.hasOwn(ROLES, role)) return { error: 'Choose a role.' };
  const why = String(reason ?? '').trim().slice(0, 300);
  if (!why) return { error: 'Write why this person needs access.' };
  const other = db.prepare('SELECT id, name FROM clinicians WHERE email = ?').get(String(email ?? '').trim().toLowerCase());
  if (!other) return { error: 'No clinician account with that email address.' };
  if (other.id === ownerId) return { error: 'You already have access as the treating clinician.' };
  let expires = null;
  if (until) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until) || Number.isNaN(Date.parse(until))) return { error: 'The end date must be a date (YYYY-MM-DD).' };
    expires = new Date(`${until}T23:59:59Z`).toISOString(); // access lasts to the end of that day
    if (expires <= nowIso()) return { error: 'The end date must be in the future.' };
  }
  // Replace any earlier active grant for the same person.
  db.prepare('UPDATE patient_access SET revoked_at = ? WHERE patient_id = ? AND clinician_id = ? AND revoked_at IS NULL').run(nowIso(), patient.id, other.id);
  const result = db
    .prepare('INSERT INTO patient_access (patient_id, clinician_id, role, reason, granted_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(patient.id, other.id, role, why, ownerId, expires);
  return { grant: { id: Number(result.lastInsertRowid), name: other.name, role, expires } };
}

export function revokeAccess({ patient, ownerId, grantId }) {
  if (patient.clinician_id !== ownerId) return { error: 'Only the treating clinician can revoke access.' };
  const changed = db
    .prepare('UPDATE patient_access SET revoked_at = ? WHERE id = ? AND patient_id = ? AND revoked_at IS NULL')
    .run(nowIso(), Number(grantId), patient.id).changes;
  return changed ? { ok: true } : { error: 'No such active access.' };
}
