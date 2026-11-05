// Differential diagnosis screening.
//
// For major depressive disorder (MDD) and generalized anxiety disorder (GAD),
// DSM-5-TR lists conditions that must be ruled out or that may explain the
// symptoms better. This module goes through them one by one and records, for
// each, WHICH answers it looked at, WHAT rule it applied and WHAT it found,
// so the clinician can check the reasoning.
//
// It does not decide a diagnosis. Each condition gets one of four statuses
// telling the clinician what to follow up in the interview.

import { findItem, answerLabel } from './questionnaire.js';

export const STATUS = {
  FLAGGED: 'Screen positive — evaluate',
  POSSIBLE: 'Unclear or partial — clarify in interview',
  NOT_INDICATED: 'Not indicated by screening',
  CLINICIAN: 'Cannot be screened by questionnaire — clinician to assess',
};

// Order used when sorting the report: most important first.
const STATUS_ORDER = [STATUS.FLAGGED, STATUS.POSSIBLE, STATUS.CLINICIAN, STATUS.NOT_INDICATED];

const YES = 1;
const NO = 0;
const OTHER = 2; // "Not sure" or "Does not apply to me"

// The question text and the patient's answer, quoted in the report.
function evidence(answers, ids) {
  return ids.map((id) => ({
    id,
    question: findItem(id)?.text ?? id,
    answer: answerLabel(id, answers[id]),
  }));
}

// AUDIT-C cut-offs (Bradley et al., 2007): >= 4 for men, >= 3 for women.
// For other or unknown gender we use 3, the more cautious cut-off.
export function auditCThreshold(gender) {
  return gender === 'Male' ? 4 : 3;
}

// ---------- One function per differential ----------
// Each returns the fields that differ; `build()` below adds the evidence.

