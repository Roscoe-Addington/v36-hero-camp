// Feeding and eating disorders: checklists, codes, screening, BMI and
// medical warnings, combination rules, and Swedish for everything new.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISORDERS, findDisorder, criterionIds } from '../src/disorders.js';
import { evaluateDisorder, STATUS } from '../src/criteria.js';
import { DIFFERENTIALS } from '../src/differential-lists.js';
import { RULES, LEVEL, conflictsFor } from '../src/conflicts.js';
import { buildSuggestions, STRENGTH } from '../src/suggestions.js';
import { scoreAll } from '../src/scoring.js';
import { runDifferential } from '../src/differential.js';
import { parseBody, bmi, medicalWarnings } from '../src/body.js';
import { parseIntake } from '../src/intake.js';
import { translator, hasSwedish } from '../src/i18n-clinician.js';
import { checklistPage } from '../src/views-workflow.js';
import { answers } from './helpers.js';

const EATING = DISORDERS.filter((d) => d.category === 'eating');
const adult = { gender: 'Female', age: 30 };
const rate = (ids, value) => Object.fromEntries(ids.map((id) => [id, value]));

function suggest(overrides, intake, p = adult) {
  const a = answers(overrides);
  const results = scoreAll(a);
  results.differential = runDifferential(a, p, results);
  return buildSuggestions({ answers: a, results, patient: p, intake });
}
const strengthOf = (out, id) => out.suggestions.find((s) => s.disorderId === id)?.strength;
const withBody = (height, weight) => ({ body: { height_cm: height, weight_kg: weight, bmi: bmi(height, weight) } });

test('all eight DSM-5-TR feeding and eating disorders are in the catalog', () => {
  assert.deepEqual(EATING.map((d) => d.id), ['pica', 'rumination', 'arfid', 'anorexia', 'bulimia', 'bed', 'osfed', 'ufed']);
});

test('every text of the eating disorders has Swedish', () => {
  const texts = EATING.flatMap((d) => [
    d.name, d.note, d.codeNote,
    ...d.groups.flatMap((g) => [g.title, ...g.items.map((i) => i.label)]),
    ...d.specifiers.flatMap((sp) => [sp.label, ...sp.options.map((o) => o.label)]),
  ]).filter(Boolean);
  const ids = EATING.map((d) => d.id);
  for (const [id, list] of Object.entries(DIFFERENTIALS)) {
    for (const item of list) if (ids.includes(id) || ids.includes(item.id)) texts.push(item.why, ...(item.outside ? [item.name] : []));
  }
  for (const r of RULES) if (r.ids.some((id) => ids.includes(id))) texts.push(r.message);
  texts.push('Feeding and eating disorders');
  assert.deepEqual([...new Set(texts)].filter((x) => !hasSwedish(x)), []);
});

test('suggestion reasons and medical warnings for eating problems have Swedish', () => {
  const all = [
    suggest({ scoff1: 1, scoff2: 1, scoff3: 1, scoff4: 1, scoff5: 1, ed_binge: 1, ed_comp: 1, ed_arfid: 1, ed_pica: 1, ed_rum: 1 }, withBody(170, 40)),
    suggest({ ed_binge: 1, scoff2: 1 }),
    suggest({ scoff1: 1 }),
    suggest({ scoff3: 1, scoff4: 1 }, withBody(165, 60)),
    suggest({ scoff3: 1 }),
    suggest({ scoff2: 1 }),
    suggest({}, withBody(170, 51), { age: 17 }),
    suggest({}, withBody(170, 51)),
    suggest({}, withBody(170, 53)),
  ];
  const text = (x) => (typeof x === 'string' ? x : x.text);
  const reasons = all.flatMap((o) => o.suggestions.filter((s) => findDisorder(s.disorderId).category === 'eating').flatMap((s) => s.reasons.map(text)));
  const warnings = all.flatMap((o) => o.medical.flatMap((m) => [text(m.finding), text(m.action)]));
  assert.ok(reasons.length > 8 && warnings.length > 6);
  assert.deepEqual([...new Set([...reasons, ...warnings])].filter((x) => !hasSwedish(x)), []);
});

