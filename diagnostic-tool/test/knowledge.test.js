// Disorder information: every disorder has a summary and treatments in both
// languages, treatments are ranked most effective first, and search finds
// disorders by name, Swedish name, abbreviation and ICD-10 code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISORDERS, findDisorder } from '../src/disorders.js';
import { KNOWLEDGE, EVIDENCE, EVIDENCE_LABELS, physicianRole, medicalCheck } from '../src/knowledge.js';
import { rankedTreatments, otherTreatments, searchDisorders } from '../src/disorder-search.js';
import { disorderInfoPage, disorderSearchPage, evidenceReviewPage } from '../src/views-knowledge.js';
import { englishLeft } from './helpers.js';
import { GUIDANCE_SOURCES } from '../src/guidance.js';

const filled = (both) => Boolean(both && String(both.en ?? '').trim() && String(both.sv ?? '').trim());

test('every disorder has information in English and Swedish', () => {
  assert.equal(Object.keys(KNOWLEDGE).length, DISORDERS.length);
  for (const d of DISORDERS) {
    const k = KNOWLEDGE[d.id];
    assert.ok(k, `${d.id} has information`);
    assert.ok(filled(k.summary), `${d.id}: summary in both languages`);
    assert.ok(k.treatments.length >= 1, `${d.id}: at least one treatment`);
    for (const x of k.treatments) {
      assert.ok(EVIDENCE.includes(x.evidence), `${d.id}: known evidence level`);
      assert.ok(filled(x.what), `${d.id}: treatment in both languages`);
      if (x.note) assert.ok(filled(x.note), `${d.id}: treatment note in both languages`);
    }
  }
  for (const level of EVIDENCE) assert.ok(filled(EVIDENCE_LABELS[level]));
});

test('treatments: Socialstyrelsen priority first (1 = most important), then the rest by evidence; FoU and icke-göra shown apart', () => {
  for (const d of DISORDERS) {
    const ranked = rankedTreatments(d.id);
    assert.ok(ranked.every((x) => x.sos !== 'fou' && x.sos !== 'dont'), d.id);
    const sos = ranked.filter((x) => typeof x.sos === 'number').map((x) => x.sos);
    assert.deepEqual(sos, [...sos].sort((a, b) => a - b), `${d.id}: priorities ascending`);
    const firstOther = ranked.findIndex((x) => typeof x.sos !== 'number');
    if (firstOther >= 0) assert.ok(ranked.slice(firstOther).every((x) => typeof x.sos !== 'number'), `${d.id}: prioritised treatments come first`);
    const rest = ranked.slice(firstOther < 0 ? ranked.length : firstOther).map((x) => EVIDENCE.indexOf(x.evidence));
    assert.deepEqual(rest, [...rest].sort((a, b) => a - b), `${d.id}: the rest by evidence`);
    const { research, advisedAgainst } = otherTreatments(d.id);
    assert.equal(ranked.length + research.length + advisedAgainst.length, KNOWLEDGE[d.id].treatments.length, d.id);
  }
  assert.equal(rankedTreatments('ocd')[0].sos, 1, 'OCD: CBT with ERP, priority 1');
  assert.equal(rankedTreatments('gad')[0].sosId, '98', 'GAD: antidepressants priority 3 before CBT priority 5');
  assert.ok(otherTreatments('gad').advisedAgainst.some((x) => x.what.en === 'Benzodiazepines'));
  const gad = String(disorderInfoPage({ clinician: { id: 1, name: 'Dr Test', language: 'en' }, disorder: findDisorder('gad') }));
  const advised = gad.slice(gad.indexOf('Socialstyrelsen advises against'));
  assert.ok(advised.includes('Benzodiazepines') && !advised.slice(0, advised.indexOf('Based on:')).includes('Not prioritised'), 'no "not prioritised" badge on icke-göra items');
});

