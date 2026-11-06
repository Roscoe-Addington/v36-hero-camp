// The web server: connects URLs to the code that handles them.
//
//   /login, /logout             clinician login
//   /clinician/...              clinician-only pages (must be logged in)
//   /q/<token>                  the patient's questionnaire link

import express from 'express';
import { db } from './db.js';
import {
  SESSION_COOKIE,
  verifyPassword,
  hashPassword,
  createSession,
  destroySession,
  clinicianForSession,
  readCookie,
  newToken,
  hashToken,
  tooManyFailures,
  recordFailure,
  clearFailures,
} from './auth.js';
import { parseAnswers } from './questionnaire.js';
import { scoreAll } from './scoring.js';
import { runDifferential } from './differential.js';
import { sendResultsEmail } from './email.js';
import * as views from './views.js';
import * as workflow from './views-workflow.js';
import { buildSuggestions } from './suggestions.js';
import { findDisorder, criterionIds } from './disorders.js';
import { RATINGS } from './criteria.js';
import { applyDiagnosis } from './diagnosis.js';
import { defaultLowEducation } from './moca.js';
import { parseIntake } from './intake.js';
import { parseInterview, parseRisk, parseInformant, finalizeBlocker } from './clinical-forms.js';

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const LINK_VALID_DAYS = Number(process.env.LINK_VALID_DAYS || 14);
const SECURE_COOKIES = BASE_URL.startsWith('https://');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true'); // set when behind a reverse proxy

// Security headers on every response.
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    // The patient link contains a secret token: never send it to other sites in
    // a Referer header. ("no-referrer" would be stricter, but it makes browsers
    // send "Origin: null" on form posts, which breaks the cross-site check below.)
    'Referrer-Policy': 'same-origin',
    // Health data: do not let browsers or proxies cache pages.
    'Cache-Control': 'no-store',
  });
  if (SECURE_COOKIES) res.set('Strict-Transport-Security', 'max-age=31536000');
  next();
});

