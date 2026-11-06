// HTML pages, built with plain JavaScript template strings.
//
// SECURITY: every value inserted with ${...} inside html`...` is escaped
// automatically (so "<script>" shows up as text instead of running). Only
// output of another html`...` call is inserted as-is.

import {
  PHQ9_ITEMS,
  GAD7_ITEMS,
  GAD_CRITERIA_ITEMS,
  FREQUENCY_OPTIONS,
  DIFFICULTY_OPTIONS,
  YES_NO_OPTIONS,
  DIFFICULTY_QUESTION,
  PHQ_DIFFICULTY_ID,
  GAD_DIFFICULTY_ID,
  SCREENING_SECTIONS,
  PAGES,
  isShown,
  progress,
  findItem,
} from './questionnaire.js';
import { CLINICIAN_CHECKLIST, LIKELIHOOD } from './scoring.js';
import { STATUS } from './differential.js';
import { STRINGS, LANGUAGES, itemText, optionText, sectionText, difficultyText } from './i18n.js';
import { measurementSeries, progressSummary } from './followup.js';
import { translator, CLINICIAN_LANGUAGES } from './i18n-clinician.js';

// ---------- The escaping helper ----------

class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function render(value) {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  if (value === false || value === null || value === undefined) return '';
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => {
    out += render(value) + strings[i + 1];
  });
  return new SafeHtml(out);
}

// ---------- Shared layout ----------

export function layout({ title, clinician, body, language = 'en', skipScript = false }) {
  const t = translator(clinician?.language);
  const other = clinician?.language === 'sv' ? 'en' : 'sv';
  return html`<!doctype html>
<html lang="${clinician ? clinician.language ?? 'en' : language}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>${title}</title>
    <link rel="stylesheet" href="/style.css" />
    ${skipScript ? html`<script type="module" src="/skip.js"></script>` : ''}
  </head>
  <body>
    <header class="topbar">
      <span class="brand">${t('Mental Health Assessment')}</span>
      ${clinician
        ? html`<nav>
            <a href="/clinician">${t('Patients')}</a>
            <a href="/clinician/patients/new">${t('New patient')}</a>
            <a href="/clinician/retention">${t('Retention')}</a>
            <form method="post" action="/clinician/language" class="inline"><button class="link" name="language" value="${other}" lang="${other}">${CLINICIAN_LANGUAGES[other]}</button></form>
            <form method="post" action="/logout" class="inline"><button class="link">${t('Log out ({name})', { name: clinician.name })}</button></form>
          </nav>`
        : ''}
    </header>
    <main>${body}</main>
  </body>
</html>`;
}

// ---------- Login ----------

export function loginPage({ error, language = 'en' } = {}) {
  const t = translator(language);
  const other = language === 'sv' ? 'en' : 'sv';
  return layout({
    title: t('Clinician login'),
    language,
    body: html`
      <p class="lang-switch"><a href="/login?lang=${other}" lang="${other}">${CLINICIAN_LANGUAGES[other]}</a></p>
      <h1>${t('Clinician login')}</h1>
      ${error ? html`<p class="error" role="alert">${t(error)}</p>` : ''}
      <form method="post" action="/login" class="card narrow">
        <input type="hidden" name="language" value="${language}" />
        <label>${t('Email')} <input type="email" name="email" required autocomplete="username" /></label>
        <label>${t('Password')} <input type="password" name="password" required autocomplete="current-password" /></label>
        <button>${t('Log in')}</button>
      </form>`,
  });
}

// ---------- Clinician: patient list ----------

export function dashboardPage({ clinician, patients }) {
  const t = translator(clinician?.language);
  return layout({
    title: t('Patients'),
    clinician,
    body: html`
      <h1>${t('Patients')}</h1>
      <p><a class="button" href="/clinician/patients/new">${t('+ Add patient')}</a></p>
      ${patients.length === 0
        ? html`<p>${t('No patients yet.')}</p>`
        : html`<table>
            <thead><tr><th>${t('Name')}</th><th>${t('Age')}</th><th>${t('Latest questionnaire')}</th></tr></thead>
            <tbody>
              ${patients.map(
                (p) => html`<tr>
                  <td><a href="/clinician/patients/${p.id}">${p.last_name}, ${p.first_name}</a>${p.shared ? html` <span class="badge info">${t('Shared by {name}', { name: p.owner_name })}</span>` : ''}</td>
                  <td>${p.age}</td>
                  <td>${p.latest_completed ? html`${t('Completed {date}', { date: p.latest_completed })}${p.latest_safety ? html` <span class="badge danger">${t('Safety alert')}</span>` : ''}` : p.has_pending ? t('Link sent, not completed') : '—'}</td>
                </tr>`
              )}
            </tbody>
          </table>`}`,
  });
}

// ---------- Clinician: new patient form ----------

export const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary / other', 'Prefer not to say'];
export const EDUCATION_OPTIONS = [
  'Primary / compulsory school',
  'Upper secondary school',
  'Vocational / post-secondary (non-university)',
  'University — bachelor level',
  'University — master level or higher',
  'Other / unknown',
];

function select(t, name, options, selected) {
  // The stored value stays English; only the shown text is translated.
  return html`<select name="${name}" required>
    <option value="">${t('Choose…')}</option>
    ${options.map((o) => html`<option value="${o}" ${o === selected ? html`selected` : ''}>${t(o)}</option>`)}
  </select>`;
}

