// End-to-end test: runs the real server against a temporary in-memory
// database and walks through the whole clinician -> patient -> email flow.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, rmSync } from 'node:fs';

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
  const linkPage = await (await post(`${patientPath}/links`, {}, cookie)).text();
  const link = linkPage.match(/value="(http[^"]+\/q\/[^"]+)"/)[1];
  const qPath = new URL(link).pathname;

  // 4. Patient opens the link (no cookie) and submits
  const form = await fetch(base + qPath);
  assert.equal(form.status, 200);

  const answers = {
    phq1: 2, phq2: 3, phq3: 2, phq4: 2, phq5: 0, phq6: 2, phq7: 1, phq8: 0, phq9: 1, phqDifficulty: 2,
    gad1: 2, gad2: 2, gad3: 2, gad4: 1, gad5: 0, gad6: 1, gad7: 2, gadDifficulty: 1,
    gadA: 1, gadB: 1, gadC1: 1, gadC2: 1, gadC3: 1, gadC4: 0, gadC5: 0, gadC6: 1,
  };
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

  // 7. Clinician sees the report
  const patientAfter = await (await fetch(base + patientPath, { headers: { cookie } })).text();
  const reportPath = patientAfter.match(/href="(\/clinician\/assessments\/\d+)"/)[1];
  const report = await (await fetch(base + reportPath, { headers: { cookie } })).text();
  assert.ok(report.includes('Safety alert'));
  assert.ok(report.includes('PHQ-9 total: <strong>13/27</strong>'));
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
