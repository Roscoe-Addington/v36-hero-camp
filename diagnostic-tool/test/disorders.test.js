import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISORDERS, findDisorder, criterionIds } from '../src/disorders.js';
import { evaluateRule, evaluateDisorder, STATUS } from '../src/criteria.js';

const adult = { age: 30 };
const teen = { age: 17 };
const rate = (ids, value) => Object.fromEntries(ids.map((id) => [id, value]));

test('three-valued logic: unknown items keep a rule undecided', () => {
  const rule = { all: ['a', { count: ['b', 'c', 'd'], min: 2 }] };
  assert.equal(evaluateRule(rule, { a: 'present', b: 'present', c: 'present' }, adult), true);
  assert.equal(evaluateRule(rule, { a: 'present', b: 'present' }, adult), null); // c, d unknown
  assert.equal(evaluateRule(rule, { a: 'present', b: 'absent', c: 'absent' }, adult), false); // max 1 possible
  assert.equal(evaluateRule(rule, { a: 'absent' }, adult), false);
  assert.equal(evaluateRule(rule, { a: 'unclear', b: 'present', c: 'present' }, adult), null);
  assert.equal(evaluateRule({ not: 'a' }, {}, adult), null);
  assert.equal(evaluateRule({ age: { min: 18 } }, {}, teen), false);
});

test('catalog: 31 disorders in 4 categories, with unique criterion ids', () => {
  assert.equal(DISORDERS.length, 31);
  const all = DISORDERS.flatMap(criterionIds);
  assert.equal(new Set(all).size, all.length, 'duplicate criterion id');
  assert.equal(new Set(DISORDERS.map((d) => d.id)).size, DISORDERS.length);
});

for (const disorder of DISORDERS) {
  test(`${disorder.name}: all present -> met, all absent -> not met, unrated -> incomplete`, () => {
    const patient = disorder.id === 'dmdd' ? teen : adult;
    const idsList = criterionIds(disorder);
    assert.equal(evaluateDisorder(disorder, { ratings: rate(idsList, 'present') }, patient).status, STATUS.MET);
    assert.equal(evaluateDisorder(disorder, { ratings: rate(idsList, 'absent') }, patient).status, STATUS.NOT_MET);
    assert.equal(evaluateDisorder(disorder, { ratings: {} }, patient).status, STATUS.INCOMPLETE);
    assert.ok(disorder.code({}), 'has a code');
  });
}

test('MDD needs 5 symptoms including mood or interest', () => {
  const mdd = findDisorder('mdd');
  const rest = rate(['mdd_b', 'mdd_c', 'mdd_d', 'mdd_e'], 'present');
  const noCore = rate(['mdd_a1', 'mdd_a2'], 'absent');
  const five = rate(['mdd_a3', 'mdd_a4', 'mdd_a5', 'mdd_a6', 'mdd_a7'], 'present');
  assert.equal(evaluateDisorder(mdd, { ratings: { ...rest, ...noCore, ...five } }, adult).status, STATUS.NOT_MET);
  const withMood = { ...rest, ...five, mdd_a1: 'present' };
  assert.equal(evaluateDisorder(mdd, { ratings: withMood }, adult).status, STATUS.MET);
});

test('MDD codes: F32/F33 with severity and psychotic features', () => {
  const { code } = findDisorder('mdd');
  assert.equal(code({ episode: 'single', severity: 'moderate', psychotic: 'no' }), 'F32.1');
  assert.equal(code({ episode: 'recurrent', severity: 'severe', psychotic: 'no' }), 'F33.2');
  assert.equal(code({ episode: 'recurrent', severity: 'severe', psychotic: 'yes' }), 'F33.3');
  assert.equal(code({ episode: 'single' }), 'F32.9');
});

test('bipolar I: irritable-only mood needs 4 symptoms instead of 3', () => {
  const bp = findDisorder('bipolar1');
  const base = rate(['bp1_a', 'bp1_c', 'bp1_d', 'bp1_e'], 'present');
  const three = { ...rate(['bp1_b1', 'bp1_b2', 'bp1_b3'], 'present'), ...rate(['bp1_b4', 'bp1_b5', 'bp1_b6', 'bp1_b7'], 'absent') };
  assert.equal(evaluateDisorder(bp, { ratings: { ...base, ...three, bp1_irr: 'absent' } }, adult).status, STATUS.MET);
  assert.equal(evaluateDisorder(bp, { ratings: { ...base, ...three, bp1_irr: 'present' } }, adult).status, STATUS.NOT_MET);
  assert.equal(bp.code({ episode: 'dep_severe_psy' }), 'F31.5');
});

test('antisocial PD cannot be met under 18, even with every criterion present', () => {
  const aspd = findDisorder('aspd');
  const all = rate(criterionIds(aspd), 'present');
  assert.equal(evaluateDisorder(aspd, { ratings: all }, teen).status, STATUS.NOT_MET);
  assert.equal(evaluateDisorder(aspd, { ratings: all }, adult).status, STATUS.MET);
});

test('DMDD cannot be met over 18', () => {
  const dmdd = findDisorder('dmdd');
  assert.equal(evaluateDisorder(dmdd, { ratings: rate(criterionIds(dmdd), 'present') }, { age: 25 }).status, STATUS.NOT_MET);
});

test('dementia code depends on the cause', () => {
  const { code } = findDisorder('major_ncd');
  assert.equal(code({ etiology: 'alzheimer' }), 'F00.9 + G30.9');
  assert.equal(code({}), 'F03');
});

test('evaluateDisorder explains count rules', () => {
  const bpd = findDisorder('bpd');
  const r = evaluateDisorder(bpd, { ratings: rate(['bpd_1', 'bpd_2', 'bpd_3'], 'present') }, adult);
  assert.deepEqual(r.counts.map((c) => [c.present, c.of, c.min]), [[3, 9, 5]]);
});
