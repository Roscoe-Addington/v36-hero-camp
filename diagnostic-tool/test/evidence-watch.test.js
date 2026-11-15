// The research watch, against a fake PubMed: search terms, study-design
// ranking, what is left out, storing new articles once, and the review check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISORDERS } from '../src/disorders.js';
import { fakeResearch } from './helpers.js';

process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
const { db } = await import('../src/db.js');
const { SEARCH_TERMS, PLAIN_TERMS, PRIORITY_JOURNALS, isPriorityJournal, enabledSources, europePmcQuery, searchQuery, classify, searchDisorder, searchAllSources, runEvidenceWatch, parseReview } = await import('../src/evidence-watch.js');

test('every disorder has PubMed search terms', () => {
  for (const d of DISORDERS) assert.ok(SEARCH_TERMS[d.id], d.id);
  const q = searchQuery('ptsd');
  assert.ok(q.includes('stress disorders, post-traumatic[mh]'));
  assert.ok(q.includes('randomized controlled trial[pt]') && q.includes('meta-analysis[pt]'));
});

test('study designs: meta-analyses and reviews above trials; comments, letters and preprints left out', () => {
  assert.equal(classify(['Journal Article', 'Meta-Analysis', 'Systematic Review']), 'meta');
  assert.equal(classify(['Systematic Review']), 'review');
  assert.equal(classify(['Practice Guideline']), 'guideline');
  assert.equal(classify(['Randomized Controlled Trial']), 'rct');
  assert.equal(classify(['Clinical Trial, Phase III']), 'trial');
  for (const x of ['Comment', 'Letter', 'Editorial', 'Preprint', 'Retracted Publication']) assert.equal(classify(['Meta-Analysis', x]), null, x);
  assert.equal(classify(['Journal Article']), null);
});

test('one search: the request sends only search terms, never patient data', async () => {
  const calls = [];
  const items = await searchDisorder('anorexia', { since: new Date('2026-11-01'), until: new Date('2026-11-15'), fetchImpl: fakeResearch(calls), env: {}, pauseMs: 0 });
  assert.deepEqual(items.map((i) => [i.source_id, i.design, i.rank]), [['111', 'meta', 5], ['222', 'rct', 3]]);
  assert.equal(items[1].journal, 'J B');
  assert.equal(items[0].year, 2026);
  assert.equal(items[0].url, 'https://pubmed.ncbi.nlm.nih.gov/111/');
  assert.ok(calls[0].includes('mindate=2026/11/01') && calls[0].includes('maxdate=2026/11/15'));
  assert.ok(calls.every((u) => u.startsWith('https://eutils.ncbi.nlm.nih.gov/') && u.includes('tool=continuum') && !u.includes('email=')));
});