// New patient, or editing an existing one (when `patient` is given).
export function newPatientPage({ clinician, patient, errors = [], values = {} }) {
  const t = translator(clinician?.language);
  const title = patient ? t('Edit patient details') : t('New patient');
  return layout({
    title,
    clinician,
    body: html`
      ${patient ? html`<p><a href="/clinician/patients/${patient.id}">← ${patient.first_name} ${patient.last_name}</a></p>` : ''}
      <h1>${title}</h1>
      ${patient ? html`<p class="hint">${t('Changes are recorded in the audit log (which fields changed, by whom and when).')}</p>` : ''}
      ${errors.length ? html`<div class="error" role="alert"><p>${t('Please fix:')}</p><ul>${errors.map((e) => html`<li>${t(e)}</li>`)}</ul></div>` : ''}
      <form method="post" action="${patient ? `/clinician/patients/${patient.id}/edit` : '/clinician/patients'}" class="card">
        <div class="grid2">
          <label>${t('First name')} <input name="first_name" required maxlength="100" value="${values.first_name}" /></label>
          <label>${t('Last name')} <input name="last_name" required maxlength="100" value="${values.last_name}" /></label>
        </div>
        <label>${t('Personal number')} <input name="personal_number" required maxlength="20" value="${values.personal_number}" placeholder="${t('e.g. YYYYMMDD-XXXX')}" /></label>
        <div class="grid2">
          <label>${t('Gender')} ${select(t, 'gender', GENDER_OPTIONS, values.gender)}</label>
          <label>${t('Age')} <input name="age" type="number" min="16" max="120" required value="${values.age}" /></label>
        </div>
        <label>${t('Level of education')} ${select(t, 'education', EDUCATION_OPTIONS, values.education)}</label>
        <fieldset>
          <legend>${t('Currently employed?')}</legend>
          <label class="choice"><input type="radio" name="employed" value="1" required ${values.employed === '1' ? html`checked` : ''} /> ${t('Yes')}</label>
          <label class="choice"><input type="radio" name="employed" value="0" ${values.employed === '0' ? html`checked` : ''} /> ${t('No')}</label>
        </fieldset>
        <button>${patient ? t('Save changes') : t('Save patient')}</button>
      </form>`,
  });
}

// ---------- Clinician: one patient ----------

function languageSelect() {
  return html`<select name="language">${Object.entries(LANGUAGES).map(([code, name]) => html`<option value="${code}">${name}</option>`)}</select>`;
}

