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

// The detailed differential diagnosis report, as plain text.
export function buildDifferentialText(differential) {
  if (!differential) return ['DIFFERENTIAL DIAGNOSIS SCREENING', '  Not available for this questionnaire.'];
  const { summary, entries, overlap } = differential;
  const lines = [
    'DIFFERENTIAL DIAGNOSIS SCREENING',
    `  ${summary.checked} alternative or co-occurring conditions checked (DSM-5-TR differentials for MDD and GAD).`,
    '  This shows what to explore in the interview. It does not confirm or exclude any diagnosis.',
    '',
    '  Summary',
    `    Screen positive:     ${summary.flagged.length ? summary.flagged.join('; ') : 'none'}`,
    `    Unclear / partial:   ${summary.possible.length ? summary.possible.join('; ') : 'none'}`,
    '',
    '  Overlap between MDD and GAD symptoms',
    ...overlap.shared.map(
      (s) => `    - ${s.symptom}: depression side ${s.onDepressionSide ? 'yes' : 'no'}, anxiety side ${s.onAnxietySide ? 'yes' : 'no'}`
    ),
    ...overlap.notes.map((n) => `    Note: ${n}`),
    '',
    '  Conditions checked (most important first)',
  ];
  entries.forEach((e, i) => {
    lines.push(
      '',
      `  ${i + 1}. ${e.condition}${e.priority ? '  [PRIORITY]' : ''}`,
      `     Status:       ${e.status}`,
      `     Relevant to:  ${e.relevantTo.join(', ')}`,
      `     Why checked:  ${e.why}`,
      `     Rule:         ${e.rule}`
    );
    if (e.evidence.length) {
      lines.push('     Answers used:');
      for (const ev of e.evidence) lines.push(`       [${ev.id}] ${ev.question}`, `              -> ${ev.answer}`);
    }
    lines.push(
      `     Finding:      ${e.finding}`,
      `     What it means: ${e.implication}`,
      `     Next step:    ${e.nextStep}`
    );
  });
  return lines;
}

// Suggested in-depth assessments from the intake screening, as plain text.
export function buildSuggestionsText(suggestions) {
  if (!suggestions) return [];
  const lines = ['SUGGESTED IN-DEPTH ASSESSMENTS'];
  if (suggestions.suggestions.length === 0) lines.push('  The screening does not point toward any disorder in this app.');
  for (const s of suggestions.suggestions) {
    lines.push(`  - ${s.name} [${s.strength}]`);
    for (const reason of s.reasons) lines.push(`      ${reason}`);
  }
  if (suggestions.neuroReferral.length) {
    lines.push('', '  Neurological symptoms (refer, do not diagnose here):');
    for (const n of suggestions.neuroReferral) lines.push(`  - ${n.urgent ? '[URGENT] ' : ''}${n.finding}. ${n.action}`);
  }
  if (suggestions.outOfScope.length) {
    lines.push('', '  Findings outside this app:');
    for (const o of suggestions.outOfScope) lines.push(`  - ${o.condition}`);
  }
  lines.push('', '  The MoCA and the clinician observations are added on site and can change these suggestions.');
  return lines;
}

export function buildReportText({ patient, results, suggestions, completedAt, reportUrl }) {
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

  const priority = results.differential?.summary.priority ?? [];
  if (priority.length) {
    lines.push(
      '!!! PRIORITY DIFFERENTIAL !!!',
      `Screen positive for: ${priority.join('; ')}.`,
      'See the differential diagnosis section below.',
      ''
    );
  }

  lines.push(
    'INTAKE SCREENING RESULT — NOT A DIAGNOSIS',
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
    '='.repeat(70),
    ...buildSuggestionsText(suggestions),
    '='.repeat(70),
    ...buildDifferentialText(results.differential),
    '='.repeat(70),
    '',
    `Full report with item-level answers: ${reportUrl}`,
    '(Log in to the clinician portal to view it.)'
  );
  return lines.join('\n');
}

export function isUrgent(results) {
  return results.safetyFlag || (results.differential?.summary.priority.length ?? 0) > 0;
}

export function buildEmailSubject(patient, results) {
  if (!isUrgent(results)) return `Screening results ready (${patient.last_name})`;
  const reason = results.safetyFlag ? 'safety alert' : 'priority differential';
  return `URGENT: ${reason} in screening results (${patient.last_name})`;
}

export async function sendResultsEmail({ to, patient, results, suggestions, completedAt, reportUrl }) {
  const urgent = isUrgent(results);
  const subject = buildEmailSubject(patient, results);
  const text = buildReportText({ patient, results, suggestions, completedAt, reportUrl });
  const message = {
    from: process.env.MAIL_FROM || 'screening@localhost',
    to,
    subject,
    text,
    priority: urgent ? 'high' : 'normal',
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

// Short email when a follow-up (PHQ-9 + GAD-7) is completed.
export async function sendFollowupEmail({ to, patient, result, completedAt, patientUrl }) {
  const subject = result.safetyFlag
    ? `URGENT: safety alert in follow-up (${patient.last_name})`
    : `Follow-up completed (${patient.last_name})`;
  const lines = [
    ...(result.safetyFlag ? [`!!! SAFETY ALERT: PHQ-9 item 9 answered "${result.safetyAnswer}". Assess suicide risk. !!!`, ''] : []),
    `Follow-up for ${patient.first_name} ${patient.last_name}, completed ${completedAt} (UTC).`,
    `PHQ-9: ${result.phq9}/27 (${result.phq9Severity})`,
    `GAD-7: ${result.gad7}/21 (${result.gad7Severity})`,
    '',
    `See the change over time on the patient page: ${patientUrl}`,
  ];
  const text = lines.join('\n');
  const message = { from: process.env.MAIL_FROM || 'screening@localhost', to, subject, text, priority: result.safetyFlag ? 'high' : 'normal' };
  if (!transport) {
    mkdirSync('outbox', { recursive: true });
    writeFileSync(`outbox/${Date.now()}-followup.txt`, `To: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return 'saved to outbox (SMTP not configured)';
  }
  await transport.sendMail(message);
  return 'sent';
}
