// The audit log: a record of who viewed or changed a patient's information.
// Health data rules (e.g. GDPR and, in Sweden, Patientdatalagen) expect
// access to patient records to be logged and checked.

import { db } from './db.js';

const insert = db.prepare(
  'INSERT INTO audit_log (clinician_id, action, patient_id, assessment_id, detail) VALUES (?, ?, ?, ?, ?)'
);

export { ACTIONS } from './audit-actions.js';

export function audit(clinicianId, action, { patientId = null, assessmentId = null, detail = null } = {}) {
  insert.run(clinicianId, action, patientId, assessmentId, detail ? String(detail).slice(0, 500) : null);
}

export function auditForPatient(patientId) {
  return db
    .prepare(
      `SELECT l.*, c.name AS clinician_name FROM audit_log l
         LEFT JOIN clinicians c ON c.id = l.clinician_id
        WHERE l.patient_id = ? ORDER BY l.id DESC LIMIT 500`
    )
    .all(patientId);
}
