// Follow-up measurements: PHQ-9 and GAD-7 repeated over time, to see whether
// treatment is helping ("measurement-based care").
//
// How change is described (common rules of thumb; studies vary):
// - PHQ-9: a change of 5 points or more is clinically meaningful; "response"
//   is a fall of 50% or more from the first measurement; "remission" is a
//   score below 5 (Kroenke et al.; McMillan et al. 2010).
// - GAD-7: a change of 4 points or more is clinically meaningful; below 5 is
//   in the minimal range (Toussaint et al. 2020).

import { PHQ9_ITEMS, GAD7_ITEMS, PHQ_DIFFICULTY_ID, GAD_DIFFICULTY_ID, FREQUENCY_OPTIONS } from './questionnaire.js';
import { phq9Severity, gad7Severity } from './scoring.js';

export const FOLLOWUP_IDS = [...PHQ9_ITEMS.map((i) => i.id), PHQ_DIFFICULTY_ID, ...GAD7_ITEMS.map((i) => i.id), GAD_DIFFICULTY_ID];

export function parseFollowupAnswers(body) {
  const answers = {};
  const errors = [];
  for (const id of FOLLOWUP_IDS) {
    const value = Number(body?.[id]);
    if (body?.[id] === undefined || body[id] === '' || ![0, 1, 2, 3].includes(value)) errors.push(id);
    else answers[id] = value;
  }
  return { answers, errors };
}

export function scoreFollowup(answers) {
  const phq9 = PHQ9_ITEMS.reduce((sum, i) => sum + answers[i.id], 0);
  const gad7 = GAD7_ITEMS.reduce((sum, i) => sum + answers[i.id], 0);
  return {
    phq9,
    phq9Severity: phq9Severity(phq9),
    gad7,
    gad7Severity: gad7Severity(gad7),
    safetyFlag: answers.phq9 >= 1,
    safetyAnswer: FREQUENCY_OPTIONS.find((o) => o.value === answers.phq9)?.label,
  };
}

// All measurements for a patient, oldest first: each completed intake
// screening (from the assessment) and each completed follow-up.
export function measurementSeries(assessments, followups) {
  const points = [];
  for (const a of assessments) {
    if (!a.completed_at || !a.results_json) continue;
    const r = JSON.parse(a.results_json);
    points.push({ date: a.completed_at, rank: 0, id: a.id ?? 0, source: 'Intake screening', phq9: r.depression.total, gad7: r.anxiety.total, safetyFlag: r.safetyFlag });
  }
  for (const f of followups) {
    if (!f.completed_at || !f.results_json) continue;
    const r = JSON.parse(f.results_json);
    points.push({ date: f.completed_at, rank: 1, id: f.id ?? 0, source: 'Follow-up', phq9: r.phq9, gad7: r.gad7, safetyFlag: r.safetyFlag });
  }
  // Oldest first. Times are stored to the minute, so two measurements can
  // share a time: then an intake screening comes before a follow-up, and
  // otherwise the one created first comes first.
  return points.sort((x, y) => x.date.localeCompare(y.date) || x.rank - y.rank || x.id - y.id);
}

function describe(first, last, meaningful, label) {
  const change = last - first;
  let text;
  if (Math.abs(change) < meaningful) text = `${label} changed by ${change >= 0 ? '+' : ''}${change} (less than ${meaningful} points: no clear change).`;
  else if (change < 0) text = `${label} fell by ${-change} points: a clinically meaningful improvement.`;
  else text = `${label} rose by ${change} points: a clinically meaningful worsening.`;
  return { change, text };
}

// Compares the latest measurement with the first one.
export function progressSummary(points) {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const phq = describe(first.phq9, last.phq9, 5, 'PHQ-9');
  const gad = describe(first.gad7, last.gad7, 4, 'GAD-7');
  const notes = [phq.text, gad.text];
  if (first.phq9 >= 10 && last.phq9 <= first.phq9 / 2) notes.push('PHQ-9 response: a fall of 50% or more from the first measurement.');
  if (first.phq9 >= 5 && last.phq9 < 5) notes.push('PHQ-9 remission range (below 5).');
  if (first.gad7 >= 5 && last.gad7 < 5) notes.push('GAD-7 is now in the minimal range (below 5).');
  return { from: first.date, to: last.date, phqChange: phq.change, gadChange: gad.change, notes };
}