export function patientPage({ clinician, patient, assessments, newLink, followups = [], followupLink, errors = [], access = { owner: true }, grants = [], owner, keptUntil, retentionYears = 10 }) {
  const t = translator(clinician?.language);
  return layout({
    title: `${patient.first_name} ${patient.last_name}`,
    clinician,
    body: html`
      <h1>${patient.first_name} ${patient.last_name}</h1>
      ${errors.length ? html`<div class="error" role="alert"><ul>${errors.map((e) => html`<li>${t(e)}</li>`)}</ul></div>` : ''}
      <p class="record-links">${access.owner ? html`<a href="/clinician/patients/${patient.id}/edit">${t('Edit details')}</a> · ` : ''}<a href="/clinician/patients/${patient.id}/audit">${t('Audit log')}</a>
        ${keptUntil ? html`<br /><span class="hint">${t('Record kept until at least {date} ({years} years after the last entry).', { date: keptUntil.toISOString().slice(0, 10), years: retentionYears })}</span>` : ''}</p>
      ${access.owner
        ? ''
        : html`<p class="note">${t('You have read-only access as {role}, granted by {by} (treating clinician{owner}) for: {reason}.', {
            role: t(ROLE_NAMES[access.role] ?? access.role), by: access.grant.granted_by_name, owner: owner ? `: ${owner.name}` : '', reason: access.grant.reason,
          })}${access.grant.expires_at ? ` ${t('Access ends {date}.', { date: access.grant.expires_at.slice(0, 10) })}` : ''}</p>`}
      <dl class="card details">
        <dt>${t('Personal number')}</dt><dd>${patient.personal_number}</dd>
        <dt>${t('Gender')}</dt><dd>${t(patient.gender)}</dd>
        <dt>${t('Age')}</dt><dd>${patient.age}</dd>
        <dt>${t('Education')}</dt><dd>${t(patient.education)}</dd>
        <dt>${t('Employed')}</dt><dd>${patient.employed ? t('Yes') : t('No')}</dd>
      </dl>

      ${newLink
        ? html`<div class="card highlight">
            <h2>${t('Questionnaire link created')}</h2>
            <p>${t('Send this link to the patient. Copy it now: for security it is not stored and cannot be shown again. It expires {date}.', { date: newLink.expires })}</p>
            <input class="linkbox" readonly value="${newLink.url}" aria-label="${t('Questionnaire link')}" />
          </div>`
        : ''}

      ${access.owner ? html`
      <section class="card">
        <h2>${t('Start a new assessment')}</h2>
        <p>${t('The assessment starts with the intake screening. Choose how the patient answers it:')}</p>
        <div class="start-options">
          <form method="post" action="/clinician/patients/${patient.id}/assessments">
            <input type="hidden" name="mode" value="link" />
            <label>${t('Questionnaire language')} ${languageSelect()}</label>
            <button>${t('Send link to patient')}</button>
            <p class="hint">${t('The patient answers at home. You get an email when it is done.')}</p>
          </form>
          <form method="post" action="/clinician/patients/${patient.id}/assessments">
            <input type="hidden" name="mode" value="onsite" />
            <label>${t('Questionnaire language')} ${languageSelect()}</label>
            <button>${t('Conduct on site')}</button>
            <p class="hint">${t('You go through the questions with the patient now, on this device.')}</p>
          </form>
        </div>
        <p class="hint">${t('Starting a new assessment cancels any earlier one for this patient that has not started yet.')}</p>
      </section>` : ''}

      <h2>${t('Assessments')}</h2>
      ${assessments.length === 0
        ? html`<p>${t('None yet.')}</p>`
        : html`<table>
            <thead><tr><th>${t('Created')}</th><th>${t('How')}</th><th>${t('Status')}</th><th>${t('Depression')}</th><th>${t('Anxiety')}</th></tr></thead>
            <tbody>
              ${assessments.map((a) => {
                const r = a.results_json ? JSON.parse(a.results_json) : null;
                const link = (text) => html`<a href="/clinician/assessments/${a.id}">${text}</a>`;
                let status;
                if (a.finalized_at) status = link(t('Finalized {date}', { date: a.finalized_at }));
                else if (a.completed_at) status = link(t('Screening done {date}: continue', { date: a.completed_at }));
                else if (a.revoked) status = t('Cancelled');
                else if (a.mode === 'onsite') status = link(t('On-site screening not finished: continue'));
                else if (new Date(a.expires_at) < new Date()) status = t('Link expired');
                else status = t('Waiting for patient');
                return html`<tr>
                  <td>${a.created_at}</td>
                  <td>${a.mode === 'onsite' ? t('On site') : t('Link')}</td>
                  <td>${status} ${r?.safetyFlag ? html`<span class="badge danger">${t('Safety alert')}</span>` : ''} ${r?.differential?.summary.priority.length ? html`<span class="badge danger">${t('Priority differential')}</span>` : ''}</td>
                  <td>${r ? html`${likelihoodBadge(r.depression.likelihood, t)} PHQ-9 ${r.depression.total}` : ''}</td>
                  <td>${r ? html`${likelihoodBadge(r.anxiety.likelihood, t)} GAD-7 ${r.anxiety.total}` : ''}</td>
                </tr>`;
              })}
            </tbody>
          </table>`}

      ${followupSection(t, patient, assessments, followups, followupLink, access.owner)}

      ${access.owner ? accessSection(t, patient, grants) : ''}

      ${access.owner ? html`<details class="card danger-zone">
        <summary>${t('Delete patient record')}</summary>
        <p>${t('This permanently deletes the patient and all assessments. Use it only for records created by mistake or when the law requires deletion: health records usually have to be kept for a set time (in Sweden, at least 10 years under Patientdatalagen). The deletion is kept in the audit log.')}</p>
        <form method="post" action="/clinician/patients/${patient.id}/delete">
          <label>${t('Type the patient’s last name to confirm')} <input name="confirm_last_name" required autocomplete="off" /></label>
          <label>${t('Reason')} <input name="reason" maxlength="300" /></label>
          <button class="danger">${t('Delete permanently')}</button>
        </form>
      </details>` : ''}`,
  });
}

export function likelihoodBadge(likelihood, t = (x) => x) {
  const cls = {
    [LIKELIHOOD.HIGH]: 'danger',
    [LIKELIHOOD.MODERATE]: 'warn',
    [LIKELIHOOD.SUBCLINICAL]: 'info',
    [LIKELIHOOD.MINIMAL]: 'ok',
  }[likelihood];
  return html`<span class="badge ${cls}">${t(likelihood)}</span>`;
}

// ---------- Clinician: full report ----------

function symptomList(t, list) {
  if (list.length === 0) return html`<p class="hint">${t('None.')}</p>`;
  return html`<ul>${list.map((s) => html`<li>${s.symptom} — <em>${t(s.frequency)}</em></li>`)}</ul>`;
}

function itemTable(t, items) {
  // Question texts in Swedish come from the patient translations (i18n.js).
  return html`<table class="items">
    <thead><tr><th>${t('Question')}</th><th>${t('Answer')}</th><th>${t('Score')}</th></tr></thead>
    <tbody>${items.map((i) => html`<tr><td>${itemText(t.language, findItem(i.id) ?? i)}</td><td>${t(i.answer)}</td><td>${i.score}</td></tr>`)}</tbody>
  </table>`;
}

// ---------- Clinician: differential diagnosis section ----------

function statusBadge(t, status) {
  const cls = {
    [STATUS.FLAGGED]: 'danger',
    [STATUS.POSSIBLE]: 'warn',
    [STATUS.CLINICIAN]: 'info',
    [STATUS.NOT_INDICATED]: 'ok',
  }[status];
  return html`<span class="badge ${cls}">${t(status)}</span>`;
}