test('anorexia nervosa: three criteria; code F50.0 for both types', () => {
  const an = findDisorder('anorexia');
  assert.equal(evaluateDisorder(an, { ratings: rate(['an_a', 'an_b', 'an_c'], 'present') }, adult).status, STATUS.MET);
  assert.equal(evaluateDisorder(an, { ratings: { an_a: 'absent' } }, adult).status, STATUS.NOT_MET);
  assert.equal(an.code({ type: 'binge_purge' }), 'F50.0');
  assert.deepEqual(an.specifiers.find((s) => s.id === 'severity').options.map((o) => o.value), ['mild', 'moderate', 'severe', 'extreme']);
});

test('binge-eating disorder needs at least 3 of the 5 associated features', () => {
  const bed = findDisorder('bed');
  const base = rate(['bed_a1', 'bed_a2', 'bed_c', 'bed_d', 'bed_e'], 'present');
  const two = { ...rate(['bed_b1', 'bed_b2'], 'present'), ...rate(['bed_b3', 'bed_b4', 'bed_b5'], 'absent') };
  assert.equal(evaluateDisorder(bed, { ratings: { ...base, ...two } }, adult).status, STATUS.NOT_MET);
  assert.equal(evaluateDisorder(bed, { ratings: { ...base, ...two, bed_b3: 'present' } }, adult).status, STATUS.MET);
});

test('ARFID needs at least one consequence (weight loss, deficiency, supplements or impairment)', () => {
  const arfid = findDisorder('arfid');
  const rest = rate(['arfid_a', 'arfid_b', 'arfid_c', 'arfid_d'], 'present');
  assert.equal(evaluateDisorder(arfid, { ratings: { ...rest, ...rate(criterionIds(arfid).filter((id) => /arfid_a\d/.test(id)), 'absent') } }, adult).status, STATUS.NOT_MET);
  assert.equal(evaluateDisorder(arfid, { ratings: { ...rest, arfid_a2: 'present' } }, adult).status, STATUS.MET);
});

test('codes: bulimia F50.2, other specified by presentation, unspecified F50.9', () => {
  assert.equal(findDisorder('bulimia').code({}), 'F50.2');
  const osfed = findDisorder('osfed');
  assert.equal(osfed.code({ presentation: 'atypical_an' }), 'F50.1');
  assert.equal(osfed.code({ presentation: 'bn_low' }), 'F50.3');
  assert.equal(osfed.code({ presentation: 'purging' }), 'F50.8');
  assert.equal(findDisorder('ufed').code({}), 'F50.9');
});

test('anorexia "wins": bulimia, BED and ARFID cannot be given with it; depression needs a check', () => {
  assert.equal(conflictsFor('bulimia', ['anorexia'])[0].level, LEVEL.CONFLICT);
  assert.equal(conflictsFor('bed', ['anorexia'])[0].level, LEVEL.CONFLICT);
  assert.equal(conflictsFor('arfid', ['anorexia'])[0].level, LEVEL.CONFLICT);
  assert.equal(conflictsFor('osfed', ['bulimia'])[0].level, LEVEL.CONFLICT);
  assert.equal(conflictsFor('mdd', ['anorexia'])[0].level, LEVEL.CHECK);
  assert.deepEqual(conflictsFor('pica', ['mdd']), []);
});

