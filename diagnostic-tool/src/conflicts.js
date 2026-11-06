// Which diagnoses may be given together.
//
// Three levels:
//   CONFLICT  DSM-5-TR does not allow both. Confirming the second one needs a
//             written reason (e.g. the first one is being revised).
//   CHECK     Both are allowed only if a condition holds. Shown as a warning.
//   CODING    Both are allowed, but they are coded or named in a special way.
//
// Clinical content written from general knowledge of DSM-5-TR and ICD-10.
// It must be reviewed by a clinician.

export const LEVEL = {
  CONFLICT: 'Not allowed together',
  CHECK: 'Check before giving both',
  CODING: 'Coding note',
};

// rule(level, 'a', ['b', 'c'], message) = a pair rule for a+b and a+c.
function rule(level, a, others, message) {
  return others.map((b) => ({ level, ids: [a, b], message }));
}

const ANXIETY_DISORDERS = ['gad', 'panic', 'agoraphobia', 'social', 'phobia', 'separation'];
const MOOD_DISORDERS = ['mdd', 'pdd', 'bipolar1', 'bipolar2', 'cyclothymic', 'pmdd'];

export const RULES = [
  // ----- Not allowed together -----
  ...rule(LEVEL.CONFLICT, 'mdd', ['bipolar1', 'bipolar2'],
    'Major depressive disorder requires that there has never been a manic or hypomanic episode. With bipolar disorder, code the depression as the current episode of the bipolar disorder.'),
  ...rule(LEVEL.CONFLICT, 'pdd', ['bipolar1', 'bipolar2', 'cyclothymic'],
    'Persistent depressive disorder requires that there has never been a manic or hypomanic episode and that cyclothymic criteria have never been met.'),
  ...rule(LEVEL.CONFLICT, 'cyclothymic', ['mdd', 'bipolar1', 'bipolar2'],
    'Cyclothymic disorder requires that a major depressive, manic or hypomanic episode has never occurred. If one has, the diagnosis changes to that disorder.'),
  ...rule(LEVEL.CONFLICT, 'bipolar1', ['bipolar2'],
    'Bipolar II requires that there has never been a manic episode. Any manic episode makes it bipolar I.'),
  ...rule(LEVEL.CONFLICT, 'dmdd', ['bipolar1', 'bipolar2'],
    'DMDD is not given if there has ever been a manic or hypomanic episode.'),
  ...rule(LEVEL.CONFLICT, 'mild_ncd', ['major_ncd'],
    'Mild and major neurocognitive disorder are two levels of the same disorder. Give the one that matches the current level.'),

  // Psychotic disorders: one psychotic diagnosis for the same illness.
  ...rule(LEVEL.CONFLICT, 'schizophrenia', ['schizophreniform', 'brief_psychotic', 'schizoaffective', 'delusional'],
    'These are alternative diagnoses for the same psychotic illness, separated by duration (brief < 1 month, schizophreniform 1–6 months, schizophrenia 6+ months), mood episodes (schizoaffective) and symptom type (delusional). Give the one that fits.'),
  ...rule(LEVEL.CONFLICT, 'schizophreniform', ['brief_psychotic', 'schizoaffective', 'delusional'],
    'Alternative diagnoses for the same psychotic illness. Give the one that fits the duration and symptoms.'),
  ...rule(LEVEL.CONFLICT, 'schizoaffective', ['mdd', 'bipolar1', 'bipolar2', 'delusional'],
    'Schizoaffective disorder already includes the mood episodes. Do not also give a separate depressive or bipolar diagnosis (or delusional disorder) for the same illness.'),
  ...rule(LEVEL.CONFLICT, 'delusional', ['ocd', 'bdd'],
    'OCD or BDD with absent insight (delusional beliefs) is diagnosed as OCD or BDD with the specifier "with absent insight", not as delusional disorder.'),
  // Trauma and stressor-related.
  ...rule(LEVEL.CONFLICT, 'acute_stress', ['ptsd'],
    'Acute stress disorder covers the first month after a trauma; after 1 month the diagnosis becomes PTSD. Do not give both for the same trauma.'),
  ...rule(LEVEL.CONFLICT, 'adjustment', ['mdd', 'pdd', 'gad', 'ptsd', 'acute_stress', 'pgd'],
    'Adjustment disorder is only given when the criteria for another specific disorder are not met (criterion C), and not for prolonged grief.'),

  // ----- Allowed only if a condition holds -----
  ...rule(LEVEL.CHECK, 'substance_mood', MOOD_DISORDERS,
    'A substance/medication-induced disorder is only given when the symptoms are NOT better explained by an independent disorder. Give both only if the independent disorder clearly stands on its own (e.g. it started before the use) and the substance causes separate symptoms.'),
  ...rule(LEVEL.CHECK, 'medical_mood', MOOD_DISORDERS,
    'A mood disorder due to a medical condition is only given when an independent mood disorder does not explain the symptoms better. Check that both are really needed.'),
  ...rule(LEVEL.CHECK, 'substance_anxiety', ANXIETY_DISORDERS,
    'A substance/medication-induced anxiety disorder is only given when an independent anxiety disorder does not explain the symptoms better.'),
  ...rule(LEVEL.CHECK, 'medical_anxiety', ANXIETY_DISORDERS,
    'An anxiety disorder due to a medical condition is only given when an independent anxiety disorder does not explain the symptoms better.'),
  ...rule(LEVEL.CHECK, 'pmdd', ['mdd', 'pdd', 'bipolar1', 'bipolar2'],
    'PMDD is not given when the symptoms are only a premenstrual worsening of another mood disorder (criterion E). Confirm that the premenstrual symptoms are distinct.'),
  ...rule(LEVEL.CHECK, 'gad', ['panic', 'social', 'separation'],
    'Both can be given, but only if the worry in GAD is about many topics, not mainly about panic attacks, being judged, or separation (GAD criterion F).'),
  ...rule(LEVEL.CHECK, 'phobia', ['agoraphobia'],
    'If the fear is limited to one agoraphobic situation, give specific phobia (situational type) only.'),
  ...rule(LEVEL.CHECK, 'separation', ['agoraphobia'],
    'Check what the person fears: being away from attachment figures (separation anxiety) or being unable to escape (agoraphobia).'),
  ...rule(LEVEL.CHECK, 'bpd', ['bipolar1', 'bipolar2', 'cyclothymic'],
    'Both can be given, but check that the mood episodes are distinct periods lasting days, not the reactive mood changes of borderline personality disorder.'),
  ...rule(LEVEL.CHECK, 'mdd', ['major_ncd', 'mild_ncd'],
    'Depression can cause cognitive problems that improve with treatment. Give the neurocognitive disorder only if the decline is not better explained by the depression; consider reassessing cognition after treatment.'),
  ...rule(LEVEL.CHECK, 'delirium', ['mild_ncd'],
    'A neurocognitive disorder cannot be diagnosed from deficits that occur only during a delirium. Reassess cognition after the delirium has cleared.'),
  ...rule(LEVEL.CHECK, 'delirium', ['major_ncd'],
    'Both can be given when the dementia was present before the delirium; code the delirium as F05.1 (superimposed on dementia). Dementia cannot be diagnosed from deficits that occur only during a delirium: if it is new, reassess cognition after the delirium has cleared.'),
  ...rule(LEVEL.CHECK, 'aspd', ['bipolar1'],
    'Antisocial personality disorder is not given if the antisocial behaviour occurs only during manic episodes.'),
  ...rule(LEVEL.CHECK, 'npd', ['bipolar1', 'bipolar2'],
    'Check that the grandiosity is lasting and not only present during manic or hypomanic episodes.'),

  ...rule(LEVEL.CHECK, 'substance_psychotic', ['schizophrenia', 'schizophreniform', 'brief_psychotic', 'delusional', 'schizoaffective'],
    'A substance/medication-induced psychotic disorder is only given when an independent psychotic disorder does not explain the symptoms (check: did psychosis start before the use, or persist about 1 month after stopping?).'),
  ...rule(LEVEL.CHECK, 'medical_psychotic', ['schizophrenia', 'schizophreniform', 'brief_psychotic', 'delusional', 'schizoaffective'],
    'A psychotic disorder due to a medical condition is only given when an independent psychotic disorder does not explain the symptoms better.'),
  ...rule(LEVEL.CHECK, 'schizophrenia', ['mdd', 'bipolar1', 'bipolar2'],
    'If the psychotic symptoms occur only during mood episodes, give the mood disorder with psychotic features instead. If mood episodes are present for most of the illness, consider schizoaffective disorder. Mood episodes that are brief compared with the whole illness can be noted alongside schizophrenia.'),
  ...rule(LEVEL.CHECK, 'schizophrenia', ['stpd', 'ppd', 'szpd'],
    'A personality disorder that was present before the schizophrenia began can be recorded with the word "premorbid". It is not given if the traits occur only during the psychotic illness.'),
  ...rule(LEVEL.CHECK, 'ptsd', ['bpd'],
    'Both can be given. Check that the emotional instability started before or independently of the trauma, rather than being part of the PTSD.'),
  ...rule(LEVEL.CHECK, 'ocd', ['gad', 'hoarding'],
    'Both can be given only if the second disorder is not explained by the obsessions (e.g. worry in GAD is about real-life concerns; hoarding is not driven by typical obsessions).'),
  ...rule(LEVEL.CHECK, 'bdd', ['social', 'trich', 'skin_picking'],
    'Both can be given only if the second disorder is not driven by the appearance concern (e.g. social fear only about the perceived flaw, or hair pulling or skin picking to fix it, is part of BDD).'),
  ...rule(LEVEL.CHECK, 'substance_ocrd', ['ocd', 'bdd', 'hoarding', 'trich', 'skin_picking'],
    'A substance/medication-induced disorder is only given when an independent obsessive-compulsive or related disorder does not explain the symptoms better.'),
  ...rule(LEVEL.CHECK, 'medical_ocrd', ['ocd', 'bdd', 'hoarding', 'trich', 'skin_picking'],
    'A disorder due to a medical condition is only given when an independent obsessive-compulsive or related disorder does not explain the symptoms better.'),

  // ----- Allowed, coded in a special way -----
  ...rule(LEVEL.CODING, 'mdd', ['pdd'],
    'Both can be given ("double depression"). DSM-5-TR names it persistent depressive disorder with persistent or intermittent major depressive episodes; ICD-10 codes both (F34.1 + F32/F33).'),
  ...rule(LEVEL.CODING, 'panic', ['agoraphobia'],
    'Both can be given in DSM-5-TR. In ICD-10, agoraphobia with panic disorder is coded F40.01 (and panic disorder is then not coded separately).'),
  ...rule(LEVEL.CODING, 'social', ['avpd'],
    'Both are often met and can both be given.'),
  ...rule(LEVEL.CODING, 'social', ['mutism'],
    'Both are often met and can both be given.'),
  ...rule(LEVEL.CODING, 'catatonia', ['schizophrenia'],
    'In DSM-5-TR, catatonia is a specifier of schizophrenia. In ICD-10, code catatonic schizophrenia (F20.2) instead of a separate F06.1.'),
  ...rule(LEVEL.CODING, 'catatonia', ['mdd', 'bipolar1', 'schizoaffective', 'schizophreniform', 'brief_psychotic'],
    'Record "with catatonia" as a specifier of the other disorder; DSM-5-TR also codes F06.1 (catatonia associated with another mental disorder).'),
  ...rule(LEVEL.CODING, 'pgd', ['mdd', 'ptsd'],
    'Both can be given; prolonged grief often co-occurs with depression and PTSD.'),
  ...rule(LEVEL.CODING, 'ocd', ['ocpd'],
    'Both can be given. OCD has true obsessions and compulsions; OCPD is a lifelong pattern of perfectionism and rigidity.'),
  ...rule(LEVEL.CODING, 'trich', ['skin_picking'],
    'Both can be given; they often occur together.'),
];

// Every warning that applies to a set of diagnosis ids.
export function conflictsAmong(ids) {
  const set = new Set(ids);
  return RULES.filter((r) => set.has(r.ids[0]) && set.has(r.ids[1]));
}

// Warnings that would appear if `candidateId` were added to `confirmedIds`.
export function conflictsFor(candidateId, confirmedIds) {
  return RULES.filter(
    (r) =>
      (r.ids[0] === candidateId && confirmedIds.includes(r.ids[1])) ||
      (r.ids[1] === candidateId && confirmedIds.includes(r.ids[0]))
  );
}
