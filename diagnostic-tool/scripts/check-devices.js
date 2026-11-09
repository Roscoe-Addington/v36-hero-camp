// Checks that every page works on tablets and phones (iPad and Android).
//
//   npm run check:devices
//
// Starts the app on a temporary in-memory database, adds a test patient with
// a finished assessment and follow-ups, then opens every page in emulated
// devices and checks:
//   - no sideways scrolling (nothing wider than the screen)
//   - text fields at least 16px, so iPad/iPhone Safari does not zoom in when
//     you tap them
//   - buttons and answer choices at least 44px tall, so they are easy to tap
//   - a patient can fill in the whole questionnaire by tapping
//   - the PDF downloads
// Screenshots go to device-check/ (not committed).
//
// Needs Playwright with Chromium (not a dependency of the app). Chromium
// emulates each device's screen size, pixel density and touch, but it is not
// Safari: check on a real iPad before use with patients.

import { createServer } from 'node:net';
import { mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  console.error('Playwright is not installed. Install it with: npm install --no-save playwright && npx playwright install chromium');
  process.exit(2);
}
const { chromium, devices } = playwright;

const DEVICES = [
  ['iPad (gen 7)', 'iPad portrait'],
  ['iPad (gen 7) landscape', 'iPad landscape'],
  ['iPad Mini', 'iPad Mini'],
  ['iPad Pro 11', 'iPad Pro 11'],
  ['Galaxy Tab S4', 'Android tablet'],
  ['Galaxy Tab S4 landscape', 'Android tablet landscape'],
  ['Pixel 7', 'Android phone'],
  ['Galaxy S9+', 'Android phone (small)'],
];
const MIN_FONT = 16;
const MIN_TAP = 44;
const SHOTS = 'device-check';

// ---------- Start the app on a free port ----------

const port = await new Promise((resolve) => {
  const s = createServer().listen(0, () => {
    const p = s.address().port;
    s.close(() => resolve(p));
  });
});
const base = `http://localhost:${port}`;
process.env.BASE_URL = base;
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
delete process.env.SMTP_HOST;

const { app } = await import('../src/server.js');
const { db } = await import('../src/db.js');
const { hashPassword } = await import('../src/auth.js');
const { ALL_FIELDS } = await import('../src/questionnaire.js');
const { DISORDERS } = await import('../src/disorders.js');

db.prepare('INSERT INTO clinicians (name, email, password_hash) VALUES (?, ?, ?)').run('Dr Device', 'device@example.com', hashPassword('device check password'));
const server = await new Promise((resolve) => {
  const s = app.listen(port, () => resolve(s));
});

// ---------- Test data, added over HTTP like a browser would ----------

const post = (path, fields, cookie) =>
  fetch(base + path, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie } : {}) },
    body: new URLSearchParams(fields),
  });
const login = await post('/login', { email: 'device@example.com', password: 'device check password' });
const cookie = login.headers.get('set-cookie').split(';')[0];

// A long name and personal number, to find layouts that break on narrow screens.
const created = await post('/clinician/patients', {
  first_name: 'Annika-Charlotte', last_name: 'Johansson-Wennerström', personal_number: '19800101-1234',
  gender: 'Non-binary / other', age: '45', education: 'University — master level or higher', employed: '2', preferred_language: 'en',
}, cookie);
const patientPath = created.headers.get('location');

// On-site screening with depressive and anxiety symptoms, so suggestions,
// differentials and the checklist have content.
const answers = Object.fromEntries(ALL_FIELDS.map((f) => [f.id, '0']));
Object.assign(answers, { phq1: '2', phq2: '3', phq3: '2', phq4: '2', phq7: '2', gad1: '2', gad2: '2', gad3: '2', consent_given: 'yes' });
const start = await post(`${patientPath}/assessments`, { mode: 'onsite' }, cookie);
const casePath = start.headers.get('location').replace('/screening', '');
for (let page = 0; page < 10; page++) await post(`${casePath}/screening?page=${page}`, answers, cookie);
await post(`${casePath}/interview`, { reason: 'Low mood and worry for several months' }, cookie);
await post(`${casePath}/finalize`, {}, cookie);

