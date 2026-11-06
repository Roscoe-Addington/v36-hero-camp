// The clinician's structured forms: intake interview (with mental status
// examination), suicide risk assessment with safety plan, and information
// from an informant (someone who knows the patient well).
//
// The wording is written for this app. The risk assessment follows the
// usual domains of a clinical suicide risk assessment (thoughts, behaviour,
// risk and protective factors, formulation, safety plan). On purpose it does
// NOT calculate a risk score or a "low/medium/high" category: guidelines such
// as NICE (2022) advise against using risk scales to predict suicide or to
// decide who gets care. The clinician writes a formulation and a plan instead.

import { parseForm } from './forms.js';

const YES_NO = [['no', 'No'], ['yes', 'Yes']];
const YES_NO_UNSURE = [['no', 'No'], ['yes', 'Yes'], ['unsure', 'Not sure']];

// ---------- Intake interview ----------

export const INTERVIEW = [
  { title: 'Reason for assessment', fields: [
    { id: 'reason', type: 'text', label: 'Reason for referral and main concerns (in the patient’s words where possible)', required: true },
    { id: 'onset', type: 'text', label: 'Onset and course of the current problems' },
  ] },
  { title: 'Psychiatric history', fields: [
    { id: 'prev_dx', type: 'text', label: 'Previous psychiatric diagnoses' },
    { id: 'prev_treatment', type: 'checks', label: 'Previous treatment', options: [
      ['therapy', 'Psychotherapy'], ['medication', 'Psychiatric medication'], ['inpatient', 'Psychiatric inpatient care'],
      ['compulsory', 'Compulsory care'], ['ect', 'ECT'],
    ] },
    { id: 'prev_treatment_notes', type: 'text', label: 'Treatment details (what helped, what did not)' },
    { id: 'prev_attempt', type: 'choice', label: 'Previous suicide attempts', options: [
      ['none', 'None'], ['one', 'One'], ['multiple', 'More than one'], ['unknown', 'Unknown'],
    ] },
    { id: 'self_harm_hist', type: 'choice', label: 'History of self-harm', options: [
      ['no', 'No'], ['past', 'More than a year ago'], ['recent', 'In the past year'], ['unknown', 'Unknown'],
    ] },
  ] },
  { title: 'Family history (parents, siblings, children)', fields: [
    { id: 'family', type: 'checks', label: 'Conditions in the family', options: [
      ['depression', 'Depression'], ['bipolar', 'Bipolar disorder'], ['psychosis', 'Schizophrenia or other psychosis'],
      ['anxiety', 'Anxiety disorders'], ['ocd', 'OCD'], ['substance', 'Substance use problems'], ['suicide', 'Suicide'],
      ['dementia', 'Dementia'], ['neurodev', 'ADHD or autism'],
    ] },
    { id: 'family_notes', type: 'text', label: 'Details' },
  ] },
  { title: 'Medical history', fields: [
    { id: 'medical', type: 'text', label: 'Physical illnesses, injuries (including head injuries), operations' },
    { id: 'medicines', type: 'text', label: 'Current medicines and doses, including non-prescription and supplements' },
    { id: 'perinatal', type: 'choice', label: 'Pregnancy', options: [
      ['na', 'Not applicable'], ['no', 'Not pregnant and no birth in the past 12 months'], ['pregnant', 'Pregnant'], ['postpartum', 'Gave birth in the past 12 months'],
    ] },
  ] },
  { title: 'Substance use', fields: [
    { id: 'substance_notes', type: 'text', label: 'Alcohol, drugs, tobacco and caffeine: amounts, pattern, consequences' },
  ] },
  { title: 'Social situation and development', fields: [
    { id: 'living', type: 'text', label: 'Living situation, relationships, children' },
    { id: 'occupation', type: 'text', label: 'Work, studies, finances' },
    { id: 'legal', type: 'text', label: 'Legal problems' },
    { id: 'development', type: 'text', label: 'Childhood and development (school, early adversity, neurodevelopmental signs)' },
  ] },
];

