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
import { parseAnswers, parsePartialAnswers, PAGES, parsePage, applySkips, firstOpenPage, isShown, TIREDNESS_BREAK_AT } from './questionnaire.js';
import { responseQuality } from './response-quality.js';
import { lang, STRINGS } from './i18n.js';
import { scoreAll } from './scoring.js';
import { runDifferential } from './differential.js';
import { sendResultsEmail, sendFollowupEmail } from './email.js';
import { parseFollowupAnswers, scoreFollowup } from './followup.js';
import * as views from './views.js';
import * as workflow from './views-workflow.js';
import { buildSuggestions } from './suggestions.js';
import { findDisorder, criterionIds } from './disorders.js';
import { RATINGS } from './criteria.js';
import { applyDiagnosis } from './diagnosis.js';
import { defaultLowEducation } from './moca.js';
import { parseIntake } from './intake.js';
import { audit, auditForPatient, ACTIONS } from './audit.js';
import { ACCESS_SQL, accessParams, accessOf, grantsFor, grantAccess, revokeAccess, ROLES } from './access.js';
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

// Loads a patient only if the logged-in clinician may see it: as the
// treating clinician, or with access granted by them (access.js). Anyone
// else gets null, which every route answers with "not found".
function accessiblePatient(req) {
  const patient = db
    .prepare(`SELECT p.* FROM patients p WHERE p.id = :id AND ${ACCESS_SQL}`)
    .get({ id: Number(req.params.id), ...accessParams(req.clinician.id) });
  if (patient) req.access = accessOf(req.clinician.id, patient);
  return patient;
}

// For actions only the treating clinician may take (grant access, delete).
function ownedPatient(req) {
  const patient = accessiblePatient(req);
  return patient && req.access.owner ? patient : null;
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
                        AND completed_at IS NULL AND revoked = 0 AND expires_at > :now) AS has_pending,
              p.clinician_id <> :me AS shared,
              (SELECT name FROM clinicians c WHERE c.id = p.clinician_id) AS owner_name
         FROM patients p
        WHERE ${ACCESS_SQL}
        ORDER BY p.last_name, p.first_name`
    )
    .all(accessParams(req.clinician.id));
  send(res, views.dashboardPage({ clinician: req.clinician, patients }));
});

clinician.get('/patients/new', (req, res) => send(res, views.newPatientPage({ clinician: req.clinician })));

// Checks the patient form. Used for both new and edited patients.
function validatePatient(body) {
  const values = {
    first_name: clean(body.first_name),
    last_name: clean(body.last_name),
    personal_number: clean(body.personal_number, 20),
    gender: clean(body.gender),
    age: clean(body.age, 3),
    education: clean(body.education),
    employed: clean(body.employed, 1),
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
  const record = [values.first_name, values.last_name, values.personal_number, values.gender, age, values.education, Number(values.employed)];
  return { values, errors, record };
}

clinician.post('/patients', (req, res) => {
  const { values, errors, record } = validatePatient(req.body);
  if (errors.length) return send(res, views.newPatientPage({ clinician: req.clinician, errors, values }), 400);
  const result = db
    .prepare(
      `INSERT INTO patients (clinician_id, first_name, last_name, personal_number, gender, age, education, employed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.clinician.id, ...record);
  audit(req.clinician.id, 'create_patient', { patientId: Number(result.lastInsertRowid) });
  res.redirect(`/clinician/patients/${result.lastInsertRowid}`);
});

clinician.get('/patients/:id/edit', (req, res) => {
  const patient = accessiblePatient(req);
  if (!patient) return send(res, views.messagePage({ title: 'Not found', message: 'No such patient.', clinician: req.clinician }), 404);
  send(res, views.newPatientPage({ clinician: req.clinician, patient, values: { ...patient, age: String(patient.age), employed: String(patient.employed) } }));
});

