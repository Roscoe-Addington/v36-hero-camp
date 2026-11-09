// The final report as a PDF file (pdfkit).
//
// Same content as the final report page. The PDF uses pdfkit's built-in
// Helvetica font, which covers the Western European character set (WinAnsi:
// including å, ä, ö, é, – and ’). Other characters are replaced by plain
// equivalents so they never print as empty boxes.

import PDFDocument from 'pdfkit';
import { evaluateDisorder } from './criteria.js';
import { findDisorder } from './disorders.js';
import { conflictsAmong } from './conflicts.js';
import { summaryRows } from './forms.js';
import { INTERVIEW, MSE, RISK, INFORMANT, riskIndicators } from './clinical-forms.js';
import { scoreMoca } from './moca.js';
import { translator } from './i18n-clinician.js';
import { employmentLabel } from './views.js';

// Characters WinAnsi has above Latin-1 (code points 0x80-0x9F in Windows-1252).
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
const REPLACE = { '≥': '>=', '≤': '<=', '→': '->', '←': '<-', '✓': 'v', '−': '-', ' ': ' ', ' ': ' ' };

export function winAnsi(text) {
  return [...String(text ?? '')]
    .map((ch) => {
      if (REPLACE[ch]) return REPLACE[ch];
      const code = ch.codePointAt(0);
      if (code === 10 || (code >= 32 && code <= 126) || (code >= 160 && code <= 255) || WIN_ANSI_EXTRA.has(ch)) return ch;
      return '?';
    })
    .join('');
}

const MARGIN = 50;
const COLOR = { text: '#1d2430', muted: '#5b6575', accent: '#1f5f8b', line: '#d9dee6', danger: '#b42318' };

