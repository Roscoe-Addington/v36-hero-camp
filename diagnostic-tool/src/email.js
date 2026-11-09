// Emails to the clinician.
//
// The emails contain NO health data and NO name or personal number: only
// that results are ready, an assessment number, and a link. The clinician
// logs in to read the results. Ordinary email is not a secure channel for
// health data, and an email cannot be deleted by the app's retention rules
// once it has been sent.
//
// If SMTP_HOST is not set (e.g. while developing on your own computer), the
// email is NOT sent; it is written to the outbox/ folder instead.

import nodemailer from 'nodemailer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { translator } from './i18n-clinician.js';

function createTransport() {
  if (!process.env.SMTP_HOST) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = TLS from the start; 587 = STARTTLS
    requireTLS: port !== 465, // never send over an unencrypted connection
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

const transport = createTransport();

// Results need prompt review: a safety alert (PHQ-9 item 9) or a priority
// differential (bipolar disorder or psychotic features screen positive).
export function isUrgent(results) {
  return Boolean(results.safetyFlag) || (results.differential?.summary.priority.length ?? 0) > 0;
}

// The subject and text of a "results are ready" email, in the clinician's
// language. `kind` is 'screening' or 'followup'; `ref` is the assessment or
// follow-up number.
export function readyEmail({ kind, ref, urgent, url, language = 'en' }) {
  const t = translator(language);
  const followup = kind === 'followup';
  const subject = urgent
    ? t(followup ? 'URGENT: Follow-up results need review today (#{ref})' : 'URGENT: Intake screening results need review today (#{ref})', { ref })
    : t(followup ? 'Follow-up results ready (#{ref})' : 'Intake screening results ready (#{ref})', { ref });
  const text = [
    t(followup ? 'Follow-up results for one of your patients are ready (reference #{ref}).' : 'Intake screening results for one of your patients are ready (reference #{ref}).', { ref }),
    ...(urgent ? ['', t('The answers need prompt review. Please log in and read them today.')] : []),
    '',
    t('Log in to see the results: {url}', { url }),
    '',
    t('For privacy, this email contains no names or health information.'),
    '',
    '— Continuum',
  ].join('\n');
  return { subject, text };
}

async function deliver(to, { subject, text }, urgent, tag) {
  if (!transport) {
    mkdirSync('outbox', { recursive: true });
    const file = `outbox/${Date.now()}-${tag}.txt`;
    writeFileSync(file, `To: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return 'saved to outbox (SMTP not configured)';
  }
  await transport.sendMail({ from: process.env.MAIL_FROM || 'Continuum <continuum@localhost>', to, subject, text, priority: urgent ? 'high' : 'normal' });
  return 'sent';
}

export function sendResultsEmail({ to, assessmentId, results, url, language }) {
  const urgent = isUrgent(results);
  return deliver(to, readyEmail({ kind: 'screening', ref: assessmentId, urgent, url, language }), urgent, 'screening');
}

export function sendFollowupEmail({ to, followupId, result, url, language }) {
  const urgent = Boolean(result.safetyFlag);
  return deliver(to, readyEmail({ kind: 'followup', ref: followupId, urgent, url, language }), urgent, 'followup');
}
