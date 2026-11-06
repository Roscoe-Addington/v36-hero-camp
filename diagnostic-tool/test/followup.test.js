import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFollowupAnswers, scoreFollowup, progressSummary, measurementSeries, FOLLOWUP_IDS } from '../src/followup.js';

const all = (value, overrides = {}) => ({ ...Object.fromEntries(FOLLOWUP_IDS.map((id) => [id, value])), ...overrides });

test('follow-up has 18 questions (PHQ-9, GAD-7 and the two difficulty questions)', () => {
  assert.equal(FOLLOWUP_IDS.length, 18);
  assert.equal(parseFollowupAnswers({}).errors.length, 18);
});

test('follow-up scoring and safety flag', () => {
  const r = scoreFollowup(all(1, { phq9: 0 }));
  assert.equal(r.phq9, 8);
  assert.equal(r.gad7, 7);
  assert.equal(r.safetyFlag, false);
  assert.equal(scoreFollowup(all(0, { phq9: 2 })).safetyFlag, true);
});

const p = (date, phq9, gad7) => ({ date, phq9, gad7, source: 'Follow-up' });

test('PHQ-9: 5 points is a meaningful change, 4 is not', () => {
  assert.match(progressSummary([p('2026-01-01', 15, 6), p('2026-02-01', 11, 6)]).notes[0], /no clear change/);
  assert.match(progressSummary([p('2026-01-01', 15, 6), p('2026-02-01', 10, 6)]).notes[0], /meaningful improvement/);
  assert.match(progressSummary([p('2026-01-01', 5, 6), p('2026-02-01', 12, 6)]).notes[0], /meaningful worsening/);
});

test('GAD-7: 4 points is meaningful; response and remission are noted', () => {
  const s = progressSummary([p('2026-01-01', 16, 12), p('2026-03-01', 4, 8)]);
  assert.match(s.notes[1], /GAD-7 fell by 4 points/);
  assert.ok(s.notes.some((n) => n.includes('response')));
  assert.ok(s.notes.some((n) => n.includes('remission')));
  assert.equal(progressSummary([p('2026-01-01', 10, 10)]), null, 'needs two measurements');
});

test('the series combines intake screenings and follow-ups, oldest first', () => {
  const assessments = [{ completed_at: '2026-01-05 10:00', results_json: JSON.stringify({ depression: { total: 14 }, anxiety: { total: 9 }, safetyFlag: false }) }];
  const followups = [{ completed_at: '2026-02-05 10:00', results_json: JSON.stringify({ phq9: 8, gad7: 5, safetyFlag: false }) }, { completed_at: null }];
  const series = measurementSeries(assessments, followups);
  assert.deepEqual(series.map((x) => [x.source, x.phq9]), [['Intake screening', 14], ['Follow-up', 8]]);
});

test('measurements with the same time keep their real order', () => {
  const same = '2026-03-01 10:00';
  const followups = [
    { id: 9, completed_at: same, results_json: JSON.stringify({ phq9: 0, gad7: 0 }) },
    { id: 8, completed_at: same, results_json: JSON.stringify({ phq9: 3, gad7: 1 }) },
  ];
  const assessments = [{ id: 1, completed_at: same, results_json: JSON.stringify({ depression: { total: 15 }, anxiety: { total: 4 } }) }];
  assert.deepEqual(measurementSeries(assessments, followups).map((x) => x.phq9), [15, 3, 0]);
});