function differentialSection(t, differential) {
  if (!differential) {
    return html`<section class="card"><h2>${t('Differential diagnosis screening')}</h2>
      <p class="hint">${t('Not available: this questionnaire was completed before differential screening was added.')}</p></section>`;
  }
  const { summary, entries, overlap } = differential;
  return html`<section class="card">
    <h2>${t('Differential diagnosis screening')}</h2>
    <p class="hint">${t('{n} alternative or co-occurring conditions checked against DSM-5-TR differentials for MDD and GAD. This shows what to explore in the interview; it does not confirm or exclude any diagnosis.', { n: summary.checked })}</p>
    ${summary.priority.length
      ? html`<div class="alert" role="alert"><strong>${t('Priority:')}</strong> ${t('screen positive for {list}.', { list: summary.priority.join('; ') })}</div>`
      : ''}

    <table class="diff-summary">
      <thead><tr><th>${t('Condition')}</th><th>${t('Relevant to')}</th><th>${t('Status')}</th></tr></thead>
      <tbody>
        ${entries.map(
          (e) => html`<tr>
            <td><a href="#diff-${e.id}">${e.condition}</a></td>
            <td>${e.relevantTo.join(', ')}</td>
            <td>${statusBadge(t, e.status)}</td>
          </tr>`
        )}
      </tbody>
    </table>

    <h3>${t('Overlap between depression and anxiety symptoms')}</h3>
    <table>
      <thead><tr><th>${t('Shared symptom')}</th><th>${t('Counted for depression')}</th><th>${t('Counted for anxiety')}</th></tr></thead>
      <tbody>
        ${overlap.shared.map(
          (o) => html`<tr><td>${o.symptom}</td><td>${o.onDepressionSide ? t('Yes') : t('No')}</td><td>${o.onAnxietySide ? t('Yes') : t('No')}</td></tr>`
        )}
      </tbody>
    </table>
    ${overlap.notes.map((n) => html`<p class="note">${n}</p>`)}

    <h3>${t('Detailed reasoning')}</h3>
    ${entries.map(
      (e) => html`<details class="diff" id="diff-${e.id}" ${e.status === STATUS.FLAGGED || e.status === STATUS.POSSIBLE ? html`open` : ''}>
        <summary><strong>${e.condition}</strong> ${statusBadge(t, e.status)}</summary>
        <dl>
          <dt>${t('Why checked')}</dt><dd>${e.why}</dd>
          <dt>${t('Rule applied')}</dt><dd>${e.rule}</dd>
          ${e.evidence.length
            ? html`<dt>${t('Answers used')}</dt><dd><ul>${e.evidence.map((ev) => html`<li>${ev.question} — <strong>${t(ev.answer)}</strong></li>`)}</ul></dd>`
            : ''}
          <dt>${t('Finding')}</dt><dd>${e.finding}</dd>
          <dt>${t('What it means')}</dt><dd>${e.implication}</dd>
          <dt>${t('Next step')}</dt><dd>${e.nextStep}</dd>
        </dl>
      </details>`
    )}
  </section>`;
}

// The screening part of an assessment (results of the intake questionnaire).
export function screeningSections(results, t = translator('en')) {
  const d = results.depression;
  const a = results.anxiety;
  const yes = (v) => (v ? t('Yes') : t('No'));
  return html`
      ${results.safetyFlag
        ? html`<div class="alert" role="alert">
            <h2>${t('Safety alert')}</h2>
            <p>${t('The patient answered “{answer}” to PHQ-9 item 9 (thoughts of being better off dead or of self-harm). Follow up promptly with a suicide risk assessment.', { answer: t(results.safetyAnswer) })}</p>
          </div>`
        : ''}

      <section class="card">
        <h2>${t('Major depressive disorder')}</h2>
        <p>${t('Likelihood:')} ${likelihoodBadge(d.likelihood, t)}</p>
        <ul class="facts">
          <li>${t('PHQ-9 total:')} <strong>${d.total}/${d.maxTotal}</strong> (${t(d.severity)})</li>
          <li>${t('DSM-5-TR symptom count: {n} of 9 at threshold; core symptom (mood or anhedonia) {core}', { n: d.symptomCount, core: d.coreSymptomPresent ? t('present') : t('absent') })}</li>
          <li>${t('Algorithm:')} ${d.syndrome}</li>
          <li>${t('Functional impairment:')} ${t(d.functionalDifficulty)}</li>
        </ul>
        <h3>${t('Symptoms at diagnostic threshold')}</h3>
        ${symptomList(t, d.thresholdSymptoms)}
        <h3>${t('Subclinical symptoms (present, below threshold)')}</h3>
        ${symptomList(t, d.subclinicalSymptoms)}
        <details><summary>${t('Item-level answers')}</summary>${itemTable(t, d.itemScores)}</details>
      </section>

      <section class="card">
        <h2>${t('Generalized anxiety disorder')}</h2>
        <p>${t('Likelihood:')} ${likelihoodBadge(a.likelihood, t)}</p>
        <ul class="facts">
          <li>${t('GAD-7 total:')} <strong>${a.total}/${a.maxTotal}</strong> (${t(a.severity)})</li>
          <li>${t('Criterion A — excessive worry, 6+ months:')} ${yes(a.criteria.A)}</li>
          <li>${t('Criterion B — difficult to control:')} ${yes(a.criteria.B)}</li>
          <li>${t('Criterion C — at least 3 of 6 associated symptoms:')} ${yes(a.criteria.C)} (${t('{n} of 6', { n: a.criteria.associatedCount })})</li>
          <li>${t('Functional impairment:')} ${t(a.functionalDifficulty)}</li>
        </ul>
        ${a.notes.map((n) => html`<p class="note">${n}</p>`)}
        <h3>${t('Symptoms more than half the days')}</h3>
        ${symptomList(t, a.thresholdSymptoms)}
        <h3>${t('Subclinical symptoms')}</h3>
        ${symptomList(t, a.subclinicalSymptoms)}
        <details><summary>${t('Item-level answers')}</summary>${itemTable(t, a.itemScores)}</details>
      </section>

      ${differentialSection(t, results.differential)}

      <section class="card">
        <h2>${t('Before making a diagnosis')}</h2>
        <ul>${CLINICIAN_CHECKLIST.map((c) => html`<li>${c}</li>`)}</ul>
      </section>`;
}

