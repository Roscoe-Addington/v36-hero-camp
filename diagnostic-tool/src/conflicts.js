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

  // ----- Allowed, coded in a special way -----
  ...rule(LEVEL.CODING, 'mdd', ['pdd'],
    'Both can be given ("double depression"). DSM-5-TR names it persistent depressive disorder with persistent or intermittent major depressive episodes; ICD-10 codes both (F34.1 + F32/F33).'),
  ...rule(LEVEL.CODING, 'panic', ['agoraphobia'],
    'Both can be given in DSM-5-TR. In ICD-10, agoraphobia with panic disorder is coded F40.01 (and panic disorder is then not coded separately).'),
  ...rule(LEVEL.CODING, 'social', ['avpd'],
    'Both are often met and can both be given.'),
  ...rule(LEVEL.CODING, 'social', ['mutism'],
    'Both are often met and can both be given.'),
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
