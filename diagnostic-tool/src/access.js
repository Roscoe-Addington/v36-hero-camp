// Access to patient records.
//
// Rule: only the treating clinician (the "owner", who created the patient)
// and people the owner names (a supervisor or a close colleague) may see a
// patient. Everyone else gets "not found", exactly as if the patient did
// not exist, so the app does not even reveal that a record exists.
//
// - Only the owner can grant or revoke access, and delete the record.
// - A grant needs a reason and can end on a date (e.g. while covering leave).
// - Grants and revocations go into the audit log; so does every view by
//   anyone with access.

import { db } from './db.js';

export const ROLES = { supervisor: 'Supervisor', colleague: 'Close colleague' };

const nowIso = () => new Date().toISOString();

// The SQL condition "clinician :me may see patient p". Used in every query
// that loads patient data, so no page can forget the check.
export const ACCESS_SQL = `(p.clinician_id = :me OR EXISTS (
  SELECT 1 FROM patient_access pa
   WHERE pa.patient_id = p.id AND pa.clinician_id = :me AND pa.revoked_at IS NULL
     AND (pa.expires_at IS NULL OR pa.expires_at > :now)))`;

export const accessParams = (clinicianId) => ({ me: clinicianId, now: nowIso() });

// How this clinician may access this patient: { owner: true }, { owner: false, role, grant }, or null.
export function accessOf(clinicianId, patient) {
  if (!patient) return null;
  if (patient.clinician_id === clinicianId) return { owner: true, role: 'owner' };
  const grant = db
    .prepare(
      `SELECT pa.*, c.name AS granted_by_name FROM patient_access pa JOIN clinicians c ON c.id = pa.granted_by
        WHERE pa.patient_id = ? AND pa.clinician_id = ? AND pa.revoked_at IS NULL
          AND (pa.expires_at IS NULL OR pa.expires_at > ?)
        ORDER BY pa.id DESC LIMIT 1`
    )
    .get(patient.id, clinicianId, nowIso());
  return grant ? { owner: false, role: grant.role, grant } : null;
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