test('a run stores new articles as "to review" once, and logs the run', async () => {
  const now = new Date('2026-11-15T10:00:00Z');
  // Per disorder: PubMed 111 and 222, Europe PMC's PMC-only trial, one registered trial (Europe PMC's 111 is merged)
  const first = await runEvidenceWatch(db, { now, fetchImpl: fakeResearch(), env: {}, pauseMs: 0, ids: ['anorexia', 'ptsd'] });
  assert.deepEqual([first.found, first.added, first.errors], [8, 8, []]);
  const again = await runEvidenceWatch(db, { now, fetchImpl: fakeResearch(), env: {}, pauseMs: 0, ids: ['anorexia'] });
  assert.equal(again.added, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM evidence_items WHERE status = 'pending'").get().n, 8);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM evidence_runs WHERE finished_at IS NOT NULL').get().n, 2);

  // A failing source is recorded and does not stop the others
  const broken = async (url) => { if (url.includes('europepmc')) throw new Error('timeout'); return fakeResearch()(url); };
  const mixed = await runEvidenceWatch(db, { now, fetchImpl: broken, env: {}, pauseMs: 0, ids: ['bulimia', 'bed'] });
  assert.deepEqual(mixed.errors, ['Europe PMC bulimia: timeout', 'Europe PMC bed: timeout']);
  assert.equal(mixed.added, 6);
});

test('three sources: duplicates merged, preprints left out, priority journals marked, trial registrations ranked last', async () => {
  const calls = [];
  const { items, errors } = await searchAllSources('ptsd', { since: new Date('2026-08-01'), until: new Date('2026-11-15'), fetchImpl: fakeResearch(calls), env: {}, pauseMs: 0 });
  assert.deepEqual(errors, []);
  const byKey = Object.fromEntries(items.map((i) => [`${i.source}:${i.source_id}`, i]));
  assert.deepEqual(Object.keys(byKey).sort(), ['clinicaltrials:NCT00000001', 'europepmc:PMC:PMC999', 'pubmed:111', 'pubmed:222']);
  assert.equal(byKey['pubmed:111'].found_via, 'pubmed,pubmed-priority,europepmc', 'found by every search, stored once');
  assert.equal(byKey['europepmc:PMC:PMC999'].priority, 1, 'Lancet Psychiatry is a priority journal');
  assert.equal(byKey['europepmc:PMC:PMC999'].design, 'rct');
  assert.equal(byKey['europepmc:PMC:PMC999'].url, 'https://europepmc.org/article/PMC/PMC999');
  assert.equal(byKey['clinicaltrials:NCT00000001'].design, 'registry');
  assert.equal(byKey['clinicaltrials:NCT00000001'].rank, 1);
  assert.ok(Math.min(...items.filter((i) => i.source !== 'clinicaltrials').map((i) => i.rank)) > 1, 'peer-reviewed articles rank above registrations');
  assert.ok(!items.some((i) => /preprint|comment/i.test(i.title)));

  // What is sent: only search terms and dates; the priority search names the journals
  assert.equal(calls.filter((u) => u.includes('esearch.fcgi')).length, 2);
  assert.ok(decodeURIComponent(calls.find((u) => u.includes('esearch.fcgi') && u.includes('5Bta%5D')) ?? '').includes('"Acta Psychiatr Scand"[ta]'));
  const epmc = decodeURIComponent(calls.find((u) => u.includes('europepmc')));
  assert.ok(epmc.includes('TITLE_ABS:"post-traumatic stress disorder"') && epmc.includes('(SRC:MED OR SRC:PMC)') && epmc.includes('FIRST_PDATE:[2026-08-01 TO 2026-11-15]'));
  const ct = new URL(calls.find((u) => u.includes('clinicaltrials.gov')));
  assert.equal(ct.searchParams.get('filter.advanced'), 'AREA[StudyType]INTERVENTIONAL AND AREA[ResultsFirstPostDate]RANGE[2026-08-01,2026-11-15]');
  assert.equal(calls.length, 6, '2 PubMed searches with 2 summaries, Europe PMC, ClinicalTrials.gov');
});

test('sources can be limited with EVIDENCE_SOURCES; every disorder has plain search terms; 22 priority journals', async () => {
  assert.deepEqual(enabledSources({}), ['pubmed', 'europepmc', 'clinicaltrials']);
  assert.deepEqual(enabledSources({ EVIDENCE_SOURCES: 'pubmed, nonsense' }), ['pubmed']);
  const calls = [];
  await searchAllSources('gad', { since: new Date('2026-08-01'), fetchImpl: fakeResearch(calls), env: { EVIDENCE_SOURCES: 'clinicaltrials' }, pauseMs: 0 });
  assert.ok(calls.length === 1 && calls[0].includes('clinicaltrials.gov'));
  for (const id of Object.keys(SEARCH_TERMS)) assert.ok(PLAIN_TERMS[id]?.length, id);
  assert.equal(Object.values(PRIORITY_JOURNALS).flat().length, 22);
  assert.ok(isPriorityJournal('Lakartidningen') && isPriorityJournal('n engl j med') && !isPriorityJournal('Lancet Oncol'));
  assert.equal(classify(['research-article', 'randomized controlled trial']), 'rct', 'Europe PMC lower-case types');
  assert.equal(classify(['preprint', 'meta-analysis']), null);
});

test('approving needs a summary in both languages; rejecting does not', () => {
  assert.ok(parseReview({ action: 'approve', summary_en: 'Works.' }).errors);
  assert.ok(parseReview({ action: 'maybe' }).errors);
  assert.equal(parseReview({ action: 'approve', summary_en: 'Works.', summary_sv: 'Fungerar.' }).review.action, 'approve');
  assert.equal(parseReview({ action: 'reject' }).review.action, 'reject');
});