clinician.post('/patients/:id/edit', (req, res) => {
  const patient = accessiblePatient(req);
  if (!patient) return res.status(404).send('Not found');
  const { values, errors, record } = validatePatient(req.body);
  if (errors.length) return send(res, views.newPatientPage({ clinician: req.clinician, patient, errors, values }), 400);
  db.prepare(
    `UPDATE patients SET first_name = ?, last_name = ?, personal_number = ?, gender = ?, age = ?, education = ?, employed = ?
      WHERE id = ?`
  ).run(...record, patient.id);
  // Record which fields changed (names only, not the values themselves).
  const fields = ['first_name', 'last_name', 'personal_number', 'gender', 'age', 'education', 'employed'];
  const changed = fields.filter((f, i) => String(patient[f]) !== String(record[i]));
  audit(req.clinician.id, 'edit_patient', { patientId: patient.id, detail: changed.length ? `Changed: ${changed.join(', ')}` : 'No changes' });
  res.redirect(`/clinician/patients/${patient.id}`);
});

clinician.post('/patients/:id/delete', (req, res) => {
  const patient = ownedPatient(req);
  if (!patient) return res.status(404).send('Not found');
  // Typing the last name is a deliberate step against deleting by mistake.
  if (clean(req.body.confirm_last_name).toLowerCase() !== patient.last_name.toLowerCase()) {
    return showPatient(req, res, { errors: ['To delete, type the patient\u2019s last name exactly.'], status: 400 });
  }
  db.prepare('DELETE FROM followups WHERE patient_id = ?').run(patient.id);
  db.prepare('DELETE FROM assessments WHERE patient_id = ?').run(patient.id);
  db.prepare('DELETE FROM patient_access WHERE patient_id = ?').run(patient.id);
  db.prepare('DELETE FROM patients WHERE id = ? AND clinician_id = ?').run(patient.id, req.clinician.id);
  audit(req.clinician.id, 'delete_patient', { patientId: patient.id, detail: clean(req.body.reason, 300) || null });
  send(res, views.messagePage({ title: 'Patient deleted', message: 'The patient record and all assessments were deleted. The deletion is kept in the audit log.', clinician: req.clinician }));
});

clinician.post('/patients/:id/access', (req, res) => {
  const patient = ownedPatient(req);
  if (!patient) return send(res, views.messagePage({ title: 'Not allowed', message: 'Only the treating clinician can change who has access.', clinician: req.clinician }), 403);
  const result = req.body.action === 'revoke'
    ? revokeAccess({ patient, ownerId: req.clinician.id, grantId: req.body.grant })
    : grantAccess({ patient, ownerId: req.clinician.id, email: req.body.email, role: req.body.role, until: req.body.until, reason: req.body.reason });
  if (result.error) return showPatient(req, res, { errors: [result.error], status: 400 });
  audit(req.clinician.id, req.body.action === 'revoke' ? 'revoke_access' : 'grant_access', {
    patientId: patient.id,
    detail: req.body.action === 'revoke' ? `Access #${req.body.grant}` : `${result.grant.name} as ${ROLES[result.grant.role]}${result.grant.expires ? ` until ${result.grant.expires.slice(0, 10)}` : ''}: ${clean(req.body.reason, 300)}`,
  });
  res.redirect(`/clinician/patients/${patient.id}`);
});

clinician.get('/patients/:id/audit', (req, res) => {
  const patient = accessiblePatient(req);
  if (!patient) return send(res, views.messagePage({ title: 'Not found', message: 'No such patient.', clinician: req.clinician }), 404);
  audit(req.clinician.id, 'view_audit', { patientId: patient.id });
  send(res, views.auditPage({ clinician: req.clinician, patient, entries: auditForPatient(patient.id), actions: ACTIONS }));
});

function ownerOf(patient) {
  return db.prepare('SELECT name, email FROM clinicians WHERE id = ?').get(patient.clinician_id);
}

function followupsOf(patientId) {
  return db.prepare('SELECT * FROM followups WHERE patient_id = ? ORDER BY id DESC').all(patientId);
}

// Draws the patient page. options: { newLink, followupLink, errors, status }
function showPatient(req, res, { newLink = null, followupLink = null, errors = [], status = 200 } = {}) {
  const patient = accessiblePatient(req);
  if (!patient) return send(res, views.messagePage({ title: 'Not found', message: 'No such patient.', clinician: req.clinician }), 404);
  const assessments = db
    .prepare('SELECT * FROM assessments WHERE patient_id = ? ORDER BY created_at DESC, id DESC')
    .all(patient.id);
  audit(req.clinician.id, 'view_patient', { patientId: patient.id });
  send(res, views.patientPage({
    clinician: req.clinician, patient, assessments, newLink, followupLink, followups: followupsOf(patient.id), errors,
    access: req.access, grants: req.access.owner ? grantsFor(patient.id) : [], owner: ownerOf(patient),
  }), status);
}