test('screening: which eating disorder is suggested', () => {
  assert.equal(strengthOf(suggest({}), 'anorexia'), undefined, 'nothing without answers');
  assert.equal(strengthOf(suggest({ scoff3: 1, scoff4: 1 }), 'anorexia'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(suggest({ scoff2: 1, scoff5: 1 }), 'anorexia'), STRENGTH.CONSIDER);
  assert.equal(strengthOf(suggest({ ed_binge: 1, ed_comp: 1 }), 'bulimia'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(suggest({ ed_binge: 1, ed_comp: 1 }), 'bed'), undefined, 'binge eating with purging is not BED');
  assert.equal(strengthOf(suggest({ ed_binge: 1 }), 'bed'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(suggest({ scoff1: 1 }), 'osfed'), STRENGTH.CONSIDER, 'purging only: purging disorder');
  assert.equal(strengthOf(suggest({ ed_arfid: 1 }), 'arfid'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(suggest({ ed_pica: 1 }), 'pica'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(suggest({ ed_rum: 1 }), 'rumination'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(suggest({ scoff5: 1 }, withBody(170, 48)), 'anorexia'), STRENGTH.SUGGESTED, 'low BMI and food dominating life');
});

test('BMI: worked out from height and weight, both or neither, within range', () => {
  assert.equal(bmi(170, 52), 18);
  assert.deepEqual(parseBody({}), { body: null });
  assert.deepEqual(parseBody({ height_cm: '165,5', weight_kg: '50' }).body, { height_cm: 165.5, weight_kg: 50, bmi: 18.3 });
  assert.ok(parseBody({ height_cm: '170' }).errors);
  assert.ok(parseBody({ height_cm: '17', weight_kg: '50' }).errors);
  assert.ok(parseIntake({ height_cm: '170', weight_kg: '600' }).errors);
  assert.equal(parseIntake({ height_cm: '170', weight_kg: '50' }).intake.body.bmi, 17.3);
});

test('medical warnings: very low BMI is urgent; purging needs electrolytes; under 18 uses BMI for age', () => {
  const urgent = medicalWarnings({ body: { bmi: 14.2 }, patient: adult });
  assert.equal(urgent[0].urgent, true);
  assert.equal(urgent[0].finding.text, 'BMI {bmi}: very low weight');
  assert.equal(medicalWarnings({ body: { bmi: 16.5 }, patient: adult })[0].urgent, false);
  assert.deepEqual(medicalWarnings({ body: { bmi: 21 }, patient: adult }), []);
  assert.match(medicalWarnings({ answers: { ed_comp: 1 }, patient: adult })[0].action, /potassium/);
  assert.match(medicalWarnings({ body: { bmi: 17 }, patient: { age: 17 } })[0].finding.text, /ISO-BMI/);
  assert.match(medicalWarnings({ answers: { scoff3: 1 }, patient: adult })[0].action, /Measure height and weight/);
});

test('the depression screen flags a possible eating disorder', () => {
  const a = answers({ scoff2: 1, scoff5: 1 });
  const results = scoreAll(a);
  const entry = runDifferential(a, adult, results).entries.find((e) => e.id === 'eating');
  assert.equal(entry.status, 'Screen positive — evaluate');
  assert.equal(runDifferential(answers({ scoff5: 1 }), adult, results).entries.find((e) => e.id === 'eating').status, 'Unclear or partial — clarify in interview');
});

test('the anorexia checklist page is in Swedish for a Swedish clinician, English otherwise', () => {
  const c = {
    assessment: { id: 1, created_at: '2026-11-15 10:00' }, patient: { id: 1, first_name: 'A', last_name: 'B', age: 30, gender: 'Female' },
    checklists: {}, diagnoses: { items: [] }, readOnly: false,
  };
  const disorder = findDisorder('anorexia');
  const sv = String(checklistPage({ clinician: { name: 'Dr', language: 'sv' }, c, disorder }));
  assert.ok(sv.includes('Intensiv rädsla för att gå upp i vikt'));
  assert.ok(sv.includes('Restriktiv typ'));
  assert.ok(sv.includes('Undvikande/restriktiv ätstörning (ARFID)'), 'rule-out list in Swedish');
  assert.ok(!sv.includes('Intense fear of gaining weight'));
  const en = String(checklistPage({ clinician: { name: 'Dr', language: 'en' }, c, disorder }));
  assert.ok(en.includes('Intense fear of gaining weight'));
  const t = translator('sv');
  assert.equal(t('Binge-eating disorder'), 'Hetsätningsstörning');
});