const RULES = [
  {
    id: 'bipolar',
    condition: 'Bipolar I or II disorder',
    relevantTo: ['MDD'],
    priority: true,
    why: 'MDD may only be diagnosed if there has never been a manic or hypomanic episode (DSM-5-TR MDD criterion E). A depressive episode in bipolar disorder looks the same as one in MDD.',
    itemIds: ['bp1', 'bp2', 'bp3'],
    rule: 'Screen positive if bp1 = Yes AND (bp2 = Yes OR bp3 = Yes). Unclear if bp1 = Yes only.',
    evaluate(a) {
      if (a.bp1 === YES && (a.bp2 === YES || a.bp3 === YES)) {
        return { status: STATUS.FLAGGED, finding: 'Reports a past period of elevated or irritable mood with reduced need for sleep and/or noticeable consequences.' };
      }
      if (a.bp1 === YES) {
        return { status: STATUS.POSSIBLE, finding: 'Reports a past period of elevated or irritable mood, without the other features asked about.' };
      }
      return { status: STATUS.NOT_INDICATED, finding: 'No past period of elevated or irritable mood reported.' };
    },
    implication: 'If a past manic or hypomanic episode is confirmed, MDD cannot be diagnosed: consider bipolar I or II disorder, current episode depressed. This changes treatment (e.g. antidepressant monotherapy).',
    nextStep: 'Take a lifetime mood history, ideally with an informant; consider a validated tool such as the Mood Disorder Questionnaire (MDQ) or HCL-32.',
  },
  {
    id: 'psychosis',
    condition: 'Psychotic features or a psychotic disorder',
    relevantTo: ['MDD', 'GAD'],
    priority: true,
    why: 'Hallucinations or delusions point to MDD with psychotic features, bipolar disorder with psychotic features, or a schizophrenia-spectrum disorder, rather than a primary depressive or anxiety disorder.',
    itemIds: ['psy1'],
    rule: 'Screen positive if psy1 = Yes.',
    evaluate(a) {
      return a.psy1 === YES
        ? { status: STATUS.FLAGGED, finding: 'Reports perceptual disturbances or persecutory ideas.' }
        : { status: STATUS.NOT_INDICATED, finding: 'No psychotic-type experiences reported.' };
    },
    implication: 'If confirmed: consider the "with psychotic features" specifier, or a schizophrenia-spectrum or schizoaffective disorder. Needs prompt psychiatric assessment.',
    nextStep: 'Prompt psychiatric assessment, including risk assessment.',
  },
  {
    id: 'pdd',
    condition: 'Persistent depressive disorder (dysthymia)',
    relevantTo: ['MDD'],
    why: 'Persistent depressive disorder requires depressed mood on most days for at least 2 years. It can occur alone or together with major depressive episodes.',
    itemIds: ['pdd1'],
    rule: 'Screen positive if pdd1 = Yes.',
    evaluate(a, ctx) {
      if (a.pdd1 !== YES) return { status: STATUS.NOT_INDICATED, finding: 'Does not report depressed mood for 2+ years.' };
      return {
        status: STATUS.FLAGGED,
        finding: ctx.results.depression.meetsMajorCriteria
          ? 'Reports 2+ years of depressed mood AND current major depressive syndrome is endorsed.'
          : 'Reports 2+ years of depressed mood; current major depressive syndrome is not endorsed.',
      };
    },
    implication: 'If confirmed with current MDD: persistent depressive disorder with persistent or intermittent major depressive episodes. Without current MDD: persistent depressive disorder alone.',
    nextStep: 'Confirm duration (2+ years with no symptom-free period longer than 2 months) and age of onset.',
  },
  {
    id: 'substance',
    condition: 'Substance-induced depressive or anxiety disorder (alcohol or drugs)',
    relevantTo: ['MDD', 'GAD'],
    why: 'Alcohol and drug use, intoxication and withdrawal can cause both depressive and anxiety symptoms. Both diagnoses require that symptoms are not due to a substance.',
    itemIds: ['auditc1', 'auditc2', 'auditc3', 'drug1'],
    rule: 'AUDIT-C total (0–12) at or above the gender cut-off (4 for men, 3 for women and other/unknown) OR any non-medical drug use in the past 12 months.',
    evaluate(a, ctx) {
      const total = a.auditc1 + a.auditc2 + a.auditc3;
      const threshold = auditCThreshold(ctx.patient.gender);
      const alcoholPositive = total >= threshold;
      const drugPositive = a.drug1 >= 1;
      const parts = [
        `AUDIT-C = ${total}/12 (cut-off ${threshold} for recorded gender "${ctx.patient.gender}") — ${alcoholPositive ? 'positive' : 'negative'}.`,
        `Drug use in past 12 months: ${answerLabel('drug1', a.drug1)} — ${drugPositive ? 'positive' : 'negative'}.`,
      ];
      return {
        status: alcoholPositive || drugPositive ? STATUS.FLAGGED : STATUS.NOT_INDICATED,
        finding: parts.join(' '),
      };
    },
    implication: 'Check whether the symptoms started before the substance use and whether they persist during sustained abstinence (about 1 month). If not, a substance-induced disorder explains them better than MDD/GAD.',
    nextStep: 'Full AUDIT and/or DUDIT; map the timeline of symptoms against use; ask about withdrawal symptoms.',
  },
  {
    id: 'medication',
    condition: 'Medication-induced depressive or anxiety disorder',
    relevantTo: ['MDD', 'GAD'],
    why: 'Some medicines, and stopping some medicines, can cause depressive or anxiety symptoms.',
    itemIds: ['med1'],
    rule: 'Screen positive if med1 = Yes; unclear if med1 = Not sure.',
    evaluate(a) {
      if (a.med1 === YES) return { status: STATUS.FLAGGED, finding: 'Problems started or worsened after a change in medicine.' };
      if (a.med1 === OTHER) return { status: STATUS.POSSIBLE, finding: 'Not sure whether problems are linked to a medicine change.' };
      return { status: STATUS.NOT_INDICATED, finding: 'No link to a medicine change reported.' };
    },
    implication: 'Examples that can cause depressive symptoms: corticosteroids, interferon. Anxiety: stimulants, corticosteroids, thyroid hormone, some asthma inhalers, and withdrawal from benzodiazepines or other sedatives.',
    nextStep: 'Medication review including recent starts, stops and dose changes.',
  },
  {
    id: 'caffeine',
    condition: 'Caffeine-induced anxiety',
    relevantTo: ['GAD'],
    why: 'High caffeine intake can cause restlessness, nervousness and insomnia that mimic GAD.',
    itemIds: ['caf1'],
    rule: 'Screen positive if caf1 = Yes.',
    evaluate(a) {
      return a.caf1 === YES
        ? { status: STATUS.FLAGGED, finding: 'Reports high daily caffeine intake.' }
        : { status: STATUS.NOT_INDICATED, finding: 'No high caffeine intake reported.' };
    },
    implication: 'If anxiety symptoms track caffeine intake, consider caffeine-induced anxiety disorder.',
    nextStep: 'Quantify intake; consider a supervised reduction and reassess.',
  },
  {
    id: 'medical',
    condition: 'Depressive or anxiety disorder due to another medical condition',
    relevantTo: ['MDD', 'GAD'],
    why: 'Physical illness can cause depressive or anxiety symptoms directly. Both diagnoses require that symptoms are not due to another medical condition.',
    itemIds: ['medcond', 'medonset'],
    rule: 'Screen positive if medonset = Yes. Unclear if medcond = Yes or medonset = Not sure.',
    evaluate(a, ctx) {
      const notes = [];
      let status = STATUS.NOT_INDICATED;
      if (a.medonset === YES) {
        status = STATUS.FLAGGED;
        notes.push('Problems began around the time of a physical illness, injury, pregnancy or birth.');
        if (ctx.patient.gender === 'Female') {
          notes.push('If onset was during pregnancy or within 4 weeks after delivery, the "with peripartum onset" specifier applies.');
        }
      } else if (a.medcond === YES || a.medonset === OTHER || a.medcond === OTHER) {
        status = STATUS.POSSIBLE;
        notes.push('Reports an ongoing physical condition, or is unsure about a link.');
      } else {
        notes.push('No ongoing physical condition or illness-linked onset reported.');
      }
      return { status, finding: notes.join(' ') };
    },
    implication: 'Common medical mimics — depression: hypothyroidism, anaemia, vitamin B12 deficiency, neurological disease (e.g. stroke, Parkinson’s), cancer. Anxiety: hyperthyroidism, heart arrhythmia, asthma/COPD, low blood sugar.',
    nextStep: 'Medical history, physical examination and baseline blood tests as clinically indicated (e.g. TSH, blood count, glucose/HbA1c, B12/folate).',
  },
  {
    id: 'adjustment',
    condition: 'Adjustment disorder',
    relevantTo: ['MDD', 'GAD'],
    why: 'Emotional symptoms that start within 3 months of a stressor are an adjustment disorder ONLY if they do not meet the criteria for another disorder such as MDD or GAD.',
    itemIds: ['stress1'],
    rule: 'If stress1 = Yes and neither MDD nor GAD criteria are endorsed but symptoms are present: screen positive. If stress1 = Yes and MDD or GAD criteria are endorsed: unclear (MDD/GAD take precedence if confirmed).',
    evaluate(a, ctx) {
      const { depression, anxiety } = ctx.results;
      const criteriaMet = depression.meetsMajorCriteria || anxiety.meetsCriteriaABC;
      const symptomsPresent = depression.total >= 5 || anxiety.total >= 5;
      if (a.stress1 !== YES) return { status: STATUS.NOT_INDICATED, finding: 'No major stressor in the 3 months before onset reported.' };
      if (criteriaMet) {
        return { status: STATUS.POSSIBLE, finding: 'A stressor preceded onset, but MDD and/or GAD criteria are endorsed, which would take precedence if confirmed.' };
      }
      if (symptomsPresent) {
        return { status: STATUS.FLAGGED, finding: 'A stressor preceded onset and symptoms are present without full MDD/GAD criteria: adjustment disorder is a strong alternative.' };
      }
      return { status: STATUS.NOT_INDICATED, finding: 'A stressor was reported but current symptoms are minimal.' };
    },
    implication: 'Adjustment disorder with depressed mood / with anxiety / with mixed anxiety and depressed mood.',
    nextStep: 'Clarify the timing of onset relative to the stressor and whether symptoms are out of proportion to it.',
  },
  {
    id: 'grief',
    condition: 'Bereavement / prolonged grief disorder',
    relevantTo: ['MDD'],
    why: 'Normal grief can resemble depression. DSM-5-TR allows MDD to be diagnosed during bereavement but asks for careful clinical judgement. Prolonged grief disorder requires at least 12 months since the death (adults; ICD-11 uses 6 months).',
    itemIds: ['grief1', 'grief2'],
    rule: 'Death within 12 months: unclear (bereavement vs MDD). Death more than 12 months ago AND grief2 = Yes: screen positive for prolonged grief disorder.',
    evaluate(a) {
      if (a.grief1 === 1) {
        return { status: STATUS.POSSIBLE, finding: `Recent bereavement (within 12 months). Ongoing intense longing/preoccupation: ${answerLabel('grief2', a.grief2)}.` };
      }
      if (a.grief1 === 2 && a.grief2 === YES) {
        return { status: STATUS.FLAGGED, finding: 'Bereavement more than 12 months ago with ongoing intense longing or preoccupation most days.' };
      }
      if (a.grief1 === 2) return { status: STATUS.NOT_INDICATED, finding: 'Bereavement more than 12 months ago without ongoing intense grief reported.' };
      return { status: STATUS.NOT_INDICATED, finding: 'No bereavement reported.' };
    },
    implication: 'Grief: waves of longing focused on the deceased, self-esteem usually preserved. MDD: pervasive low mood and worthlessness. Prolonged grief disorder can co-occur with MDD.',
    nextStep: 'Explore the content of the low mood (loss-focused vs pervasive); consider PG-13-R if prolonged grief is suspected.',
  },
  {
    id: 'pmdd',
    condition: 'Premenstrual dysphoric disorder (PMDD)',
    relevantTo: ['MDD'],
    why: 'In PMDD, mood symptoms occur in the week before menstruation and improve within a few days after onset. It is a depressive disorder of its own.',
    itemIds: ['pmdd1'],
    rule: 'Screen positive if pmdd1 = Yes.',
    evaluate(a) {
      if (a.pmdd1 === YES) return { status: STATUS.FLAGGED, finding: 'Symptoms reported to be linked to the premenstrual phase.' };
      if (a.pmdd1 === OTHER) return { status: STATUS.NOT_INDICATED, finding: 'Question does not apply.' };
      return { status: STATUS.NOT_INDICATED, finding: 'No premenstrual pattern reported.' };
    },
    implication: 'If symptoms are confined to the premenstrual phase, consider PMDD instead of MDD.',
    nextStep: 'Diagnosis requires prospective daily symptom ratings over at least 2 menstrual cycles.',
  },
  {
    id: 'panic',
    condition: 'Panic disorder',
    relevantTo: ['GAD'],
    why: 'In panic disorder the anxiety centres on recurrent unexpected panic attacks and fear of further attacks, rather than on broad everyday worries.',
    itemIds: ['panic1', 'panic2'],
    rule: 'Screen positive if panic1 = Yes AND panic2 = Yes. Unclear if panic1 = Yes only.',
    evaluate(a) {
      if (a.panic1 === YES && a.panic2 === YES) return { status: STATUS.FLAGGED, finding: 'Reports panic attacks with worry about further attacks or avoidance.' };
      if (a.panic1 === YES) return { status: STATUS.POSSIBLE, finding: 'Reports panic attacks without persistent concern or avoidance.' };
      return { status: STATUS.NOT_INDICATED, finding: 'No panic attacks in the past 4 weeks reported.' };
    },
    implication: 'Panic disorder may co-occur with GAD or better explain the anxiety. Panic attacks alone can be noted with the "with panic attacks" specifier.',
    nextStep: 'Ask whether attacks are unexpected, how often they occur, and about agoraphobic avoidance; consider the PDSS.',
  },
  {
    id: 'social',
    condition: 'Social anxiety disorder',
    relevantTo: ['GAD'],
    why: 'GAD criterion F requires that the worry is not better explained by another disorder — e.g. worry that is mainly about being judged by others points to social anxiety disorder.',
    itemIds: ['soc1', 'soc2'],
    rule: 'Screen positive if soc1 = Yes. Unclear if only soc2 = Yes.',
    evaluate(a) {
      if (a.soc1 === YES) {
        return {
          status: STATUS.FLAGGED,
          finding: a.soc2 === YES
            ? 'Fears/avoids social situations AND worry is mainly about others’ opinions: the worry may be better explained by social anxiety.'
            : 'Fears/avoids social situations.',
        };
      }
      if (a.soc2 === YES) return { status: STATUS.POSSIBLE, finding: 'Worry mainly about others’ opinions, without reported social fear or avoidance.' };
      return { status: STATUS.NOT_INDICATED, finding: 'No social fear or avoidance reported.' };
    },
    implication: 'Social anxiety disorder may co-occur with GAD, or explain the worry better.',
    nextStep: 'Consider the SPIN or LSAS.',
  },
  {
    id: 'ocd',
    condition: 'Obsessive-compulsive disorder (OCD)',
    relevantTo: ['GAD'],
    why: 'Obsessions are intrusive, unwanted thoughts or images, often with compulsions. GAD worries are about real-life concerns (work, health, money).',
    itemIds: ['ocd1', 'ocd2'],
    rule: 'Screen positive if ocd1 = Yes OR ocd2 = Yes.',
    evaluate(a) {
      if (a.ocd1 === YES || a.ocd2 === YES) {
        const parts = [];
        if (a.ocd1 === YES) parts.push('intrusive unwanted thoughts');
        if (a.ocd2 === YES) parts.push('repetitive behaviours or mental routines');
        return { status: STATUS.FLAGGED, finding: `Reports ${parts.join(' and ')}.` };
      }
      return { status: STATUS.NOT_INDICATED, finding: 'No obsessions or compulsions reported.' };
    },
    implication: 'If confirmed, OCD may co-occur with GAD or explain the anxiety better.',
    nextStep: 'Consider the OCI-R or Y-BOCS.',
  },
  {
    id: 'illness',
    condition: 'Illness anxiety disorder / somatic symptom disorder',
    relevantTo: ['GAD'],
    why: 'If the worry is mainly about having or getting a serious illness, illness anxiety disorder may explain it better than GAD.',
    itemIds: ['ill1'],
    rule: 'Screen positive if ill1 = Yes.',
    evaluate(a) {
      return a.ill1 === YES
        ? { status: STATUS.FLAGGED, finding: 'Worry is mainly about serious illness.' }
        : { status: STATUS.NOT_INDICATED, finding: 'Worry is not mainly about illness.' };
    },
    implication: 'Illness anxiety disorder or somatic symptom disorder, after ruling out actual medical illness.',
    nextStep: 'Clarify the focus of the worry and any health-related checking or reassurance seeking.',
  },
  {
    id: 'ptsd',
    condition: 'Posttraumatic stress disorder (PTSD)',
    relevantTo: ['MDD', 'GAD'],
    why: 'PTSD shares many symptoms with MDD and GAD (sleep problems, irritability, poor concentration, being on edge, negative mood). If these follow a trauma, PTSD may explain them better.',
    itemIds: ['ptsd0', 'ptsd1', 'ptsd2', 'ptsd3', 'ptsd4', 'ptsd5'],
    rule: 'PC-PTSD-5: if trauma exposure (ptsd0 = Yes), count Yes answers to ptsd1–5. Screen positive if 3 or more (some settings use 4); unclear if 1–2.',
    evaluate(a) {
      if (a.ptsd0 !== YES) return { status: STATUS.NOT_INDICATED, finding: 'No trauma exposure reported (PC-PTSD-5 items not scored).' };
      const count = ['ptsd1', 'ptsd2', 'ptsd3', 'ptsd4', 'ptsd5'].filter((id) => a[id] === YES).length;
      const finding = `Trauma exposure reported; PC-PTSD-5 score ${count}/5.`;
      if (count >= 3) return { status: STATUS.FLAGGED, finding };
      if (count >= 1) return { status: STATUS.POSSIBLE, finding };
      return { status: STATUS.NOT_INDICATED, finding };
    },
    implication: 'PTSD may co-occur with MDD/GAD or explain the symptoms better.',
    nextStep: 'PCL-5 or a clinician-administered interview (CAPS-5).',
  },

  // ----- Conditions a questionnaire cannot screen for -----
  {
    id: 'neurocognitive',
    condition: 'Neurocognitive disorder (e.g. dementia)',
    relevantTo: ['MDD'],
    why: 'Depression and early dementia can look alike (poor concentration, apathy, low energy), especially in older adults.',
    itemIds: ['phq7'],
    rule: 'Not screened by questionnaire. Highlighted if the patient is 60 or older.',
    evaluate(a, ctx) {
      const age = ctx.patient.age;
      return {
        status: STATUS.CLINICIAN,
        finding: age >= 60
          ? `Patient is ${age}: assess cognition, especially if concentration problems are reported.`
          : `Patient is ${age}: consider only if there are memory or cognitive complaints.`,
      };
    },
    implication: 'Consider a neurocognitive disorder if cognitive problems are prominent or progressive.',
    nextStep: 'Cognitive screening (e.g. MoCA or MMSE) and history from an informant.',
  },
  {
    id: 'adhd',
    condition: 'Attention-deficit/hyperactivity disorder (ADHD)',
    relevantTo: ['MDD', 'GAD'],
    why: 'Poor concentration and restlessness occur in MDD, GAD and ADHD. ADHD symptoms start in childhood and are lifelong rather than episodic.',
    itemIds: ['phq7', 'gad5', 'gadC3'],
    rule: 'Not screened by questionnaire. Highlighted if concentration or restlessness items are endorsed.',
    evaluate(a) {
      const endorsed = a.phq7 >= 2 || a.gad5 >= 2 || a.gadC3 === YES;
      return {
        status: STATUS.CLINICIAN,
        finding: endorsed
          ? 'Concentration and/or restlessness problems are endorsed: ask whether they were present since childhood.'
          : 'Concentration and restlessness not prominent.',
      };
    },
    implication: 'Lifelong attention problems since childhood suggest ADHD (alone or with MDD/GAD).',
    nextStep: 'Developmental history; consider the ASRS.',
  },
  {
    id: 'personality',
    condition: 'Personality disorders',
    relevantTo: ['MDD', 'GAD'],
    why: 'Long-standing patterns of unstable mood, relationships or self-image (e.g. borderline personality disorder) can resemble or complicate MDD and GAD.',
    itemIds: [],
    rule: 'Not screened by questionnaire.',
    evaluate() {
      return { status: STATUS.CLINICIAN, finding: 'Requires longitudinal clinical assessment.' };
    },
    implication: 'May co-occur and affect treatment planning.',
    nextStep: 'Clinical interview; structured instruments (e.g. SCID-5-PD) if suspected.',
  },
];