clinician.get('/patients/:id', (req, res) => showPatient(req, res));

// ---------- Starting an assessment: link or on site ----------

clinician.post('/patients/:id/assessments', (req, res) => {
  const patient = accessiblePatient(req);
  if (!patient) return res.status(404).send('Not found');
  const mode = req.body.mode === 'onsite' ? 'onsite' : 'link';
  const language = lang(req.body.language);

  // Only one open assessment per patient: cancel any not yet started.
  db.prepare('UPDATE assessments SET revoked = 1 WHERE patient_id = ? AND completed_at IS NULL').run(patient.id);

  // Every assessment gets a random token. For on-site assessments it is never
  // shown, so the questionnaire can only be answered in the clinician portal.
  const token = newToken();
  const expires = new Date(Date.now() + LINK_VALID_DAYS * 24 * 3600 * 1000);
  const result = db
    .prepare('INSERT INTO assessments (patient_id, token_hash, expires_at, mode, language) VALUES (?, ?, ?, ?, ?)')
    .run(patient.id, hashToken(token), expires.toISOString(), mode, language);

  audit(req.clinician.id, 'start_assessment', { patientId: patient.id, assessmentId: Number(result.lastInsertRowid), detail: `${mode}, ${language}` });
  if (mode === 'onsite') return res.redirect(`/clinician/assessments/${result.lastInsertRowid}/screening`);
  showPatient(req, res, { newLink: { url: `${BASE_URL}/q/${token}`, expires: expires.toISOString().slice(0, 10) } });
});

// ---------- Loading one assessment ("case") ----------

const parseJson = (text, fallback) => (text ? JSON.parse(text) : fallback);

