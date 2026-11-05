import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runDifferential, STATUS, auditCThreshold } from '../src/differential.js';
import { scoreAll } from '../src/scoring.js';
import { answers } from './helpers.js';

const woman40 = { gender: 'Female', age: 40 };
const man40 = { gender: 'Male', age: 40 };

// Runs scoring + differential and returns the entry for one condition.
function entry(id, overrides, patient = woman40) {
  const a = answers(overrides);
  const diff = runDifferential(a, patient, scoreAll(a));
  return diff.entries.find((e) => e.id === id);
}

// Symptoms meeting the MDD algorithm (5 symptoms incl. core, total 10).
const MDD = { phq1: 2, phq2: 2, phq3: 2, phq4: 2, phq7: 2 };

test('all "No" answers: nothing flagged, only clinician-assessed items remain', () => {
  const a = answers();
  const diff = runDifferential(a, woman40, scoreAll(a));
  assert.deepEqual(diff.summary.flagged, []);
  assert.deepEqual(diff.summary.possible, []);
  assert.deepEqual(diff.summary.priority, []);
  for (const e of diff.entries) {
    assert.ok([STATUS.NOT_INDICATED, STATUS.CLINICIAN].includes(e.status), e.id);
  }
});

test('every entry records why, the rule, the evidence and a next step', () => {
  const a = answers();
  const diff = runDifferential(a, woman40, scoreAll(a));
  assert.ok(diff.summary.checked >= 15);
  for (const e of diff.entries) {
    assert.ok(e.why && e.rule && e.finding && e.implication && e.nextStep, e.id);
    for (const ev of e.evidence) assert.ok(ev.question && ev.answer, `${e.id}/${ev.id}`);
  }
});

test('bipolar: elevated mood + less sleep is flagged as priority and sorted first', () => {
  const a = answers({ bp1: 1, bp2: 1 });
  const diff = runDifferential(a, woman40, scoreAll(a));
  assert.equal(diff.entries[0].id, 'bipolar');
  assert.equal(diff.entries[0].status, STATUS.FLAGGED);
  assert.deepEqual(diff.summary.priority, ['Bipolar I or II disorder']);
});

test('bipolar: elevated mood alone is only "unclear"', () => {
  assert.equal(entry('bipolar', { bp1: 1, bp2: 0, bp3: 0 }).status, STATUS.POSSIBLE);
});

test('psychosis item is a priority flag', () => {
  const e = entry('psychosis', { psy1: 1 });
  assert.equal(e.status, STATUS.FLAGGED);
  assert.equal(e.priority, true);
});

test('AUDIT-C uses the gender cut-off: 3 is positive for women, not for men', () => {
  assert.equal(auditCThreshold('Female'), 3);
  assert.equal(auditCThreshold('Male'), 4);
  assert.equal(auditCThreshold('Prefer not to say'), 3);
  const drinks = { auditc1: 2, auditc2: 1, auditc3: 0 }; // total 3
  assert.equal(entry('substance', drinks, woman40).status, STATUS.FLAGGED);
  assert.equal(entry('substance', drinks, man40).status, STATUS.NOT_INDICATED);
});

test('any drug use is flagged', () => {
  assert.equal(entry('substance', { drug1: 1 }).status, STATUS.FLAGGED);
});

test('adjustment disorder: flagged only when MDD/GAD criteria are NOT met', () => {
  // Stressor + mild symptoms, criteria not met -> strong alternative
  assert.equal(entry('adjustment', { stress1: 1, phq1: 1, phq2: 1, phq3: 1, phq4: 1, phq7: 1 }).status, STATUS.FLAGGED);
  // Stressor + MDD criteria met -> MDD takes precedence, only "unclear"
  assert.equal(entry('adjustment', { stress1: 1, ...MDD }).status, STATUS.POSSIBLE);
  // No stressor
  assert.equal(entry('adjustment', { ...MDD }).status, STATUS.NOT_INDICATED);
});

test('grief: recent death is unclear; >12 months with ongoing grief flags prolonged grief', () => {
  assert.equal(entry('grief', { grief1: 1 }).status, STATUS.POSSIBLE);
  assert.equal(entry('grief', { grief1: 2, grief2: 1 }).status, STATUS.FLAGGED);
  assert.equal(entry('grief', { grief1: 2, grief2: 0 }).status, STATUS.NOT_INDICATED);
});

test('PC-PTSD-5: scored only with trauma exposure; 3+ is positive', () => {
  const symptoms = { ptsd1: 1, ptsd2: 1, ptsd3: 1 };
  assert.equal(entry('ptsd', { ptsd0: 0, ...symptoms }).status, STATUS.NOT_INDICATED);
  assert.equal(entry('ptsd', { ptsd0: 1, ...symptoms }).status, STATUS.FLAGGED);
  assert.equal(entry('ptsd', { ptsd0: 1, ptsd1: 1 }).status, STATUS.POSSIBLE);
});

test('panic: attacks + worry about more attacks is flagged; attacks alone are unclear', () => {
  assert.equal(entry('panic', { panic1: 1, panic2: 1 }).status, STATUS.FLAGGED);
  assert.equal(entry('panic', { panic1: 1, panic2: 0 }).status, STATUS.POSSIBLE);
});

test('medical: illness-linked onset flagged; peripartum note only for female patients', () => {
  const f = entry('medical', { medonset: 1 }, woman40);
  assert.equal(f.status, STATUS.FLAGGED);
  assert.match(f.finding, /peripartum/);
  assert.doesNotMatch(entry('medical', { medonset: 1 }, man40).finding, /peripartum/);
  assert.equal(entry('medical', { medcond: 1 }).status, STATUS.POSSIBLE);
});

test('persistent depressive disorder notes co-occurring MDD', () => {
  assert.match(entry('pdd', { pdd1: 1, ...MDD }).finding, /AND current major depressive syndrome/);
});

test('neurocognitive entry highlights patients aged 60+', () => {
  assert.match(entry('neurocognitive', {}, { gender: 'Male', age: 72 }).finding, /Patient is 72: assess cognition/);
});

test('overlap: warns when the MDD count depends on symptoms shared with anxiety', () => {
  // MDD with exactly 5 symptoms, 3 of them (sleep, fatigue, concentration)
  // also endorsed on the anxiety side.
  const a = answers({ ...MDD, gadC6: 1, gadC2: 1, gadC3: 1 });
  const diff = runDifferential(a, woman40, scoreAll(a));
  assert.equal(diff.overlap.bothCount, 3);
  assert.equal(diff.overlap.mddSymptomCountWithoutShared, 2);
  assert.ok(diff.overlap.notes.some((n) => n.includes('falls to 2')));
});
