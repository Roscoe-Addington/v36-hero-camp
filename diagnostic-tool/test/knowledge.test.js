// Disorder information: every disorder has a summary and treatments in both
// languages, treatments are ranked most effective first, and search finds
// disorders by name, Swedish name, abbreviation and ICD-10 code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISORDERS, findDisorder } from '../src/disorders.js';
import { KNOWLEDGE, EVIDENCE, EVIDENCE_LABELS } from '../src/knowledge.js';
import { rankedTreatments, searchDisorders } from '../src/disorder-search.js';
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

test('treatments are listed most effective first', () => {
  for (const d of DISORDERS) {
    const levels = rankedTreatments(d.id).map((x) => EVIDENCE.indexOf(x.evidence));
    assert.deepEqual(levels, [...levels].sort((a, b) => a - b), d.id);
  }
  assert.equal(rankedTreatments('ptsd')[0].evidence, 'strong');
  assert.equal(rankedTreatments('anorexia')[0].evidence, 'strong');
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