// Loads an assessment only if the logged-in clinician may see its patient.
function loadCase(req) {
  const assessment = db
    .prepare(
      `SELECT a.* FROM assessments a JOIN patients p ON p.id = a.patient_id
        WHERE a.id = :id AND a.revoked = 0 AND ${ACCESS_SQL}`
    )
    .get({ id: Number(req.params.id), ...accessParams(req.clinician.id) });
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
    amendments: parseJson(assessment.amendments_json, []),
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

const auditCase = (req, c, action, detail) =>
  audit(req.clinician.id, action, { patientId: c.patient.id, assessmentId: c.assessment.id, detail });

clinician.get('/assessments/:id', (req, res) => {
  const c = loadCase(req);
  if (!c) return notFound(req, res);
  const suggestions = c.results ? suggestionsFor(c) : null;
  auditCase(req, c, 'view_assessment');
  send(res, workflow.casePage({ clinician: req.clinician, c, suggestions }));
});

// ---------- On-site screening ----------

// ---------- The questionnaire, one part per page ----------
// Used for both the patient link (/q/...) and on-site screening. Each page
// saves its answers into the draft and records timing for the
// response-quality check (response-quality.js).

const emptyMeta = () => ({ pages: {}, tiredness: [], contradictions: [] });

function pageIndexFrom(req, draft) {
  const n = Number(req.query.page);
  return Number.isInteger(n) && n >= 0 && n < PAGES.length ? n : firstOpenPage(draft);
}

function saveProgress(assessmentId, draft, meta) {
  db.prepare('UPDATE assessments SET draft_json = ?, meta_json = ? WHERE id = ? AND completed_at IS NULL').run(
    JSON.stringify(draft), JSON.stringify(meta), assessmentId
  );
}

// Records that a page was shown (the start time for the speed check).
function markShown(assessment, pageIndex) {
  const meta = parseJson(assessment.meta_json, emptyMeta());
  meta.pages[PAGES[pageIndex].part] = { ...meta.pages[PAGES[pageIndex].part], shown: Date.now() };
  db.prepare('UPDATE assessments SET meta_json = ? WHERE id = ? AND completed_at IS NULL').run(JSON.stringify(meta), assessment.id);
}

// Handles one submitted page. Returns what to do next:
//   { saved } | { back } | { redisplay: { missing, error } } | { breakAfter: nextIndex } | { next: index } | { done }
function handlePage(assessment, patient, pageIndex, body, language) {
  const draft = parseJson(assessment.draft_json, {});
  const meta = parseJson(assessment.meta_json, emptyMeta());
  const page = PAGES[pageIndex];
  const { answers, missing, contradictions } = parsePage(pageIndex, body, draft);

  // Keep every contradiction seen (a later page cannot "undo" it).
  for (const c of contradictions) {
    if (!meta.contradictions.some((x) => x.child === c.child)) meta.contradictions.push(c);
  }
  const tired = Number(body.tired);
  if (page.tiredness && body.tired !== undefined && body.tired !== '' && Number.isInteger(tired) && tired >= 0 && tired <= 10) {
    meta.tiredness = meta.tiredness.filter((t) => t.part !== page.part).concat({ part: page.part, value: tired, at: Date.now() });
  }
  saveProgress(assessment.id, answers, meta);

  if (body.intent === 'save' || body.intent === 'stop') return { saved: true };
  if (body.intent === 'back') return { back: Math.max(0, pageIndex - 1) };
  if (missing.length) return { redisplay: { missing, error: STRINGS[language].pageMissing(missing.length), answers } };

  const shownOnPage = page.items.filter((item) => isShown(item, answers)).length;
  meta.pages[page.part] = { ...meta.pages[page.part], submitted: Date.now(), answered: shownOnPage };
  saveProgress(assessment.id, answers, meta);

  if (pageIndex < PAGES.length - 1) {
    const last = meta.tiredness.find((t) => t.part === page.part);
    if (page.tiredness && last && last.value >= TIREDNESS_BREAK_AT && body.intent !== 'continue') return { breakAfter: pageIndex + 1 };
    return { next: pageIndex + 1 };
  }

  // Last page: everything must be answered (skipped questions are filled in).
  const full = applySkips(answers).answers;
  const { answers: complete, errors } = parseAnswers(full);
  if (errors.length) {
    const first = firstOpenPage(full);
    return { redisplay: { pageIndex: first, missing: errors, error: STRINGS[language].pageMissing(errors.length), answers: full } };
  }
  const done = completeScreening(assessment, patient, complete, meta);
  return done ? { done } : { saved: true };
}

function onsitePage(req, c, extra = {}) {
  const draft = parseJson(c.assessment.draft_json, {});
  return views.questionnairePage({
    action: `/clinician/assessments/${c.assessment.id}/screening`,
    clinician: req.clinician,
    patient: c.patient,
    language: c.assessment.language,
    answers: draft,
    pageIndex: pageIndexFrom(req, draft),
    consentDone: Boolean(c.assessment.consent_at),
    ...extra,
  });
}

clinician.get('/assessments/:id/screening', (req, res) => {
  const c = loadCase(req);
  if (!c) return notFound(req, res);
  if (c.assessment.completed_at || c.assessment.mode !== 'onsite') return res.redirect(`/clinician/assessments/${c.assessment.id}`);
  markShown(c.assessment, pageIndexFrom(req, parseJson(c.assessment.draft_json, {})));
  send(res, onsitePage(req, c));
});

clinician.post('/assessments/:id/screening', (req, res) => {
  const c = loadCase(req);
  if (!c) return notFound(req, res);
  if (c.assessment.completed_at || c.assessment.mode !== 'onsite') return res.redirect(`/clinician/assessments/${c.assessment.id}`);
  const url = `/clinician/assessments/${c.assessment.id}/screening`;
  const pageIndex = pageIndexFrom(req, parseJson(c.assessment.draft_json, {}));

  // The clinician confirms on the first page that the patient was informed.
  const moving = !['save', 'back'].includes(req.body.intent);
  if (!c.assessment.consent_at && pageIndex === 0 && moving) {
    if (req.body.consent_given !== 'yes') {
      return send(res, onsitePage(req, c, { answers: parsePartialAnswers(req.body), error: 'Confirm that the patient has been given the information.' }), 400);
    }
    db.prepare('UPDATE assessments SET consent_at = ? WHERE id = ?').run(now(), c.assessment.id);
    c.assessment.consent_at = now();
  }
  if (!c.assessment.consent_at && moving) return res.redirect(`${url}?page=0`);

  const step = handlePage(c.assessment, c.patient, pageIndex, req.body, lang(c.assessment.language));
  if (step.saved) return res.redirect(`/clinician/assessments/${c.assessment.id}`);
  if (step.back !== undefined) return res.redirect(`${url}?page=${step.back}`);
  if (step.redisplay) {
    const { pageIndex: at = pageIndex, ...rest } = step.redisplay;
    return send(res, onsitePage(req, c, { ...rest, pageIndex: at, consentDone: true }), 400);
  }
  if (step.next !== undefined || step.breakAfter !== undefined) return res.redirect(`${url}?page=${step.next ?? step.breakAfter}`);
  auditCase(req, c, 'save_screening');
  res.redirect(`/clinician/assessments/${c.assessment.id}`);
  emailResults(c.assessment, c.patient, step.done);
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
  auditCase(req, c, 'save_intake');
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
    auditCase(req, c, `view_${name}`);
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
    auditCase(req, c, `save_${name}`);
    res.redirect(`/clinician/assessments/${c.assessment.id}`);
  });
}

