import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSuggestions, personalityScreen, STRENGTH } from '../src/suggestions.js';
import { scoreMoca, parseMoca, defaultLowEducation } from '../src/moca.js';
import { scoreAll } from '../src/scoring.js';
import { runDifferential } from '../src/differential.js';
import { answers } from './helpers.js';

const patient = { gender: 'Female', age: 40, education: 'University — bachelor level' };

function suggest(overrides, intake, p = patient) {
  const a = answers(overrides);
  const results = scoreAll(a);
  results.differential = runDifferential(a, p, results);
  return buildSuggestions({ answers: a, results, patient: p, intake });
}
const strengthOf = (out, id) => out.suggestions.find((s) => s.disorderId === id)?.strength;

test('no symptoms: no suggestions', () => {
  const out = suggest({});
  assert.deepEqual(out.suggestions, []);
  assert.deepEqual(out.neuroReferral, []);
});

test('depression screen suggests MDD with the reason', () => {
  const out = suggest({ phq1: 2, phq2: 2, phq3: 2, phq4: 2, phq7: 2 });
  const mdd = out.suggestions.find((s) => s.disorderId === 'mdd');
  assert.equal(mdd.strength, STRENGTH.SUGGESTED);
  assert.match(mdd.reasons[0], /PHQ-9 10\/27/);
});

