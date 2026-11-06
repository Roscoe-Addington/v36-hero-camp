// Turns the intake screening into suggestions for in-depth assessment.
//
// Input: the patient's screening answers, the scored results (including the
// differential), the patient record and the clinician's own intake (MoCA
// scores and observations). Output: which disorders the clinician should
// assess with the full criteria checklist, and WHY.
//
// Two strengths:
//   SUGGESTED  the screening points clearly toward this disorder
//   CONSIDER   weaker or partial signs: worth checking in the interview
//
// The clinician can still assess any disorder in the catalog, suggested or not.

import { findDisorder } from './disorders.js';
import { scoreMoca } from './moca.js';
import { STATUS as DIFF } from './differential.js';

export const STRENGTH = { SUGGESTED: 'Suggested', CONSIDER: 'Consider' };

const YES = 1;
const NO = 0;

// SAPAS-style personality screen (Moran et al., 2003): 8 areas, one point
// each. Item pd3 ("do you trust others?") scores a point for NO.
export function personalityScreen(a) {
  const points = ['pd1', 'pd2', 'pd4', 'pd5', 'pd6', 'pd7', 'pd8'].filter((id) => a[id] === YES).length + (a.pd3 === NO ? 1 : 0);
  return { score: points, max: 8, positive: points >= 3 };
}

// Borderline traits: temper, impulsivity and the 6 borderline items.
export function borderlineCount(a) {
  return ['pd4', 'pd5', 'pd14', 'pd15', 'pd16', 'pd17', 'pd18', 'pd19'].filter((id) => a[id] === YES).length;
}

// Delirium signs observed by the clinician. The rule follows the structure of
// the CAM algorithm (acute onset/fluctuation AND inattention AND either
// disorganised thinking or altered consciousness). It is not the official CAM.
export function deliriumSigns(obs) {
  if (!obs) return { assessed: false, positive: false };
  const positive = obs.acute === 'yes' && obs.inattention === 'yes' && (obs.disorganized === 'yes' || obs.consciousness === 'yes');
  return { assessed: true, positive };
}