clinician.get('/assessments/:id/risk/plan', (req, res) => {
  const c = loadCase(req);
  if (!c) return notFound(req, res);
  if (!c.risk) return res.redirect(`/clinician/assessments/${c.assessment.id}/risk`);
  auditCase(req, c, 'view_safety_plan');
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
  auditCase(req, c, 'save_checklist', disorder.name);
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
  auditCase(req, c, 'diagnosis', `${req.body.action} ${req.body.disorder}`);
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
  auditCase(req, c, 'finalize');
  res.redirect(`/clinician/assessments/${c.assessment.id}/final`);
});

// Reopening a finalized assessment needs a reason. The diagnoses as they were
// are kept in the amendment history, and the final report shows it.
clinician.post('/assessments/:id/reopen', (req, res) => {
  const c = loadCase(req);
  if (!c) return notFound(req, res);
  if (!c.assessment.finalized_at) return res.redirect(`/clinician/assessments/${c.assessment.id}`);
  const reason = clean(req.body.reason, 1000);
  if (!reason) {
    return send(res, workflow.casePage({ clinician: req.clinician, c, suggestions: suggestionsFor(c), errors: ['Write why the assessment is reopened.'] }), 400);
  }
  c.amendments.push({
    reopened_at: now(),
    by: req.clinician.name,
    reason,
    previously_finalized_at: c.assessment.finalized_at,
    diagnoses_before: c.diagnoses.items.map((d) => `${d.code} ${d.name}`),
  });
  db.prepare('UPDATE assessments SET finalized_at = NULL, amendments_json = ? WHERE id = ?').run(JSON.stringify(c.amendments), c.assessment.id);
  auditCase(req, c, 'reopen', reason);
  res.redirect(`/clinician/assessments/${c.assessment.id}`);
});

clinician.get('/assessments/:id/final', (req, res) => {
  const c = loadCase(req);
  if (!c) return notFound(req, res);
  if (!c.assessment.finalized_at) return res.redirect(`/clinician/assessments/${c.assessment.id}`);
  auditCase(req, c, 'view_final');
  send(res, workflow.finalReportPage({ clinician: req.clinician, c, suggestions: suggestionsFor(c) }));
});

// ---------- Scoring and emailing a finished screening ----------

