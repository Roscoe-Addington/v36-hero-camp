import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGES, applySkips, isShown, parsePage, firstOpenPage, progress, findItem } from '../src/questionnaire.js';
import { responseQuality, contradictionChecks, KIND } from '../src/response-quality.js';
import { answers } from './helpers.js';

test('10 pages; tiredness asked after parts 3 and 6', () => {
  assert.equal(PAGES.length, 10);
  assert.deepEqual(PAGES.filter((p) => p.tiredness).map((p) => p.part), [3, 6]);
  assert.equal(PAGES.flatMap((p) => p.items).length, 95);
});

test('every skip rule points to an earlier question on the same page', () => {
  for (const page of PAGES) {
    page.items.forEach((item, i) => {
      if (!item.showIf) return;
      const parentIndex = page.items.findIndex((x) => x.id === item.showIf.id);
      assert.ok(parentIndex >= 0 && parentIndex < i, `${item.id} depends on ${item.showIf.id}`);
      assert.ok(findItem(item.id).options.some((o) => o.value === item.skipValue), `${item.id} skip value is a valid answer`);
    });
  }
});

test('skipped follow-ups get "does not apply", and a "Yes" to one is a contradiction', () => {
  const { answers: a, contradictions } = applySkips({ psy1: 0, psy2: 1, ptsd0: 0, cog1: 0 });
  assert.equal(a.psy2, 2);
  assert.equal(a.psy3, 2);
  assert.equal(a.ptsd5, 2);
  assert.equal(a.cog2, 0);
  assert.deepEqual(contradictions, [{ parent: 'psy1', child: 'psy2' }]);
  assert.equal(isShown(findItem('psy2'), { psy1: 1 }), true);
  assert.equal(isShown(findItem('psy2'), {}), true, 'shown until the earlier question is answered');
});

test('a page only counts shown questions as missing', () => {
  const page = PAGES.findIndex((p) => p.items.some((i) => i.id === 'psy1'));
  const { missing } = parsePage(page, { bp1: '0', pdd1: '0', cyclo1: '0', psy1: '0' }, {});
  assert.deepEqual(missing, [], 'bp2, bp3, psy2, psy3 are skipped');
  assert.deepEqual(parsePage(page, { bp1: '1', pdd1: '0', cyclo1: '0', psy1: '0' }, {}).missing, ['bp2', 'bp3']);
});

test('progress and resuming at the first open page', () => {
  assert.deepEqual(progress({}), { answered: 0, total: 95 });
  const done = answers({ psy1: 0, bp1: 0 });
  assert.equal(firstOpenPage({}), 0);
  assert.equal(firstOpenPage({ ...done, gad1: undefined }), 1);
});

test('contradictions and possible inconsistencies', () => {
  const kinds = (a) => contradictionChecks(answers(a)).map((f) => f.kind);
  assert.deepEqual(kinds({}), []);
  assert.deepEqual(kinds({ auditc1: 0, auditc2: 2 }), [KIND.CONTRADICTION]);
  assert.deepEqual(kinds({ phqDifficulty: 3 }), [KIND.CONTRADICTION]);
  assert.deepEqual(kinds({ pdd1: 1 }), [KIND.POSSIBLE]);
  assert.deepEqual(kinds({ gadA: 1, gadB: 1 }), [KIND.POSSIBLE]);
});

const T = 1_000_000; // a start time in milliseconds
const meta = (secondsPerPage, extra = {}) => ({
  pages: Object.fromEntries(PAGES.map((p) => [p.part, { shown: T, submitted: T + secondsPerPage * 1000 * p.items.length, answered: p.items.length }])),
  tiredness: [],
  contradictions: [],
  ...extra,
});

test('speed: under 2 seconds per question is flagged for link answers only', () => {
  assert.equal(responseQuality(answers(), meta(1)).flags[0].kind, KIND.SPEED);
  assert.deepEqual(responseQuality(answers(), meta(5)).flags, []);
  assert.deepEqual(responseQuality(answers(), meta(1), 'onsite').flags, [], 'on site the clinician may type from paper');
});

test('tiredness 7+ is flagged, noting whether a break was taken', () => {
  const tiredAt = T;
  const page4 = (shown) => ({ shown, submitted: shown + 5 * 1000 * PAGES[3].items.length, answered: PAGES[3].items.length });
  const continued = meta(5, { tiredness: [{ part: 3, value: 8, at: tiredAt }] });
  continued.pages[4] = page4(tiredAt + 1000);
  assert.match(responseQuality(answers(), continued).flags[0].text, /continued without a break/);
  const rested = meta(5, { tiredness: [{ part: 3, value: 8, at: tiredAt }] });
  rested.pages[4] = page4(tiredAt + 20 * 60 * 1000);
  assert.match(responseQuality(answers(), rested).flags[0].text, /took a break/);
  assert.deepEqual(responseQuality(answers(), meta(5, { tiredness: [{ part: 3, value: 4, at: 0 }] })).flags, []);
});

test('quality never changes the answers it is given', () => {
  const a = answers({ auditc1: 0, auditc2: 2 });
  const copy = { ...a };
  responseQuality(a, meta(1));
  assert.deepEqual(a, copy);
});
