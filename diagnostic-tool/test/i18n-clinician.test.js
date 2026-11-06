// Every text on the clinician pages must have a Swedish translation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translator, hasSwedish } from '../src/i18n-clinician.js';
import { LIKELIHOOD } from '../src/scoring.js';
import { STATUS as DIFF } from '../src/differential.js';
import { STATUS as CRITERIA } from '../src/criteria.js';
import { STRENGTH } from '../src/suggestions.js';
import { LEVEL } from '../src/conflicts.js';
import { KIND } from '../src/response-quality.js';
import { MOCA_DOMAINS, mocaBand } from '../src/moca.js';
import { GENDER_OPTIONS, EDUCATION_OPTIONS, EMPLOYMENT_OPTIONS } from '../src/views.js';
import { FREQUENCY_OPTIONS, DIFFICULTY_OPTIONS } from '../src/questionnaire.js';
import { ACTIONS } from '../src/audit-actions.js';
import { INTERVIEW_FORM, RISK, INFORMANT } from '../src/clinical-forms.js';

const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const missing = (texts) => [...new Set(texts)].filter((x) => !hasSwedish(x));

test('every t(…) text on the clinician pages has Swedish', () => {
  const texts = [];
  for (const f of ['views.js', 'views-workflow.js', 'views-forms.js', 'pdf-report.js']) {
    // ’ written in source as an escape is turned into the real character
    for (const m of read(f).matchAll(/\b(?:t|ct|translator\([^)]*\))\(\s*'((?:[^'\\]|\\.)*)'/g)) texts.push(m[1].replace(/\\u2019/g, '’'));
  }
  assert.ok(texts.length > 300, `found ${texts.length} texts`);
  assert.deepEqual(missing(texts), []);
});

test('fixed lists translated by lookup have Swedish (statuses, options, form labels)', () => {
  const lists = [
    ...Object.values(LIKELIHOOD), ...Object.values(DIFF), ...Object.values(CRITERIA), ...Object.values(STRENGTH),
    ...Object.values(LEVEL), ...Object.values(KIND), ...MOCA_DOMAINS.map((d) => d.label), ...[30, 20, 12, 5].map(mocaBand),
    ...GENDER_OPTIONS, ...EDUCATION_OPTIONS, ...EMPLOYMENT_OPTIONS.map((o) => o.label), ...FREQUENCY_OPTIONS.map((o) => o.label), ...DIFFICULTY_OPTIONS.map((o) => o.label),
    'Minimal', 'Mild', 'Moderate', 'Moderately severe', 'Severe', 'Present', 'Absent', 'Unclear',
    'Supervisor', 'Close colleague', 'Treating clinician', 'Follow-up', 'Intake screening', ...Object.values(ACTIONS),
    ...[INTERVIEW_FORM, RISK, INFORMANT].flatMap((s) => s.flatMap((sec) => [sec.title, ...sec.fields.flatMap((f) => [f.label, ...(f.options ?? []).map((o) => o[1])])])),
  ];
  assert.deepEqual(missing(lists), []);
});

test('fixed server messages have Swedish', () => {
  const texts = [];
  for (const f of ['server.js', 'access.js']) {
    for (const m of read(f).matchAll(/(?:title|message|error): '((?:[^'\\]|\\.)*)'|errors\.push\('((?:[^'\\]|\\.)*)'\)|errors: \['((?:[^'\\]|\\.)*)'\]/g)) {
      texts.push((m[1] ?? m[2] ?? m[3]).replace(/\\u2019/g, '’'));
    }
  }
  assert.ok(texts.length > 25);
  assert.deepEqual(missing(texts), []);
});

test('the translator fills in placeholders and falls back to English', () => {
  const sv = translator('sv');
  assert.equal(sv('Completed {date}', { date: '2026-01-01' }), 'Besvarad 2026-01-01');
  assert.equal(sv('Some text that has no translation'), 'Some text that has no translation');
  assert.equal(translator('en')('Completed {date}', { date: 'x' }), 'Completed x');
  assert.equal(translator('xx').language, 'en');
});

test('fixed sentences from clinical-forms.js have Swedish', async () => {
  const { finalizeBlocker, riskIndicators } = await import('../src/clinical-forms.js');
  const fixed = [
    finalizeBlocker({ interview: null }),
    ...riskIndicators({ answers: { pd16: 1 }, interview: { prev_attempt: 'one', self_harm_hist: 'recent', mse_delusions: 'yes' }, informant: { inf_safety: 'yes' } }),
  ];
  assert.equal(fixed.length, 6);
  assert.deepEqual(missing(fixed), []);
});