// ---------- Patient: the questionnaire ----------

function radioGroup(id, question, options, number, selected, language, { showIf, shown = true, missing = false, required = true } = {}) {
  const req = required && shown ? html`required` : '';
  return html`<fieldset class="question${missing ? ' missing' : ''}${showIf ? ' follow-up' : ''}" ${showIf ? html`data-show-if="${showIf.id}:${showIf.values.join(',')}"` : ''} ${shown ? '' : html`hidden`}>
    <legend>${number ? html`<span class="num">${number}.</span> ` : ''}${question}</legend>
    <div class="options">
      ${options.map(
        (o) => html`<label class="choice"><input type="radio" name="${id}" value="${o.value}" ${req} ${selected === o.value ? html`checked` : ''} /> ${optionText(language, o.label)}</label>`
      )}
    </div>
  </fieldset>`;
}

// Links to switch the patient's questionnaire language.
function languageSwitch(language, switchUrl) {
  if (!switchUrl) return '';
  return html`<p class="lang-switch">${Object.entries(LANGUAGES)
    .filter(([code]) => code !== language)
    .map(([code, name]) => html`<a href="${switchUrl}?lang=${code}" lang="${code}">${name}</a>`)}</p>`;
}

// One part of the questionnaire per page.
// action: where the form is sent (the page number is added). clinician: set
// when the clinician fills it in on site (then the clinician's menu and the
// consent confirmation show). answers: all answers given so far.
export function questionnairePage({ action, pageIndex = 0, error, missing = [], clinician, patient, language = 'en', answers = {}, switchUrl, consentDone }) {
  const t = STRINGS[language];
  const page = PAGES[pageIndex];
  const last = pageIndex === PAGES.length - 1;
  const { answered, total } = progress(answers);
  const [sectionTitle, sectionIntro] = page.section ? sectionText(language, page.section) : [null, t[page.intro]];
  const tiredOptions = Array.from({ length: 11 }, (_, n) => ({ value: n, label: String(n) }));
  const ct = translator(clinician?.language); // the clinician's language, for on-site texts
  return layout({
    title: t.title,
    clinician,
    language,
    skipScript: true,
    body: html`
      ${languageSwitch(language, switchUrl)}
      <h1>${clinician ? html`${ct('Intake screening')}: ${patient.first_name} ${patient.last_name}` : t.title}</h1>
      ${pageIndex === 0
        ? clinician
          ? html`<p class="note">${ct('On-site screening ({language}). Read the questions to the patient and record their answers, or let the patient answer on this device. Answer from the patient’s point of view.', { language: LANGUAGES[language] })}</p>`
          : html`<p>${t.intro}</p>`
        : ''}

      <div class="progress-bar">
        <p>${t.progress(page.part, PAGES.length, answered, total)}</p>
        <progress max="${total}" value="${answered}" aria-label="${t.progress(page.part, PAGES.length, answered, total)}"></progress>
      </div>
      ${error ? html`<p class="error" role="alert">${error}</p>` : ''}

      <form method="post" action="${action}?page=${pageIndex}">
        ${clinician && !consentDone && pageIndex === 0
          ? html`<section class="card">
              <h2>${ct('Information to the patient')}</h2>
              <ul>${STRINGS[language].consent.map((p) => html`<li>${p}</li>`)}</ul>
              <label class="check"><input type="checkbox" name="consent_given" value="yes" required /> ${ct('The patient has been given this information and agrees to answer')}</label>
            </section>`
          : ''}

        <section class="card">
          <h2>${t.part} ${page.part}${sectionTitle ? html`: ${sectionTitle}` : ''}</h2>
          ${sectionIntro ? html`<p>${page.section ? sectionIntro : html`<strong>${sectionIntro}</strong>`}</p>` : ''}
          ${page.items.map((item, i) =>
            radioGroup(
              item.id,
              item.difficulty ? difficultyText(language, item.text) : itemText(language, item),
              item.options,
              // Only main questions are numbered; a follow-up belongs to the question above it.
              item.difficulty || item.showIf ? null : page.items.slice(0, i + 1).filter((x) => !x.showIf && !x.difficulty).length,
              answers[item.id],
              language,
              { showIf: item.showIf, shown: isShown(item, answers), missing: missing.includes(item.id) }
            )
          )}
        </section>

        ${page.tiredness && !clinician
          ? html`<section class="card tired">
              ${radioGroup('tired', t.tiredQuestion, tiredOptions, null, undefined, language, { required: false })}
              <p class="hint">${t.tiredScale}</p>
            </section>`
          : ''}

        <div class="page-buttons">
          ${pageIndex > 0 ? html`<button class="secondary" name="intent" value="back" formnovalidate>${t.back}</button>` : html`<span></span>`}
          <button>${last ? (clinician ? ct('Save answers and score') : t.submit) : t.next}</button>
        </div>
        <p class="save-later"><button class="link" name="intent" value="save" formnovalidate>${clinician ? ct('Save draft and continue later') : t.save}</button></p>
      </form>
      <p class="crisis">${t.crisis}</p>
      ${last ? html`<p class="hint">PHQ-9 and GAD-7 © Pfizer Inc., developed by Drs. Spitzer, Williams, Kroenke and colleagues; no permission required to reproduce. AUDIT-C: Bush et al., 1998. PC-PTSD-5: Prins et al., 2016, US National Center for PTSD. Personality items reworded from the SAPAS areas (Moran et al., 2003).</p>` : ''}
      ${t.translationNote ? html`<p class="hint">${t.translationNote}</p>` : ''}`,
  });
}