test('anxiety items suggest the matching anxiety disorders', () => {
  const out = suggest({ panic1: 1, panic2: 1, agora1: 1, phobia1: 1, sep1: 1, soc2: 1 });
  assert.equal(strengthOf(out, 'panic'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(out, 'agoraphobia'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(out, 'phobia'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(out, 'separation'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(out, 'social'), STRENGTH.CONSIDER);
});

test('personality screen: pd3 counts when the answer is NO', () => {
  assert.equal(personalityScreen(answers({ pd3: 0 })).score, 1);
  assert.equal(personalityScreen(answers({ pd3: 1 })).score, 0);
});

test('specific personality disorders are only suggested when the overall screen is positive', () => {
  assert.equal(strengthOf(suggest({ pd3: 1, pd8: 1 }), 'ocpd'), undefined); // screen 1/8
  assert.equal(strengthOf(suggest({ pd3: 1, pd8: 1, pd6: 1, pd2: 1 }), 'ocpd'), STRENGTH.CONSIDER); // 3/8
});

test('borderline traits: 5 or more suggests borderline PD', () => {
  const out = suggest({ pd4: 1, pd5: 1, pd14: 1, pd15: 1, pd17: 1 });
  assert.equal(strengthOf(out, 'bpd'), STRENGTH.SUGGESTED);
});

test('MoCA: education point, cap at 30, and bands', () => {
  const domains = { visexec: 4, naming: 3, attention: 5, language: 2, abstraction: 2, recall: 3, orientation: 6 }; // 25
  assert.equal(scoreMoca({ administered: true, domains, lowEducation: false }).adjusted, 25);
  const low = scoreMoca({ administered: true, domains, lowEducation: true });
  assert.equal(low.adjusted, 26);
  assert.equal(low.belowCutoff, false);
  const full = { visexec: 5, naming: 3, attention: 6, language: 3, abstraction: 2, recall: 5, orientation: 6 };
  assert.equal(scoreMoca({ administered: true, domains: full, lowEducation: true }).adjusted, 30);
  assert.equal(scoreMoca({ administered: false }), null);
  assert.equal(defaultLowEducation({ education: 'Upper secondary school' }), true);
});

test('MoCA form validation rejects out-of-range scores', () => {
  const { errors } = parseMoca({ moca_administered: 'yes', moca_visexec: '9' });
  assert.ok(errors.some((e) => e.includes('Visuospatial')));
  assert.equal(errors.length, 7); // one too high + six missing
});

test('MoCA below cut-off suggests mild NCD; below 18 suggests major NCD', () => {
  const mild = { visexec: 3, naming: 3, attention: 5, language: 2, abstraction: 1, recall: 2, orientation: 6 }; // 22
  assert.equal(strengthOf(suggest({}, { moca: { administered: true, domains: mild } }), 'mild_ncd'), STRENGTH.SUGGESTED);
  const severe = { visexec: 1, naming: 2, attention: 3, language: 1, abstraction: 0, recall: 0, orientation: 4 }; // 11
  assert.equal(strengthOf(suggest({}, { moca: { administered: true, domains: severe } }), 'major_ncd'), STRENGTH.SUGGESTED);
});

test('memory complaint without MoCA asks for the MoCA', () => {
  const out = suggest({ cog1: 1 }, null, { ...patient, age: 70 });
  const s = out.suggestions.find((x) => x.disorderId === 'mild_ncd');
  assert.equal(s.strength, STRENGTH.SUGGESTED);
  assert.match(s.reasons[0], /Give the MoCA/);
});

test('delirium suggested from clinician observations (CAM-style rule)', () => {
  const obs = { acute: 'yes', inattention: 'yes', disorganized: 'no', consciousness: 'yes' };
  assert.equal(strengthOf(suggest({}, { delirium: obs }), 'delirium'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(suggest({}, { delirium: { ...obs, inattention: 'no' } }), 'delirium'), undefined);
});

test('neurological red flags give referrals, with urgent ones marked', () => {
  const out = suggest({ neuro2: 1, neuro4: 1 });
  assert.equal(out.neuroReferral.length, 2);
  assert.equal(out.neuroReferral.find((n) => n.finding.startsWith('New weakness')).urgent, true);
});

test('findings outside the app scope are listed, not suggested', () => {
  const out = suggest({ ill1: 1, auditc1: 4, auditc2: 3, auditc3: 3 });
  assert.deepEqual(out.outOfScope.map((o) => o.condition), ['Illness anxiety disorder', 'Substance use disorder']);
});

test('psychosis lasting more than a month, not only in mood episodes, suggests schizophrenia', () => {
  const out = suggest({ psy1: 1, psy2: 0, psy3: 1 });
  assert.equal(strengthOf(out, 'schizophrenia'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(out, 'schizophreniform'), STRENGTH.CONSIDER);
  assert.equal(strengthOf(out, 'delusional'), STRENGTH.CONSIDER);
});

test('psychosis under a month suggests brief psychotic disorder', () => {
  assert.equal(strengthOf(suggest({ psy1: 1, psy2: 0, psy3: 0 }), 'brief_psychotic'), STRENGTH.SUGGESTED);
});

test('psychosis only during mood episodes points to the mood disorder, not schizophrenia', () => {
  const out = suggest({ psy1: 1, psy2: 1, phq1: 2, phq2: 2, phq3: 2, phq4: 2, phq7: 2 });
  assert.match(out.suggestions.find((s) => s.disorderId === 'mdd').reasons.join(' '), /psychotic features/);
  assert.equal(strengthOf(out, 'schizophrenia'), undefined);
  assert.equal(strengthOf(out, 'schizoaffective'), STRENGTH.CONSIDER);
});

test('psychosis with substance use suggests substance-induced psychotic disorder', () => {
  assert.equal(strengthOf(suggest({ psy1: 1, psy3: 1, drug1: 2 }), 'substance_psychotic'), STRENGTH.SUGGESTED);
});

test('trauma: PC-PTSD-5 3+ suggests PTSD, or acute stress disorder within the first month', () => {
  const symptoms = { ptsd0: 1, ptsd1: 1, ptsd2: 1, ptsd3: 1 };
  assert.equal(strengthOf(suggest({ ...symptoms, ptsd_recent: 0 }), 'ptsd'), STRENGTH.SUGGESTED);
  const recent = suggest({ ...symptoms, ptsd_recent: 1 });
  assert.equal(strengthOf(recent, 'acute_stress'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(recent, 'ptsd'), undefined);
});

test('adjustment disorder is only suggested when MDD/GAD criteria are not met', () => {
  const mild = { stress1: 1, phq1: 1, phq2: 1, phq3: 1, phq4: 1, phq7: 1 };
  assert.equal(strengthOf(suggest(mild), 'adjustment'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(suggest({ stress1: 1, phq1: 2, phq2: 2, phq3: 2, phq4: 2, phq7: 2 }), 'adjustment'), undefined);
});

test('prolonged grief: more than 12 months with ongoing longing', () => {
  assert.equal(strengthOf(suggest({ grief1: 2, grief2: 1 }), 'pgd'), STRENGTH.SUGGESTED);
  assert.equal(strengthOf(suggest({ grief1: 1, grief2: 1 }), 'pgd'), undefined); // adult, under 12 months
});

test('obsessive-compulsive and related items suggest the matching disorders', () => {
  const out = suggest({ ocd1: 1, bdd1: 1, hoard1: 1, trich1: 1, skin1: 1 });
  for (const id of ['ocd', 'bdd', 'hoarding', 'trich', 'skin_picking']) assert.equal(strengthOf(out, id), STRENGTH.SUGGESTED, id);
});

test('catatonic signs observed by the clinician suggest catatonia', () => {
  assert.equal(strengthOf(suggest({}, { catatonia: 'yes' }), 'catatonia'), STRENGTH.SUGGESTED);
});

test('antisocial suggestion for a 17-year-old explains the age limit', () => {
  const out = suggest({ pd12: 1, pd1: 1, pd4: 1, pd5: 1 }, null, { ...patient, age: 17 });
  assert.match(out.suggestions.find((s) => s.disorderId === 'aspd').reasons[0], /under 18/);
});
