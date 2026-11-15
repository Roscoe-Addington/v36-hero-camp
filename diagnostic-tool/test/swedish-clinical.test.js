// "Only Swedish in Swedish mode": renders the clinician pages in Swedish
// with answers that trigger as many clinical texts as possible (suggestions,
// differential screening, conflicts, every checklist, the final report) and
// fails if common English words are left in the visible text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISORDERS, criterionIds } from '../src/disorders.js';
import { scoreAll } from '../src/scoring.js';
import { runDifferential } from '../src/differential.js';
import { buildSuggestions } from '../src/suggestions.js';
import { responseQuality } from '../src/response-quality.js';
import { PAGES } from '../src/questionnaire.js';
import * as workflow from '../src/views-workflow.js';
import { answers } from './helpers.js';

// Words that only occur in English text (Swedish never uses them as words).
const ENGLISH = /(?<![\p{L}\d])(the|and|with|not|only|are|of|to|from|this|that|have|has|been|was|were|which|when|than|during|after|before|should|could|would|your|their|there|these|those|without|because|between|within|also|other|another|about|into|over|more|less|most|least|any|each|every|some|such|both|either|neither|while|until|since|then|they|them|it|its|be|by|an|at|on|as|if|or|no|yes|can|may|must|will|do|does|did)(?![\p{L}\d])/giu;

// Allowed: proper names, instrument names and author citations.
const ALLOWED = [
  /Mind Självmordslinjen/g, /et al\.?/g, /US National Center for PTSD/g, /Pfizer Inc\./g,
];

export function englishLeft(page) {
  let text = String(page)
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
  for (const re of ALLOWED) text = text.replace(re, ' ');
  const hits = [];
  for (const m of text.matchAll(ENGLISH)) {
    const start = Math.max(0, m.index - 50);
    hits.push(text.slice(start, m.index + 50).replace(/\s+/g, ' ').trim());
  }
  return [...new Set(hits)];
}

const clinician = { id: 1, name: 'Dr Test', language: 'sv' };
const patient = { id: 1, first_name: 'Eva', last_name: 'Ek', age: 67, gender: 'Female', education: 'Primary / compulsory school', employed: 0, personal_number: '19590101-0000' };

function richCase(overrides) {
  const a = answers(overrides);
  const results = scoreAll(a);
  results.differential = runDifferential(a, patient, results);
  results.quality = responseQuality(a, { pages: Object.fromEntries(PAGES.map((p) => [p.part, { shown: 0, submitted: 1000, answered: p.items.length }])), tiredness: [{ part: 3, value: 8 }], contradictions: [{ parent: 'psy1', child: 'psy2' }] }, 'link');
  const intake = {
    moca: { administered: true, lowEducation: true, domains: { visexec: 2, naming: 2, attention: 3, language: 1, abstraction: 1, recall: 1, orientation: 4 } },
    delirium: { acute: 'yes', inattention: 'yes', disorganized: 'yes', consciousness: 'no' }, catatonia: 'yes',
    body: { height_cm: 165, weight_kg: 40, bmi: 14.7 }, notes: '', updated_at: '2026-11-15 10:00',
  };
  const interview = { reason: 'x', family: ['bipolar'], perinatal: 'postpartum', mse_hallucinations: 'yes', mse_delusions: 'yes', mse_thought_form: 'flight', mse_speech: 'pressured', mse_obsessions: 'yes', mse_orientation: 'disoriented', updated_at: '2026-11-15 10:00' };
  const informant = { inf_name: 'Anna', inf_relationship: 'Dotter', inf_consent: 'yes', inf_elevated: 'yes', inf_memory: 'yes', inf_daily: 'yes', inf_psychotic: 'yes', inf_traits: 'yes', updated_at: '2026-11-15 10:00' };
  const checklists = Object.fromEntries(DISORDERS.slice(0, 12).map((d) => [d.id, { ratings: Object.fromEntries(criterionIds(d).map((id) => [id, 'present'])), specifiers: {}, notes: '' }]));
  const c = {
    assessment: { id: 1, mode: 'link', created_at: '2026-11-15 09:00', completed_at: '2026-11-15 09:40', consent_at: '2026-11-15 09:00', email_status: 'sent', finalized_at: null },
    patient, readOnly: false, ownerName: 'Dr Test', answers: a, results, intake, interview, informant, risk: null, checklists,
    diagnoses: { items: [], finalNote: '' }, amendments: [], defaultLowEducation: true,
  };
  return { c, suggestions: buildSuggestions({ answers: a, results, patient, intake, interview, informant }) };
}

