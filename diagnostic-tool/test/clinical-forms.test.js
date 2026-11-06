import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseForm } from '../src/forms.js';
import { parseInterview, parseRisk, parseInformant, riskIndicators, finalizeBlocker, INTERVIEW_FORM, RISK, INFORMANT } from '../src/clinical-forms.js';
import { buildSuggestions, STRENGTH } from '../src/suggestions.js';
import { scoreAll } from '../src/scoring.js';
import { runDifferential } from '../src/differential.js';
import { answers } from './helpers.js';

const schema = [{ title: 'T', fields: [
  { id: 'a', type: 'choice', label: 'A', options: [['x', 'X'], ['y', 'Y']], required: true },
  { id: 'b', type: 'checks', label: 'B', options: [['p', 'P'], ['q', 'Q']] },
  { id: 'c', type: 'text', label: 'C' },
] }];

test('parseForm keeps only allowed options and reports missing required fields', () => {
  const ok = parseForm(schema, { a: 'x', b: ['p', 'evil'], c: '  hello  ' });
  assert.deepEqual(ok.values, { a: 'x', b: ['p'], c: 'hello' });
  assert.deepEqual(ok.errors, []);
  const bad = parseForm(schema, { a: 'not-an-option', b: 'q' });
  assert.deepEqual(bad.values.b, ['q'], 'a single checkbox arrives as a string');
  assert.deepEqual(bad.errors, ['A: this is required.']);
});

test('every schema field has a unique id and checks/choices have options', () => {
  for (const s of [INTERVIEW_FORM, RISK, INFORMANT]) {
    const fields = s.flatMap((x) => x.fields);
    assert.equal(new Set(fields.map((f) => f.id)).size, fields.length);
    for (const f of fields) if (['choice', 'checks'].includes(f.type)) assert.ok(f.options.length >= 2, f.id);
  }
});

test('interview needs a reason; risk needs thoughts, formulation, immediate action and plan', () => {
  assert.ok(parseInterview({}).errors);
  assert.ok(parseInterview({ reason: 'Low mood' }).interview.updated_at);
  assert.equal(parseRisk({ ideation: 'passive' }).errors.length, 3);
  const r = parseRisk({ ideation: 'passive', formulation: 'x', immediate: 'no', plan: 'Review in 1 week' });
  assert.equal(r.risk.ideation, 'passive');
});

test('informant information needs the patient’s consent', () => {
  const base = { inf_name: 'Anna', inf_relationship: 'Daughter' };
  assert.match(parseInformant({ ...base, inf_consent: 'no' }).errors[0], /agreed/);
  assert.equal(parseInformant({ ...base, inf_consent: 'yes' }).informant.inf_name, 'Anna');
});

function caseFor(overrides = {}, extra = {}) {
  const a = answers(overrides);
  const results = scoreAll(a);
  results.differential = runDifferential(a, { gender: 'Female', age: 40 }, results);
  return { answers: a, results, interview: { reason: 'x', updated_at: 'now' }, ...extra };
}

test('risk assessment is required by item 9, self-harm, previous attempts or informant worry', () => {
  assert.deepEqual(riskIndicators(caseFor()), []);
  assert.equal(riskIndicators(caseFor({ phq9: 1 })).length, 1);
  assert.equal(riskIndicators(caseFor({ pd16: 1 })).length, 1);
  assert.equal(riskIndicators(caseFor({}, { interview: { prev_attempt: 'one' } })).length, 1);
  assert.equal(riskIndicators(caseFor({}, { informant: { inf_safety: 'yes' } })).length, 1);
});

test('finalizing is blocked without the interview, and without a required risk assessment', () => {
  assert.match(finalizeBlocker(caseFor({}, { interview: null })), /intake interview/);
  assert.equal(finalizeBlocker(caseFor()), null);
  assert.match(finalizeBlocker(caseFor({ phq9: 2 })), /risk assessment is required/);
  assert.equal(finalizeBlocker(caseFor({ phq9: 2 }, { risk: { updated_at: 'now' } })), null);
});

test('interview and informant findings change the suggestions', () => {
  const c = caseFor({ phq1: 2, phq2: 2, phq3: 2, phq4: 2, phq7: 2 });
  const patient = { gender: 'Female', age: 70 };
  const out = buildSuggestions({
    answers: c.answers, results: c.results, patient,
    interview: { family: ['bipolar'], mse_orientation: 'disoriented' },
    informant: { inf_relationship: 'son', inf_elevated: 'yes', inf_memory: 'yes', inf_daily: 'yes' },
  });
  const strength = (id) => out.suggestions.find((s) => s.disorderId === id)?.strength;
  assert.match(out.suggestions.find((s) => s.disorderId === 'mdd').reasons.join(' '), /Family history of bipolar/);
  assert.equal(strength('bipolar1'), STRENGTH.SUGGESTED);
  assert.equal(strength('delirium'), STRENGTH.SUGGESTED);
  assert.equal(strength('major_ncd'), STRENGTH.SUGGESTED);
});