export const MSE = [
  { title: 'Mental status examination', fields: [
    { id: 'mse_appearance', type: 'text', label: 'Appearance and behaviour (grooming, eye contact, rapport)' },
    { id: 'mse_psychomotor', type: 'choice', label: 'Psychomotor activity', options: [
      ['normal', 'Normal'], ['slowed', 'Slowed'], ['agitated', 'Agitated'], ['abnormal', 'Abnormal movements'],
    ] },
    { id: 'mse_speech', type: 'choice', label: 'Speech', options: [
      ['normal', 'Normal'], ['slow', 'Slow or sparse'], ['pressured', 'Pressured'], ['other', 'Other (describe below)'],
    ] },
    { id: 'mse_mood', type: 'line', label: 'Mood (in the patient’s words)' },
    { id: 'mse_affect', type: 'choice', label: 'Affect', options: [
      ['normal', 'Normal range'], ['restricted', 'Restricted'], ['blunted', 'Blunted'], ['flat', 'Flat'],
      ['labile', 'Labile'], ['incongruent', 'Incongruent with mood'],
    ] },
    { id: 'mse_thought_form', type: 'choice', label: 'Thought form', options: [
      ['normal', 'Normal'], ['circumstantial', 'Circumstantial'], ['tangential', 'Tangential'],
      ['flight', 'Flight of ideas'], ['loosening', 'Loosening of associations'], ['blocking', 'Thought blocking'],
    ] },
    { id: 'mse_delusions', type: 'choice', label: 'Delusions', options: YES_NO },
    { id: 'mse_obsessions', type: 'choice', label: 'Obsessions', options: YES_NO },
    { id: 'mse_hallucinations', type: 'choice', label: 'Hallucinations', options: YES_NO },
    { id: 'mse_thought_notes', type: 'text', label: 'Thought content and perception: details' },
    { id: 'mse_orientation', type: 'choice', label: 'Orientation', options: [['oriented', 'Fully oriented'], ['disoriented', 'Disoriented (time, place or person)']] },
    { id: 'mse_insight', type: 'choice', label: 'Insight', options: [['good', 'Good'], ['partial', 'Partial'], ['poor', 'Poor'], ['absent', 'Absent']] },
    { id: 'mse_judgement', type: 'choice', label: 'Judgement', options: [['good', 'Good'], ['impaired', 'Impaired']] },
    { id: 'mse_notes', type: 'text', label: 'Other observations' },
  ] },
];

export const INTERVIEW_FORM = [...INTERVIEW, ...MSE];

// ---------- Suicide risk assessment and safety plan ----------

export const RISK = [
  { title: 'Suicidal thoughts and behaviour', fields: [
    { id: 'ideation', type: 'choice', label: 'Current suicidal thoughts', required: true, options: [
      ['none', 'None'],
      ['passive', 'Wishes to be dead or not wake up, without thoughts of acting'],
      ['active', 'Thoughts of killing themselves, without a method'],
      ['method', 'Has thought about a method'],
      ['intent', 'Some intent to act'],
      ['plan', 'A specific plan with intent'],
    ] },
    { id: 'ideation_notes', type: 'text', label: 'Details: frequency, duration, how controllable, triggers' },
    { id: 'preparatory', type: 'choice', label: 'Preparations (e.g. collecting medicines, writing a note) in the past 3 months', options: YES_NO_UNSURE },
    { id: 'attempts', type: 'choice', label: 'Previous suicide attempts', options: [['none', 'None'], ['one', 'One'], ['multiple', 'More than one'], ['unknown', 'Unknown']] },
    { id: 'last_attempt', type: 'line', label: 'Most recent attempt: when and how' },
    { id: 'self_harm_recent', type: 'choice', label: 'Self-harm in the past year', options: YES_NO_UNSURE },
  ] },
  { title: 'Risk factors present', fields: [
    { id: 'risk_factors', type: 'checks', label: 'Risk factors', options: [
      ['prev_attempt', 'Previous suicide attempt'], ['family_suicide', 'Suicide in the family'],
      ['hopelessness', 'Hopelessness'], ['recent_loss', 'Recent loss, crisis or humiliation'],
      ['substance', 'Alcohol or drug misuse'], ['severe_illness', 'Severe mental illness (e.g. psychosis, bipolar disorder)'],
      ['command', 'Command hallucinations'], ['impulsivity', 'Impulsivity or agitation'],
      ['pain', 'Chronic pain or physical illness'], ['isolation', 'Social isolation'],
      ['means', 'Access to lethal means (e.g. firearms, stored medicines)'], ['discharge', 'Recent discharge from psychiatric care'],
    ] },
  ] },
  { title: 'Protective factors present', fields: [
    { id: 'protective', type: 'checks', label: 'Protective factors', options: [
      ['support', 'Supportive family or friends'], ['children', 'Responsibility for children or pets'],
      ['engaged', 'Engaged in care and willing to accept help'], ['reasons', 'Reasons for living, hope for the future'],
      ['beliefs', 'Religious, cultural or moral objections to suicide'], ['coping', 'Problem-solving and coping skills'],
    ] },
  ] },
  { title: 'Formulation and plan', fields: [
    { id: 'formulation', type: 'text', label: 'Risk formulation: what drives the risk now, what protects, what could change it', required: true },
    { id: 'immediate', type: 'choice', label: 'Immediate action needed (e.g. emergency psychiatric assessment)?', required: true, options: YES_NO },
    { id: 'plan', type: 'text', label: 'Management plan: follow-up, who is told, referrals', required: true },
  ] },
  { title: 'Safety plan (written together with the patient)', fields: [
    { id: 'sp_warning', type: 'text', label: '1. Warning signs that a crisis may be starting' },
    { id: 'sp_coping', type: 'text', label: '2. Things I can do on my own to cope' },
    { id: 'sp_distraction', type: 'text', label: '3. People and places that help take my mind off things' },
    { id: 'sp_people', type: 'text', label: '4. People I can ask for help (name and phone number)' },
    { id: 'sp_professionals', type: 'text', label: '5. Professionals and services to contact (including 112 and crisis lines)' },
    { id: 'sp_means', type: 'text', label: '6. Making my surroundings safer (e.g. medicines, weapons)' },
    { id: 'sp_reasons', type: 'text', label: '7. My reasons for living' },
  ] },
];

