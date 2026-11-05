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
} from './questionnaire.js';
import { CLINICIAN_CHECKLIST, LIKELIHOOD } from './scoring.js';

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

const CRISIS_TEXT =
  process.env.CRISIS_TEXT ||
  'If you are in danger or thinking about harming yourself, call 112 (emergency) now. In Sweden you can also call Mind Självmordslinjen on 90101 or 1177 for healthcare advice.';

function layout({ title, clinician, body }) {
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>${title}</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <header class="topbar">
      <span class="brand">Mood &amp; Anxiety Screening</span>
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
                  <td><a href="/clinician/patients/${p.id}">${p.last_name}, ${p.first_name}</a></td>
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

export function newPatientPage({ clinician, errors = [], values = {} }) {
  return layout({
    title: 'New patient',
    clinician,
    body: html`
      <h1>New patient</h1>
      ${errors.length ? html`<div class="error" role="alert"><p>Please fix:</p><ul>${errors.map((e) => html`<li>${e}</li>`)}</ul></div>` : ''}
      <form method="post" action="/clinician/patients" class="card">
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
        <button>Save patient</button>
      </form>`,
  });
}

// ---------- Clinician: one patient ----------

export function patientPage({ clinician, patient, assessments, newLink }) {
  return layout({
    title: `${patient.first_name} ${patient.last_name}`,
    clinician,
    body: html`
      <h1>${patient.first_name} ${patient.last_name}</h1>
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

      <form method="post" action="/clinician/patients/${patient.id}/links">
        <button>Create new questionnaire link</button>
      </form>
      <p class="hint">Creating a new link cancels any earlier link for this patient that has not been used yet.</p>

      <h2>Questionnaires</h2>
      ${assessments.length === 0
        ? html`<p>None yet.</p>`
        : html`<table>
            <thead><tr><th>Created</th><th>Status</th><th>Depression</th><th>Anxiety</th></tr></thead>
            <tbody>
              ${assessments.map((a) => {
                const r = a.results_json ? JSON.parse(a.results_json) : null;
                let status;
                if (a.completed_at) status = html`<a href="/clinician/assessments/${a.id}">Completed ${a.completed_at}</a>`;
                else if (a.revoked) status = 'Cancelled';
                else if (new Date(a.expires_at) < new Date()) status = 'Expired';
                else status = 'Waiting for patient';
                return html`<tr>
                  <td>${a.created_at}</td>
                  <td>${status} ${r?.safetyFlag ? html`<span class="badge danger">Safety alert</span>` : ''}</td>
                  <td>${r ? html`${likelihoodBadge(r.depression.likelihood)} PHQ-9 ${r.depression.total}` : ''}</td>
                  <td>${r ? html`${likelihoodBadge(r.anxiety.likelihood)} GAD-7 ${r.anxiety.total}` : ''}</td>
                </tr>`;
              })}
            </tbody>
          </table>`}`,
  });
}

function likelihoodBadge(likelihood) {
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

export function reportPage({ clinician, patient, assessment, results, emailStatus }) {
  const d = results.depression;
  const a = results.anxiety;
  return layout({
    title: `Report — ${patient.last_name}`,
    clinician,
    body: html`
      <p><a href="/clinician/patients/${patient.id}">← ${patient.first_name} ${patient.last_name}</a></p>
      <h1>Screening report</h1>
      <p class="hint">Completed ${assessment.completed_at} (UTC). Email: ${emailStatus || 'unknown'}.</p>
      <p class="disclaimer"><strong>Screening result, not a diagnosis.</strong> Confirm in a clinical interview.</p>

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

      <section class="card">
        <h2>Before making a diagnosis</h2>
        <ul>${CLINICIAN_CHECKLIST.map((c) => html`<li>${c}</li>`)}</ul>
      </section>`,
  });
}

// ---------- Patient: the questionnaire ----------

function radioGroup(id, question, options, number) {
  return html`<fieldset class="question">
    <legend>${number ? html`<span class="num">${number}.</span> ` : ''}${question}</legend>
    <div class="options">
      ${options.map(
        (o) => html`<label class="choice"><input type="radio" name="${id}" value="${o.value}" required /> ${o.label}</label>`
      )}
    </div>
  </fieldset>`;
}

export function questionnairePage({ token, error }) {
  return layout({
    title: 'Questionnaire',
    body: html`
      <h1>Questionnaire about mood and worry</h1>
      <p>Your clinician has asked you to fill in this questionnaire. It takes about 5–10 minutes. Please answer every question. Your answers go only to your clinician.</p>
      <p class="crisis">${CRISIS_TEXT}</p>
      ${error ? html`<p class="error" role="alert">${error}</p>` : ''}

      <form method="post" action="/q/${token}">
        <section class="card">
          <h2>Part 1</h2>
          <p><strong>Over the last 2 weeks</strong>, how often have you been bothered by any of the following problems?</p>
          ${PHQ9_ITEMS.map((item, i) => radioGroup(item.id, item.text, FREQUENCY_OPTIONS, i + 1))}
          ${radioGroup(PHQ_DIFFICULTY_ID, DIFFICULTY_QUESTION, DIFFICULTY_OPTIONS)}
        </section>

        <section class="card">
          <h2>Part 2</h2>
          <p><strong>Over the last 2 weeks</strong>, how often have you been bothered by the following problems?</p>
          ${GAD7_ITEMS.map((item, i) => radioGroup(item.id, item.text, FREQUENCY_OPTIONS, i + 1))}
          ${radioGroup(GAD_DIFFICULTY_ID, DIFFICULTY_QUESTION, DIFFICULTY_OPTIONS)}
        </section>

        <section class="card">
          <h2>Part 3</h2>
          <p>These questions are about the <strong>last 6 months</strong>.</p>
          ${GAD_CRITERIA_ITEMS.map((item, i) => radioGroup(item.id, item.text, YES_NO_OPTIONS, i + 1))}
        </section>

        <button class="big">Submit answers</button>
      </form>
      <p class="hint">PHQ-9 and GAD-7 © Pfizer Inc., developed by Drs. Spitzer, Williams, Kroenke and colleagues; no permission required to reproduce.</p>`,
  });
}

export function thankYouPage({ safetyFlag }) {
  return layout({
    title: 'Thank you',
    body: html`
      <h1>Thank you</h1>
      <p>Your answers have been sent to your clinician, who will go through them with you.</p>
      ${safetyFlag
        ? html`<div class="alert" role="alert">
            <p><strong>You mentioned having thoughts of being better off dead or of hurting yourself.</strong> You do not have to wait for your appointment.</p>
            <p>${CRISIS_TEXT}</p>
          </div>`
        : html`<p class="crisis">${CRISIS_TEXT}</p>`}
      <p>You can close this page now.</p>`,
  });
}

export function messagePage({ title, message, clinician }) {
  return layout({ title, clinician, body: html`<h1>${title}</h1><p>${message}</p>` });
}
