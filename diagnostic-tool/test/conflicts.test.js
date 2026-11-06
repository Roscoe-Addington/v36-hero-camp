import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISORDERS, findDisorder, criterionIds } from '../src/disorders.js';
import { DIFFERENTIALS } from '../src/differential-lists.js';
import { RULES, LEVEL, conflictsAmong, conflictsFor } from '../src/conflicts.js';
import { applyDiagnosis } from '../src/diagnosis.js';

test('every disorder has a differential list of at least 4 conditions', () => {
  for (const d of DISORDERS) {
    assert.ok(DIFFERENTIALS[d.id], `${d.id} has no list`);
    assert.ok(DIFFERENTIALS[d.id].length >= 4, `${d.id} has only ${DIFFERENTIALS[d.id].length}`);
  }
  assert.deepEqual(Object.keys(DIFFERENTIALS).sort(), DISORDERS.map((d) => d.id).sort(), 'no lists for unknown disorders');
});

test('differential entries point to real disorders, never to themselves, and all have a reason', () => {
  for (const [id, list] of Object.entries(DIFFERENTIALS)) {
    for (const item of list) {
      assert.ok(item.why, `${id}: entry without a reason`);
      if (item.outside) continue;
      assert.ok(findDisorder(item.id), `${id}: unknown disorder ${item.id}`);
      assert.notEqual(item.id, id, `${id} lists itself`);
    }
    const ids = list.filter((i) => !i.outside).map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length, `${id}: duplicate entry`);
  }
});

test('conflict rules: real disorders, no self-pairs, no pair listed twice', () => {
  const seen = new Set();
  for (const r of RULES) {
    assert.ok(Object.values(LEVEL).includes(r.level));
    for (const id of r.ids) assert.ok(findDisorder(id), `unknown disorder ${id}`);
    assert.notEqual(r.ids[0], r.ids[1]);
    const key = [...r.ids].sort().join('+');
    assert.ok(!seen.has(key), `pair listed twice: ${key}`);
    seen.add(key);
  }
});

test('every "not allowed together" pair is also in one of the two rule-out lists', () => {
  for (const r of RULES.filter((x) => x.level === LEVEL.CONFLICT)) {
    const [a, b] = r.ids;
    const listed = DIFFERENTIALS[a].some((i) => i.id === b) || DIFFERENTIALS[b].some((i) => i.id === a);
    assert.ok(listed, `${a} + ${b} conflict but neither lists the other`);
  }
});

test('conflictsFor works in both directions', () => {
  assert.equal(conflictsFor('mdd', ['bipolar1'])[0].level, LEVEL.CONFLICT);
  assert.equal(conflictsFor('bipolar1', ['mdd'])[0].level, LEVEL.CONFLICT);
  assert.deepEqual(conflictsFor('mdd', ['gad']), []);
  assert.equal(conflictsAmong(['mdd', 'pdd', 'gad'])[0].level, LEVEL.CODING);
});

// ---------- applyDiagnosis ----------

const allPresent = (id) => ({ ratings: Object.fromEntries(criterionIds(findDisorder(id)).map((c) => [c, 'present'])), specifiers: {} });
const caseWith = (ids, confirmed = []) => ({
  patient: { age: 40 },
  checklists: Object.fromEntries(ids.map((id) => [id, allPresent(id)])),
  diagnoses: { items: confirmed, finalNote: '' },
});

test('confirming a disorder with criteria met works without a note', () => {
  const r = applyDiagnosis(caseWith(['mdd']), { disorderId: 'mdd', action: 'confirm' });
  assert.equal(r.diagnoses.items[0].code, 'F32/F33 (choose single or recurrent)');
});

test('a disorder must be assessed before it can be confirmed', () => {
  assert.match(applyDiagnosis(caseWith([]), { disorderId: 'mdd', action: 'confirm' }).error, /Assess/);
});

test('a "not allowed together" diagnosis needs a reason', () => {
  let c = caseWith(['mdd', 'bipolar1']);
  c.diagnoses = applyDiagnosis(c, { disorderId: 'mdd', action: 'confirm' }).diagnoses;
  const refused = applyDiagnosis(c, { disorderId: 'bipolar1', action: 'confirm' });
  assert.match(refused.error, /cannot normally be given together with Major depressive disorder/);
  const ok = applyDiagnosis(c, { disorderId: 'bipolar1', action: 'confirm', override: 'MDD diagnosis being revised.' });
  assert.equal(ok.diagnoses.items.length, 2);
  assert.equal(ok.diagnoses.items[1].conflictOverride, 'MDD diagnosis being revised.');
});

test('"check" and "coding" warnings do not block confirming', () => {
  let c = caseWith(['gad', 'panic']);
  c.diagnoses = applyDiagnosis(c, { disorderId: 'gad', action: 'confirm' }).diagnoses;
  const r = applyDiagnosis(c, { disorderId: 'panic', action: 'confirm' });
  assert.equal(r.error, undefined);
  assert.equal(r.diagnoses.items.length, 2);
});

test('removing a diagnosis', () => {
  let c = caseWith(['mdd']);
  c.diagnoses = applyDiagnosis(c, { disorderId: 'mdd', action: 'confirm' }).diagnoses;
  assert.deepEqual(applyDiagnosis(c, { disorderId: 'mdd', action: 'remove' }).diagnoses.items, []);
});

test('confirming again replaces the earlier entry instead of adding a second one', () => {
  let c = caseWith(['mdd']);
  c.diagnoses = applyDiagnosis(c, { disorderId: 'mdd', action: 'confirm' }).diagnoses;
  c.diagnoses = applyDiagnosis(c, { disorderId: 'mdd', action: 'confirm', note: 'updated' }).diagnoses;
  assert.equal(c.diagnoses.items.length, 1);
  assert.equal(c.diagnoses.items[0].note, 'updated');
});