const MANY = {
  phq1: 3, phq2: 3, phq3: 2, phq4: 2, phq5: 2, phq6: 2, phq7: 2, phq8: 1, phq9: 1, phqDifficulty: 2,
  gad1: 2, gad2: 2, gad3: 2, gad4: 2, gad5: 1, gad6: 1, gad7: 1, gadDifficulty: 2, gadA: 1, gadB: 1, gadC1: 1, gadC2: 1, gadC3: 1,
  bp1: 1, bp2: 1, pdd1: 1, cyclo1: 1, psy1: 1, psy2: 0, psy3: 1, auditc1: 4, auditc2: 3, auditc3: 3, drug1: 3, caf1: 1, med1: 1, medcond: 1, medonset: 1,
  stress1: 1, grief1: 2, grief2: 1, pmdd1: 1, panic1: 1, panic2: 1, soc1: 1, ocd1: 1, ocd2: 1, ill1: 1, phobia1: 1, agora1: 1, sep1: 1, bdd1: 1, hoard1: 1, trich1: 1, skin1: 1, mutism1: 1,
  ptsd0: 1, ptsd_recent: 0, ptsd1: 1, ptsd2: 1, ptsd3: 1, ptsd4: 1, ptsd5: 1,
  pd1: 1, pd2: 1, pd3: 0, pd4: 1, pd5: 1, pd6: 1, pd7: 1, pd8: 1, pd9: 1, pd10: 1, pd11: 1, pd12: 1, pd13: 1, pd14: 1, pd15: 1, pd16: 1, pd17: 1, pd18: 1, pd19: 1,
  cog1: 1, cog2: 1, neuro1: 1, neuro2: 1, neuro3: 1, neuro4: 1, neuro5: 1, neuro6: 1,
  scoff1: 1, scoff2: 1, scoff3: 1, scoff4: 1, scoff5: 1, ed_binge: 1, ed_comp: 1, ed_arfid: 1, ed_pica: 1, ed_rum: 1,
};

test('the assessment overview in Swedish has no English left', () => {
  for (const overrides of [MANY, {}, { psy1: 1, psy2: 1 }, { psy1: 1, psy3: 0 }, { psy1: 1 }, { bp1: 1 }, { panic1: 1 }, { soc2: 1 }, { cog1: 1 }, { ptsd0: 1, ptsd_recent: 1, ptsd1: 1 }, { gadA: 1 }, { phq1: 1, phq2: 1, phq4: 1 }]) {
    const { c, suggestions } = richCase(overrides);
    assert.deepEqual(englishLeft(workflow.casePage({ clinician, c, suggestions })), [], JSON.stringify(overrides).slice(0, 60));
  }
});

test('every checklist page in Swedish has no English left', () => {
  const { c, suggestions } = richCase(MANY);
  for (const disorder of DISORDERS) {
    const suggestion = suggestions.suggestions.find((s) => s.disorderId === disorder.id);
    assert.deepEqual(englishLeft(workflow.checklistPage({ clinician, c, disorder, suggestion })), [], disorder.id);
  }
});

test('the final report in Swedish has no English left', () => {
  const { c, suggestions } = richCase(MANY);
  c.assessment.finalized_at = '2026-11-15 11:00';
  c.diagnoses = { items: [{ disorderId: 'mdd', code: 'F32/F33 (choose single or recurrent)', name: 'Major depressive disorder', criteriaStatus: 'Criteria met', note: '' }], finalNote: '' };
  assert.deepEqual(englishLeft(workflow.finalReportPage({ clinician, c, suggestions })), []);
});
