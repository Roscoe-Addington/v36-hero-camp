// Patient records: search by personal number, and one patient's record as a
// timeline (assessments, intake interviews, follow-ups, clinical notes and
// treatment reports). All text through t(), in English and Swedish.

import { html, layout } from './views.js';
import { translator } from './i18n-clinician.js';
import { findDisorder } from './disorders.js';
import { ENTRY_KINDS } from './records.js';

const day = (text) => String(text ?? '').slice(0, 16);

export function recordSearchPage({ clinician, query = '', results = null }) {
  const t = translator(clinician?.language);
  return layout({
    title: t('Patient records'),
    clinician,
    body: html`
      <h1>${t('Patient records')}</h1>
      <form method="get" action="/clinician/records" class="card search">
        <label>${t('Personal number')}
          <input name="pn" type="search" required maxlength="20" value="${query}" placeholder="${t('e.g. YYYYMMDD-XXXX')}" autocomplete="off" inputmode="numeric" />
        </label>
        <button>${t('Search')}</button>
        <p class="hint">${t(clinician?.role === 'admin'
          ? 'As administrator you find every patient record (read-only unless the patient is assigned to you). With or without the dash, and with 10 or 12 digits.'
          : 'Finds the patients assigned to you now or before, and those shared with you. With or without the dash, and with 10 or 12 digits.')}</p>
      </form>
      ${results === null
        ? ''
        : results.length === 0
          ? html`<p class="note">${t('No patient record you have access to matches this personal number.')}</p>`
          : html`<div class="table-scroll"><table>
              <thead><tr><th>${t('Name')}</th><th>${t('Personal number')}</th><th>${t('Age')}</th><th>${t('Treating clinician')}</th><th>${t('Assessments')}</th><th>${t('Last entry')}</th><th></th></tr></thead>
              <tbody>${results.map((p) => html`<tr>
                <td>${p.last_name}, ${p.first_name}</td>
                <td class="code">${p.personal_number}</td>
                <td>${p.age}</td>
                <td>${p.clinician_name ?? ''}</td>
                <td>${p.assessment_count}</td>
                <td>${p.lastEntry ? p.lastEntry.toISOString().slice(0, 10) : '–'}</td>
                <td><a class="button" href="/clinician/patients/${p.id}/record">${t('Open record')}</a></td>
              </tr>`)}</tbody>
            </table></div>`}`,
  });
}

const SHOW = ['all', 'assessment', 'interview', 'followup', 'treatment', 'note'];
const SHOW_LABELS = { all: 'All', assessment: 'Assessments', interview: 'Intake interviews', followup: 'Follow-ups', treatment: 'Treatment reports', note: 'Clinical notes' };

// Everything in the record as one list, newest first.
export function recordTimeline({ assessments, followups, entries }) {
  const items = [];
  for (const a of assessments) {
    const results = a.results_json ? JSON.parse(a.results_json) : null;
    const diagnoses = a.diagnoses_json ? JSON.parse(a.diagnoses_json).items ?? [] : [];
    items.push({ type: 'assessment', date: a.created_at, a, results, diagnoses });
    if (a.interview_json) {
      const iv = JSON.parse(a.interview_json);
      items.push({ type: 'interview', date: iv.updated_at ?? a.created_at, a, interview: iv });
    }
  }
  for (const f of followups) {
    if (!f.completed_at) continue;
    items.push({ type: 'followup', date: f.completed_at, f, results: f.results_json ? JSON.parse(f.results_json) : null });
  }
  for (const e of entries) items.push({ type: e.kind, date: e.created_at, e });
  return items.sort((x, y) => String(y.date).localeCompare(String(x.date)));
}