app.use(express.static('public', { index: false }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use((req, res, next) => {
  req.body ??= {}; // Express 5 leaves req.body undefined when nothing was posted
  next();
});

// Blocks form posts coming from other websites (cross-site request forgery).
// Browsers send an Origin header on POST; if it is there, it must be ours.
app.use((req, res, next) => {
  if (req.method === 'POST') {
    const origin = req.get('origin');
    if (origin && origin !== BASE_URL) return res.status(403).send('Forbidden');
  }
  next();
});

const send = (res, page, status = 200) => res.status(status).type('html').send(page.toString());

// Collapses whitespace and removes line breaks (which could otherwise be
// abused in email headers) and trims to a maximum length.
const clean = (value, max = 100) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// ---------- Login ----------

app.get('/', (req, res) => res.redirect('/clinician'));

app.get('/login', (req, res) => send(res, views.loginPage()));

// A real hash of a random password, used when the email is unknown so that
// a wrong email and a wrong password take the same time to answer.
const DUMMY_HASH = hashPassword(newToken());

app.post('/login', (req, res) => {
  const ip = req.ip;
  if (tooManyFailures(ip)) {
    return send(res, views.loginPage({ error: 'Too many failed attempts. Try again in 15 minutes.' }), 429);
  }
  const email = clean(req.body.email, 200).toLowerCase();
  const password = String(req.body.password ?? '');
  const clinician = db.prepare('SELECT id, password_hash FROM clinicians WHERE email = ?').get(email);
  const ok = verifyPassword(password, clinician ? clinician.password_hash : DUMMY_HASH) && clinician;
  if (!ok) {
    recordFailure(ip);
    return send(res, views.loginPage({ error: 'Wrong email or password.' }), 401);
  }
  clearFailures(ip);
  const session = createSession(clinician.id);
  res.cookie(SESSION_COOKIE, session.token, {
    httpOnly: true, // JavaScript in the page cannot read it
    sameSite: 'strict',
    secure: SECURE_COOKIES,
    maxAge: session.maxAgeMs,
    path: '/',
  });
  res.redirect('/clinician');
});

app.post('/logout', (req, res) => {
  destroySession(readCookie(req, SESSION_COOKIE));
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.redirect('/login');
});

// ---------- Clinician pages (login required) ----------

function requireClinician(req, res, next) {
  const clinician = clinicianForSession(readCookie(req, SESSION_COOKIE));
  if (!clinician) return res.redirect('/login');
  req.clinician = clinician;
  next();
}

const clinician = express.Router();
clinician.use(requireClinician);
app.use('/clinician', clinician);

// Loads a patient only if it belongs to the logged-in clinician.
function ownPatient(req) {
  return db
    .prepare('SELECT * FROM patients WHERE id = ? AND clinician_id = ?')
    .get(Number(req.params.id), req.clinician.id);
}

clinician.get('/', (req, res) => {
  const patients = db
    .prepare(
      `SELECT p.id, p.first_name, p.last_name, p.age,
              (SELECT MAX(completed_at) FROM assessments a WHERE a.patient_id = p.id) AS latest_completed,
              (SELECT json_extract(results_json, '$.safetyFlag') FROM assessments a
                 WHERE a.patient_id = p.id AND completed_at IS NOT NULL
                 ORDER BY completed_at DESC LIMIT 1) AS latest_safety,
              EXISTS (SELECT 1 FROM assessments a WHERE a.patient_id = p.id
                        AND completed_at IS NULL AND revoked = 0 AND expires_at > ?) AS has_pending
         FROM patients p
        WHERE p.clinician_id = ?
        ORDER BY p.last_name, p.first_name`
    )
    .all(new Date().toISOString(), req.clinician.id);
  send(res, views.dashboardPage({ clinician: req.clinician, patients }));
});

clinician.get('/patients/new', (req, res) => send(res, views.newPatientPage({ clinician: req.clinician })));

clinician.post('/patients', (req, res) => {
  const values = {
    first_name: clean(req.body.first_name),
    last_name: clean(req.body.last_name),
    personal_number: clean(req.body.personal_number, 20),
    gender: clean(req.body.gender),
    age: clean(req.body.age, 3),
    education: clean(req.body.education),
    employed: clean(req.body.employed, 1),
  };
  const errors = [];
  if (!values.first_name) errors.push('First name is required.');
  if (!values.last_name) errors.push('Last name is required.');
  if (!values.personal_number) errors.push('Personal number is required.');
  if (!views.GENDER_OPTIONS.includes(values.gender)) errors.push('Choose a gender option.');
  const age = Number(values.age);
  if (!Number.isInteger(age) || age < 16 || age > 120) errors.push('Age must be a whole number between 16 and 120.');
  if (!views.EDUCATION_OPTIONS.includes(values.education)) errors.push('Choose a level of education.');
  if (values.employed !== '0' && values.employed !== '1') errors.push('Choose whether the patient is employed.');

  if (errors.length) {
    return send(res, views.newPatientPage({ clinician: req.clinician, errors, values }), 400);
  }

  const result = db
    .prepare(
      `INSERT INTO patients (clinician_id, first_name, last_name, personal_number, gender, age, education, employed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.clinician.id,
      values.first_name,
      values.last_name,
      values.personal_number,
      values.gender,
      age,
      values.education,
      Number(values.employed)
    );
  res.redirect(`/clinician/patients/${result.lastInsertRowid}`);
});

function showPatient(req, res, newLink) {
  const patient = ownPatient(req);
  if (!patient) return send(res, views.messagePage({ title: 'Not found', message: 'No such patient.', clinician: req.clinician }), 404);
  const assessments = db
    .prepare('SELECT * FROM assessments WHERE patient_id = ? ORDER BY created_at DESC, id DESC')
    .all(patient.id);
  send(res, views.patientPage({ clinician: req.clinician, patient, assessments, newLink }));
}

clinician.get('/patients/:id', (req, res) => showPatient(req, res, null));

// ---------- Starting an assessment: link or on site ----------

clinician.post('/patients/:id/assessments', (req, res) => {
  const patient = ownPatient(req);
  if (!patient) return res.status(404).send('Not found');
  const mode = req.body.mode === 'onsite' ? 'onsite' : 'link';

  // Only one open assessment per patient: cancel any not yet started.
  db.prepare('UPDATE assessments SET revoked = 1 WHERE patient_id = ? AND completed_at IS NULL').run(patient.id);

  // Every assessment gets a random token. For on-site assessments it is never
  // shown, so the questionnaire can only be answered in the clinician portal.
  const token = newToken();
  const expires = new Date(Date.now() + LINK_VALID_DAYS * 24 * 3600 * 1000);
  const result = db
    .prepare('INSERT INTO assessments (patient_id, token_hash, expires_at, mode) VALUES (?, ?, ?, ?)')
    .run(patient.id, hashToken(token), expires.toISOString(), mode);

  if (mode === 'onsite') return res.redirect(`/clinician/assessments/${result.lastInsertRowid}/screening`);
  showPatient(req, res, { url: `${BASE_URL}/q/${token}`, expires: expires.toISOString().slice(0, 10) });
});

// ---------- Loading one assessment ("case") ----------

const parseJson = (text, fallback) => (text ? JSON.parse(text) : fallback);

// Loads an assessment only if its patient belongs to the logged-in clinician.
function loadCase(req) {
  const assessment = db
    .prepare(
      `SELECT a.* FROM assessments a JOIN patients p ON p.id = a.patient_id
        WHERE a.id = ? AND p.clinician_id = ? AND a.revoked = 0`
    )
    .get(Number(req.params.id), req.clinician.id);
  if (!assessment) return null;
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(assessment.patient_id);
  return {
    assessment,
    patient,
    answers: parseJson(assessment.answers_json, null),
    results: parseJson(assessment.results_json, null),
    intake: parseJson(assessment.intake_json, null),
    checklists: parseJson(assessment.checklists_json, {}),
    diagnoses: parseJson(assessment.diagnoses_json, { items: [], finalNote: '' }),
    interview: parseJson(assessment.interview_json, null),
    risk: parseJson(assessment.risk_json, null),
    informant: parseJson(assessment.informant_json, null),
    defaultLowEducation: defaultLowEducation(patient),
  };
}

function suggestionsFor(c) {
  return buildSuggestions({ answers: c.answers, results: c.results, patient: c.patient, intake: c.intake, interview: c.interview, informant: c.informant });
}

const notFound = (req, res) =>
  send(res, views.messagePage({ title: 'Not found', message: 'No such assessment.', clinician: req.clinician }), 404);

// Pages after the screening need a completed, not finalized assessment.
function editableCase(req, res) {
  // Always return null after sending a response, so callers can do
  // `if (!c) return;` (res.send() returns the response object, which is truthy).
  const c = loadCase(req);
  if (!c) {
    notFound(req, res);
    return null;
  }
  if (!c.assessment.completed_at) {
    res.redirect(`/clinician/assessments/${c.assessment.id}`);
    return null;
  }
  if (c.assessment.finalized_at) {
    send(res, views.messagePage({ title: 'Assessment finalized', message: 'A finalized assessment cannot be changed.', clinician: req.clinician }), 409);
    return null;
  }
  return c;
}

const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

clinician.get('/assessments/:id', (req, res) => {
  const c = loadCase(req);
  if (!c) return notFound(req, res);
  const suggestions = c.results ? suggestionsFor(c) : null;
  send(res, workflow.casePage({ clinician: req.clinician, c, suggestions }));
});

// ---------- On-site screening ----------

clinician.get('/assessments/:id/screening', (req, res) => {
  const c = loadCase(req);
  if (!c) return notFound(req, res);
  if (c.assessment.completed_at || c.assessment.mode !== 'onsite') return res.redirect(`/clinician/assessments/${c.assessment.id}`);
  send(res, views.questionnairePage({ action: `/clinician/assessments/${c.assessment.id}/screening`, clinician: req.clinician, patient: c.patient }));
});

clinician.post('/assessments/:id/screening', async (req, res) => {
  const c = loadCase(req);
  if (!c) return notFound(req, res);
  if (c.assessment.completed_at || c.assessment.mode !== 'onsite') return res.redirect(`/clinician/assessments/${c.assessment.id}`);
  const { answers, errors } = parseAnswers(req.body);
  if (errors.length) {
    return send(res, views.questionnairePage({
      action: `/clinician/assessments/${c.assessment.id}/screening`, clinician: req.clinician, patient: c.patient,
      error: 'Please answer every question before saving.',
    }), 400);
  }
  const done = completeScreening(c.assessment, c.patient, answers);
  if (!done) return res.redirect(`/clinician/assessments/${c.assessment.id}`);
  res.redirect(`/clinician/assessments/${c.assessment.id}`);
  emailResults(c.assessment, c.patient, done);
});

// ---------- Clinician intake (MoCA, delirium signs, notes) ----------

clinician.post('/assessments/:id/intake', (req, res) => {
  const c = editableCase(req, res);
  if (!c) return;
  const { intake, errors } = parseIntake(req.body);
  if (errors) {
    return send(res, workflow.casePage({ clinician: req.clinician, c, suggestions: suggestionsFor(c), errors }), 400);
  }
  db.prepare('UPDATE assessments SET intake_json = ? WHERE id = ?').run(JSON.stringify(intake), c.assessment.id);
  res.redirect(`/clinician/assessments/${c.assessment.id}`);
});

// ---------- Intake interview, informant, risk assessment ----------
// One pattern for all three forms: a page, a parser (clinical-forms.js) and
// the database column the result is saved in.

const FORMS = {
  interview: { page: workflow.interviewPage, parse: parseInterview, column: 'interview_json' },
  informant: { page: workflow.informantPage, parse: parseInformant, column: 'informant_json' },
  risk: { page: workflow.riskPage, parse: parseRisk, column: 'risk_json' },
};

for (const [name, form] of Object.entries(FORMS)) {
  clinician.get(`/assessments/:id/${name}`, (req, res) => {
    const c = loadCase(req);
    if (!c) return notFound(req, res);
    if (!c.assessment.completed_at) return res.redirect(`/clinician/assessments/${c.assessment.id}`);
    send(res, form.page({ clinician: req.clinician, c }));
  });

  clinician.post(`/assessments/:id/${name}`, (req, res) => {
    const c = editableCase(req, res);
    if (!c) return;
    const result = form.parse(req.body);
    if (result.errors) {
      return send(res, form.page({ clinician: req.clinician, c, errors: result.errors, values: req.body }), 400);
    }
    db.prepare(`UPDATE assessments SET ${form.column} = ? WHERE id = ?`).run(JSON.stringify(result[name]), c.assessment.id);
    res.redirect(`/clinician/assessments/${c.assessment.id}`);
  });
}

clinician.get('/assessments/:id/risk/plan', (req, res) => {
  const c = loadCase(req);
  if (!c) return notFound(req, res);
  if (!c.risk) return res.redirect(`/clinician/assessments/${c.assessment.id}/risk`);
  send(res, workflow.safetyPlanPage({ clinician: req.clinician, c }));
});

// ---------- In-depth criteria checklists ----------

function checklistDisorder(req) {
  return findDisorder(String(req.query.disorder ?? ''));
}

clinician.get('/assessments/:id/checklist', (req, res) => {
  const c = loadCase(req);
  if (!c) return notFound(req, res);
  if (!c.assessment.completed_at) return res.redirect(`/clinician/assessments/${c.assessment.id}`);
  const disorder = checklistDisorder(req);
  if (!disorder) return notFound(req, res);
  const suggestion = suggestionsFor(c).suggestions.find((s) => s.disorderId === disorder.id);
  send(res, workflow.checklistPage({ clinician: req.clinician, c, disorder, suggestion }));
});

clinician.post('/assessments/:id/checklist', (req, res) => {
  const c = editableCase(req, res);
  if (!c) return;
  const disorder = checklistDisorder(req);
  if (!disorder) return notFound(req, res);

  // Keep only known criteria and allowed values.
  const ratings = {};
  for (const id of criterionIds(disorder)) {
    if (RATINGS.includes(req.body[id])) ratings[id] = req.body[id];
  }
  const specifiers = {};
  for (const sp of disorder.specifiers) {
    const value = req.body[`spec_${sp.id}`];
    if (sp.options.some((o) => o.value === value)) specifiers[sp.id] = value;
  }
  c.checklists[disorder.id] = { ratings, specifiers, notes: String(req.body.notes ?? '').slice(0, 5000), updated_at: now() };
  db.prepare('UPDATE assessments SET checklists_json = ? WHERE id = ?').run(JSON.stringify(c.checklists), c.assessment.id);
  res.redirect(`/clinician/assessments/${c.assessment.id}/checklist?disorder=${disorder.id}`);
});

// ---------- Diagnoses and finalizing ----------

clinician.post('/assessments/:id/diagnoses', (req, res) => {
  const c = editableCase(req, res);
  if (!c) return;
  // The rules live in diagnosis.js so the browser demo uses the same ones.
  const result = applyDiagnosis(c, {
    disorderId: req.body.disorder,
    action: req.body.action,
    note: req.body.note,
    override: req.body.override,
  });
  if (result.error) {
    return send(res, workflow.casePage({ clinician: req.clinician, c, suggestions: suggestionsFor(c), errors: [result.error] }), 400);
  }
  db.prepare('UPDATE assessments SET diagnoses_json = ? WHERE id = ?').run(JSON.stringify(result.diagnoses), c.assessment.id);
  res.redirect(`/clinician/assessments/${c.assessment.id}`);
});

clinician.post('/assessments/:id/finalize', (req, res) => {
  const c = editableCase(req, res);
  if (!c) return;
  c.diagnoses.finalNote = String(req.body.final_note ?? '').slice(0, 5000);
  // e.g. a required suicide risk assessment is missing (clinical-forms.js)
  const blocker = finalizeBlocker(c);
  if (blocker) {
    return send(res, workflow.casePage({ clinician: req.clinician, c, suggestions: suggestionsFor(c), errors: [blocker] }), 400);
  }
  db.prepare('UPDATE assessments SET diagnoses_json = ?, finalized_at = ? WHERE id = ? AND finalized_at IS NULL').run(
    JSON.stringify(c.diagnoses), now(), c.assessment.id
  );
  res.redirect(`/clinician/assessments/${c.assessment.id}/final`);
});

clinician.get('/assessments/:id/final', (req, res) => {
  const c = loadCase(req);
  if (!c) return notFound(req, res);
  if (!c.assessment.finalized_at) return res.redirect(`/clinician/assessments/${c.assessment.id}`);
  send(res, workflow.finalReportPage({ clinician: req.clinician, c, suggestions: suggestionsFor(c) }));
});

// ---------- Scoring and emailing a finished screening ----------

// Scores the answers and saves them. Returns null if it was already saved
// (e.g. a double-click), so it is never saved or emailed twice.
function completeScreening(assessment, patient, answers) {
  const results = scoreAll(answers);
  // The differential uses the patient's recorded gender and age as well.
  results.differential = runDifferential(answers, patient, results);
  const completedAt = now();
  const saved = db
    .prepare(
      `UPDATE assessments SET completed_at = ?, answers_json = ?, results_json = ?
        WHERE id = ? AND completed_at IS NULL`
    )
    .run(completedAt, JSON.stringify(answers), JSON.stringify(results), assessment.id);
  if (saved.changes === 0) return null;
  return { answers, results, completedAt };
}

async function emailResults(assessment, patient, { answers, results, completedAt }) {
  const clinicianRow = db.prepare('SELECT email FROM clinicians WHERE id = ?').get(patient.clinician_id);
  let emailStatus;
  try {
    emailStatus = await sendResultsEmail({
      to: clinicianRow.email,
      patient,
      results,
      suggestions: buildSuggestions({ answers, results, patient, intake: null }),
      completedAt,
      reportUrl: `${BASE_URL}/clinician/assessments/${assessment.id}`,
    });
  } catch (err) {
    console.error('[email] failed:', err.message);
    emailStatus = `FAILED: ${err.message}`.slice(0, 200);
  }
  db.prepare('UPDATE assessments SET email_status = ? WHERE id = ?').run(emailStatus, assessment.id);
}

// ---------- Patient questionnaire (no login; the secret link is the key) ----------

function openAssessment(token) {
  const a = db.prepare('SELECT * FROM assessments WHERE token_hash = ?').get(hashToken(token));
  if (!a || a.revoked || a.completed_at || a.mode !== 'link' || new Date(a.expires_at) < new Date()) return null;
  return a;
}

const LINK_INVALID = {
  title: 'Link not valid',
  message: 'This link has expired, has already been used, or is not valid. Please contact your clinician for a new link.',
};

app.get('/q/:token', (req, res) => {
  if (!openAssessment(req.params.token)) return send(res, views.messagePage(LINK_INVALID), 404);
  send(res, views.questionnairePage({ action: `/q/${req.params.token}` }));
});

app.post('/q/:token', (req, res) => {
  const assessment = openAssessment(req.params.token);
  if (!assessment) return send(res, views.messagePage(LINK_INVALID), 404);

  const { answers, errors } = parseAnswers(req.body);
  if (errors.length) {
    return send(res, views.questionnairePage({ action: `/q/${req.params.token}`, error: 'Please answer every question before submitting.' }), 400);
  }

  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(assessment.patient_id);
  const done = completeScreening(assessment, patient, answers);
  if (!done) return send(res, views.messagePage(LINK_INVALID), 409);

  // Show the patient the thank-you page straight away; email in the background.
  send(res, views.thankYouPage({ safetyFlag: done.results.safetyFlag }));
  emailResults(assessment, patient, done);
});

// ---------- Start ----------

app.use((req, res) => send(res, views.messagePage({ title: 'Not found', message: 'This page does not exist.' }), 404));

app.use((err, req, res, next) => {
  console.error(err);
  send(res, views.messagePage({ title: 'Something went wrong', message: 'Please try again.' }), 500);
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Listening on ${BASE_URL}`));
}

export { app };
