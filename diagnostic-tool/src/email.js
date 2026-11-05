// Sends the results email to the clinician.
//
// If SMTP_HOST is not set (e.g. while developing on your own computer), the
// email is NOT sent; it is written to the outbox/ folder instead so you can
// read it.

import nodemailer from 'nodemailer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CLINICIAN_CHECKLIST } from './scoring.js';

const includePersonalNumber = process.env.EMAIL_INCLUDE_PERSONAL_NUMBER === 'true';

function createTransport() {
  if (!process.env.SMTP_HOST) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = TLS from the start; 587 = STARTTLS
    requireTLS: port !== 465, // never send health data over an unencrypted connection
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

const transport = createTransport();

// "199001011234" -> "********1234". Shows only the last 4 characters.
export function maskPersonalNumber(value) {
  const s = String(value);
  if (s.length <= 4) return '****';
  return '*'.repeat(s.length - 4) + s.slice(-4);
}

function symptomLines(list) {
  if (list.length === 0) return ['    (none)'];
  return list.map((s) => `    - ${s.symptom}: ${s.frequency}`);
}

export function buildReportText({ patient, results, completedAt, reportUrl }) {
  const d = results.depression;
  const a = results.anxiety;
  const lines = [];

  if (results.safetyFlag) {
    lines.push(
      '!!! SAFETY ALERT !!!',
      `The patient answered "${results.safetyAnswer}" to PHQ-9 item 9`,
      '(thoughts of being better off dead or of self-harm).',
      'This needs prompt clinical follow-up and a suicide risk assessment.',
      ''
    );
  }

  lines.push(
    'SCREENING RESULT — NOT A DIAGNOSIS',
    '',
    'Patient',
    `  Name:            ${patient.first_name} ${patient.last_name}`,
    `  Personal number: ${includePersonalNumber ? patient.personal_number : maskPersonalNumber(patient.personal_number)}`,
    `  Age / gender:    ${patient.age} / ${patient.gender}`,
    `  Education:       ${patient.education}`,
    `  Employed:        ${patient.employed ? 'Yes' : 'No'}`,
    `  Completed:       ${completedAt} (UTC)`,
    '',
    'MAJOR DEPRESSIVE DISORDER (PHQ-9)',
    `  Likelihood:      ${d.likelihood}`,
    `  PHQ-9 total:     ${d.total}/${d.maxTotal} (${d.severity})`,
    `  DSM-5-TR count:  ${d.symptomCount} of 9 symptoms at threshold; core symptom ${d.coreSymptomPresent ? 'present' : 'absent'}`,
    `  Algorithm:       ${d.syndrome}`,
    `  Impairment:      ${d.functionalDifficulty}`,
    '  Symptoms at diagnostic threshold:',
    ...symptomLines(d.thresholdSymptoms),
    '  Subclinical symptoms (present, below threshold):',
    ...symptomLines(d.subclinicalSymptoms),
    '',
    'GENERALIZED ANXIETY DISORDER (GAD-7 + DSM-5-TR criteria items)',
    `  Likelihood:      ${a.likelihood}`,
    `  GAD-7 total:     ${a.total}/${a.maxTotal} (${a.severity})`,
    `  Criterion A (excessive worry 6+ months): ${a.criteria.A ? 'Yes' : 'No'}`,
    `  Criterion B (hard to control):           ${a.criteria.B ? 'Yes' : 'No'}`,
    `  Criterion C (>= 3 of 6 symptoms):        ${a.criteria.C ? 'Yes' : 'No'} (${a.criteria.associatedCount} of 6)`,
    `  Impairment:      ${a.functionalDifficulty}`,
    '  Symptoms more than half the days:',
    ...symptomLines(a.thresholdSymptoms),
    '  Subclinical symptoms:',
    ...symptomLines(a.subclinicalSymptoms),
    ...a.notes.map((n) => `  Note: ${n}`),
    '',
    'Before making a diagnosis:',
    ...CLINICIAN_CHECKLIST.map((c) => `  - ${c}`),
    '',
    `Full report with item-level answers: ${reportUrl}`,
    '(Log in to the clinician portal to view it.)'
  );
  return lines.join('\n');
}

export async function sendResultsEmail({ to, patient, results, completedAt, reportUrl }) {
  const subject = results.safetyFlag
    ? `URGENT: safety alert in screening results (${patient.last_name})`
    : `Screening results ready (${patient.last_name})`;
  const text = buildReportText({ patient, results, completedAt, reportUrl });
  const message = {
    from: process.env.MAIL_FROM || 'screening@localhost',
    to,
    subject,
    text,
    priority: results.safetyFlag ? 'high' : 'normal',
  };

  if (!transport) {
    mkdirSync('outbox', { recursive: true });
    const file = `outbox/${Date.now()}.txt`;
    writeFileSync(file, `To: ${to}\nSubject: ${subject}\n\n${text}\n`);
    console.log(`[email] SMTP not configured; wrote email to ${file}`);
    return 'saved to outbox (SMTP not configured)';
  }

  await transport.sendMail(message);
  return 'sent';
}