function item(t, x) {
  if (x.type === 'assessment') {
    const { a, results, diagnoses } = x;
    const base = `/clinician/assessments/${a.id}`;
    const status = a.finalized_at ? t('Finalized {date}', { date: a.finalized_at })
      : a.completed_at ? t('Screening done {date}: continue', { date: a.completed_at })
        : a.revoked ? t('Cancelled') : t('Waiting for patient');
    return html`<article class="card record-item">
      <p class="hint">${day(x.date)} · ${t('Assessment')} #${a.id} · ${a.mode === 'onsite' ? t('On site') : t('Link')}</p>
      <h3>${t('Assessment')}: ${status}</h3>
      ${results ? html`<p>PHQ-9 ${results.depression.total}/27 (${t(results.depression.severity)}) · GAD-7 ${results.anxiety.total}/21 (${t(results.anxiety.severity)})${results.safetyFlag ? html` <span class="badge danger">${t('Safety alert')}</span>` : ''}</p>` : ''}
      ${diagnoses.length
        ? html`<p><strong>${t('Diagnoses')}:</strong> ${diagnoses.map((d) => `${t(d.code)} ${t(findDisorder(d.disorderId)?.name ?? d.name)}`).join('; ')}</p>`
        : ''}
      <p><a href="${base}">${t('Open the assessment')}</a>${a.finalized_at ? html` · <a href="${base}/final">${t('Open the final report')}</a>` : ''}${a.risk_json ? html` · <a href="${base}/risk">${t('Risk assessment')}</a>` : ''}</p>
    </article>`;
  }
  if (x.type === 'interview') {
    const iv = x.interview;
    return html`<article class="card record-item">
      <p class="hint">${day(x.date)} · ${t('Intake interview')} · ${t('Assessment')} #${x.a.id}</p>
      <h3>${t('Intake interview')}</h3>
      ${iv.reason ? html`<p><strong>${t('Reason for referral and main concerns (in the patient’s words where possible)')}:</strong> <span class="prewrap">${iv.reason}</span></p>` : ''}
      ${iv.onset ? html`<p><strong>${t('Onset and course of the current problems')}:</strong> <span class="prewrap">${iv.onset}</span></p>` : ''}
      <p><a href="/clinician/assessments/${x.a.id}/interview">${t('Open intake interview')}</a></p>
    </article>`;
  }
  if (x.type === 'followup') {
    const r = x.results;
    return html`<article class="card record-item">
      <p class="hint">${day(x.date)} · ${t('Follow-up')}</p>
      <h3>${t('Follow-up')}</h3>
      ${r ? html`<p>PHQ-9 ${r.phq9}/27 · GAD-7 ${r.gad7}/21${r.safetyFlag ? html` <span class="badge danger">${t('Safety alert')}</span>` : ''}</p>` : ''}
    </article>`;
  }
  const e = x.e;
  return html`<article class="card record-item entry-${e.kind}">
    <p class="hint">${day(x.date)} · ${t(ENTRY_KINDS[e.kind])} · ${e.clinician_name}</p>
    <h3>${e.title}</h3>
    <p class="prewrap">${e.text}</p>
  </article>`;
}

export function recordPage({ clinician, patient, access = { owner: true }, assessments, followups, entries, show = 'all', errors = [], values = {} }) {
  const t = translator(clinician?.language);
  const current = SHOW.includes(show) ? show : 'all';
  const all = recordTimeline({ assessments, followups, entries });
  const items = current === 'all' ? all : all.filter((x) => x.type === current);
  const base = `/clinician/patients/${patient.id}/record`;
  return layout({
    title: `${t('Patient record')}: ${patient.last_name}`,
    clinician,
    body: html`
      <p><a href="/clinician/patients/${patient.id}">← ${patient.first_name} ${patient.last_name}</a> · <a href="/clinician/records">${t('Search records')}</a></p>
      <h1>${t('Patient record')}: ${patient.first_name} ${patient.last_name}</h1>
      <p class="hint">${patient.personal_number} · ${t('{age} years', { age: patient.age })}</p>
      ${errors.length ? html`<div class="error" role="alert"><ul>${errors.map((x) => html`<li>${t(x)}</li>`)}</ul></div>` : ''}

      ${access.owner
        ? html`<details class="card" ${errors.length ? html`open` : ''}>
            <summary>${t('Add a clinical note or treatment report')}</summary>
            <form method="post" action="${base}">
              <fieldset>
                <legend>${t('Type')}</legend>
                <div class="options">${Object.entries(ENTRY_KINDS).map(([kind, label], i) => html`<label class="choice"><input type="radio" name="kind" value="${kind}" ${i === 0 ? html`required` : ''} ${(values.kind ?? 'note') === kind ? html`checked` : ''} /> ${t(label)}</label>`)}</div>
              </fieldset>
              <label>${t('Heading')} <input name="title" required maxlength="200" value="${values.title ?? ''}" placeholder="${t('e.g. Session 4, CBT for depression')}" /></label>
              <label>${t('Text')} <textarea name="text" required rows="6" maxlength="20000">${values.text ?? ''}</textarea></label>
              <p class="hint">${t('Entries cannot be changed or deleted once saved, as in a health record. To correct one, write a new entry.')}</p>
              <button>${t('Save to the record')}</button>
            </form>
          </details>`
        : html`<p class="note">${t('Read-only access.')} ${t('Only the treating clinician can make changes.')}</p>`}

      <nav class="record-filter" aria-label="${t('Show')}">
        ${SHOW.map((s) => (s === current
          ? html`<span class="current">${t(SHOW_LABELS[s])} (${(s === 'all' ? all : all.filter((x) => x.type === s)).length})</span>`
          : html`<a href="${base}${s === 'all' ? '' : `?show=${s}`}">${t(SHOW_LABELS[s])} (${(s === 'all' ? all : all.filter((x) => x.type === s)).length})</a>`))}
      </nav>
      ${items.length ? items.map((x) => item(t, x)) : html`<p class="hint">${t('Nothing in the record yet.')}</p>`}`,
  });
}