// Two follow-ups, so the chart is drawn.
const followupAnswers = Object.fromEntries(['phq1', 'phq2', 'phq3', 'phq4', 'phq5', 'phq6', 'phq7', 'phq8', 'phq9', 'phqDifficulty',
  'gad1', 'gad2', 'gad3', 'gad4', 'gad5', 'gad6', 'gad7', 'gadDifficulty'].map((id) => [id, '1']));
for (let i = 0; i < 2; i++) {
  const f = await post(`${patientPath}/followups`, { mode: 'onsite', language: 'en' }, cookie);
  await post(f.headers.get('location'), followupAnswers, cookie);
}

const PAGES = [
  ['login', '/login'],
  ['patients', '/clinician'],
  ['new-patient', '/clinician/patients/new'],
  ['patient', patientPath],
  ['edit-patient', `${patientPath}/edit`],
  ['audit', `${patientPath}/audit`],
  ['retention', '/clinician/retention'],
  ['case', casePath],
  ['interview', `${casePath}/interview`],
  ['risk', `${casePath}/risk`],
  ['informant', `${casePath}/informant`],
  ['checklist', `${casePath}/checklist?disorder=${DISORDERS[0].id}`],
  ['final', `${casePath}/final`],
];

// ---------- Checks run inside the page ----------

function measure({ minFont, minTap }) {
  const width = document.documentElement.clientWidth;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  // Inside a box that scrolls sideways on purpose (wide tables), overflow is fine.
  const inScroller = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === 'auto' || o === 'scroll') return true;
    }
    return false;
  };
  const describe = (el) => `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}${el.name ? `[name=${el.name}]` : ''} "${(el.textContent || el.value || '').trim().slice(0, 30)}"`;
  const wide = [...document.querySelectorAll('body *')]
    .filter((el) => visible(el) && !inScroller(el) && el.getBoundingClientRect().right > width + 1)
    // Report the outermost element only.
    .filter((el, _, all) => !all.includes(el.parentElement))
    .map(describe);
  const smallText = [...document.querySelectorAll('input:not([type=radio]):not([type=checkbox]):not([type=hidden]), select, textarea')]
    .filter((el) => visible(el) && parseFloat(getComputedStyle(el).fontSize) < minFont)
    .map((el) => `${describe(el)} ${getComputedStyle(el).fontSize}`);
  const smallTap = [...document.querySelectorAll('button, a.button, label.choice, label.check, summary, select, input[type=submit]')]
    .filter((el) => visible(el) && el.getBoundingClientRect().height < minTap - 0.5)
    .map((el) => `${describe(el)} ${Math.round(el.getBoundingClientRect().height)}px`);
  return { overflow: document.documentElement.scrollWidth > width + 1, wide, smallText, smallTap };
}

// ---------- Run ----------

rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS);
const browser = await chromium.launch();
const problems = [];
const report = (device, page, kind, items) => {
  for (const item of items) problems.push(`${device} · ${page} · ${kind}: ${item}`);
};