test('every Socialstyrelsen priority has a recommendation id and a linked Socialstyrelsen source', () => {
  const sosDisorders = [];
  for (const d of DISORDERS) {
    const k = KNOWLEDGE[d.id];
    const fromSos = k.treatments.filter((x) => x.sos !== null && x.sos !== undefined);
    for (const x of fromSos) {
      assert.ok(typeof x.sos === 'number' ? x.sos >= 1 && x.sos <= 10 : ['fou', 'dont'].includes(x.sos), `${d.id}: priority`);
      assert.ok(x.sosId, `${d.id}: recommendation id`);
      if (x.differs) assert.ok(filled(x.differs), `${d.id}: differs in both languages`);
    }
    const sosSources = k.sources.filter((s) => typeof s === 'object');
    for (const s of sosSources) assert.ok(filled(s.label) && s.url.startsWith('https://socialstyrelsen.se/'), d.id);
    if (fromSos.length) assert.ok(sosSources.length, `${d.id}: cites the Socialstyrelsen guideline it uses`);
    if (k.note) assert.ok(filled(k.note), `${d.id}: note in both languages`);
    if (sosSources.length) sosDisorders.push(d.id);
  }
  // The guidelines that exist: depression and anxiety, schizophrenia-like, dementia, eating disorders, substance use
  for (const id of ['mdd', 'gad', 'ptsd', 'ocd', 'schizophrenia', 'schizoaffective', 'delusional', 'brief_psychotic', 'major_ncd', 'anorexia', 'bulimia', 'bed', 'arfid', 'osfed', 'substance_mood']) {
    assert.ok(sosDisorders.includes(id), `${id} cites Socialstyrelsen`);
  }
  assert.equal(sosDisorders.length, 27);
});

test('treatments a physician prescribes are marked; psychological treatments and advice are not', () => {
  const role = (en) => physicianRole({ what: { en } });
  for (const en of ['Severe depression: antidepressant medicine', 'Severe depression: electroconvulsive therapy (ECT)', 'Treatment-resistant schizophrenia: clozapine', 'N-acetylcysteine', 'Lisdexamfetamine', 'Moderate to severe depression: repetitive transcranial magnetic stimulation (rTMS)']) {
    assert.equal(role(en), 'rx', en);
  }
  for (const en of ['Sertraline combined with CBT', 'Antidepressant combined with CBT or IPT', 'Treat remaining symptoms as in OCD (ERP, SSRI)']) assert.equal(role(en), 'mixed', en);
  for (const en of ['Mild to moderate depression: cognitive behavioural therapy (CBT)', 'EMDR', 'Avoid antidepressants without a mood stabiliser', 'Medicines are not a first choice', 'Review medicines that can cause or worsen the symptoms', 'Applied relaxation']) {
    assert.equal(role(en), null, en);
  }
  // Every treatment that names a medicine is marked, unless it is advice
  let marked = 0;
  for (const k of Object.values(KNOWLEDGE)) for (const t of k.treatments) if (physicianRole(t)) marked += 1;
  assert.ok(marked > 60, `${marked} marked`);
  // Shown on the page in both languages, never on advised-against items
  const page = (language, id) => String(disorderInfoPage({ clinician: { id: 1, name: 'Dr Test', language }, disorder: findDisorder(id) }));
  assert.ok(page('en', 'gad').includes('Prescribed by a physician'));
  assert.ok(page('sv', 'gad').includes('Ordineras av läkare'));
  assert.ok(page('sv', 'social').includes('Läkemedelsdelen ordineras av läkare'));
  const advised = page('en', 'gad').split('Socialstyrelsen advises against')[1];
  assert.ok(!advised.split('Based on:')[0].includes('Prescribed by a physician'));
});