// Scores the answers and saves them. Returns null if it was already saved
// (e.g. a double-click), so it is never saved or emailed twice.
function completeScreening(assessment, patient, answers, meta = emptyMeta()) {
  const results = scoreAll(answers);
  // The differential uses the patient's recorded gender and age as well.
  results.differential = runDifferential(answers, patient, results);
  // Signs of tired or careless answering (never changes the scores).
  results.quality = responseQuality(answers, meta, assessment.mode);
  const completedAt = now();
  const saved = db
    .prepare(
      `UPDATE assessments SET completed_at = ?, answers_json = ?, results_json = ?, draft_json = NULL, meta_json = ?
        WHERE id = ? AND completed_at IS NULL`
    )
    .run(completedAt, JSON.stringify(answers), JSON.stringify(results), JSON.stringify(meta), assessment.id);
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

// ---------- Follow-up measurements (PHQ-9 + GAD-7) ----------

clinician.post('/patients/:id/followups', (req, res) => {
  const patient = accessiblePatient(req);
  if (!patient) return res.status(404).send('Not found');
  const mode = req.body.mode === 'onsite' ? 'onsite' : 'link';
  const language = lang(req.body.language);
  const token = newToken();
  const expires = new Date(Date.now() + LINK_VALID_DAYS * 24 * 3600 * 1000);
  const result = db
    .prepare('INSERT INTO followups (patient_id, token_hash, expires_at, mode, language) VALUES (?, ?, ?, ?, ?)')
    .run(patient.id, hashToken(token), expires.toISOString(), mode, language);
  audit(req.clinician.id, 'start_followup', { patientId: patient.id, detail: `${mode}, ${language}` });
  if (mode === 'onsite') return res.redirect(`/clinician/followups/${result.lastInsertRowid}`);

  showPatient(req, res, { followupLink: { url: `${BASE_URL}/f/${token}`, expires: expires.toISOString().slice(0, 10) } });
});

function ownFollowup(req) {
  return db
    .prepare(
      `SELECT f.* FROM followups f JOIN patients p ON p.id = f.patient_id
        WHERE f.id = :id AND f.revoked = 0 AND ${ACCESS_SQL}`
    )
    .get({ id: Number(req.params.id), ...accessParams(req.clinician.id) });
}

// Scores and saves a follow-up once; emails the clinician in the background.
function completeFollowup(followup, answers) {
  const result = scoreFollowup(answers);
  const completedAt = now();
  const saved = db
    .prepare('UPDATE followups SET completed_at = ?, answers_json = ?, results_json = ? WHERE id = ? AND completed_at IS NULL')
    .run(completedAt, JSON.stringify(answers), JSON.stringify(result), followup.id);
  if (saved.changes === 0) return null;
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(followup.patient_id);
  const to = db.prepare('SELECT email FROM clinicians WHERE id = ?').get(patient.clinician_id).email;
  sendFollowupEmail({ to, patient, result, completedAt, patientUrl: `${BASE_URL}/clinician/patients/${patient.id}` })
    .catch((err) => console.error('[email] follow-up failed:', err.message));
  return result;
}

clinician.get('/followups/:id', (req, res) => {
  const f = ownFollowup(req);
  if (!f || f.completed_at || f.mode !== 'onsite') return res.redirect('/clinician');
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(f.patient_id);
  audit(req.clinician.id, 'view_followup', { patientId: patient.id });
  send(res, views.followupPage({ action: `/clinician/followups/${f.id}`, clinician: req.clinician, patient, language: lang(f.language) }));
});

clinician.post('/followups/:id', (req, res) => {
  const f = ownFollowup(req);
  if (!f || f.completed_at || f.mode !== 'onsite') return res.redirect('/clinician');
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(f.patient_id);
  const { answers, errors } = parseFollowupAnswers(req.body);
  if (errors.length) {
    return send(res, views.followupPage({
      action: `/clinician/followups/${f.id}`, clinician: req.clinician, patient, language: lang(f.language),
      answers: parsePartialAnswers(req.body), error: `${errors.length} questions are not answered yet.`,
    }), 400);
  }
  completeFollowup(f, answers);
  res.redirect(`/clinician/patients/${patient.id}`);
});

function openFollowup(token) {
  const f = db.prepare('SELECT * FROM followups WHERE token_hash = ?').get(hashToken(token));
  if (!f || f.revoked || f.completed_at || f.mode !== 'link' || new Date(f.expires_at) < new Date()) return null;
  return f;
}

app.get('/f/:token', (req, res) => {
  const f = openFollowup(req.params.token);
  if (!f) return send(res, views.linkInvalidPage({}), 404);
  const wanted = req.query.lang;
  if (wanted && lang(wanted) === wanted) {
    db.prepare('UPDATE followups SET language = ? WHERE id = ?').run(wanted, f.id);
    f.language = wanted;
  }
  const url = `/f/${req.params.token}`;
  send(res, views.followupPage({ action: url, language: lang(f.language), switchUrl: url }));
});

app.post('/f/:token', (req, res) => {
  const f = openFollowup(req.params.token);
  if (!f) return send(res, views.linkInvalidPage({}), 404);
  const language = lang(f.language);
  const url = `/f/${req.params.token}`;
  const { answers, errors } = parseFollowupAnswers(req.body);
  if (errors.length) {
    return send(res, views.followupPage({ action: url, language, switchUrl: url, answers: parsePartialAnswers(req.body), error: STRINGS[language].missing(errors.length) }), 400);
  }
  const result = completeFollowup(f, answers);
  if (!result) return send(res, views.linkInvalidPage({ language }), 409);
  send(res, views.thankYouPage({ safetyFlag: result.safetyFlag, language }));
});

// ---------- Patient questionnaire (no login; the secret link is the key) ----------

function openAssessment(token) {
  const a = db.prepare('SELECT * FROM assessments WHERE token_hash = ?').get(hashToken(token));
  if (!a || a.revoked || a.completed_at || a.mode !== 'link' || new Date(a.expires_at) < new Date()) return null;
  return a;
}

// The patient's language: ?lang=sv switches it and remembers the choice.
function patientLanguage(req, assessment) {
  const wanted = req.query.lang;
  if (wanted && lang(wanted) === wanted && wanted !== assessment.language) {
    db.prepare('UPDATE assessments SET language = ? WHERE id = ?').run(wanted, assessment.id);
    assessment.language = wanted;
  }
  return lang(assessment.language);
}

const invalidLink = (res) => send(res, views.linkInvalidPage({}), 404);

app.get('/q/:token', (req, res) => {
  const assessment = openAssessment(req.params.token);
  if (!assessment) return invalidLink(res);
  const language = patientLanguage(req, assessment);
  const url = `/q/${req.params.token}`;
  if (!assessment.consent_at) return send(res, views.consentPage({ action: `${url}/consent`, language, switchUrl: url }));
  const draft = parseJson(assessment.draft_json, {});
  const pageIndex = pageIndexFrom(req, draft);
  markShown(assessment, pageIndex);
  send(res, views.questionnairePage({ action: url, pageIndex, language, switchUrl: url, answers: draft }));
});

app.post('/q/:token/consent', (req, res) => {
  const assessment = openAssessment(req.params.token);
  if (!assessment) return invalidLink(res);
  const url = `/q/${req.params.token}`;
  if (req.body.agree !== 'yes') {
    const language = lang(assessment.language);
    return send(res, views.consentPage({ action: `${url}/consent`, language, switchUrl: url, error: STRINGS[language].consentNeeded }), 400);
  }
  db.prepare('UPDATE assessments SET consent_at = ? WHERE id = ? AND consent_at IS NULL').run(now(), assessment.id);
  res.redirect(url);
});

app.post('/q/:token', (req, res) => {
  const assessment = openAssessment(req.params.token);
  if (!assessment) return invalidLink(res);
  const url = `/q/${req.params.token}`;
  if (!assessment.consent_at) return res.redirect(url);
  const language = lang(assessment.language);
  const pageIndex = pageIndexFrom(req, parseJson(assessment.draft_json, {}));
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(assessment.patient_id);

  const step = handlePage(assessment, patient, pageIndex, req.body, language);
  if (step.saved) return send(res, views.savedPage({ language, expires: assessment.expires_at.slice(0, 10) }));
  if (step.back !== undefined) return res.redirect(`${url}?page=${step.back}`);
  if (step.redisplay) {
    const { pageIndex: at = pageIndex, ...rest } = step.redisplay;
    return send(res, views.questionnairePage({ action: url, pageIndex: at, language, switchUrl: url, ...rest }), 400);
  }
  if (step.breakAfter !== undefined) {
    return send(res, views.breakPage({ language, continueUrl: `${url}?page=${step.breakAfter}`, stopAction: `${url}?page=${step.breakAfter}` }));
  }
  if (step.next !== undefined) return res.redirect(`${url}?page=${step.next}`);

  // Show the patient the thank-you page straight away; email in the background.
  send(res, views.thankYouPage({ safetyFlag: step.done.results.safetyFlag, language }));
  emailResults(assessment, patient, step.done);
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