export function breakPage({ language = 'en', continueUrl, stopAction }) {
  const t = STRINGS[language];
  return layout({
    title: t.breakTitle,
    language,
    body: html`
      <h1>${t.breakTitle}</h1>
      <p>${t.breakText}</p>
      <div class="page-buttons">
        <form method="post" action="${stopAction}"><button class="secondary" name="intent" value="stop">${t.stopNow}</button></form>
        <a class="button" href="${continueUrl}">${t.continueNow}</a>
      </div>
      <p class="crisis">${t.crisis}</p>`,
  });
}

export function consentPage({ action, language = 'en', switchUrl, error }) {
  const t = STRINGS[language];
  return layout({
    title: t.consentTitle,
    language,
    body: html`
      ${languageSwitch(language, switchUrl)}
      <h1>${t.consentTitle}</h1>
      ${error ? html`<p class="error" role="alert">${error}</p>` : ''}
      <section class="card">
        ${t.consent.map((p) => html`<p>${p}</p>`)}
        <form method="post" action="${action}">
          <label class="check"><input type="checkbox" name="agree" value="yes" required /> ${t.consentCheck}</label>
          <button>${t.start}</button>
        </form>
      </section>
      <p class="crisis">${t.crisis}</p>`,
  });
}

export function savedPage({ language = 'en', expires }) {
  const t = STRINGS[language];
  return layout({
    title: t.savedTitle,
    language,
    body: html`<h1>${t.savedTitle}</h1><p>${t.savedText(expires)}</p><p class="crisis">${t.crisis}</p>`,
  });
}

export function thankYouPage({ safetyFlag, language = 'en' }) {
  const t = STRINGS[language];
  return layout({
    title: t.thanksTitle,
    language,
    body: html`
      <h1>${t.thanksTitle}</h1>
      <p>${t.thanksText}</p>
      ${safetyFlag
        ? html`<div class="alert" role="alert">
            <p><strong>${t.safety}</strong></p>
            <p>${t.crisis}</p>
          </div>`
        : html`<p class="crisis">${t.crisis}</p>`}
      <p>${t.close}</p>`,
  });
}

export function linkInvalidPage({ language = 'en' }) {
  const t = STRINGS[language];
  return layout({ title: t.invalidTitle, language, body: html`<h1>${t.invalidTitle}</h1><p>${t.invalidText}</p>` });
}

// ---------- Who has access (treating clinician only) ----------

const ROLE_NAMES = { supervisor: 'Supervisor', colleague: 'Close colleague', owner: 'Treating clinician' };

function grantStatus(t, g) {
  if (g.revoked_at) return html`<span class="badge ok">${t('Revoked {date}', { date: g.revoked_at.slice(0, 10) })}</span>`;
  if (g.expires_at && g.expires_at <= new Date().toISOString()) return html`<span class="badge ok">${t('Ended {date}', { date: g.expires_at.slice(0, 10) })}</span>`;
  return html`<span class="badge warn">${g.expires_at ? t('Active until {date}', { date: g.expires_at.slice(0, 10) }) : t('Active')}</span>`;
}

function accessSection(t, patient, grants) {
  const active = grants.filter((g) => !g.revoked_at && !(g.expires_at && g.expires_at <= new Date().toISOString()));
  return html`<section class="card">
    <h2>${t('Who has access')}</h2>
    <p class="hint">${t('Only you, as the treating clinician, and the people you name here can see this patient. They can read but not change anything. Give access only to those who need it for the patient’s care, such as a supervisor or a close colleague covering for you. Every grant, and every view, is in the audit log.')}</p>
    ${grants.length
      ? html`<div class="table-scroll"><table>
          <thead><tr><th>${t('Person')}</th><th>${t('Role')}</th><th>${t('Reason')}</th><th>${t('Status')}</th><th></th></tr></thead>
          <tbody>${grants.map((g) => html`<tr>
            <td>${g.clinician_name}<br /><span class="hint">${g.clinician_email}</span></td>
            <td>${t(ROLE_NAMES[g.role] ?? g.role)}</td>
            <td>${g.reason}</td>
            <td>${grantStatus(t, g)}</td>
            <td>${active.includes(g)
              ? html`<form method="post" action="/clinician/patients/${patient.id}/access"><input type="hidden" name="action" value="revoke" /><input type="hidden" name="grant" value="${g.id}" /><button class="small secondary">${t('Revoke')}</button></form>`
              : ''}</td>
          </tr>`)}</tbody>
        </table></div>`
      : html`<p>${t('Nobody else has access.')}</p>`}
    <details>
      <summary>${t('Give read access to a supervisor or colleague')}</summary>
      <form method="post" action="/clinician/patients/${patient.id}/access" class="grid2">
        <input type="hidden" name="action" value="grant" />
        <label>${t('Their email (clinician account)')} <input type="email" name="email" required /></label>
        <label>${t('Role')}
          <select name="role" required><option value="supervisor">${t('Supervisor')}</option><option value="colleague">${t('Close colleague')}</option></select>
        </label>
        <label>${t('Access ends (optional)')} <input type="date" name="until" /></label>
        <label>${t('Why do they need access?')} <input name="reason" required maxlength="300" /></label>
        <button>${t('Give access')}</button>
      </form>
    </details>
  </section>`;
}

