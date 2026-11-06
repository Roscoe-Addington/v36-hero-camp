// The audit log: a record of who viewed or changed a patient's information.
// Health data rules (e.g. GDPR and, in Sweden, Patientdatalagen) expect
// access to patient records to be logged and checked.

import { db } from './db.js';

const insert = db.prepare(
  'INSERT INTO audit_log (clinician_id, action, patient_id, assessment_id, detail) VALUES (?, ?, ?, ?, ?)'
);

// Short, readable names for each action.
export const ACTIONS = {
  view_patient: 'Viewed patient',
  create_patient: 'Created patient',
  edit_patient: 'Edited patient details',
  delete_patient: 'Deleted patient record',
  start_assessment: 'Started assessment',
  view_assessment: 'Viewed assessment',
  view_final: 'Viewed final report',
  view_safety_plan: 'Viewed safety plan',
  view_interview: 'Viewed intake interview',
  view_informant: 'Viewed informant information',
  view_risk: 'Viewed risk assessment',
  save_screening: 'Saved on-site screening',
  save_interview: 'Saved intake interview',
  save_informant: 'Saved informant information',
  save_risk: 'Saved risk assessment',
  save_intake: 'Saved MoCA and observations',
  save_checklist: 'Saved criteria checklist',
  diagnosis: 'Changed diagnoses',
  finalize: 'Finalized assessment',
  reopen: 'Reopened assessment',
  view_audit: 'Viewed audit log',
  start_followup: 'Started follow-up',
  view_followup: 'Viewed follow-up',
};

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
