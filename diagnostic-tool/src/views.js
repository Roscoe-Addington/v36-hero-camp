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
} from './questionnaire.js';
import { CLINICIAN_CHECKLIST, LIKELIHOOD } from './scoring.js';
import { STATUS } from './differential.js';
import { STRINGS, LANGUAGES, itemText, optionText, sectionText, difficultyText } from './i18n.js';
import { measurementSeries, progressSummary } from './followup.js';

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
  return html`<!doctype html>
<html lang="${language}">
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
      <span class="brand">Mental Health Assessment</span>
      ${clinician
        ? html`<nav>
            <a href="/clinician">Patients</a>
            <a href="/clinician/patients/new">New patient</a>
            <form method="post" action="/logout" class="inline"><button class="link">Log out (${clinician.name})</button></form>
          </nav>`
        : ''}
    </header>
    <main>${body}</main>
  </body>
</html>`;
}

// ---------- Login ----------

export function loginPage({ error } = {}) {
  return layout({
    title: 'Clinician login',
    body: html`
      <h1>Clinician login</h1>
      ${error ? html`<p class="error" role="alert">${error}</p>` : ''}
      <form method="post" action="/login" class="card narrow">
        <label>Email <input type="email" name="email" required autocomplete="username" /></label>
        <label>Password <input type="password" name="password" required autocomplete="current-password" /></label>
        <button>Log in</button>
      </form>`,
  });
}

// ---------- Clinician: patient list ----------

