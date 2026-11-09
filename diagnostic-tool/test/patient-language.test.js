// Once the clinician chooses a language for the patient, every page the
// patient sees is in that language only, including the top bar, buttons and
// footer. The same holds for questionnaires the clinician fills in on site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as views from '../src/views.js';
import { STRINGS } from '../src/i18n.js';
import { SV } from '../src/i18n-clinician-sv.js';
import { PAGES } from '../src/questionnaire.js';
import { readyEmail } from '../src/email.js';

// The text a reader sees: tags removed, entities decoded.
function visibleText(page) {
  return String(page)
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ');
}

// Phrases that must not appear on a page in the other language: every
// patient text, and every clinician text (the English keys of the Swedish
// dictionary). Short words are left out: they also occur inside other words.
const strings = (language) =>
  Object.values(STRINGS[language]).flatMap((v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v : []))
    .filter((s) => s.length >= 12);
const ENGLISH = [...strings('en'), ...Object.keys(SV).filter((k) => k.length >= 12 && k.includes(' ')), 'Mental Health Assessment', 'English'];
const SWEDISH = [...strings('sv'), ...Object.values(SV).filter((v) => v.length >= 12 && v.includes(' ')), 'Svenska'];

function assertOnly(language, name, page) {
  const text = visibleText(page);
  const foreign = (language === 'sv' ? ENGLISH : SWEDISH).filter((phrase) => text.includes(phrase.split('{')[0].trim()) && phrase.split('{')[0].trim().length >= 8);
  assert.deepEqual(foreign, [], `${name} (${language}) shows text in the other language`);
  assert.ok(String(page).includes(`<html lang="${language}">`), `${name}: html lang="${language}"`);
}

const patient = { id: 7, first_name: 'Eva', last_name: 'Ek' };
const pagesFor = (language) => [
  ['consent', views.consentPage({ action: '/q/x/consent', language, error: STRINGS[language].consentNeeded })],
  ...PAGES.map((_, i) => [`questionnaire page ${i + 1}`, views.questionnairePage({ action: '/q/x', pageIndex: i, language, error: STRINGS[language].pageMissing(2) })]),
  ['break', views.breakPage({ language, continueUrl: '/q/x?page=3', stopAction: '/q/x?page=3' })],
  ['saved', views.savedPage({ language, expires: '2030-01-01' })],
  ['thank you (safety)', views.thankYouPage({ safetyFlag: true, language })],
  ['link not valid', views.linkInvalidPage({ language })],
  ['follow-up', views.followupPage({ action: '/f/x', language, error: STRINGS[language].missing(3) })],
];

for (const language of ['sv', 'en']) {
  test(`patient pages by link are only in ${language === 'sv' ? 'Swedish' : 'English'}`, () => {
    for (const [name, page] of pagesFor(language)) {
      assertOnly(language, name, page);
      assert.ok(!String(page).includes('?lang='), `${name}: no language switch for the patient`);
    }
  });
}

test('on site: the questionnaire is in the patient’s language even when the clinician works in the other one', () => {
  for (const [patientLanguage, clinicianLanguage] of [['sv', 'en'], ['en', 'sv']]) {
    const clinician = { id: 1, name: 'Dr Test', language: clinicianLanguage };
    const pages = [
      ...PAGES.map((_, i) => [`on-site page ${i + 1}`, views.questionnairePage({ action: '/clinician/assessments/1/screening', pageIndex: i, clinician, patient, language: patientLanguage })]),
      ['on-site follow-up', views.followupPage({ action: '/clinician/followups/1', clinician, patient, language: patientLanguage })],
    ];
    for (const [name, page] of pages) {
      assertOnly(patientLanguage, name, page);
      assert.ok(!String(page).includes('action="/clinician/language"'), `${name}: the clinician's language switch is hidden here`);
    }
  }
});

test('clinician pages show both languages to choose from, the current one marked', () => {
  const page = String(views.dashboardPage({ clinician: { id: 1, name: 'Dr Test', language: 'sv' }, patients: [] }));
  assert.match(page, /<span class="current" lang="sv" aria-current="true">Svenska<\/span>/);
  assert.match(page, /<button class="link" name="language" value="en" lang="en">English<\/button>/);
  assertOnly('sv', 'patient list', page.replace(/<form method="post" action="\/clinician\/language"[\s\S]*?<\/form>/, ''));
});

test('emails to the clinician are in the clinician’s language', () => {
  for (const kind of ['screening', 'followup']) {
    for (const urgent of [true, false]) {
      const sv = readyEmail({ kind, ref: 12, urgent, url: 'https://example.org/x', language: 'sv' });
      assertOnlyText('sv', `${kind} email`, `${sv.subject}\n${sv.text}`);
      const en = readyEmail({ kind, ref: 12, urgent, url: 'https://example.org/x' });
      assert.ok(en.subject.includes(urgent ? 'URGENT' : 'ready'));
    }
  }
});

function assertOnlyText(language, name, text) {
  const foreign = ENGLISH.map((p) => p.split('{')[0].trim()).filter((p) => p.length >= 8 && text.includes(p));
  assert.deepEqual(foreign, [], `${name} (${language})`);
  assert.ok(!/\{\w+\}/.test(text), `${name}: placeholders filled in`);
}