// ---------- Overlap between MDD and GAD ----------
// Some symptoms count toward both disorders. This shows how much each result
// depends on them.

const OVERLAP_PAIRS = [
  { symptom: 'Sleep disturbance', phq: 'phq3', gad: ['gadC6'] },
  { symptom: 'Fatigue', phq: 'phq4', gad: ['gadC2'] },
  { symptom: 'Poor concentration', phq: 'phq7', gad: ['gadC3'] },
  { symptom: 'Restlessness / agitation', phq: 'phq8', gad: ['gad5', 'gadC1'] },
];

export function overlapAnalysis(a, results) {
  const shared = OVERLAP_PAIRS.map((pair) => {
    const onPhq = a[pair.phq] >= 2; // the PHQ-9 threshold used for the symptom count
    const onGad = pair.gad.some((id) => (id.startsWith('gadC') ? a[id] === YES : a[id] >= 2));
    return { ...pair, onPhq, onGad, both: onPhq && onGad };
  });
  const bothCount = shared.filter((s) => s.both).length;

  // MDD symptom count if shared symptoms that are ALSO present on the GAD side
  // were not counted.
  const mddWithoutShared = results.depression.symptomCount - shared.filter((s) => s.both && s.onPhq).length;
  // GAD criterion C count without the shared ones.
  const sharedCItems = shared.filter((s) => s.both).flatMap((s) => s.gad.filter((id) => id.startsWith('gadC') && a[id] === YES));
  const gadCWithoutShared = results.anxiety.criteria.associatedCount - new Set(sharedCItems).size;

  const notes = [];
  if (results.depression.meetsMajorCriteria && results.anxiety.meetsCriteriaABC) {
    notes.push('Both MDD and GAD criteria are endorsed. DSM-5-TR allows both diagnoses together; co-occurrence is common.');
  }
  if (results.depression.meetsMajorCriteria && mddWithoutShared < 5) {
    notes.push(`The MDD symptom count (${results.depression.symptomCount}) falls to ${mddWithoutShared} without symptoms also attributed to anxiety. Check that the depressive syndrome does not rest on shared symptoms.`);
  }
  if (results.anxiety.meetsCriteriaABC && gadCWithoutShared < 3) {
    notes.push(`GAD criterion C (${results.anxiety.criteria.associatedCount} of 6) falls to ${gadCWithoutShared} without symptoms also attributed to depression. Check that the anxiety syndrome does not rest on shared symptoms.`);
  }
  if (notes.length === 0) notes.push('No overlap concerns: neither result depends on symptoms shared between MDD and GAD.');

  return {
    shared: shared.map((s) => ({
      symptom: s.symptom,
      onDepressionSide: s.onPhq,
      onAnxietySide: s.onGad,
    })),
    bothCount,
    mddSymptomCountWithoutShared: mddWithoutShared,
    gadCriterionCWithoutShared: gadCWithoutShared,
    notes,
  };
}

