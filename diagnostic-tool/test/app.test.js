// End-to-end test: runs the real server against a temporary in-memory
// database and walks through the whole clinician -> patient -> email flow.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { answers as makeAnswers } from './helpers.js';
import { findDisorder, criterionIds } from '../src/disorders.js';

process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
delete process.env.SMTP_HOST; // emails go to outbox/

const { app } = await import('../src/server.js');
const { db } = await import('../src/db.js');
const { hashPassword } = await import('../src/auth.js');

let server;
let base;

before(async () => {
  rmSync('outbox', { recursive: true, force: true });
  db.prepare('INSERT INTO clinicians (name, email, password_hash) VALUES (?, ?, ?)').run(
    'Dr Test',
    'dr@example.com',
    hashPassword('correct horse battery')
  );
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const post = (path, fields, cookie) =>
  fetch(base + path, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie } : {}) },
    // Arrays are sent as repeated keys (family=a&family=b), like a browser's checkboxes.
    body: new URLSearchParams(Object.entries(fields).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]]))),
  });

// Answers the questionnaire one page at a time (10 pages), like a patient
// clicking "Next". Each page only takes its own questions from `fields`.
async function answerPages(path, fields, cookie) {
  let res;
  for (let page = 0; page < 10; page++) res = await post(`${path}?page=${page}`, fields, cookie);
  return res;
}