test('medical checks (blood tests, ECG, monitoring) are marked for a physician or nurse', () => {
  const check = (en) => medicalCheck({ what: { en } });
  for (const en of ['Regular checks of metabolic risk factors (blood tests and physical examination)', 'Check electrolytes (potassium) and the ECG when there is vomiting or laxative use',
    'Medical monitoring if weight is low or purging is present', 'Rule out gastrointestinal disease together with a physician', 'Weight restoration with medical monitoring; watch for refeeding syndrome']) {
    assert.ok(check(en), en);
  }
  for (const en of ['Adults: eating-disorder-focused CBT (CBT-E)', 'Weight loss programmes are not a treatment for the binge eating itself', 'Case management']) assert.ok(!check(en), en);
  assert.equal(physicianRole({ what: { en: 'Treat skin infections and other skin conditions' } }), 'rx');
  const page = (language) => String(disorderInfoPage({ clinician: { id: 1, name: 'Dr Test', language }, disorder: findDisorder('bulimia') }));
  assert.ok(page('en').includes('Medical check (physician or nurse)'));
  assert.ok(page('sv').includes('Medicinsk kontroll (läkare eller sjuksköterska)'));
  let marked = 0;
  for (const k of Object.values(KNOWLEDGE)) for (const t of k.treatments) if (medicalCheck(t)) marked += 1;
  assert.ok(marked >= 9, `${marked} marked`);
});

test('search by name, Swedish name, abbreviation and code', () => {
  const first = (q) => searchDisorders(q)[0]?.id;
  assert.equal(first('PTSD'), 'ptsd');
  assert.equal(first('anorexi'), 'anorexia');
  assert.equal(first('Anorexia nervosa'), 'anorexia');
  assert.ok(searchDisorders('F50').some((d) => d.id === 'bulimia'));
  assert.ok(searchDisorders('depression').some((d) => d.id === 'mdd'));
  assert.ok(searchDisorders('generaliserat ångestsyndrom').some((d) => d.id === 'gad'));
  assert.deepEqual(searchDisorders('zzzz'), []);
});

test('Swedish disorder pages and the review page show only Swedish', () => {
  const clinician = { id: 1, name: 'Dr Test', language: 'sv' };
  const evidence = [{ id: 1, disorder_id: 'ptsd', design: 'meta', rank: 5, source_id: '123', title: 'A trial of the treatment', journal: 'Journal of Traumatic Stress', year: 2026, url: 'https://pubmed.ncbi.nlm.nih.gov/123/', summary_en: 'Exposure works.', summary_sv: 'Exponering fungerar.', reviewer_name: 'Dr Test', reviewed_at: '2026-11-15T10:00:00Z', status: 'approved' }];
  const hits = [];
  for (const d of DISORDERS) hits.push(...englishLeft(disorderInfoPage({ clinician, disorder: d, evidence })).map((h) => `${d.id}: ${h}`));
  hits.push(...englishLeft(disorderSearchPage({ clinician, query: 'ångest', results: searchDisorders('ångest') })));
  hits.push(...englishLeft(disorderSearchPage({ clinician })));
  const more = [
    { ...evidence[0], id: 2, source: 'europepmc', source_id: 'PMC:PMC999', priority: 1, found_via: 'europepmc', design: 'rct', rank: 3, url: 'https://europepmc.org/article/PMC/PMC999' },
    { ...evidence[0], id: 3, source: 'clinicaltrials', source_id: 'NCT00000001', journal: 'A University', found_via: 'clinicaltrials', design: 'registry', rank: 1, url: 'https://clinicaltrials.gov/study/NCT00000001' },
  ];
  const guidance = GUIDANCE_SOURCES.map((g, i) => ({ ...g, due: i > 0, last: i === 0 ? { checked_at: '2026-11-15T10:00:00Z', checked_by_name: 'Dr Test', outcome: 'update_needed', note: 'Ny rapport om ätstörningar' } : null }));
  hits.push(...englishLeft(evidenceReviewPage({ clinician, pending: [...evidence, ...more].map((e) => ({ ...e, status: 'pending' })), reviewed: [...evidence, ...more], lastRun: { finished_at: '2026-11-15T10:00:00Z', found: 3, added: 2 }, errors: { 1: ['Choose approve or reject.'] },
    guidance, guidanceErrors: { sbu: ['Write what is new and what needs updating.'] } })));
  hits.push(...englishLeft(disorderInfoPage({ clinician, disorder: findDisorder('ptsd'), evidence: more.map((e) => ({ ...e, status: 'approved' })) })));
  assert.deepEqual(hits, []);
  const page = String(disorderInfoPage({ clinician, disorder: findDisorder('ptsd'), evidence }));
  assert.ok(page.includes('Exponering fungerar.') && !page.includes('Exposure works.'));
});