export function buildSuggestions({ answers: a, results, patient, intake }) {
  const found = new Map();
  function add(disorderId, strength, reason) {
    const existing = found.get(disorderId);
    if (!existing) {
      found.set(disorderId, { disorderId, strength, reasons: [reason] });
      return;
    }
    if (strength === STRENGTH.SUGGESTED) existing.strength = STRENGTH.SUGGESTED;
    existing.reasons.push(reason);
  }

  const dep = results.depression;
  const anx = results.anxiety;
  const diff = Object.fromEntries((results.differential?.entries ?? []).map((e) => [e.id, e]));
  const flagged = (id) => diff[id]?.status === DIFF.FLAGGED;
  const possible = (id) => diff[id]?.status === DIFF.POSSIBLE;

  // ----- Mood -----
  if (dep.meetsMajorCriteria || dep.total >= 10) {
    add('mdd', STRENGTH.SUGGESTED, `PHQ-9 ${dep.total}/27 (${dep.severity}). Algorithm: ${dep.syndrome}.`);
  } else if (dep.total >= 5 || dep.symptomCount >= 2) {
    add('mdd', STRENGTH.CONSIDER, `Subthreshold depressive symptoms (PHQ-9 ${dep.total}).`);
  }
  if (a.pdd1 === YES) add('pdd', STRENGTH.SUGGESTED, 'Reports depressed mood on most days for 2+ years.');
  if (a.bp1 === YES && (a.bp2 === YES || a.bp3 === YES)) {
    const reason = 'Reports a past period of elevated or irritable mood with reduced need for sleep and/or noticeable consequences.';
    add('bipolar1', STRENGTH.SUGGESTED, reason);
    add('bipolar2', STRENGTH.SUGGESTED, reason);
  } else if (a.bp1 === YES) {
    add('bipolar2', STRENGTH.CONSIDER, 'Reports a past period of elevated or irritable mood (other features not reported).');
  }
  if (a.cyclo1 === YES) add('cyclothymic', STRENGTH.SUGGESTED, 'Reports frequent mood swings between up and down periods for 2+ years.');
  if (a.pmdd1 === YES) add('pmdd', STRENGTH.SUGGESTED, 'Reports symptoms mainly in the week before menstruation.');
  const moodSymptoms = dep.total >= 5;
  const anxietySymptoms = anx.total >= 5;
  if (flagged('substance') || flagged('medication')) {
    if (moodSymptoms) add('substance_mood', STRENGTH.SUGGESTED, diff.substance?.finding ?? 'Substance or medicine link reported.');
    if (anxietySymptoms) add('substance_anxiety', STRENGTH.SUGGESTED, diff.substance?.finding ?? 'Substance or medicine link reported.');
  } else if (possible('medication')) {
    if (moodSymptoms) add('substance_mood', STRENGTH.CONSIDER, 'Unsure whether symptoms are linked to a medicine change.');
    if (anxietySymptoms) add('substance_anxiety', STRENGTH.CONSIDER, 'Unsure whether symptoms are linked to a medicine change.');
  }
  if (flagged('medical') || possible('medical')) {
    const strength = flagged('medical') ? STRENGTH.SUGGESTED : STRENGTH.CONSIDER;
    if (moodSymptoms) add('medical_mood', strength, diff.medical.finding);
    if (anxietySymptoms) add('medical_anxiety', strength, diff.medical.finding);
  }

  // ----- Anxiety -----
  if (anx.meetsCriteriaABC || anx.total >= 10) {
    add('gad', STRENGTH.SUGGESTED, `GAD-7 ${anx.total}/21 (${anx.severity}); 6-month criteria ${anx.meetsCriteriaABC ? 'endorsed' : 'not fully endorsed'}.`);
  } else if (anx.total >= 5 || a.gadA === YES) {
    add('gad', STRENGTH.CONSIDER, `Subthreshold anxiety symptoms (GAD-7 ${anx.total}).`);
  }
  if (a.panic1 === YES && a.panic2 === YES) add('panic', STRENGTH.SUGGESTED, 'Panic attacks with worry about further attacks or avoidance.');
  else if (a.panic1 === YES) add('panic', STRENGTH.CONSIDER, 'Panic attacks without reported persistent worry or avoidance.');
  if (a.agora1 === YES) add('agoraphobia', STRENGTH.SUGGESTED, 'Fears or avoids two or more agoraphobic situations.');
  if (a.soc1 === YES) add('social', STRENGTH.SUGGESTED, 'Fears or avoids social situations where they may be judged.');
  else if (a.soc2 === YES) add('social', STRENGTH.CONSIDER, 'Worry is mainly about what others think.');
  if (a.phobia1 === YES) add('phobia', STRENGTH.SUGGESTED, 'Strong fear and avoidance of a specific object or situation.');
  if (a.sep1 === YES) add('separation', STRENGTH.SUGGESTED, 'Excessive worry about separation from, or harm to, people close to them.');
  if (a.mutism1 === YES) add('mutism', STRENGTH.SUGGESTED, 'Unable to speak in some situations despite speaking normally at home.');

  // ----- Personality -----
  const pd = personalityScreen(a);
  const bpd = borderlineCount(a);
  if (bpd >= 5) add('bpd', STRENGTH.SUGGESTED, `${bpd} of 8 borderline-related traits endorsed.`);
  else if (bpd >= 3) add('bpd', STRENGTH.CONSIDER, `${bpd} of 8 borderline-related traits endorsed.`);
  if (pd.positive) {
    const screen = `Personality screen ${pd.score}/8 (3 or more suggests further assessment)`;
    if (a.pd3 === NO) add('ppd', STRENGTH.CONSIDER, `${screen}; does not trust others.`);
    if (a.pd2 === YES && a.pd1 === YES) add('szpd', STRENGTH.CONSIDER, `${screen}; loner with difficulty making friends.`);
    if (a.pd9 === YES) add('stpd', STRENGTH.CONSIDER, `${screen}; odd behaviour or unusual experiences.`);
    if (a.pd12 === YES) {
      const age = Number(patient.age);
      add('aspd', STRENGTH.CONSIDER, `${screen}; repeated rule-breaking without remorse since the teens${age < 18 ? ' (patient is under 18: antisocial personality disorder cannot be diagnosed yet; consider conduct disorder)' : ''}.`);
    }
    if (a.pd10 === YES) add('hpd', STRENGTH.CONSIDER, `${screen}; needs to be the centre of attention.`);
    if (a.pd11 === YES) add('npd', STRENGTH.CONSIDER, `${screen}; feels special and needs admiration.`);
    if (a.pd13 === YES) add('avpd', STRENGTH.CONSIDER, `${screen}; avoids people for fear of criticism or rejection.`);
    if (a.pd7 === YES) add('dpd', STRENGTH.CONSIDER, `${screen}; depends a lot on others.`);
    if (a.pd8 === YES) add('ocpd', STRENGTH.CONSIDER, `${screen}; perfectionist.`);
  }

  // ----- Neurocognitive -----
  const moca = scoreMoca(intake?.moca);
  const delirium = deliriumSigns(intake?.delirium);
  if (delirium.positive) {
    add('delirium', STRENGTH.SUGGESTED, 'Clinician observed acute onset or fluctuation, inattention, and disorganised thinking or altered consciousness.');
  }
  if (moca) {
    const mocaText = `MoCA ${moca.adjusted}/30 (${moca.band})`;
    if (moca.adjusted < 18) add('major_ncd', STRENGTH.SUGGESTED, `${mocaText}.`);
    else if (moca.belowCutoff) {
      add('mild_ncd', STRENGTH.SUGGESTED, `${mocaText}.`);
      if (a.cog2 === YES) add('major_ncd', STRENGTH.SUGGESTED, `${mocaText} and everyday activities affected.`);
    } else if (a.cog1 === YES) {
      add('mild_ncd', STRENGTH.CONSIDER, `Memory concern reported but ${mocaText}.`);
    }
  } else if (a.cog1 === YES) {
    const reason = 'Memory or thinking decline reported. Give the MoCA on site to assess further.';
    add('mild_ncd', Number(patient.age) >= 60 ? STRENGTH.SUGGESTED : STRENGTH.CONSIDER, reason);
    if (a.cog2 === YES) add('major_ncd', STRENGTH.CONSIDER, `${reason} Everyday activities affected.`);
  }

  // ----- Neurological findings: refer, do not diagnose here -----
  const NEURO = [
    { id: 'neuro1', finding: 'Seizures or unexplained blackouts', urgent: false },
    { id: 'neuro2', finding: 'New weakness, numbness or paralysis (face, arm or leg)', urgent: true },
    { id: 'neuro3', finding: 'New difficulty speaking or understanding, or sudden vision loss', urgent: true },
    { id: 'neuro4', finding: 'Tremor, stiffness or slowed movements', urgent: false },
    { id: 'neuro5', finding: 'New severe headaches unlike before', urgent: true },
    { id: 'neuro6', finding: 'Head injury with loss of consciousness', urgent: false },
  ];
  const neuroReferral = NEURO.filter((n) => a[n.id] === YES).map(({ finding, urgent }) => ({
    finding,
    urgent,
    action: urgent
      ? 'Ask about timing now. If it started in the last days: emergency assessment (possible stroke or other acute cause). Otherwise: urgent neurology referral.'
      : 'Refer to a physician or neurologist for assessment.',
  }));

  // ----- Findings outside this app's scope -----
  const OUT = [
    { id: 'psychosis', condition: 'Psychotic disorder', where: 'schizophrenia spectrum and other psychotic disorders' },
    { id: 'ptsd', condition: 'Posttraumatic stress disorder', where: 'trauma- and stressor-related disorders' },
    { id: 'ocd', condition: 'Obsessive-compulsive disorder', where: 'obsessive-compulsive and related disorders' },
    { id: 'illness', condition: 'Illness anxiety disorder', where: 'somatic symptom and related disorders' },
    { id: 'adjustment', condition: 'Adjustment disorder', where: 'trauma- and stressor-related disorders' },
    { id: 'grief', condition: 'Prolonged grief disorder', where: 'trauma- and stressor-related disorders' },
    { id: 'substance', condition: 'Substance use disorder', where: 'substance-related and addictive disorders' },
  ];
  const outOfScope = OUT.filter((o) => flagged(o.id)).map((o) => ({
    condition: o.condition,
    reason: `${diff[o.id].finding} This app does not include the DSM-5-TR chapter on ${o.where}; assess it separately.`,
  }));

  const order = (s) => (s.strength === STRENGTH.SUGGESTED ? 0 : 1);
  const suggestions = [...found.values()]
    .map((s) => ({ ...s, name: findDisorder(s.disorderId).name, category: findDisorder(s.disorderId).category }))
    .sort((x, y) => order(x) - order(y));

  return { suggestions, neuroReferral, outOfScope, personality: { ...pd, borderlineTraits: bpd }, moca, delirium };
}