test('clinician pages require login', async () => {
  const res = await fetch(`${base}/clinician`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/login');
});

test('wrong password is rejected', async () => {
  const res = await post('/login', { email: 'dr@example.com', password: 'nope' });
  assert.equal(res.status, 401);
});

test('full flow: add patient, send link, patient answers, clinician gets email and report', async () => {
  // 1. Log in
  const login = await post('/login', { email: 'dr@example.com', password: 'correct horse battery' });
  assert.equal(login.status, 302);
  const cookie = login.headers.get('set-cookie').split(';')[0];

  // 2. Add a patient (name contains HTML to check it gets escaped)
  const created = await post(
    '/clinician/patients',
    {
      first_name: 'Ada<script>',
      last_name: 'Lovelace',
      personal_number: '19900101-1234',
      gender: 'Female',
      age: '34',
      education: 'Upper secondary school',
      employed: '1',
    },
    cookie
  );
  assert.equal(created.status, 302);
  const patientPath = created.headers.get('location');

  const patientHtml = await (await fetch(base + patientPath, { headers: { cookie } })).text();
  assert.ok(patientHtml.includes('Ada&lt;script&gt;'), 'name must be HTML-escaped');
  assert.ok(!patientHtml.includes('Ada<script>'));

  // 3. Create a questionnaire link
  const linkPage = await (await post(`${patientPath}/assessments`, { mode: 'link' }, cookie)).text();
  const link = linkPage.match(/value="(http[^"]+\/q\/[^"]+)"/)[1];
  const qPath = new URL(link).pathname;

  // 4. Patient opens the link (no cookie) and submits
  const form = await fetch(base + qPath);
  assert.equal(form.status, 200);

  const answers = makeAnswers({
    phq1: 2, phq2: 3, phq3: 2, phq4: 2, phq5: 0, phq6: 2, phq7: 1, phq8: 0, phq9: 1, phqDifficulty: 2,
    gad1: 2, gad2: 2, gad3: 2, gad4: 1, gad5: 0, gad6: 1, gad7: 2, gadDifficulty: 1,
    gadA: 1, gadB: 1, gadC1: 1, gadC2: 1, gadC3: 1, gadC4: 0, gadC5: 0, gadC6: 1,
    // Differential items: past elevated mood with reduced sleep -> bipolar flag
    bp1: 1, bp2: 1, bp3: 0, auditc1: 3, auditc2: 1, auditc3: 1, ptsd0: 1, ptsd1: 1, ptsd3: 1, ptsd4: 1,
  });
  // Answers are refused until the information page is confirmed
  assert.equal((await post(qPath, answers)).status, 302);
  assert.ok((await (await fetch(base + qPath)).text()).includes('Before you start'));
  assert.equal((await post(`${qPath}/consent`, {})).status, 400);
  assert.equal((await post(`${qPath}/consent`, { agree: 'yes' })).status, 302);

  const submit = await answerPages(qPath, answers);
  assert.equal(submit.status, 200);
  const thanks = await submit.text();
  assert.ok(thanks.includes('112'), 'safety answer shows crisis info to the patient');

  // 5. The link cannot be used twice
  assert.equal((await fetch(base + qPath)).status, 404);

  // 6. Email was produced (outbox, since SMTP is not configured)
  await new Promise((r) => setTimeout(r, 100));
  const files = readdirSync('outbox');
  assert.equal(files.length, 1);
  const email = readFileSync(`outbox/${files[0]}`, 'utf8');
  assert.ok(email.startsWith('To: dr@example.com'));
  // Item 9 answered and bipolar screen positive: urgent, but no health data or identity in the email
  assert.match(email, /Subject: URGENT: Intake screening results need review today \(#\d+\)/);
  assert.match(email, /Log in to see the results: http:\/\/localhost:3000\/clinician\/assessments\/\d+/);
  for (const secret of ['Lovelace', 'Ada', '1234', 'PHQ', 'Bipolar', 'suicid', 'depress']) {
    assert.ok(!email.toLowerCase().includes(secret.toLowerCase()), `email must not contain "${secret}"`);
  }

  // 7. Clinician sees the report
  const patientAfter = await (await fetch(base + patientPath, { headers: { cookie } })).text();
  const reportPath = patientAfter.match(/href="(\/clinician\/assessments\/\d+)"/)[1];
  const report = await (await fetch(base + reportPath, { headers: { cookie } })).text();
  assert.ok(report.includes('Safety alert'));
  assert.ok(report.includes('PHQ-9 total: <strong>13/27</strong>'));
  assert.ok(report.includes('Differential diagnosis screening'));
  assert.ok(report.includes('Priority:</strong> screen positive for Bipolar I or II disorder'));
  // Suggestions from the screening, in the portal and in the email
  assert.ok(report.includes('6. In-depth assessment'));
  assert.ok(report.includes('Required before finalizing'), 'item 9 answered: risk assessment required');
  assert.ok(report.includes('checklist?disorder=bipolar1'));
  // AUDIT-C 3+1+1 = 5, recorded gender Female -> cut-off 3 -> positive (in the app, not the email)
  assert.ok(report.includes('AUDIT-C = 5/12 (cut-off 3 for recorded gender &quot;Female&quot;)'));
  assert.ok(report.includes('PC-PTSD-5 score 3/5'));
});

test('a clinician cannot see another clinician\'s patient', async () => {
  db.prepare('INSERT INTO clinicians (name, email, password_hash) VALUES (?, ?, ?)').run(
    'Dr Other',
    'other@example.com',
    hashPassword('another long password')
  );
  const login = await post('/login', { email: 'other@example.com', password: 'another long password' });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const res = await fetch(`${base}/clinician/patients/1`, { headers: { cookie } });
  assert.equal(res.status, 404);
});

test('posts from another website are blocked', async () => {
  const res = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://evil.example' },
    body: 'email=a&password=b',
  });
  assert.equal(res.status, 403);
});

test('on-site flow: screening, MoCA, checklist, diagnosis, final report', async () => {
  const login = await post('/login', { email: 'dr@example.com', password: 'correct horse battery' });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const created = await post('/clinician/patients', {
    first_name: 'Bo', last_name: 'Berg', personal_number: '19500101-0000', gender: 'Male',
    age: '75', education: 'Primary / compulsory school', employed: '0',
  }, cookie);
  const patientPath = created.headers.get('location');

  // Start on site: goes straight to the screening form, no link shown
  const start = await post(`${patientPath}/assessments`, { mode: 'onsite' }, cookie);
  assert.equal(start.status, 302);
  const screeningPath = start.headers.get('location');
  assert.match(screeningPath, /^\/clinician\/assessments\/\d+\/screening$/);
  const casePath = screeningPath.replace('/screening', '');
  const form = await (await fetch(base + screeningPath, { headers: { cookie } })).text();
  assert.ok(form.includes('On-site screening'));

  // The screening form needs a login
  assert.equal((await fetch(base + screeningPath, { redirect: 'manual' })).status, 302);

  // Clinician records the answers: depression + memory complaint
  assert.equal((await post(screeningPath, makeAnswers({ phq1: 2 }), cookie)).status, 400, 'patient information must be confirmed');
  const saved = await answerPages(screeningPath, { ...makeAnswers({ phq1: 2, phq2: 2, phq3: 2, phq4: 2, phq7: 3, phq6: 2, cog1: 1, cog2: 1 }), consent_given: 'yes' }, cookie);
  assert.equal(saved.status, 302);
  assert.equal(saved.headers.get('location'), casePath);

  let page = await (await fetch(base + casePath, { headers: { cookie } })).text();
  assert.ok(page.includes('checklist?disorder=mdd'), 'MDD suggested');
  assert.ok(page.includes('Give the MoCA'), 'asks for MoCA before it is given');

  // MoCA 20 raw + 1 education point = 21 -> mild range
  const moca = { moca_administered: 'yes', moca_visexec: '3', moca_naming: '3', moca_attention: '4', moca_language: '2',
    moca_abstraction: '1', moca_recall: '1', moca_orientation: '6', moca_low_education: 'yes' };
  assert.equal((await post(`${casePath}/intake`, { ...moca, moca_visexec: '9' }, cookie)).status, 400, 'invalid score rejected');
  assert.equal((await post(`${casePath}/intake`, moca, cookie)).status, 302);
  page = await (await fetch(base + casePath, { headers: { cookie } })).text();
  assert.ok(page.includes('<strong>21/30</strong>'));
  assert.ok(page.includes('checklist?disorder=major_ncd'), 'major NCD suggested (MoCA low + daily life affected)');

  // Confirming before assessing is refused
  assert.equal((await post(`${casePath}/diagnoses`, { disorder: 'mdd', action: 'confirm' }, cookie)).status, 400);

  // MDD checklist: all criteria present, recurrent, moderate
  const mddRatings = Object.fromEntries(
    ['mdd_a1', 'mdd_a2', 'mdd_a3', 'mdd_a4', 'mdd_a6', 'mdd_a7', 'mdd_a8', 'mdd_b', 'mdd_c', 'mdd_d', 'mdd_e'].map((id) => [id, 'present'])
  );
  await post(`${casePath}/checklist?disorder=mdd`, { ...mddRatings, spec_episode: 'recurrent', spec_severity: 'moderate', spec_psychotic: 'no' }, cookie);
  const checklist = await (await fetch(`${base}${casePath}/checklist?disorder=mdd`, { headers: { cookie } })).text();
  assert.ok(checklist.includes('Criteria met'));
  assert.ok(checklist.includes('F33.1'));

  // Major NCD checklist partly rated: incomplete; confirming needs a note
  await post(`${casePath}/checklist?disorder=major_ncd`, { mncd_a1: 'present', mncd_a2: 'unclear' }, cookie);
  assert.equal((await post(`${casePath}/diagnoses`, { disorder: 'major_ncd', action: 'confirm', note: '' }, cookie)).status, 400);

  // Confirm MDD and finalize
  assert.equal((await post(`${casePath}/diagnoses`, { disorder: 'mdd', action: 'confirm', note: '' }, cookie)).status, 302);

  // Checklist page shows what to rule out
  const mddPage = await (await fetch(`${base}${casePath}/checklist?disorder=mdd`, { headers: { cookie } })).text();
  assert.ok(mddPage.includes('Differential diagnosis: rule out'));
  assert.ok(mddPage.includes('checklist?disorder=bipolar1'));

  // Bipolar I together with MDD: refused without a reason, accepted with one
  const bp1 = Object.fromEntries(criterionIds(findDisorder('bipolar1')).map((id) => [id, 'present']));
  await post(`${casePath}/checklist?disorder=bipolar1`, bp1, cookie);
  assert.equal((await post(`${casePath}/diagnoses`, { disorder: 'bipolar1', action: 'confirm' }, cookie)).status, 400);
  assert.equal((await post(`${casePath}/diagnoses`, { disorder: 'bipolar1', action: 'confirm', override: 'Testing the override.' }, cookie)).status, 302);
  // Finalizing needs the intake interview first
  assert.equal((await post(`${casePath}/finalize`, { final_note: 'x' }, cookie)).status, 400);
  assert.equal((await post(`${casePath}/interview`, {}, cookie)).status, 400, 'reason is required');
  const iv = await post(`${casePath}/interview`, { reason: 'Low mood and forgetfulness', family: ['depression', 'dementia'], mse_orientation: 'oriented', prev_attempt: 'none' }, cookie);
  assert.equal(iv.status, 302);
  // Informant: refused without consent, saved with it
  assert.equal((await post(`${casePath}/informant`, { inf_name: 'Eva', inf_relationship: 'Wife', inf_consent: 'no' }, cookie)).status, 400);
  assert.equal((await post(`${casePath}/informant`, { inf_name: 'Eva', inf_relationship: 'Wife', inf_consent: 'yes', inf_memory: 'yes' }, cookie)).status, 302);

  const fin = await post(`${casePath}/finalize`, { final_note: 'Recurrent depression; cognition to be followed up.' }, cookie);
  assert.equal(fin.headers.get('location'), `${casePath}/final`);
  const final = await (await fetch(`${base}${casePath}/final`, { headers: { cookie } })).text();
  assert.ok(final.includes('Final assessment report'));
  assert.ok(final.includes('F33.1'));
  assert.ok(final.includes('Major depressive disorder'));
  assert.ok(final.includes('21/30'));
  assert.ok(final.includes('Not allowed together'));
  assert.ok(final.includes('Testing the override.'));
  assert.ok(final.includes('Low mood and forgetfulness'), 'interview in the final report');
  assert.ok(final.includes('Depression, Dementia'), 'family history in the final report');
  assert.ok(final.includes('Eva'), 'informant in the final report');

  // Finalized: no more changes
  assert.equal((await post(`${casePath}/checklist?disorder=mdd`, mddRatings, cookie)).status, 409);
  assert.equal((await post(`${casePath}/diagnoses`, { disorder: 'mdd', action: 'remove' }, cookie)).status, 409);
});

test('an on-site assessment cannot be answered through a patient link', async () => {
  const { hashToken } = await import('../src/auth.js');
  const patientId = db.prepare('SELECT id FROM patients LIMIT 1').get().id;
  const insert = db.prepare('INSERT INTO assessments (patient_id, token_hash, expires_at, mode) VALUES (?, ?, ?, ?)');
  insert.run(patientId, hashToken('known-onsite-token'), '2099-01-01T00:00:00Z', 'onsite');
  insert.run(patientId, hashToken('known-link-token'), '2099-01-01T00:00:00Z', 'link');
  assert.equal((await fetch(`${base}/q/known-onsite-token`)).status, 404);
  assert.equal((await fetch(`${base}/q/known-link-token`)).status, 200);
});

test('a required risk assessment blocks finalizing until it is done, then gives a safety plan', async () => {
  const login = await post('/login', { email: 'dr@example.com', password: 'correct horse battery' });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const created = await post('/clinician/patients', {
    first_name: 'Sam', last_name: 'Ek', personal_number: '19990101-0000', gender: 'Non-binary / other',
    age: '26', education: 'Upper secondary school', employed: '1',
  }, cookie);
  const start = await post(`${created.headers.get('location')}/assessments`, { mode: 'onsite' }, cookie);
  const casePath = start.headers.get('location').replace('/screening', '');
  await answerPages(`${casePath}/screening`, { ...makeAnswers({ phq2: 3, phq9: 2 }), consent_given: 'yes' }, cookie);
  await post(`${casePath}/interview`, { reason: 'Crisis after break-up' }, cookie);

  const blocked = await post(`${casePath}/finalize`, {}, cookie);
  assert.equal(blocked.status, 400);
  assert.ok((await blocked.text()).includes('A suicide risk assessment is required'));

  assert.equal((await post(`${casePath}/risk`, { ideation: 'active' }, cookie)).status, 400, 'formulation and plan required');
  const risk = await post(`${casePath}/risk`, {
    ideation: 'active', formulation: 'Acute crisis; strong family support.', immediate: 'no', plan: 'Daily phone contact this week.',
    risk_factors: ['recent_loss', 'hopelessness'], protective: 'support', sp_people: 'Mum 070-000 00 00',
  }, cookie);
  assert.equal(risk.status, 302);
  const plan = await (await fetch(`${base}${casePath}/risk/plan`, { headers: { cookie } })).text();
  assert.ok(plan.includes('My safety plan'));
  assert.ok(plan.includes('Mum 070-000 00 00'));

  assert.equal((await post(`${casePath}/finalize`, {}, cookie)).status, 302);
  const final = await (await fetch(`${base}${casePath}/final`, { headers: { cookie } })).text();
  assert.ok(final.includes('Recent loss, crisis or humiliation, Hopelessness'));
  assert.ok(final.includes('Daily phone contact this week.'));
});

test('patient link: Swedish, save part-way, keep answers when some are missing', async () => {
  const { hashToken } = await import('../src/auth.js');
  const patientId = db.prepare('SELECT id FROM patients LIMIT 1').get().id;
  db.prepare('INSERT INTO assessments (patient_id, token_hash, expires_at, mode, language) VALUES (?, ?, ?, ?, ?)')
    .run(patientId, hashToken('swedish-token'), '2099-01-01T00:00:00Z', 'link', 'sv');
  const q = `${base}/q/swedish-token`;

  const consent = await (await fetch(q)).text();
  assert.ok(consent.includes('Innan du börjar'));
  assert.ok(consent.includes('lang="sv"'));
  await post('/q/swedish-token/consent', { agree: 'yes' });

  const form = await (await fetch(q)).text();
  assert.ok(form.includes('Frågeformulär om din hälsa'));
  assert.ok(form.includes('Känt dig nedstämd, deprimerad eller hopplös'));
  assert.ok(form.includes('Nästan varje dag'));
  assert.ok(form.includes('inte den officiella'), 'unofficial translation note');

  // Switch to English and back
  assert.ok((await (await fetch(`${q}?lang=en`)).text()).includes('Questionnaire about your health'));
  await fetch(`${q}?lang=sv`);

  // Save part-way: answers come back when the link is opened again
  const saved = await post('/q/swedish-token', { phq1: '3', phq2: '2', intent: 'save' });
  assert.ok((await saved.text()).includes('Dina svar är sparade'));
  const again = await (await fetch(q)).text();
  assert.match(again, /name="phq1" value="3" required checked/);

  // Submitting with answers missing keeps the given ones and says how many are missing
  const partial = await post('/q/swedish-token', { phq1: '3', phq2: '2', phq3: '1' });
  assert.equal(partial.status, 400);
  const page = await partial.text();
  assert.match(page, /7 saknas/, 'page 1 has 10 questions, 3 answered');
  assert.match(page, /name="phq3" value="1" required checked/);
});

function makeAnswersCount() {
  return Object.keys(makeAnswers()).length;
}

test('data protection: edit details, audit log, reopen with history, delete with confirmation', async () => {
  const login = await post('/login', { email: 'dr@example.com', password: 'correct horse battery' });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const created = await post('/clinician/patients', {
    first_name: 'Lea', last_name: 'Holm', personal_number: '20000101-0000', gender: 'Female',
    age: '25', education: 'Upper secondary school', employed: '1',
  }, cookie);
  const patientPath = created.headers.get('location');
  const patientId = Number(patientPath.split('/').pop());

  // Edit: invalid age refused, valid change saved and logged by field name only
  const edit = { first_name: 'Lea', last_name: 'Holm', personal_number: '20000101-0000', gender: 'Female', age: '15', education: 'Upper secondary school', employed: '1' };
  assert.equal((await post(`${patientPath}/edit`, edit, cookie)).status, 400);
  assert.equal((await post(`${patientPath}/edit`, { ...edit, age: '26' }, cookie)).status, 302);
  const auditHtml = await (await fetch(`${base}${patientPath}/audit`, { headers: { cookie } })).text();
  assert.ok(auditHtml.includes('Edited patient details'));
  assert.ok(auditHtml.includes('Changed: age'));
  assert.ok(!auditHtml.includes('>26<'), 'the new value itself is not written to the log');

  // Finalize, then reopen: needs a reason, and the history is kept
  const start = await post(`${patientPath}/assessments`, { mode: 'onsite' }, cookie);
  const casePath = start.headers.get('location').replace('/screening', '');
  await answerPages(`${casePath}/screening`, { ...makeAnswers({}), consent_given: 'yes' }, cookie);
  await post(`${casePath}/interview`, { reason: 'Check-up' }, cookie);
  assert.equal((await post(`${casePath}/finalize`, {}, cookie)).status, 302);
  assert.equal((await post(`${casePath}/reopen`, {}, cookie)).status, 400);
  assert.equal((await post(`${casePath}/reopen`, { reason: 'Wrong date in interview' }, cookie)).status, 302);
  await post(`${casePath}/finalize`, {}, cookie);
  const final = await (await fetch(`${base}${casePath}/final`, { headers: { cookie } })).text();
  assert.ok(final.includes('Change history'));
  assert.ok(final.includes('Wrong date in interview'));

  // Delete: needs the exact last name; afterwards the record is gone but the log remains
  assert.equal((await post(`${patientPath}/delete`, { confirm_last_name: 'Wrong' }, cookie)).status, 400);
  assert.equal((await post(`${patientPath}/delete`, { confirm_last_name: 'holm', reason: 'Test record' }, cookie)).status, 200);
  assert.equal((await fetch(base + patientPath, { headers: { cookie } })).status, 404);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM assessments WHERE patient_id = ?').get(patientId).n, 0);
  const log = db.prepare('SELECT action FROM audit_log WHERE patient_id = ? ORDER BY id').all(patientId).map((r) => r.action);
  assert.ok(log.includes('delete_patient'));
  assert.ok(log.includes('reopen'));
  assert.ok(log.includes('view_final'));
});

test('follow-up by link (Swedish) and on site, with chart and change on the patient page', async () => {
  const login = await post('/login', { email: 'dr@example.com', password: 'correct horse battery' });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const created = await post('/clinician/patients', {
    first_name: 'Nils', last_name: 'Ström', personal_number: '19800101-0000', gender: 'Male',
    age: '46', education: 'University — master level or higher', employed: '1',
  }, cookie);
  const patientPath = created.headers.get('location');

  // Intake screening on site: PHQ-9 15
  const start = await post(`${patientPath}/assessments`, { mode: 'onsite' }, cookie);
  await answerPages(start.headers.get('location'), { ...makeAnswers({ phq1: 3, phq2: 3, phq3: 3, phq4: 3, phq7: 3, gad1: 2, gad2: 2 }), consent_given: 'yes' }, cookie);

  // Follow-up link in Swedish
  const page = await (await post(`${patientPath}/followups`, { mode: 'link', language: 'sv' }, cookie)).text();
  const link = page.match(/value="(http[^"]+\/f\/[^"]+)"/)[1];
  const fPath = new URL(link).pathname;
  const form = await (await fetch(base + fPath)).text();
  assert.ok(form.includes('Nästan varje dag'));
  const followupAnswers = Object.fromEntries(['phq1', 'phq2', 'phq3', 'phq4', 'phq5', 'phq6', 'phq7', 'phq8', 'phq9', 'phqDifficulty',
    'gad1', 'gad2', 'gad3', 'gad4', 'gad5', 'gad6', 'gad7', 'gadDifficulty'].map((id) => [id, '0']));
  assert.equal((await post(fPath, { phq1: '1' })).status, 400);
  const done = await post(fPath, { ...followupAnswers, phq1: '2', phq9: '1' });
  assert.ok((await done.text()).includes('Tack'));
  assert.equal((await fetch(base + fPath)).status, 404, 'link works once');

  // On-site follow-up
  const onsite = await post(`${patientPath}/followups`, { mode: 'onsite', language: 'en' }, cookie);
  const onsitePath = onsite.headers.get('location');
  assert.equal((await post(onsitePath, followupAnswers, cookie)).status, 302);

  // Patient page: chart, table, change summary, item 9 badge
  const patientHtml = await (await fetch(base + patientPath, { headers: { cookie } })).text();
  assert.ok(patientHtml.includes('<svg viewBox'));
  assert.ok(patientHtml.includes('PHQ-9 fell by 15 points: a clinically meaningful improvement.'));
  assert.ok(patientHtml.includes('PHQ-9 remission range'));
  assert.ok(patientHtml.includes('Item 9'));

  // Email for the follow-up with item 9 answered is urgent
  await new Promise((r) => setTimeout(r, 100));
  const followupEmails = readdirSync('outbox').filter((f) => f.endsWith('-followup.txt')).map((f) => readFileSync(`outbox/${f}`, 'utf8'));
  assert.ok(followupEmails.some((e) => e.includes('URGENT: Follow-up results need review today')));
  assert.ok(!followupEmails.some((e) => e.includes('Ström') || e.includes('PHQ')), 'no name or scores in the email');
});

test('patient link page by page: skip logic, tiredness break, response-quality box', async () => {
  const login = await post('/login', { email: 'dr@example.com', password: 'correct horse battery' });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const created = await post('/clinician/patients', {
    first_name: 'Tove', last_name: 'Berg', personal_number: '19900505-0000', gender: 'Female',
    age: '36', education: 'Upper secondary school', employed: '1',
  }, cookie);
  const page = await (await post(`${created.headers.get('location')}/assessments`, { mode: 'link' }, cookie)).text();
  const qPath = new URL(page.match(/value="(http[^"]+\/q\/[^"]+)"/)[1]).pathname;
  await post(`${qPath}/consent`, { agree: 'yes' });

  // No JavaScript here: psy1 "No" but psy2 "Yes" is a contradiction; AUDIT-C "never" but drinks reported is another.
  const fields = makeAnswers({ auditc1: 0, auditc2: 2, psy1: 0, psy2: 1, tired: 8 });
  let breakSeen = false;
  let last;
  for (let i = 0; i < 10; i++) {
    const form = await (await fetch(`${base}${qPath}?page=${i}`)).text();
    assert.ok(form.includes(`Part ${i + 1} of 10`), `progress shown on page ${i + 1}`);
    if (i === 0) assert.ok(form.includes('src="/skip.js"'));
    last = await post(`${qPath}?page=${i}`, fields);
    if (i === 2) {
      assert.equal(last.status, 200);
      const html = await last.text();
      assert.ok(html.includes('Time for a break?'), 'tiredness 8/10 after part 3 offers a break');
      breakSeen = true;
    }
  }
  assert.ok(breakSeen);
  assert.ok((await last.text()).includes('Thank you'));

  const row = db.prepare("SELECT id, results_json FROM assessments WHERE token_hash IS NOT NULL ORDER BY id DESC LIMIT 1").get();
  const quality = JSON.parse(row.results_json).quality;
  const kinds = quality.flags.map((f) => f.kind);
  assert.ok(kinds.includes('Fast answering'), 'pages answered within milliseconds');
  assert.equal(kinds.filter((k) => k === 'Contradiction').length, 2);
  assert.ok(quality.flags.some((f) => f.text.includes('8/10 after part 3 and continued without a break')));

  const caseHtml = await (await fetch(`${base}/clinician/assessments/${row.id}`, { headers: { cookie } })).text();
  assert.ok(caseHtml.includes('Response quality'));
  assert.ok(caseHtml.includes('signs to check in the interview'));
});

test('access: only the treating clinician and named supervisors or colleagues', async () => {
  const loginAs = async (email, password) =>
    (await post('/login', { email, password })).headers.get('set-cookie').split(';')[0];
  const owner = await loginAs('dr@example.com', 'correct horse battery');
  db.prepare('INSERT OR IGNORE INTO clinicians (name, email, password_hash) VALUES (?, ?, ?)').run('Dr Super', 'super@example.com', hashPassword('supervisor password 1'));
  const supervisor = await loginAs('super@example.com', 'supervisor password 1');
  const outsider = await loginAs('other@example.com', 'another long password');

  const created = await post('/clinician/patients', {
    first_name: 'Ida', last_name: 'Sand', personal_number: '19950101-0000', gender: 'Female',
    age: '31', education: 'Upper secondary school', employed: '1',
  }, owner);
  const patientPath = created.headers.get('location');
  const status = async (cookie, path = patientPath) => (await fetch(base + path, { headers: { cookie }, redirect: 'manual' })).status;

  assert.equal(await status(supervisor), 404, 'no access before a grant');

  // Granting needs a reason, a known account and a future end date
  assert.equal((await post(`${patientPath}/access`, { action: 'grant', email: 'super@example.com', role: 'supervisor' }, owner)).status, 400);
  assert.equal((await post(`${patientPath}/access`, { action: 'grant', email: 'nobody@example.com', role: 'supervisor', reason: 'x' }, owner)).status, 400);
  assert.equal((await post(`${patientPath}/access`, { action: 'grant', email: 'super@example.com', role: 'supervisor', reason: 'x', until: '2020-01-01' }, owner)).status, 400);
  assert.equal((await post(`${patientPath}/access`, { action: 'grant', email: 'super@example.com', role: 'supervisor', reason: 'Clinical supervision', until: '2099-12-31' }, owner)).status, 302);

  // The supervisor can now see the patient and its assessments; the outsider still cannot
  assert.equal(await status(supervisor), 200);
  const page = await (await fetch(base + patientPath, { headers: { cookie: supervisor } })).text();
  assert.ok(page.includes('You have <strong>read-only</strong> access as <strong>Supervisor</strong>'));
  assert.ok(!page.includes('Delete patient record'), 'only the treating clinician can delete');
  assert.ok((await (await fetch(`${base}/clinician`, { headers: { cookie: supervisor } })).text()).includes('Shared by Dr Test'));
  const start = await post(`${patientPath}/assessments`, { mode: 'onsite' }, owner);
  const casePath = start.headers.get('location').replace('/screening', '');
  assert.equal(await status(supervisor, casePath), 200);
  assert.equal(await status(outsider), 404);
  assert.equal(await status(outsider, casePath), 404);

  // The supervisor cannot pass access on or delete the record
  assert.equal((await post(`${patientPath}/access`, { action: 'grant', email: 'other@example.com', role: 'colleague', reason: 'x' }, supervisor)).status, 403);
  assert.equal((await post(`${patientPath}/delete`, { confirm_last_name: 'Sand' }, supervisor)).status, 403);

  // Read-only: the supervisor cannot change anything, and sees no forms for changing
  assert.equal((await post(`${patientPath}/edit`, { first_name: 'X' }, supervisor)).status, 403);
  assert.equal((await post(`${patientPath}/assessments`, { mode: 'link' }, supervisor)).status, 403);
  assert.equal((await post(`${casePath}/interview`, { reason: 'x' }, supervisor)).status, 403);
  assert.equal((await post(`${casePath}/checklist?disorder=mdd`, { mdd_a1: 'present' }, supervisor)).status, 403);
  const readOnlyCase = await (await fetch(base + casePath, { headers: { cookie: supervisor } })).text();
  assert.ok(readOnlyCase.includes('Read-only access'));
  const readOnlyPatient = await (await fetch(base + patientPath, { headers: { cookie: supervisor } })).text();
  assert.ok(!readOnlyPatient.includes('Start a new assessment'));
  assert.ok(!readOnlyPatient.includes('Edit details'));
  // The treating clinician can still change things
  assert.equal((await post(`${patientPath}/edit`, { first_name: 'Ida', last_name: 'Sand', personal_number: '19950101-0000', gender: 'Female', age: '31', education: 'Upper secondary school', employed: '1' }, owner)).status, 302);

  // Views by the supervisor are logged under their name
  const auditHtml = await (await fetch(`${base}${patientPath}/audit`, { headers: { cookie: owner } })).text();
  assert.ok(auditHtml.includes('Granted access'));
  assert.ok(auditHtml.includes('Dr Super'));

  // Revoking ends access at once
  const grantId = db.prepare("SELECT id FROM patient_access WHERE revoked_at IS NULL ORDER BY id DESC LIMIT 1").get().id;
  assert.equal((await post(`${patientPath}/access`, { action: 'revoke', grant: String(grantId) }, owner)).status, 302);
  assert.equal(await status(supervisor), 404);

  // An expired grant gives no access
  const patientId = Number(patientPath.split('/').pop());
  const superId = db.prepare("SELECT id FROM clinicians WHERE email = 'super@example.com'").get().id;
  db.prepare('INSERT INTO patient_access (patient_id, clinician_id, role, reason, granted_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(patientId, superId, 'colleague', 'Old cover', 1, '2020-01-01T00:00:00Z');
  assert.equal(await status(supervisor), 404);
});

test('retention: patient page shows how long the record is kept; review page lists due records', async () => {
  const login = await post('/login', { email: 'dr@example.com', password: 'correct horse battery' });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  db.prepare("INSERT INTO patients (clinician_id, first_name, last_name, personal_number, gender, age, education, employed, created_at) VALUES (1, 'Old', 'Record', 'x', 'Male', 70, 'Other / unknown', 0, '2010-01-01 09:00:00')").run();
  const id = db.prepare("SELECT id FROM patients WHERE last_name = 'Record'").get().id;
  const patientHtml = await (await fetch(`${base}/clinician/patients/${id}`, { headers: { cookie } })).text();
  assert.ok(patientHtml.includes('Record kept until at least 2020-01-01 (10 years after the last entry).'));
  const review = await (await fetch(`${base}/clinician/retention`, { headers: { cookie } })).text();
  assert.ok(review.includes('Record, Old'));
  assert.ok(review.includes('10 years after the last entry'));
  assert.equal((await post(`/clinician/patients/${id}/delete`, { confirm_last_name: 'Record', reason: 'Retention period ended' }, cookie)).status, 200);
  assert.ok(!(await (await fetch(`${base}/clinician/retention`, { headers: { cookie } })).text()).includes('Record, Old'));
});
