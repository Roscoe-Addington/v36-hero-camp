// Patient records: personal-number matching, entries, and the timeline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personalNumberKey, parseEntry } from '../src/records.js';
import { recordTimeline } from '../src/views-records.js';

test('a personal number matches with or without dash, century or spaces', () => {
  const key = personalNumberKey('19480405-1234');
  for (const v of ['194804051234', '480405-1234', '4804051234', ' 19480405 1234 ']) assert.equal(personalNumberKey(v), key, v);
  assert.notEqual(personalNumberKey('19480405-1235'), key);
  assert.equal(personalNumberKey('r-123'), 'R-123', 'a reserve number is compared as typed');
});

test('a record entry needs a type, a heading and a text', () => {
  assert.deepEqual(parseEntry({ kind: 'note', title: ' Session 1 ', text: 'Text' }).entry, { kind: 'note', title: 'Session 1', text: 'Text' });
  assert.equal(parseEntry({ kind: 'diary', title: 'x', text: 'y' }).errors.length, 1);
  assert.equal(parseEntry({ kind: 'treatment' }).errors.length, 2);
});

test('the timeline lists assessments, interviews, follow-ups and entries, newest first', () => {
  const items = recordTimeline({
    assessments: [{ id: 1, created_at: '2026-01-10 10:00', interview_json: JSON.stringify({ reason: 'x', updated_at: '2026-01-10 11:00' }) }],
    followups: [{ id: 1, completed_at: '2026-03-01 09:00', results_json: JSON.stringify({ phq9: 4, gad7: 3 }) }, { id: 2, completed_at: null }],
    entries: [{ id: 1, kind: 'treatment', created_at: '2026-02-01 09:00' }, { id: 2, kind: 'note', created_at: '2026-01-20 09:00' }],
  });
  assert.deepEqual(items.map((x) => x.type), ['followup', 'treatment', 'note', 'interview', 'assessment']);
});