// ---------- Run everything ----------

export function runDifferential(answers, patient, results) {
  const ctx = { patient, results };
  const entries = RULES.map((rule) => {
    const outcome = rule.evaluate(answers, ctx);
    return {
      id: rule.id,
      condition: rule.condition,
      relevantTo: rule.relevantTo,
      priority: Boolean(rule.priority) && outcome.status === STATUS.FLAGGED,
      why: rule.why,
      evidence: evidence(answers, rule.itemIds),
      rule: rule.rule,
      status: outcome.status,
      finding: outcome.finding,
      implication: rule.implication,
      nextStep: rule.nextStep,
    };
  });

  // Most important first; priority conditions (bipolar, psychosis) at the top.
  entries.sort(
    (x, y) =>
      Number(y.priority) - Number(x.priority) || STATUS_ORDER.indexOf(x.status) - STATUS_ORDER.indexOf(y.status)
  );

  const flagged = entries.filter((e) => e.status === STATUS.FLAGGED);
  const possible = entries.filter((e) => e.status === STATUS.POSSIBLE);

  return {
    version: 1,
    entries,
    overlap: overlapAnalysis(answers, results),
    summary: {
      flagged: flagged.map((e) => e.condition),
      possible: possible.map((e) => e.condition),
      priority: entries.filter((e) => e.priority).map((e) => e.condition),
      checked: entries.length,
    },
  };
}
