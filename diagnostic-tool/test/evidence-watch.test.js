// The research watch, against a fake PubMed: search terms, study-design
// ranking, what is left out, storing new articles once, and the review check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISORDERS } from '../src/disorders.js';
import { fakePubmed } from './helpers.js';

process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
const { db } = await import('../src/db.js');
const { SEARCH_TERMS, searchQuery, classify, searchDisorder, runEvidenceWatch, parseReview } = await import('../src/evidence-watch.js');

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
  const items = await searchDisorder('anorexia', { since: new Date('2026-11-01'), until: new Date('2026-11-15'), fetchImpl: fakePubmed(calls), env: {}, pauseMs: 0 });
  assert.deepEqual(items.map((i) => [i.source_id, i.design, i.rank]), [['111', 'meta', 5], ['222', 'rct', 3]]);
  assert.equal(items[1].journal, 'J B');
  assert.equal(items[0].year, 2026);
  assert.equal(items[0].url, 'https://pubmed.ncbi.nlm.nih.gov/111/');
  assert.ok(calls[0].includes('mindate=2026/11/01') && calls[0].includes('maxdate=2026/11/15'));
  assert.ok(calls.every((u) => u.startsWith('https://eutils.ncbi.nlm.nih.gov/') && u.includes('tool=continuum') && !u.includes('email=')));
});

test('a run stores new articles as "to review" once, and logs the run', async () => {
  const now = new Date('2026-11-15T10:00:00Z');
  const first = await runEvidenceWatch(db, { now, fetchImpl: fakePubmed(), env: {}, pauseMs: 0, ids: ['anorexia', 'ptsd'] });
  assert.deepEqual([first.found, first.added, first.errors], [4, 4, []]);
  const again = await runEvidenceWatch(db, { now, fetchImpl: fakePubmed(), env: {}, pauseMs: 0, ids: ['anorexia'] });
  assert.equal(again.added, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM evidence_items WHERE status = 'pending'").get().n, 4);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM evidence_runs WHERE finished_at IS NOT NULL').get().n, 2);

  // A failing search is recorded and does not stop the others
  const broken = async (url) => { if (url.includes('bulimia')) throw new Error('timeout'); return fakePubmed()(url); };
  const mixed = await runEvidenceWatch(db, { now, fetchImpl: broken, env: {}, pauseMs: 0, ids: ['bulimia', 'bed'] });
  assert.equal(mixed.errors.length, 1);
  assert.equal(mixed.added, 2);
});

test('approving needs a summary in both languages; rejecting does not', () => {
  assert.ok(parseReview({ action: 'approve', summary_en: 'Works.' }).errors);
  assert.ok(parseReview({ action: 'maybe' }).errors);
  assert.equal(parseReview({ action: 'approve', summary_en: 'Works.', summary_sv: 'Fungerar.' }).review.action, 'approve');
  assert.equal(parseReview({ action: 'reject' }).review.action, 'reject');
});
