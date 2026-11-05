// Scoring rules.
//
// IMPORTANT: this produces a SCREENING result, not a diagnosis. A diagnosis
// of major depressive disorder or generalized anxiety disorder requires a
// clinical interview (e.g. to rule out bipolar disorder, substance or medical
// causes, and to judge whether the symptoms are better explained by another
// condition). Every report says this.
//
// Sources for the cut-offs and algorithms:
// - PHQ-9: Kroenke, Spitzer & Williams (2001), J Gen Intern Med 16:606-613.
//   Severity bands 5/10/15/20. "Major depressive syndrome" algorithm:
//   >= 5 of the 9 items at "more than half the days" or more, one of them
//   item 1 or 2. Item 9 counts if present at all ("several days" or more).
//   "Other depressive syndrome": 2-4 such items, one of them item 1 or 2.
// - GAD-7: Spitzer, Kroenke, Williams & Lowe (2006), Arch Intern Med
//   166:1092-1097. Severity bands 5/10/15; >= 10 is the usual cut-off for
//   probable GAD.
// - DSM-5-TR GAD criteria A-C (excessive worry >= 6 months, hard to control,
//   >= 3 of 6 associated symptoms). ICD-11 6B00 describes the same picture
//   over "several months"; the 6-month rule here is the stricter of the two.

import {
  PHQ9_ITEMS,
  GAD7_ITEMS,
  GAD_CRITERIA_ITEMS,
  FREQUENCY_OPTIONS,
  DIFFICULTY_OPTIONS,
  PHQ_DIFFICULTY_ID,
  GAD_DIFFICULTY_ID,
} from './questionnaire.js';

// Likelihood levels, from highest to lowest. These are ordered categories,
// not percentages: the instruments do not give a valid individual
// probability, so the tool does not invent one.
export const LIKELIHOOD = {
  HIGH: 'High',
  MODERATE: 'Moderate',
  SUBCLINICAL: 'Low — subclinical symptoms present',
  MINIMAL: 'Minimal',
};

const frequencyLabel = (value) => FREQUENCY_OPTIONS.find((o) => o.value === value)?.label;
const difficultyLabel = (value) => DIFFICULTY_OPTIONS.find((o) => o.value === value)?.label;

function sumOf(items, answers) {
  return items.reduce((total, item) => total + answers[item.id], 0);
}

export function phq9Severity(total) {
  if (total >= 20) return 'Severe';
  if (total >= 15) return 'Moderately severe';
  if (total >= 10) return 'Moderate';
  if (total >= 5) return 'Mild';
  return 'Minimal';
}

export function gad7Severity(total) {
  if (total >= 15) return 'Severe';
  if (total >= 10) return 'Moderate';
  if (total >= 5) return 'Mild';
  return 'Minimal';
}

export function scoreDepression(answers) {
  const total = sumOf(PHQ9_ITEMS, answers);

  // An item "counts" toward the DSM symptom count when it is present more
  // than half the days. Item 9 (thoughts of death / self-harm) counts at any
  // frequency, because the DSM criterion does not require it daily.
  const counts = (item) => (item.id === 'phq9' ? answers.phq9 >= 1 : answers[item.id] >= 2);

  const countedItems = PHQ9_ITEMS.filter(counts);
  const coreSymptomPresent = counts(PHQ9_ITEMS[0]) || counts(PHQ9_ITEMS[1]);
  const symptomCount = countedItems.length;

  let syndrome;
  if (coreSymptomPresent && symptomCount >= 5) {
    syndrome = 'Major depressive syndrome — DSM-5-TR symptom criteria endorsed';
  } else if (coreSymptomPresent && symptomCount >= 2) {
    syndrome = 'Other (subthreshold) depressive syndrome';
  } else {
    syndrome = 'Symptom criteria not met';
  }
  const meetsMajorCriteria = coreSymptomPresent && symptomCount >= 5;

  let likelihood;
  if (meetsMajorCriteria && total >= 10) likelihood = LIKELIHOOD.HIGH;
  else if (meetsMajorCriteria || total >= 10) likelihood = LIKELIHOOD.MODERATE;
  else if (total >= 5 || symptomCount >= 2 || answers.phq9 >= 1) likelihood = LIKELIHOOD.SUBCLINICAL;
  else likelihood = LIKELIHOOD.MINIMAL;

  // Subclinical symptoms: anything the person reported (at least "several
  // days") that did NOT reach the threshold that counts toward a diagnosis.
  const subclinicalSymptoms = PHQ9_ITEMS.filter((item) => answers[item.id] >= 1 && !counts(item)).map(
    (item) => ({ symptom: item.symptom, frequency: frequencyLabel(answers[item.id]) })
  );

  const thresholdSymptoms = countedItems.map((item) => ({
    symptom: item.symptom,
    frequency: frequencyLabel(answers[item.id]),
  }));

  return {
    instrument: 'PHQ-9',
    total,
    maxTotal: 27,
    severity: phq9Severity(total),
    symptomCount,
    coreSymptomPresent,
    syndrome,
    meetsMajorCriteria,
    likelihood,
    thresholdSymptoms,
    subclinicalSymptoms,
    functionalDifficulty: difficultyLabel(answers[PHQ_DIFFICULTY_ID]),
    itemScores: PHQ9_ITEMS.map((item) => ({
      id: item.id,
      text: item.text,
      score: answers[item.id],
      answer: frequencyLabel(answers[item.id]),
    })),
  };
}