export function retentionPage({ clinician, due, policy }) {
  const t = translator(clinician?.language);
  return layout({
    title: t('Retention review'),
    clinician,
    body: html`
      <h1>${t('Retention review')}</h1>
      <section class="card">
        <h2>${t('How long data is kept')}</h2>
        <ul>
          <li>${t('Patient records: {years} years after the last entry, then reviewed here and deleted.', { years: policy.recordYears })}</li>
          <li>${t('Questionnaires never completed, including saved drafts: deleted automatically {days} days after the link expired or was cancelled.', { days: policy.unusedDays })}</li>
          <li>${t('Audit log entries: deleted automatically after {years} years. Expired logins are deleted daily.', { years: policy.auditYears })}</li>
        </ul>
        <p class="hint">${t('GDPR requires that personal data is kept no longer than necessary; laws such as Patientdatalagen set minimum periods for health records. The periods are set in the app’s configuration; check them with your data protection officer.')}</p>
      </section>
      <section class="card">
        <h2>${t('Records past their retention period')}</h2>
        ${due.length
          ? html`<p>${t('Check that nothing requires keeping a record longer (ongoing care, a complaint, a legal hold) before deleting it.')}</p>
            <div class="table-scroll"><table>
              <thead><tr><th>${t('Patient')}</th><th>${t('Last entry')}</th><th>${t('Kept until')}</th><th></th></tr></thead>
              <tbody>${due.map((r) => html`<tr>
                <td><a href="/clinician/patients/${r.id}">${r.last_name}, ${r.first_name}</a></td>
                <td>${r.lastEntry.toISOString().slice(0, 10)}</td>
                <td>${r.keptUntil.toISOString().slice(0, 10)}</td>
                <td><form method="post" action="/clinician/patients/${r.id}/delete" class="inline-form">
                  <input type="hidden" name="reason" value="Retention period ended" />
                  <label>${t('Type the last name')} <input name="confirm_last_name" required autocomplete="off" /></label>
                  <button class="small danger">${t('Delete')}</button>
                </form></td>
              </tr>`)}</tbody>
            </table></div>`
          : html`<p>${t('No records of yours have reached the end of their retention period.')}</p>`}
      </section>`,
  });
}

export function auditPage({ clinician, patient, entries, actions }) {
  const t = translator(clinician?.language);
  return layout({
    title: t('Audit log'),
    clinician,
    body: html`
      <p><a href="/clinician/patients/${patient.id}">← ${patient.first_name} ${patient.last_name}</a></p>
      <h1>${t('Audit log')}</h1>
      <p class="hint">${t('Every view and change of this patient’s information (newest first, up to 500 entries).')}</p>
      <div class="table-scroll"><table>
        <thead><tr><th>${t('When (UTC)')}</th><th>${t('Who')}</th><th>${t('What')}</th><th>${t('Assessment')}</th><th>${t('Detail')}</th></tr></thead>
        <tbody>${entries.map((e) => html`<tr>
          <td class="code">${e.at}</td><td>${e.clinician_name ?? `#${e.clinician_id}`}</td><td>${t(actions[e.action] ?? e.action)}</td>
          <td>${e.assessment_id ? html`<a href="/clinician/assessments/${e.assessment_id}">#${e.assessment_id}</a>` : ''}</td><td>${e.detail ?? ''}</td>
        </tr>`)}</tbody>
      </table></div>`,
  });
}

// ---------- Follow-up measurements on the patient page ----------

// A line chart of PHQ-9 and GAD-7 over time, drawn as SVG on the server.
// Colours come from classes in style.css (the CSP blocks inline styles).
function progressChart(t, points) {
  // Wide side margins so the first and last date labels are not cut off.
  const W = 640, H = 230, left = 70, right = 50, top = 14, bottom = 46;
  const maxY = 27;
  const x = (i) => left + (points.length === 1 ? (W - left - right) / 2 : (i * (W - left - right)) / (points.length - 1));
  const y = (v) => top + (1 - v / maxY) * (H - top - bottom);
  const line = (key) => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const grid = [0, 5, 10, 15, 20, 27];
  return html`<figure class="chart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('PHQ-9 and GAD-7 scores over time')}">
      ${grid.map((g) => html`<line class="chart-grid" x1="${left}" x2="${W - right}" y1="${y(g)}" y2="${y(g)}" /><text class="chart-label" x="${left - 30}" y="${y(g) + 4}" text-anchor="end">${g}</text>`)}
      <path class="chart-line chart-phq" d="${line('phq9')}" />
      <path class="chart-line chart-gad" d="${line('gad7')}" />
      ${points.map((p, i) => html`
        <circle class="chart-dot chart-phq-dot" cx="${x(i)}" cy="${y(p.phq9)}" r="4" />
        <circle class="chart-dot chart-gad-dot" cx="${x(i)}" cy="${y(p.gad7)}" r="4" />
        <text class="chart-label" x="${x(i)}" y="${H - bottom + 18}" text-anchor="middle">${p.date.slice(0, 10)}</text>
        <text class="chart-label" x="${x(i)}" y="${H - bottom + 32}" text-anchor="middle">${p.source === 'Follow-up' ? t('follow-up') : t('intake')}</text>`)}
    </svg>
    <figcaption><span class="key key-phq"></span> PHQ-9 (0–27) <span class="key key-gad"></span> GAD-7 (0–21). ${t('Lines at 5, 10, 15 and 20 mark the severity bands.')}</figcaption>
  </figure>`;
}

