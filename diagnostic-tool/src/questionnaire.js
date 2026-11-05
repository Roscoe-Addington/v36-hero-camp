// The questionnaire content.
//
// PHQ-9 and GAD-7 were developed by Drs. Spitzer, Williams, Kroenke and
// colleagues with an educational grant from Pfizer Inc. They are in the
// public domain: "No permission required to reproduce, translate, display
// or distribute." The wording below is the standard English wording.
//
// The "GAD criteria" items are NOT a validated instrument. They are written
// for this tool to cover the parts of the DSM-5-TR criteria for generalized
// anxiety disorder that the GAD-7 does not ask about (mainly the 6-month
// duration). They paraphrase the criteria; they do not quote the DSM.

// Answer scale shared by PHQ-9 and GAD-7.
export const FREQUENCY_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

export const DIFFICULTY_OPTIONS = [
  { value: 0, label: 'Not difficult at all' },
  { value: 1, label: 'Somewhat difficult' },
  { value: 2, label: 'Very difficult' },
  { value: 3, label: 'Extremely difficult' },
];

export const YES_NO_OPTIONS = [
  { value: 1, label: 'Yes' },
  { value: 0, label: 'No' },
];

// `symptom` is the short clinical name used in the clinician report.
export const PHQ9_ITEMS = [
  { id: 'phq1', text: 'Little interest or pleasure in doing things', symptom: 'Anhedonia (loss of interest or pleasure)' },
  { id: 'phq2', text: 'Feeling down, depressed, or hopeless', symptom: 'Depressed mood' },
  { id: 'phq3', text: 'Trouble falling or staying asleep, or sleeping too much', symptom: 'Sleep disturbance' },
  { id: 'phq4', text: 'Feeling tired or having little energy', symptom: 'Fatigue / loss of energy' },
  { id: 'phq5', text: 'Poor appetite or overeating', symptom: 'Appetite change' },
  { id: 'phq6', text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down', symptom: 'Worthlessness / guilt' },
  { id: 'phq7', text: 'Trouble concentrating on things, such as reading the newspaper or watching television', symptom: 'Poor concentration' },
  { id: 'phq8', text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual', symptom: 'Psychomotor retardation / agitation' },
  { id: 'phq9', text: 'Thoughts that you would be better off dead or of hurting yourself in some way', symptom: 'Thoughts of death or self-harm' },
];

export const GAD7_ITEMS = [
  { id: 'gad1', text: 'Feeling nervous, anxious, or on edge', symptom: 'Nervousness / on edge' },
  { id: 'gad2', text: 'Not being able to stop or control worrying', symptom: 'Uncontrollable worry' },
  { id: 'gad3', text: 'Worrying too much about different things', symptom: 'Excessive worry about several things' },
  { id: 'gad4', text: 'Trouble relaxing', symptom: 'Trouble relaxing' },
  { id: 'gad5', text: 'Being so restless that it is hard to sit still', symptom: 'Restlessness' },
  { id: 'gad6', text: 'Becoming easily annoyed or irritable', symptom: 'Irritability' },
  { id: 'gad7', text: 'Feeling afraid, as if something awful might happen', symptom: 'Fear something awful will happen' },
];

// Supplementary yes/no items mapping to DSM-5-TR GAD criteria A, B and C.
export const GAD_CRITERIA_ITEMS = [
  { id: 'gadA', criterion: 'A', text: 'During the past 6 months, have you been worrying a lot about several different things (for example work, health, family or money) on more days than not?', symptom: 'Excessive worry, more days than not, for 6+ months' },
  { id: 'gadB', criterion: 'B', text: 'During those 6 months, has it been hard to control or stop the worrying?', symptom: 'Difficulty controlling the worry' },
  { id: 'gadC1', criterion: 'C', text: 'During those 6 months, have you often felt restless, keyed up or on edge?', symptom: 'Restlessness / keyed up' },
  { id: 'gadC2', criterion: 'C', text: 'During those 6 months, have you often been easily tired?', symptom: 'Easily fatigued' },
  { id: 'gadC3', criterion: 'C', text: 'During those 6 months, have you often had trouble concentrating, or had your mind go blank?', symptom: 'Difficulty concentrating / mind going blank' },
  { id: 'gadC4', criterion: 'C', text: 'During those 6 months, have you often been irritable?', symptom: 'Irritability' },
  { id: 'gadC5', criterion: 'C', text: 'During those 6 months, have you often had tense or sore muscles?', symptom: 'Muscle tension' },
  { id: 'gadC6', criterion: 'C', text: 'During those 6 months, have you often had trouble sleeping (falling or staying asleep, or restless sleep)?', symptom: 'Sleep disturbance' },
];

export const PHQ_DIFFICULTY_ID = 'phqDifficulty';
export const GAD_DIFFICULTY_ID = 'gadDifficulty';

export const DIFFICULTY_QUESTION =
  'If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?';

// Every answer the form must contain, with the values allowed for it.
// Used to validate what the browser sends to the server.
export const ALL_FIELDS = [
  ...PHQ9_ITEMS.map((item) => ({ id: item.id, allowed: [0, 1, 2, 3] })),
  { id: PHQ_DIFFICULTY_ID, allowed: [0, 1, 2, 3] },
  ...GAD7_ITEMS.map((item) => ({ id: item.id, allowed: [0, 1, 2, 3] })),
  { id: GAD_DIFFICULTY_ID, allowed: [0, 1, 2, 3] },
  ...GAD_CRITERIA_ITEMS.map((item) => ({ id: item.id, allowed: [0, 1] })),
];

// Turns the raw form body (all strings) into numbers, or returns a list of
// problems if anything is missing or out of range.
export function parseAnswers(body) {
  const answers = {};
  const errors = [];
  for (const field of ALL_FIELDS) {
    const raw = body?.[field.id];
    const value = Number(raw);
    if (raw === undefined || raw === '' || !field.allowed.includes(value)) {
      errors.push(field.id);
    } else {
      answers[field.id] = value;
    }
  }
  return { answers, errors };
}