export function scoreAnxiety(answers) {
  const total = sumOf(GAD7_ITEMS, answers);

  const criterionA = answers.gadA === 1;
  const criterionB = answers.gadB === 1;
  const cItems = GAD_CRITERIA_ITEMS.filter((item) => item.criterion === 'C');
  const associatedCount = cItems.filter((item) => answers[item.id] === 1).length;
  const criterionC = associatedCount >= 3;
  const meetsCriteriaABC = criterionA && criterionB && criterionC;

  let likelihood;
  if (meetsCriteriaABC && total >= 10) likelihood = LIKELIHOOD.HIGH;
  else if (meetsCriteriaABC || total >= 10) likelihood = LIKELIHOOD.MODERATE;
  else if (total >= 5 || criterionA || criterionB || associatedCount >= 1) likelihood = LIKELIHOOD.SUBCLINICAL;
  else likelihood = LIKELIHOOD.MINIMAL;

  const notes = [];
  if (total >= 10 && !criterionA) {
    notes.push(
      'GAD-7 is elevated but the person did not report 6+ months of excessive worry. ' +
        'Symptoms may be too recent for GAD; consider adjustment disorder or another anxiety ' +
        'disorder (the GAD-7 also picks up panic disorder, social anxiety disorder and PTSD).'
    );
  }
  if (meetsCriteriaABC && total < 10) {
    notes.push(
      'DSM-5-TR criteria A-C were endorsed but current (2-week) GAD-7 severity is below 10. ' +
        'Symptoms may be fluctuating or partly remitted.'
    );
  }

  // Subclinical symptoms: GAD-7 items present at a low frequency ("several
  // days"), plus any criteria items endorsed when the full criteria are not met.
  const subclinicalSymptoms = GAD7_ITEMS.filter((item) => answers[item.id] === 1).map((item) => ({
    symptom: item.symptom,
    frequency: frequencyLabel(answers[item.id]),
  }));
  if (!meetsCriteriaABC) {
    for (const item of GAD_CRITERIA_ITEMS) {
      if (answers[item.id] === 1) {
        subclinicalSymptoms.push({ symptom: item.symptom, frequency: 'Endorsed (criteria not fully met)' });
      }
    }
  }

  const thresholdSymptoms = GAD7_ITEMS.filter((item) => answers[item.id] >= 2).map((item) => ({
    symptom: item.symptom,
    frequency: frequencyLabel(answers[item.id]),
  }));

  return {
    instrument: 'GAD-7 + DSM-5-TR criteria items',
    total,
    maxTotal: 21,
    severity: gad7Severity(total),
    criteria: {
      A: criterionA,
      B: criterionB,
      C: criterionC,
      associatedCount,
    },
    meetsCriteriaABC,
    likelihood,
    notes,
    thresholdSymptoms,
    subclinicalSymptoms,
    functionalDifficulty: difficultyLabel(answers[GAD_DIFFICULTY_ID]),
    itemScores: [
      ...GAD7_ITEMS.map((item) => ({
        id: item.id,
        text: item.text,
        score: answers[item.id],
        answer: frequencyLabel(answers[item.id]),
      })),
      ...GAD_CRITERIA_ITEMS.map((item) => ({
        id: item.id,
        text: item.text,
        score: answers[item.id],
        answer: answers[item.id] === 1 ? 'Yes' : 'No',
      })),
    ],
  };
}

// The full result stored in the database and sent to the clinician.
export function scoreAll(answers) {
  return {
    depression: scoreDepression(answers),
    anxiety: scoreAnxiety(answers),
    // Any answer above "Not at all" on PHQ-9 item 9 is a safety flag that
    // needs same-day clinical follow-up.
    safetyFlag: answers.phq9 >= 1,
    safetyAnswer: frequencyLabel(answers.phq9),
  };
}

// Things the clinician must still check before making any diagnosis.
export const CLINICIAN_CHECKLIST = [
  'Confirm symptoms in a clinical interview (screening questionnaires over-identify cases).',
  'Rule out a history of mania or hypomania (bipolar disorder) before diagnosing major depressive disorder.',
  'Rule out substance/medication effects and medical causes (e.g. thyroid disease, anaemia).',
  'Check that symptoms cause clinically significant distress or impairment.',
  'Consider whether another disorder better explains the symptoms (e.g. panic, social anxiety, PTSD, OCD, grief).',
  'For depression: ICD-11 (6A70/6A71) uses a similar 2-week, 5-of-10-symptom rule and adds hopelessness as a separate symptom.',
];