function followupSection(t, patient, assessments, followups, followupLink, canStart = true) {
  const points = measurementSeries(assessments, followups);
  const progress = progressSummary(points);
  const pending = followups.filter((f) => !f.completed_at && !f.revoked && new Date(f.expires_at) > new Date());
  return html`<section class="card">
    <h2>${t('Follow-up: PHQ-9 and GAD-7 over time')}</h2>
    <p class="hint">${t('Repeat PHQ-9 and GAD-7 (18 questions, about 3 minutes) to see whether treatment helps.')}</p>
    ${followupLink
      ? html`<div class="highlight card"><p>${t('Send this follow-up link to the patient. Copy it now: it is not shown again. It expires {date}.', { date: followupLink.expires })}</p>
          <input class="linkbox" readonly value="${followupLink.url}" aria-label="${t('Follow-up link')}" /></div>`
      : ''}
    ${points.length
      ? html`${progressChart(t, points)}
        ${progress ? html`<ul class="facts">${progress.notes.map((n) => html`<li>${n}</li>`)}</ul>` : html`<p class="hint">${t('One measurement so far. Add a follow-up to see change.')}</p>`}
        <div class="table-scroll"><table>
          <thead><tr><th>${t('Date')}</th><th>${t('Measurement')}</th><th>PHQ-9</th><th>GAD-7</th><th></th></tr></thead>
          <tbody>${points.map((p) => html`<tr><td class="code">${p.date}</td><td>${t(p.source)}</td><td>${p.phq9}</td><td>${p.gad7}</td>
            <td>${p.safetyFlag ? html`<span class="badge danger">${t('Item 9')}</span>` : ''}</td></tr>`)}</tbody>
        </table></div>`
      : html`<p class="hint">${t('No completed measurements yet.')}</p>`}
    ${pending.length ? html`<p class="hint">${pending.length === 1 ? t('1 follow-up link is waiting for the patient.') : t('{n} follow-up links are waiting for the patient.', { n: pending.length })}</p>` : ''}
    ${canStart ? html`<div class="start-options">
      <form method="post" action="/clinician/patients/${patient.id}/followups">
        <input type="hidden" name="mode" value="link" />
        <label>${t('Language')} ${languageSelect()}</label>
        <button>${t('Send follow-up link')}</button>
      </form>
      <form method="post" action="/clinician/patients/${patient.id}/followups">
        <input type="hidden" name="mode" value="onsite" />
        <label>${t('Language')} ${languageSelect()}</label>
        <button>${t('Follow-up on site')}</button>
      </form>
    </div>` : ''}
  </section>`;
}

// The follow-up questionnaire: PHQ-9 and GAD-7 only.
export function followupPage({ action, error, clinician, patient, language = 'en', answers = {}, switchUrl }) {
  const t = STRINGS[language];
  const pick = (id) => answers[id];
  return layout({
    title: t.title,
    clinician,
    language,
    body: html`
      ${languageSwitch(language, switchUrl)}
      <h1>${clinician ? html`${translator(clinician.language)('Follow-up')}: ${patient.first_name} ${patient.last_name}` : t.title}</h1>
      <p class="crisis">${t.crisis}</p>
      ${error ? html`<p class="error" role="alert">${error}</p>` : ''}
      <form method="post" action="${action}">
        <section class="card">
          <h2>${t.part} 1</h2>
          <p><strong>${t.twoWeeks}</strong></p>
          ${PHQ9_ITEMS.map((item, i) => radioGroup(item.id, itemText(language, item), FREQUENCY_OPTIONS, i + 1, pick(item.id), language))}
          ${radioGroup(PHQ_DIFFICULTY_ID, difficultyText(language, DIFFICULTY_QUESTION), DIFFICULTY_OPTIONS, null, pick(PHQ_DIFFICULTY_ID), language)}
        </section>
        <section class="card">
          <h2>${t.part} 2</h2>
          <p><strong>${t.twoWeeks}</strong></p>
          ${GAD7_ITEMS.map((item, i) => radioGroup(item.id, itemText(language, item), FREQUENCY_OPTIONS, i + 1, pick(item.id), language))}
          ${radioGroup(GAD_DIFFICULTY_ID, difficultyText(language, DIFFICULTY_QUESTION), DIFFICULTY_OPTIONS, null, pick(GAD_DIFFICULTY_ID), language)}
        </section>
        <button class="big">${clinician ? translator(clinician.language)('Save follow-up') : t.submit}</button>
      </form>
      <p class="hint">PHQ-9 and GAD-7 © Pfizer Inc.; no permission required to reproduce. ${t.translationNote}</p>`,
  });
}

export function messagePage({ title, message, clinician }) {
  const t = translator(clinician?.language);
  return layout({ title: t(title), clinician, body: html`<h1>${t(title)}</h1><p>${t(message)}</p>` });
}
