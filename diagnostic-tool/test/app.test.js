// End-to-end test: runs the real server against a temporary in-memory
// database and walks through the whole clinician -> patient -> email flow.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { answers as makeAnswers } from './helpers.js';

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
    body: new URLSearchParams(fields),
  });

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
  const submit = await post(qPath, answers);
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
  assert.ok(email.includes('URGENT'));
  assert.ok(email.includes('SAFETY ALERT'));
  assert.ok(email.includes('*********1234'), 'personal number is masked');
  assert.ok(!email.includes('19900101-1234'));
  assert.ok(email.includes('Likelihood:      High'));
  assert.ok(email.includes('PRIORITY DIFFERENTIAL'));
  assert.ok(email.includes('DIFFERENTIAL DIAGNOSIS SCREENING'));
  assert.ok(email.includes('Bipolar I or II disorder  [PRIORITY]'));
  // AUDIT-C 3+1+1 = 5, recorded gender Female -> cut-off 3 -> positive
  assert.ok(email.includes('AUDIT-C = 5/12 (cut-off 3 for recorded gender "Female")'));
  assert.ok(email.includes('PC-PTSD-5 score 3/5'));

  // 7. Clinician sees the report
  const patientAfter = await (await fetch(base + patientPath, { headers: { cookie } })).text();
  const reportPath = patientAfter.match(/href="(\/clinician\/assessments\/\d+)"/)[1];
  const report = await (await fetch(base + reportPath, { headers: { cookie } })).text();
  assert.ok(report.includes('Safety alert'));
  assert.ok(report.includes('PHQ-9 total: <strong>13/27</strong>'));
  assert.ok(report.includes('Differential diagnosis screening'));
  assert.ok(report.includes('Priority:</strong> screen positive for Bipolar I or II disorder'));
  // Suggestions from the screening, in the portal and in the email
  assert.ok(report.includes('3. In-depth assessment'));
  assert.ok(report.includes('checklist?disorder=bipolar1'));
  assert.ok(email.includes('SUGGESTED IN-DEPTH ASSESSMENTS'));
  assert.ok(email.includes('Bipolar I disorder [Suggested]'));
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
  const saved = await post(screeningPath, makeAnswers({ phq1: 2, phq2: 2, phq3: 2, phq4: 2, phq7: 3, phq6: 2, cog1: 1, cog2: 1 }), cookie);
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
  const fin = await post(`${casePath}/finalize`, { final_note: 'Recurrent depression; cognition to be followed up.' }, cookie);
  assert.equal(fin.headers.get('location'), `${casePath}/final`);
  const final = await (await fetch(`${base}${casePath}/final`, { headers: { cookie } })).text();
  assert.ok(final.includes('Final assessment report'));
  assert.ok(final.includes('F33.1'));
  assert.ok(final.includes('Major depressive disorder'));
  assert.ok(final.includes('21/30'));

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