export function dashboardPage({ clinician, patients }) {
  return layout({
    title: 'Patients',
    clinician,
    body: html`
      <h1>Patients</h1>
      <p><a class="button" href="/clinician/patients/new">+ Add patient</a></p>
      ${patients.length === 0
        ? html`<p>No patients yet.</p>`
        : html`<table>
            <thead><tr><th>Name</th><th>Age</th><th>Latest questionnaire</th></tr></thead>
            <tbody>
              ${patients.map(
                (p) => html`<tr>
                  <td><a href="/clinician/patients/${p.id}">${p.last_name}, ${p.first_name}</a>${p.shared ? html` <span class="badge info">Shared by ${p.owner_name}</span>` : ''}</td>
                  <td>${p.age}</td>
                  <td>${p.latest_completed ? html`Completed ${p.latest_completed}${p.latest_safety ? html` <span class="badge danger">Safety alert</span>` : ''}` : p.has_pending ? 'Link sent, not completed' : '—'}</td>
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

function select(name, options, selected) {
  return html`<select name="${name}" required>
    <option value="">Choose…</option>
    ${options.map((o) => html`<option ${o === selected ? html`selected` : ''}>${o}</option>`)}
  </select>`;
}

// New patient, or editing an existing one (when `patient` is given).
export function newPatientPage({ clinician, patient, errors = [], values = {} }) {
  const title = patient ? 'Edit patient details' : 'New patient';
  return layout({
    title,
    clinician,
    body: html`
      ${patient ? html`<p><a href="/clinician/patients/${patient.id}">← ${patient.first_name} ${patient.last_name}</a></p>` : ''}
      <h1>${title}</h1>
      ${patient ? html`<p class="hint">Changes are recorded in the audit log (which fields changed, by whom and when).</p>` : ''}
      ${errors.length ? html`<div class="error" role="alert"><p>Please fix:</p><ul>${errors.map((e) => html`<li>${e}</li>`)}</ul></div>` : ''}
      <form method="post" action="${patient ? `/clinician/patients/${patient.id}/edit` : '/clinician/patients'}" class="card">
        <div class="grid2">
          <label>First name <input name="first_name" required maxlength="100" value="${values.first_name}" /></label>
          <label>Last name <input name="last_name" required maxlength="100" value="${values.last_name}" /></label>
        </div>
        <label>Personal number <input name="personal_number" required maxlength="20" value="${values.personal_number}" placeholder="e.g. YYYYMMDD-XXXX" /></label>
        <div class="grid2">
          <label>Gender ${select('gender', GENDER_OPTIONS, values.gender)}</label>
          <label>Age <input name="age" type="number" min="16" max="120" required value="${values.age}" /></label>
        </div>
        <label>Level of education ${select('education', EDUCATION_OPTIONS, values.education)}</label>
        <fieldset>
          <legend>Currently employed?</legend>
          <label class="choice"><input type="radio" name="employed" value="1" required ${values.employed === '1' ? html`checked` : ''} /> Yes</label>
          <label class="choice"><input type="radio" name="employed" value="0" ${values.employed === '0' ? html`checked` : ''} /> No</label>
        </fieldset>
        <button>${patient ? 'Save changes' : 'Save patient'}</button>
      </form>`,
  });
}

// ---------- Clinician: one patient ----------

function languageSelect() {
  return html`<select name="language">${Object.entries(LANGUAGES).map(([code, name]) => html`<option value="${code}">${name}</option>`)}</select>`;
}

export function patientPage({ clinician, patient, assessments, newLink, followups = [], followupLink, errors = [], access = { owner: true }, grants = [], owner }) {
  return layout({
    title: `${patient.first_name} ${patient.last_name}`,
    clinician,
    body: html`
      <h1>${patient.first_name} ${patient.last_name}</h1>
      ${errors.length ? html`<div class="error" role="alert"><ul>${errors.map((e) => html`<li>${e}</li>`)}</ul></div>` : ''}
      <p class="record-links"><a href="/clinician/patients/${patient.id}/edit">Edit details</a> · <a href="/clinician/patients/${patient.id}/audit">Audit log</a></p>
      ${access.owner
        ? ''
        : html`<p class="note">You have access as <strong>${ROLE_NAMES[access.role] ?? access.role}</strong>, granted by ${access.grant.granted_by_name} (treating clinician${owner ? `: ${owner.name}` : ''}) for: ${access.grant.reason}.${access.grant.expires_at ? ` Access ends ${access.grant.expires_at.slice(0, 10)}.` : ''}</p>`}
      <dl class="card details">
        <dt>Personal number</dt><dd>${patient.personal_number}</dd>
        <dt>Gender</dt><dd>${patient.gender}</dd>
        <dt>Age</dt><dd>${patient.age}</dd>
        <dt>Education</dt><dd>${patient.education}</dd>
        <dt>Employed</dt><dd>${patient.employed ? 'Yes' : 'No'}</dd>
      </dl>

      ${newLink
        ? html`<div class="card highlight">
            <h2>Questionnaire link created</h2>
            <p>Send this link to the patient. <strong>Copy it now</strong> — for security it is not stored and cannot be shown again. It expires ${newLink.expires}.</p>
            <input class="linkbox" readonly value="${newLink.url}" aria-label="Questionnaire link" />
          </div>`
        : ''}

      <section class="card">
        <h2>Start a new assessment</h2>
        <p>The assessment starts with the intake screening. Choose how the patient answers it:</p>
        <div class="start-options">
          <form method="post" action="/clinician/patients/${patient.id}/assessments">
            <input type="hidden" name="mode" value="link" />
            <label>Questionnaire language ${languageSelect()}</label>
            <button>Send link to patient</button>
            <p class="hint">The patient answers at home. You get an email when it is done.</p>
          </form>
          <form method="post" action="/clinician/patients/${patient.id}/assessments">
            <input type="hidden" name="mode" value="onsite" />
            <label>Questionnaire language ${languageSelect()}</label>
            <button>Conduct on site</button>
            <p class="hint">You go through the questions with the patient now, on this device.</p>
          </form>
        </div>
        <p class="hint">Starting a new assessment cancels any earlier one for this patient that has not started yet.</p>
      </section>

      <h2>Assessments</h2>
      ${assessments.length === 0
        ? html`<p>None yet.</p>`
        : html`<table>
            <thead><tr><th>Created</th><th>How</th><th>Status</th><th>Depression</th><th>Anxiety</th></tr></thead>
            <tbody>
              ${assessments.map((a) => {
                const r = a.results_json ? JSON.parse(a.results_json) : null;
                const link = (text) => html`<a href="/clinician/assessments/${a.id}">${text}</a>`;
                let status;
                if (a.finalized_at) status = link(`Finalized ${a.finalized_at}`);
                else if (a.completed_at) status = link(`Screening done ${a.completed_at} — continue`);
                else if (a.revoked) status = 'Cancelled';
                else if (a.mode === 'onsite') status = link('On-site screening not finished — continue');
                else if (new Date(a.expires_at) < new Date()) status = 'Link expired';
                else status = 'Waiting for patient';
                return html`<tr>
                  <td>${a.created_at}</td>
                  <td>${a.mode === 'onsite' ? 'On site' : 'Link'}</td>
                  <td>${status} ${r?.safetyFlag ? html`<span class="badge danger">Safety alert</span>` : ''} ${r?.differential?.summary.priority.length ? html`<span class="badge danger">Priority differential</span>` : ''}</td>
                  <td>${r ? html`${likelihoodBadge(r.depression.likelihood)} PHQ-9 ${r.depression.total}` : ''}</td>
                  <td>${r ? html`${likelihoodBadge(r.anxiety.likelihood)} GAD-7 ${r.anxiety.total}` : ''}</td>
                </tr>`;
              })}
            </tbody>
          </table>`}

      ${followupSection(patient, assessments, followups, followupLink)}

      ${access.owner ? accessSection(patient, grants) : ''}

      ${access.owner ? html`<details class="card danger-zone">
        <summary>Delete patient record</summary>
        <p>This permanently deletes the patient and all assessments. Use it only for records created by mistake or when the law requires deletion: health records usually have to be kept for a set time (in Sweden, at least 10 years under Patientdatalagen). The deletion is kept in the audit log.</p>
        <form method="post" action="/clinician/patients/${patient.id}/delete">
          <label>Type the patient’s last name to confirm <input name="confirm_last_name" required autocomplete="off" /></label>
          <label>Reason <input name="reason" maxlength="300" /></label>
          <button class="danger">Delete permanently</button>
        </form>
      </details>` : ''}`,
  });
}

export function likelihoodBadge(likelihood) {
  const cls = {
    [LIKELIHOOD.HIGH]: 'danger',
    [LIKELIHOOD.MODERATE]: 'warn',
    [LIKELIHOOD.SUBCLINICAL]: 'info',
    [LIKELIHOOD.MINIMAL]: 'ok',
  }[likelihood];
  return html`<span class="badge ${cls}">${likelihood}</span>`;
}

// ---------- Clinician: full report ----------

function symptomList(list) {
  if (list.length === 0) return html`<p class="hint">None.</p>`;
  return html`<ul>${list.map((s) => html`<li>${s.symptom} — <em>${s.frequency}</em></li>`)}</ul>`;
}

function itemTable(items) {
  return html`<table class="items">
    <thead><tr><th>Question</th><th>Answer</th><th>Score</th></tr></thead>
    <tbody>${items.map((i) => html`<tr><td>${i.text}</td><td>${i.answer}</td><td>${i.score}</td></tr>`)}</tbody>
  </table>`;
}

// ---------- Clinician: differential diagnosis section ----------

function statusBadge(status) {
  const cls = {
    [STATUS.FLAGGED]: 'danger',
    [STATUS.POSSIBLE]: 'warn',
    [STATUS.CLINICIAN]: 'info',
    [STATUS.NOT_INDICATED]: 'ok',
  }[status];
  return html`<span class="badge ${cls}">${status}</span>`;
}

function differentialSection(differential) {
  if (!differential) {
    return html`<section class="card"><h2>Differential diagnosis screening</h2>
      <p class="hint">Not available: this questionnaire was completed before differential screening was added.</p></section>`;
  }
  const { summary, entries, overlap } = differential;
  return html`<section class="card">
    <h2>Differential diagnosis screening</h2>
    <p class="hint">${summary.checked} alternative or co-occurring conditions checked against DSM-5-TR differentials for MDD and GAD. This shows what to explore in the interview; it does not confirm or exclude any diagnosis.</p>
    ${summary.priority.length
      ? html`<div class="alert" role="alert"><strong>Priority:</strong> screen positive for ${summary.priority.join('; ')}.</div>`
      : ''}

    <table class="diff-summary">
      <thead><tr><th>Condition</th><th>Relevant to</th><th>Status</th></tr></thead>
      <tbody>
        ${entries.map(
          (e) => html`<tr>
            <td><a href="#diff-${e.id}">${e.condition}</a></td>
            <td>${e.relevantTo.join(', ')}</td>
            <td>${statusBadge(e.status)}</td>
          </tr>`
        )}
      </tbody>
    </table>

    <h3>Overlap between depression and anxiety symptoms</h3>
    <table>
      <thead><tr><th>Shared symptom</th><th>Counted for depression</th><th>Counted for anxiety</th></tr></thead>
      <tbody>
        ${overlap.shared.map(
          (o) => html`<tr><td>${o.symptom}</td><td>${o.onDepressionSide ? 'Yes' : 'No'}</td><td>${o.onAnxietySide ? 'Yes' : 'No'}</td></tr>`
        )}
      </tbody>
    </table>
    ${overlap.notes.map((n) => html`<p class="note">${n}</p>`)}

    <h3>Detailed reasoning</h3>
    ${entries.map(
      (e) => html`<details class="diff" id="diff-${e.id}" ${e.status === STATUS.FLAGGED || e.status === STATUS.POSSIBLE ? html`open` : ''}>
        <summary><strong>${e.condition}</strong> ${statusBadge(e.status)}</summary>
        <dl>
          <dt>Why checked</dt><dd>${e.why}</dd>
          <dt>Rule applied</dt><dd>${e.rule}</dd>
          ${e.evidence.length
            ? html`<dt>Answers used</dt><dd><ul>${e.evidence.map((ev) => html`<li>${ev.question} — <strong>${ev.answer}</strong></li>`)}</ul></dd>`
            : ''}
          <dt>Finding</dt><dd>${e.finding}</dd>
          <dt>What it means</dt><dd>${e.implication}</dd>
          <dt>Next step</dt><dd>${e.nextStep}</dd>
        </dl>
      </details>`
    )}
  </section>`;
}

// The screening part of an assessment (results of the intake questionnaire).
export function screeningSections(results) {
  const d = results.depression;
  const a = results.anxiety;
  return html`
      ${results.safetyFlag
        ? html`<div class="alert" role="alert">
            <h2>Safety alert</h2>
            <p>The patient answered <strong>“${results.safetyAnswer}”</strong> to PHQ-9 item 9 (thoughts of being better off dead or of self-harm). Follow up promptly with a suicide risk assessment.</p>
          </div>`
        : ''}

      <section class="card">
        <h2>Major depressive disorder</h2>
        <p>Likelihood: ${likelihoodBadge(d.likelihood)}</p>
        <ul class="facts">
          <li>PHQ-9 total: <strong>${d.total}/${d.maxTotal}</strong> (${d.severity})</li>
          <li>DSM-5-TR symptom count: ${d.symptomCount} of 9 at threshold; core symptom (mood or anhedonia) ${d.coreSymptomPresent ? 'present' : 'absent'}</li>
          <li>Algorithm: ${d.syndrome}</li>
          <li>Functional impairment: ${d.functionalDifficulty}</li>
        </ul>
        <h3>Symptoms at diagnostic threshold</h3>
        ${symptomList(d.thresholdSymptoms)}
        <h3>Subclinical symptoms (present, below threshold)</h3>
        ${symptomList(d.subclinicalSymptoms)}
        <details><summary>Item-level answers</summary>${itemTable(d.itemScores)}</details>
      </section>

      <section class="card">
        <h2>Generalized anxiety disorder</h2>
        <p>Likelihood: ${likelihoodBadge(a.likelihood)}</p>
        <ul class="facts">
          <li>GAD-7 total: <strong>${a.total}/${a.maxTotal}</strong> (${a.severity})</li>
          <li>Criterion A — excessive worry, 6+ months: ${a.criteria.A ? 'Yes' : 'No'}</li>
          <li>Criterion B — difficult to control: ${a.criteria.B ? 'Yes' : 'No'}</li>
          <li>Criterion C — at least 3 of 6 associated symptoms: ${a.criteria.C ? 'Yes' : 'No'} (${a.criteria.associatedCount} of 6)</li>
          <li>Functional impairment: ${a.functionalDifficulty}</li>
        </ul>
        ${a.notes.map((n) => html`<p class="note">${n}</p>`)}
        <h3>Symptoms more than half the days</h3>
        ${symptomList(a.thresholdSymptoms)}
        <h3>Subclinical symptoms</h3>
        ${symptomList(a.subclinicalSymptoms)}
        <details><summary>Item-level answers</summary>${itemTable(a.itemScores)}</details>
      </section>

      ${differentialSection(results.differential)}

      <section class="card">
        <h2>Before making a diagnosis</h2>
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
  return layout({
    title: t.title,
    clinician,
    language,
    skipScript: true,
    body: html`
      ${languageSwitch(language, switchUrl)}
      <h1>${clinician ? html`Intake screening: ${patient.first_name} ${patient.last_name}` : t.title}</h1>
      ${pageIndex === 0
        ? clinician
          ? html`<p class="note">On-site screening (${LANGUAGES[language]}). Read the questions to the patient and record their answers, or let the patient answer on this device. Answer from the patient's point of view.</p>`
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
              <h2>Information to the patient</h2>
              <ul>${STRINGS[language].consent.map((p) => html`<li>${p}</li>`)}</ul>
              <label class="check"><input type="checkbox" name="consent_given" value="yes" required /> The patient has been given this information and agrees to answer</label>
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
          <button>${last ? (clinician ? 'Save answers and score' : t.submit) : t.next}</button>
        </div>
        <p class="save-later"><button class="link" name="intent" value="save" formnovalidate>${clinician ? 'Save draft and continue later' : t.save}</button></p>
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

function grantStatus(g) {
  if (g.revoked_at) return html`<span class="badge ok">Revoked ${g.revoked_at.slice(0, 10)}</span>`;
  if (g.expires_at && g.expires_at <= new Date().toISOString()) return html`<span class="badge ok">Ended ${g.expires_at.slice(0, 10)}</span>`;
  return html`<span class="badge warn">Active${g.expires_at ? ` until ${g.expires_at.slice(0, 10)}` : ''}</span>`;
}

function accessSection(patient, grants) {
  const active = grants.filter((g) => !g.revoked_at && !(g.expires_at && g.expires_at <= new Date().toISOString()));
  return html`<section class="card">
    <h2>Who has access</h2>
    <p class="hint">Only you, as the treating clinician, and the people you name here can see this patient. Give access only to those who need it for the patient\u2019s care, such as a supervisor or a close colleague covering for you. Every grant, and every view, is in the audit log.</p>
    ${grants.length
      ? html`<div class="table-scroll"><table>
          <thead><tr><th>Person</th><th>Role</th><th>Reason</th><th>Status</th><th></th></tr></thead>
          <tbody>${grants.map((g) => html`<tr>
            <td>${g.clinician_name}<br /><span class="hint">${g.clinician_email}</span></td>
            <td>${ROLE_NAMES[g.role] ?? g.role}</td>
            <td>${g.reason}</td>
            <td>${grantStatus(g)}</td>
            <td>${active.includes(g)
              ? html`<form method="post" action="/clinician/patients/${patient.id}/access"><input type="hidden" name="action" value="revoke" /><input type="hidden" name="grant" value="${g.id}" /><button class="small secondary">Revoke</button></form>`
              : ''}</td>
          </tr>`)}</tbody>
        </table></div>`
      : html`<p>Nobody else has access.</p>`}
    <details>
      <summary>Give access to a supervisor or colleague</summary>
      <form method="post" action="/clinician/patients/${patient.id}/access" class="grid2">
        <input type="hidden" name="action" value="grant" />
        <label>Their email (clinician account) <input type="email" name="email" required /></label>
        <label>Role
          <select name="role" required><option value="supervisor">Supervisor</option><option value="colleague">Close colleague</option></select>
        </label>
        <label>Access ends (optional) <input type="date" name="until" /></label>
        <label>Why do they need access? <input name="reason" required maxlength="300" /></label>
        <button>Give access</button>
      </form>
    </details>
  </section>`;
}

export function auditPage({ clinician, patient, entries, actions }) {
  return layout({
    title: 'Audit log',
    clinician,
    body: html`
      <p><a href="/clinician/patients/${patient.id}">← ${patient.first_name} ${patient.last_name}</a></p>
      <h1>Audit log</h1>
      <p class="hint">Every view and change of this patient’s information (newest first, up to 500 entries).</p>
      <div class="table-scroll"><table>
        <thead><tr><th>When (UTC)</th><th>Who</th><th>What</th><th>Assessment</th><th>Detail</th></tr></thead>
        <tbody>${entries.map((e) => html`<tr>
          <td class="code">${e.at}</td><td>${e.clinician_name ?? `#${e.clinician_id}`}</td><td>${actions[e.action] ?? e.action}</td>
          <td>${e.assessment_id ? html`<a href="/clinician/assessments/${e.assessment_id}">#${e.assessment_id}</a>` : ''}</td><td>${e.detail ?? ''}</td>
        </tr>`)}</tbody>
      </table></div>`,
  });
}

// ---------- Follow-up measurements on the patient page ----------

// A line chart of PHQ-9 and GAD-7 over time, drawn as SVG on the server.
// Colours come from classes in style.css (the CSP blocks inline styles).
function progressChart(points) {
  // Wide side margins so the first and last date labels are not cut off.
  const W = 640, H = 230, left = 70, right = 50, top = 14, bottom = 46;
  const maxY = 27;
  const x = (i) => left + (points.length === 1 ? (W - left - right) / 2 : (i * (W - left - right)) / (points.length - 1));
  const y = (v) => top + (1 - v / maxY) * (H - top - bottom);
  const line = (key) => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const grid = [0, 5, 10, 15, 20, 27];
  return html`<figure class="chart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="PHQ-9 and GAD-7 scores over time">
      ${grid.map((g) => html`<line class="chart-grid" x1="${left}" x2="${W - right}" y1="${y(g)}" y2="${y(g)}" /><text class="chart-label" x="${left - 30}" y="${y(g) + 4}" text-anchor="end">${g}</text>`)}
      <path class="chart-line chart-phq" d="${line('phq9')}" />
      <path class="chart-line chart-gad" d="${line('gad7')}" />
      ${points.map((p, i) => html`
        <circle class="chart-dot chart-phq-dot" cx="${x(i)}" cy="${y(p.phq9)}" r="4" />
        <circle class="chart-dot chart-gad-dot" cx="${x(i)}" cy="${y(p.gad7)}" r="4" />
        <text class="chart-label" x="${x(i)}" y="${H - bottom + 18}" text-anchor="middle">${p.date.slice(0, 10)}</text>
        <text class="chart-label" x="${x(i)}" y="${H - bottom + 32}" text-anchor="middle">${p.source === 'Follow-up' ? 'follow-up' : 'intake'}</text>`)}
    </svg>
    <figcaption><span class="key key-phq"></span> PHQ-9 (0–27) <span class="key key-gad"></span> GAD-7 (0–21). Lines at 5, 10, 15 and 20 mark the severity bands.</figcaption>
  </figure>`;
}

function followupSection(patient, assessments, followups, followupLink) {
  const points = measurementSeries(assessments, followups);
  const progress = progressSummary(points);
  const pending = followups.filter((f) => !f.completed_at && !f.revoked && new Date(f.expires_at) > new Date());
  return html`<section class="card">
    <h2>Follow-up: PHQ-9 and GAD-7 over time</h2>
    <p class="hint">Repeat PHQ-9 and GAD-7 (18 questions, about 3 minutes) to see whether treatment helps.</p>
    ${followupLink
      ? html`<div class="highlight card"><p>Send this follow-up link to the patient. <strong>Copy it now</strong>; it is not shown again. It expires ${followupLink.expires}.</p>
          <input class="linkbox" readonly value="${followupLink.url}" aria-label="Follow-up link" /></div>`
      : ''}
    ${points.length
      ? html`${progressChart(points)}
        ${progress ? html`<ul class="facts">${progress.notes.map((n) => html`<li>${n}</li>`)}</ul>` : html`<p class="hint">One measurement so far. Add a follow-up to see change.</p>`}
        <div class="table-scroll"><table>
          <thead><tr><th>Date</th><th>Measurement</th><th>PHQ-9</th><th>GAD-7</th><th></th></tr></thead>
          <tbody>${points.map((p) => html`<tr><td class="code">${p.date}</td><td>${p.source}</td><td>${p.phq9}</td><td>${p.gad7}</td>
            <td>${p.safetyFlag ? html`<span class="badge danger">Item 9</span>` : ''}</td></tr>`)}</tbody>
        </table></div>`
      : html`<p class="hint">No completed measurements yet.</p>`}
    ${pending.length ? html`<p class="hint">${pending.length} follow-up ${pending.length === 1 ? 'link is' : 'links are'} waiting for the patient.</p>` : ''}
    <div class="start-options">
      <form method="post" action="/clinician/patients/${patient.id}/followups">
        <input type="hidden" name="mode" value="link" />
        <label>Language ${languageSelect()}</label>
        <button>Send follow-up link</button>
      </form>
      <form method="post" action="/clinician/patients/${patient.id}/followups">
        <input type="hidden" name="mode" value="onsite" />
        <label>Language ${languageSelect()}</label>
        <button>Follow-up on site</button>
      </form>
    </div>
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
      <h1>${clinician ? html`Follow-up: ${patient.first_name} ${patient.last_name}` : t.title}</h1>
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
        <button class="big">${clinician ? 'Save follow-up' : t.submit}</button>
      </form>
      <p class="hint">PHQ-9 and GAD-7 © Pfizer Inc.; no permission required to reproduce. ${t.translationNote}</p>`,
  });
}

export function messagePage({ title, message, clinician }) {
  return layout({ title, clinician, body: html`<h1>${title}</h1><p>${message}</p>` });
}