// Optional filter for a quick run: npm run check:devices -- iPad
const only = process.argv[2];
const chosen = DEVICES.filter(([d, l]) => !only || `${d} ${l}`.includes(only));
for (const [deviceName, label] of chosen) {
  const context = await browser.newContext({ ...devices[deviceName], acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const slug = label.replace(/\W+/g, '-').toLowerCase();

  // Log in by tapping, like a clinician would.
  await page.goto(`${base}/login`);
  await page.locator('input[name=email]').tap();
  await page.keyboard.type('device@example.com');
  await page.locator('input[name=password]').fill('device check password');
  await page.locator('button', { hasText: 'Log in' }).tap();
  await page.waitForURL(`${base}/clinician`);

  for (const [name, path] of PAGES) {
    if (name === 'login') {
      await context.clearCookies();
    }
    const res = await page.goto(base + path);
    if (!res.ok()) problems.push(`${label} · ${name} · HTTP ${res.status()}`);
    const m = await page.evaluate(measure, { minFont: MIN_FONT, minTap: MIN_TAP });
    if (m.overflow) report(label, name, 'page scrolls sideways', m.wide.length ? m.wide : ['(unknown element)']);
    report(label, name, `text field under ${MIN_FONT}px (Safari zooms in)`, m.smallText);
    report(label, name, `tap target under ${MIN_TAP}px`, m.smallTap);
    if (['patient', 'case', 'final', 'checklist'].includes(name)) await page.screenshot({ path: `${SHOTS}/${slug}-${name}.png`, fullPage: true });
    if (name === 'login') {
      // Log in again for the next pages.
      await page.locator('input[name=email]').fill('device@example.com');
      await page.locator('input[name=password]').fill('device check password');
      await page.locator('button', { hasText: 'Log in' }).tap();
      await page.waitForURL(`${base}/clinician`);
    }
  }

  // PDF download from the final report.
  await page.goto(base + casePath + '/final');
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('a', { hasText: 'Download PDF' }).tap()]);
  if (!download.suggestedFilename().endsWith('.pdf')) problems.push(`${label} · PDF · wrong file name ${download.suggestedFilename()}`);

  // A patient fills in the whole questionnaire by tapping, from a fresh link.
  const linkPage = await (await post(`${patientPath}/assessments`, { mode: 'link' }, cookie)).text();
  const qUrl = linkPage.match(/value="(http[^"]+\/q\/[^"]+)"/)[1];
  const patient = await browser.newContext({ ...devices[deviceName] });
  const p = await patient.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(qUrl);
  const firstMeasure = await p.evaluate(measure, { minFont: MIN_FONT, minTap: MIN_TAP });
  report(label, 'patient consent', 'tap target', firstMeasure.smallTap);
  await p.locator('label.check').tap();
  await Promise.all([p.waitForEvent('load'), p.locator('form button').tap()]);
  let pagesDone = 0;
  for (let i = 0; i < 15; i++) {
    if (!(await p.locator('fieldset.question').count())) break;
    const m = await p.evaluate(measure, { minFont: MIN_FONT, minTap: MIN_TAP });
    if (m.overflow) report(label, `questionnaire page ${i + 1}`, 'page scrolls sideways', m.wide);
    report(label, `questionnaire page ${i + 1}`, `tap target under ${MIN_TAP}px`, m.smallTap);
    report(label, `questionnaire page ${i + 1}`, `text field under ${MIN_FONT}px`, m.smallText);
    if (i === 0) await p.screenshot({ path: `${SHOTS}/${slug}-questionnaire.png` });
    // Tap the first answer of every visible, unanswered question (follow-ups appear as you go).
    // Answering can hide or show follow-ups, so look again after every tap.
    const open = p.locator('fieldset.question:visible:has(input[type=radio]):not(:has(input:checked))');
    for (let taps = 0; taps < 40 && (await open.count()); taps++) {
      await open.first().locator('label.choice').first().tap();
    }
    // Other required fields (numbers, text): type an answer with the on-screen keyboard.
    for (const input of await p.locator('input[required]:visible:not([type=radio]):not([type=checkbox]), textarea[required]:visible').all()) {
      if (!(await input.inputValue())) {
        await input.tap();
        await p.keyboard.type('0');
      }
    }
    await Promise.all([p.waitForEvent('load'), p.locator('.page-buttons button:not([name=intent])').tap()]);
    pagesDone++;
  }
  const finished = (await p.locator('main').textContent()).includes('Thank you');
  if (!finished) {
    const heading = await p.locator('h1').first().textContent().catch(() => '');
    problems.push(`${label} · questionnaire · could not finish by tapping (stopped after ${pagesDone} pages at "${heading}", ${p.url()})`);
    await p.screenshot({ path: `${SHOTS}/${slug}-questionnaire-stuck.png`, timeout: 5000 }).catch(() => {});
  }
  report(label, 'browser', 'JavaScript error', errors);
  console.log(`${finished ? '✓' : '✗'} ${label} (${deviceName}): ${pagesDone} questionnaire pages tapped through`);
  await patient.close();
  await context.close();
}

await browser.close();
server.close();

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const line of problems) console.log(' - ' + line);
  process.exitCode = 1;
} else {
  console.log(`\nNo problems on ${chosen.length} device(s). Screenshots in ${SHOTS}/.`);
}
