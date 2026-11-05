import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreDepression, scoreAnxiety, scoreAll, LIKELIHOOD, phq9Severity, gad7Severity } from '../src/scoring.js';
import { parseAnswers } from '../src/questionnaire.js';
import { answers } from './helpers.js';

test('PHQ-9 severity bands match the published cut-offs', () => {
  assert.equal(phq9Severity(4), 'Minimal');
  assert.equal(phq9Severity(5), 'Mild');
  assert.equal(phq9Severity(10), 'Moderate');
  assert.equal(phq9Severity(15), 'Moderately severe');
  assert.equal(phq9Severity(20), 'Severe');
});

test('GAD-7 severity bands match the published cut-offs', () => {
  assert.equal(gad7Severity(4), 'Minimal');
  assert.equal(gad7Severity(5), 'Mild');
  assert.equal(gad7Severity(10), 'Moderate');
  assert.equal(gad7Severity(15), 'Severe');
});

test('all zeros gives minimal likelihood and no safety flag', () => {
  const result = scoreAll(answers());
  assert.equal(result.depression.likelihood, LIKELIHOOD.MINIMAL);
  assert.equal(result.anxiety.likelihood, LIKELIHOOD.MINIMAL);
  assert.equal(result.safetyFlag, false);
});

test('5 symptoms at "more than half the days" including a core symptom meets major depressive syndrome', () => {
  const d = scoreDepression(answers({ phq1: 2, phq3: 2, phq4: 2, phq5: 2, phq7: 2 }));
  assert.equal(d.total, 10);
  assert.equal(d.symptomCount, 5);
  assert.equal(d.meetsMajorCriteria, true);
  assert.equal(d.likelihood, LIKELIHOOD.HIGH);
});

test('5 symptoms WITHOUT a core symptom (item 1 or 2) does not meet major depressive syndrome', () => {
  const d = scoreDepression(answers({ phq3: 2, phq4: 2, phq5: 2, phq6: 2, phq7: 2 }));
  assert.equal(d.meetsMajorCriteria, false);
  assert.equal(d.syndrome, 'Symptom criteria not met');
  // Total is 10, so the score alone still raises the likelihood.
  assert.equal(d.likelihood, LIKELIHOOD.MODERATE);
});

test('item 9 counts toward the symptom count at "several days"', () => {
  const d = scoreDepression(answers({ phq2: 2, phq3: 2, phq4: 2, phq6: 2, phq9: 1 }));
  assert.equal(d.symptomCount, 5);
  assert.equal(d.meetsMajorCriteria, true);
});

test('any answer on item 9 raises the safety flag', () => {
  assert.equal(scoreAll(answers({ phq9: 1 })).safetyFlag, true);
  assert.equal(scoreAll(answers({ phq9: 3 })).safetyFlag, true);
});

test('symptoms only on "several days" are reported as subclinical', () => {
  const d = scoreDepression(answers({ phq1: 1, phq3: 1, phq4: 1, phq7: 1, phq8: 1 }));
  assert.equal(d.total, 5);
  assert.equal(d.symptomCount, 0);
  assert.equal(d.likelihood, LIKELIHOOD.SUBCLINICAL);
  assert.equal(d.subclinicalSymptoms.length, 5);
});

test('2-4 counted symptoms with a core symptom is "other depressive syndrome"', () => {
  const d = scoreDepression(answers({ phq2: 2, phq4: 2, phq7: 2 }));
  assert.equal(d.syndrome, 'Other (subthreshold) depressive syndrome');
  assert.equal(d.likelihood, LIKELIHOOD.SUBCLINICAL);
});

test('GAD: criteria A, B and 3 associated symptoms with GAD-7 >= 10 gives high likelihood', () => {
  const a = scoreAnxiety(answers({
    gad1: 2, gad2: 2, gad3: 2, gad4: 2, gad5: 1, gad6: 1,
    gadA: 1, gadB: 1, gadC1: 1, gadC3: 1, gadC5: 1,
  }));
  assert.equal(a.total, 10);
  assert.equal(a.meetsCriteriaABC, true);
  assert.equal(a.likelihood, LIKELIHOOD.HIGH);
});

test('GAD: only 2 associated symptoms does not meet criterion C', () => {
  const a = scoreAnxiety(answers({ gadA: 1, gadB: 1, gadC1: 1, gadC2: 1 }));
  assert.equal(a.criteria.C, false);
  assert.equal(a.meetsCriteriaABC, false);
  assert.equal(a.likelihood, LIKELIHOOD.SUBCLINICAL);
});

test('GAD: high GAD-7 without 6 months of worry is moderate and adds a note', () => {
  const a = scoreAnxiety(answers({ gad1: 3, gad2: 3, gad3: 3, gad4: 3 }));
  assert.equal(a.total, 12);
  assert.equal(a.likelihood, LIKELIHOOD.MODERATE);
  assert.equal(a.notes.length, 1);
});

test('parseAnswers rejects missing and out-of-range values', () => {
  const body = Object.fromEntries(Object.entries(answers()).map(([k, v]) => [k, String(v)]));
  assert.deepEqual(parseAnswers(body).errors, []);

  const missing = { ...body };
  delete missing.phq4;
  assert.deepEqual(parseAnswers(missing).errors, ['phq4']);

  assert.deepEqual(parseAnswers({ ...body, phq1: '7' }).errors, ['phq1']);
  assert.deepEqual(parseAnswers({ ...body, gadA: '2' }).errors, ['gadA']);
});