// ---------- Informant ----------

export const INFORMANT = [
  { title: 'Informant', fields: [
    { id: 'inf_name', type: 'line', label: 'Name', required: true },
    { id: 'inf_relationship', type: 'line', label: 'Relationship to the patient (e.g. daughter, partner)', required: true },
    { id: 'inf_consent', type: 'choice', label: 'The patient has agreed that this person is contacted', required: true, options: YES_NO },
  ] },
  { title: 'What the informant has noticed', fields: [
    { id: 'inf_memory', type: 'choice', label: 'A decline in memory or thinking', options: YES_NO_UNSURE },
    { id: 'inf_memory_course', type: 'text', label: 'If so: when it started and how fast it has changed' },
    { id: 'inf_daily', type: 'choice', label: 'Needs more help than before with everyday activities (money, medicines, cooking)', options: YES_NO_UNSURE },
    { id: 'inf_elevated', type: 'choice', label: 'Periods of days with unusually elevated mood, energy or reduced need for sleep', options: YES_NO_UNSURE },
    { id: 'inf_traits', type: 'choice', label: 'Long-standing difficulties in relationships or behaviour since adolescence or early adulthood', options: YES_NO_UNSURE },
    { id: 'inf_psychotic', type: 'choice', label: 'Odd beliefs, marked suspiciousness, or responding to things that are not there', options: YES_NO_UNSURE },
    { id: 'inf_substance', type: 'choice', label: 'Worries about alcohol or drug use', options: YES_NO_UNSURE },
    { id: 'inf_safety', type: 'choice', label: 'Worried about the patient’s safety (e.g. talk of suicide, self-harm)', options: YES_NO_UNSURE },
    { id: 'inf_notes', type: 'text', label: 'Other information' },
  ] },
];

const stamp = (now) => now ?? new Date().toISOString().slice(0, 16).replace('T', ' ');

export function parseInterview(body, now) {
  const { values, errors } = parseForm(INTERVIEW_FORM, body);
  return errors.length ? { errors } : { interview: { ...values, updated_at: stamp(now) } };
}

export function parseRisk(body, now) {
  const { values, errors } = parseForm(RISK, body);
  return errors.length ? { errors } : { risk: { ...values, updated_at: stamp(now) } };
}

export function parseInformant(body, now) {
  const { values, errors } = parseForm(INFORMANT, body);
  if (!errors.length && values.inf_consent !== 'yes') {
    errors.push('Record information from an informant only when the patient has agreed (or where the law allows it without consent).');
  }
  return errors.length ? { errors } : { informant: { ...values, updated_at: stamp(now) } };
}

// ---------- When a risk assessment is required ----------

// Every reason, from anywhere in the assessment, to do a risk assessment.
export function riskIndicators(c) {
  const reasons = [];
  const a = c.answers ?? {};
  if (c.results?.safetyFlag) reasons.push(`PHQ-9 item 9 (thoughts of death or self-harm): "${c.results.safetyAnswer}".`);
  if (a.pd16 === 1) reasons.push('Reports having deliberately hurt themselves (screening).');
  if (['one', 'multiple'].includes(c.interview?.prev_attempt)) reasons.push('Previous suicide attempt (intake interview).');
  if (c.interview?.self_harm_hist === 'recent') reasons.push('Self-harm in the past year (intake interview).');
  if (c.informant?.inf_safety === 'yes') reasons.push('The informant is worried about the patient’s safety.');
  if (c.interview?.mse_hallucinations === 'yes' || c.interview?.mse_delusions === 'yes') reasons.push('Psychotic symptoms in the mental status examination.');
  return reasons;
}

// Returns a reason the assessment cannot be finalized yet, or null.
export function finalizeBlocker(c) {
  if (!c.interview?.updated_at) return 'Complete the intake interview before finalizing.';
  if (riskIndicators(c).length && !c.risk?.updated_at) {
    return 'A suicide risk assessment is required before finalizing, because of: ' + riskIndicators(c).join(' ');
  }
  return null;
}