// Returns a Promise of the PDF as a Buffer.
// language: the language of the clinician who downloads it ('en' or 'sv').
export function finalReportPdf({ c, suggestions, clinicianName, language = 'en' }) {
  const t = translator(language);
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true, info: { Title: `Continuum · ${t('Final assessment report')} #${c.assessment.id}`, Author: clinicianName, Creator: 'Continuum' } });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  const width = doc.page.width - 2 * MARGIN;

  // ----- small drawing helpers -----
  const ensureSpace = (needed) => {
    if (doc.y + needed > doc.page.height - MARGIN - 30) doc.addPage();
  };
  const heading = (text) => {
    ensureSpace(60);
    doc.moveDown(0.8).font('Helvetica-Bold').fontSize(13).fillColor(COLOR.accent).text(winAnsi(text));
    doc.moveTo(MARGIN, doc.y + 2).lineTo(MARGIN + width, doc.y + 2).strokeColor(COLOR.line).lineWidth(0.7).stroke();
    doc.moveDown(0.5).fillColor(COLOR.text);
  };
  const para = (text, { bold = false, color = COLOR.text, size = 10 } = {}) => {
    ensureSpace(20);
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color).text(winAnsi(text), { width });
    doc.moveDown(0.3);
  };
  const bullet = (text) => {
    ensureSpace(20);
    doc.font('Helvetica').fontSize(10).fillColor(COLOR.text).text(winAnsi(`•  ${text}`), MARGIN + 8, doc.y, { width: width - 8 });
    doc.x = MARGIN;
    doc.moveDown(0.2);
  };
  // Label/value pairs in two columns.
  const pairs = (rows) => {
    for (const { label, value } of rows) {
      ensureSpace(24);
      const y = doc.y;
      doc.font('Helvetica').fontSize(9).fillColor(COLOR.muted).text(winAnsi(label), MARGIN, y, { width: 170 });
      const labelBottom = doc.y;
      doc.font('Helvetica').fontSize(10).fillColor(COLOR.text).text(winAnsi(value), MARGIN + 180, y, { width: width - 180 });
      doc.y = Math.max(doc.y, labelBottom) + 4;
      doc.x = MARGIN;
    }
  };
  const none = (text) => para(text, { color: COLOR.muted });

  // ----- content -----
  const { assessment, patient } = c;
  const r = c.results;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.muted).text('Continuum');
  doc.font('Helvetica-Bold').fontSize(18).fillColor(COLOR.text).text(winAnsi(t('Final assessment report')));
  doc.font('Helvetica').fontSize(9).fillColor(COLOR.muted).text(winAnsi(t('Assessment #{id} · finalized {date}', { id: assessment.id, date: assessment.finalized_at })));
  doc.moveDown(0.8);
  pairs([
    { label: t('Patient'), value: `${patient.first_name} ${patient.last_name}` },
    { label: t('Personal number'), value: patient.personal_number },
    { label: t('Age / gender'), value: `${patient.age} / ${t(patient.gender)}` },
    { label: t('Education'), value: t(patient.education) },
    { label: t('Employment'), value: employmentLabel(patient.employed, t) },
    { label: t('Treating clinician'), value: clinicianName },
    { label: t('Intake screening'), value: `${assessment.mode === 'onsite' ? t('On site') : t('By link')}, ${t('completed {date}', { date: assessment.completed_at })}` },
  ]);

  heading(t('Diagnoses'));
  if (c.diagnoses.items.length) {
    for (const d of c.diagnoses.items) {
      para(`${d.code}   ${d.name}`, { bold: true });
      para(`${t('Criteria at confirmation: {status}', { status: t(d.criteriaStatus) })}${d.note ? `. ${t('Note: {note}', { note: d.note })}` : ''}`, { size: 9, color: COLOR.muted });
      if (d.conflictOverride) para(`${t('Reason for giving {name} despite a conflict:', { name: d.name })} ${d.conflictOverride}`, { size: 9, color: COLOR.danger });
    }
  } else {
    none(t('No diagnosis in the scope of this app was made.'));
  }
  const checks = conflictsAmong(c.diagnoses.items.map((d) => d.disorderId));
  if (checks.length) {
    para(t('Combination checks'), { bold: true });
    for (const k of checks) bullet(`${t(k.level)}: ${k.ids.map((id) => findDisorder(id).name).join(' + ')}. ${k.message}`);
  }
  if (c.diagnoses.finalNote) {
    para(t('Summary'), { bold: true });
    para(c.diagnoses.finalNote);
  }

  heading(t('In-depth assessments'));
  const assessed = Object.entries(c.checklists);
  if (assessed.length) {
    for (const [id, checklist] of assessed) {
      const ev = evaluateDisorder(findDisorder(id), checklist, patient);
      const counts = ev.counts.map((n) => t('{present} of {of} symptoms (at least {min})', n)).join('; ');
      bullet(`${findDisorder(id).name}: ${t(ev.status)}${counts ? `, ${counts}` : ''}${checklist.notes ? `. ${checklist.notes}` : ''}`);
    }
  } else {
    none(t('No in-depth checklists were completed.'));
  }

  heading(t('Intake interview'));
  const iv = summaryRows(INTERVIEW, c.interview, t);
  iv.length ? pairs(iv) : none(t('Not filled in yet.'));
  heading(t('Mental status examination'));
  const mse = summaryRows(MSE, c.interview, t);
  mse.length ? pairs(mse) : none(t('Not filled in yet.'));

  if (c.informant) {
    heading(t('Informant'));
    pairs(summaryRows(INFORMANT, c.informant, t));
  }

  heading(t('Suicide risk assessment'));
  if (c.risk) pairs(summaryRows(RISK, c.risk, t));
  else none(riskIndicators(c).length ? t('Not done.') : t('Not done (no indication found).'));

  heading(t('Screening summary'));
  const m = scoreMoca(c.intake?.moca);
  pairs([
    { label: 'PHQ-9', value: `${r.depression.total}/27 (${t(r.depression.severity)})` },
    { label: 'GAD-7', value: `${r.anxiety.total}/21 (${t(r.anxiety.severity)})` },
    { label: t('Safety (PHQ-9 item 9):'), value: r.safetyFlag ? t(r.safetyAnswer) : t('Not at all') },
    { label: 'MoCA', value: m ? `${m.adjusted}/30 (${t(m.band)})` : t('not given') },
    { label: t('Personality screen:'), value: `${suggestions.personality.score}/8${suggestions.personality.positive ? ` ${t('(positive)')}` : ''}` },
    { label: t('Differential screening, positive:'), value: r.differential?.summary.flagged.join('; ') || t('none') },
    { label: t('Response quality:'), value: r.quality ? (r.quality.flags.length ? (r.quality.flags.length === 1 ? t('1 sign to check in the interview.') : t('{n} signs to check in the interview.', { n: r.quality.flags.length })) : t('No signs of tired or careless answering.')) : t('not recorded') },
  ]);
  for (const f of r.quality?.flags ?? []) bullet(`${t(f.kind)}: ${f.text}`);
  if (suggestions.neuroReferral.length) {
    para(t('Neurological referral'), { bold: true });
    for (const n of suggestions.neuroReferral) bullet(`${n.finding}. ${n.action}`);
  }
  if (suggestions.outOfScope.length) {
    para(t('Findings outside this app'), { bold: true });
    for (const o of suggestions.outOfScope) bullet(o.condition);
  }

  if (c.amendments?.length) {
    heading(t('Change history'));
    for (const a of c.amendments) {
      bullet(t('Reopened {date} by {who} (finalized {finalized}). Reason: {reason}. Diagnoses before: {before}.', {
        date: a.reopened_at, who: a.by, finalized: a.previously_finalized_at, reason: a.reason, before: a.diagnoses_before.join('; ') || t('none'),
      }));
    }
  }

  doc.moveDown(1);
  para(t('Diagnoses were confirmed by the treating clinician named above. The app’s criteria checklists and suggestions support, but do not replace, clinical judgement. ICD-10 codes should be checked against ICD-10-SE before reporting.'), { size: 8, color: COLOR.muted });

  // Footer on every page.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Writing inside the bottom margin would make pdfkit start a new page,
    // so the margin is set to 0 while the footer is drawn.
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor(COLOR.muted).text(
      winAnsi(t('Confidential: contains health data · Assessment #{id} · Page {page} of {pages}', { id: assessment.id, page: i + 1, pages: range.count })),
      MARGIN, doc.page.height - MARGIN + 10, { width, align: 'center', lineBreak: false }
    );
  }
  doc.end();
  return done;
}
