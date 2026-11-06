// The catalog of disorders the clinician can assess in depth.
//
// Each disorder lists its DSM-5-TR criteria as SHORT LABELS written for this
// app. They are reminders for a clinician who knows the criteria, not the
// DSM text (which is copyrighted by the American Psychiatric Association).
// Always check the DSM-5-TR itself for the full wording.
//
// Codes are WHO ICD-10. Swedish healthcare reports in ICD-10-SE, which
// mostly matches but adds extra detail for some codes, so check the code in
// your record system before using it.
//
// Each disorder has:
//   groups      criteria to rate, grouped as in the DSM (A, B, C ...)
//   rule        when the criteria are met (see criteria.js for the format)
//   autoCriteria  criteria filled in from the patient record (age)
//   specifiers  extra choices that change the code (e.g. severity)
//   code()      the ICD-10 code for the chosen specifiers

// Builds numbered criteria: list('mdd_a', ['x', 'y']) -> [{id:'mdd_a1',...}, {id:'mdd_a2',...}]
const list = (prefix, labels) => labels.map((label, i) => ({ id: `${prefix}${i + 1}`, label }));
const ids = (items) => items.map((i) => i.id);
const one = (id, label) => ({ id, label });

// Exclusion criteria that appear in many disorders, worded once here.
const NOT_SUBSTANCE = 'Not attributable to a substance (drug, medicine) or another medical condition';
const DISTRESS = 'Causes clinically significant distress or impairment in social, work or other important areas';
const NOT_PSYCHOTIC = 'Not better explained by a schizophrenia-spectrum or other psychotic disorder';

export const CATEGORIES = [
  { id: 'mood', title: 'Mood disorders (depressive and bipolar disorders)' },
  { id: 'anxiety', title: 'Anxiety disorders' },
  { id: 'personality', title: 'Personality disorders' },
  { id: 'neurocognitive', title: 'Neurocognitive disorders' },
];

// ---------- Mood: depressive disorders ----------

const mddA = list('mdd_a', [
  'Depressed mood most of the day, nearly every day',
  'Markedly diminished interest or pleasure in (almost) all activities',
  'Significant weight or appetite change',
  'Insomnia or hypersomnia nearly every day',
  'Psychomotor agitation or retardation, observable by others',
  'Fatigue or loss of energy nearly every day',
  'Feelings of worthlessness or excessive or inappropriate guilt',
  'Diminished ability to think or concentrate, or indecisiveness',
  'Recurrent thoughts of death, suicidal ideation, plan or attempt',
]);

const SEVERITY = {
  id: 'severity',
  label: 'Severity',
  options: [
    { value: 'mild', label: 'Mild' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'severe', label: 'Severe' },
  ],
};
const PSYCHOTIC = {
  id: 'psychotic',
  label: 'With psychotic features',
  options: [
    { value: 'no', label: 'No' },
    { value: 'yes', label: 'Yes' },
  ],
};

const mdd = {
  id: 'mdd',
  category: 'mood',
  name: 'Major depressive disorder',
  groups: [
    { title: 'A. During the same 2-week period, at least 5 symptoms, including mood (1) or interest (2)', items: mddA },
    { title: 'B–E', items: [
      one('mdd_b', DISTRESS),
      one('mdd_c', NOT_SUBSTANCE),
      one('mdd_d', 'Not better explained by schizoaffective disorder, schizophrenia or another psychotic disorder'),
      one('mdd_e', 'There has never been a manic or hypomanic episode'),
    ] },
  ],
  rule: { all: [{ any: ['mdd_a1', 'mdd_a2'] }, { count: ids(mddA), min: 5 }, 'mdd_b', 'mdd_c', 'mdd_d', 'mdd_e'] },
  specifiers: [
    { id: 'episode', label: 'Episode', options: [
      { value: 'single', label: 'Single episode' },
      { value: 'recurrent', label: 'Recurrent' },
    ] },
    SEVERITY,
    PSYCHOTIC,
  ],
  // ICD-10: F32 single / F33 recurrent; .0 mild, .1 moderate, .2 severe,
  // .3 severe with psychotic symptoms (ICD-10 only codes psychotic features as severe).
  code(s) {
    if (!s.episode) return 'F32/F33 (choose single or recurrent)';
    const base = s.episode === 'recurrent' ? 'F33' : 'F32';
    if (s.psychotic === 'yes') return `${base}.3`;
    const digit = { mild: '0', moderate: '1', severe: '2' }[s.severity];
    return digit ? `${base}.${digit}` : `${base}.9`;
  },
};

const pddB = list('pdd_b', [
  'Poor appetite or overeating',
  'Insomnia or hypersomnia',
  'Low energy or fatigue',
  'Low self-esteem',
  'Poor concentration or difficulty making decisions',
  'Feelings of hopelessness',
]);

const pdd = {
  id: 'pdd',
  category: 'mood',
  name: 'Persistent depressive disorder (dysthymia)',
  groups: [
    { title: 'A', items: [one('pdd_a', 'Depressed mood most of the day, more days than not, for at least 2 years')] },
    { title: 'B. While depressed, at least 2 of', items: pddB },
    { title: 'C–H', items: [
      one('pdd_c', 'During the 2 years, never without symptoms for more than 2 months at a time'),
      one('pdd_e', 'There has never been a manic or hypomanic episode, and cyclothymic criteria have never been met'),
      one('pdd_f', NOT_PSYCHOTIC),
      one('pdd_g', NOT_SUBSTANCE),
      one('pdd_h', DISTRESS),
    ] },
  ],
  rule: { all: ['pdd_a', { count: ids(pddB), min: 2 }, 'pdd_c', 'pdd_e', 'pdd_f', 'pdd_g', 'pdd_h'] },
  specifiers: [],
  code: () => 'F34.1',
};

const pmddB = list('pmdd_b', [
  'Marked mood swings or sudden sadness or sensitivity to rejection',
  'Marked irritability, anger or increased conflicts',
  'Marked depressed mood, hopelessness or self-critical thoughts',
  'Marked anxiety, tension or feeling on edge',
]);
const pmddC = list('pmdd_c', [
  'Decreased interest in usual activities',
  'Difficulty concentrating',
  'Lethargy, fatigue or lack of energy',
  'Marked change in appetite, overeating or food cravings',
  'Hypersomnia or insomnia',
  'Feeling overwhelmed or out of control',
  'Physical symptoms (e.g. breast tenderness, bloating, joint or muscle pain)',
]);

const pmdd = {
  id: 'pmdd',
  category: 'mood',
  name: 'Premenstrual dysphoric disorder',
  groups: [
    { title: 'A', items: [one('pmdd_a', 'In most cycles of the past year: symptoms in the final week before menses, improving within a few days after onset and minimal in the week after')] },
    { title: 'B. At least 1 of', items: pmddB },
    { title: 'C. At least 1 of (at least 5 symptoms in total from B and C)', items: pmddC },
    { title: 'D–G', items: [
      one('pmdd_d', 'Clinically significant distress or interference with work, school, social activities or relationships'),
      one('pmdd_e', 'Not merely a worsening of another disorder (e.g. MDD, panic disorder, a personality disorder)'),
      one('pmdd_f', 'Confirmed by prospective daily ratings over at least 2 symptomatic cycles'),
      one('pmdd_g', NOT_SUBSTANCE),
    ] },
  ],
  rule: { all: ['pmdd_a', { count: ids(pmddB), min: 1 }, { count: ids(pmddC), min: 1 }, { count: [...ids(pmddB), ...ids(pmddC)], min: 5 }, 'pmdd_d', 'pmdd_e', 'pmdd_f', 'pmdd_g'] },
  specifiers: [],
  code: () => 'N94.3',
  codeNote: 'WHO ICD-10 has no separate PMDD code; N94.3 (premenstrual tension syndrome) is commonly used. Check your local coding rules.',
};

const dmdd = {
  id: 'dmdd',
  category: 'mood',
  name: 'Disruptive mood dysregulation disorder',
  note: 'Only for patients under 18 at first diagnosis; onset must be before age 10.',
  groups: [
    { title: 'A–F', items: [
      one('dmdd_a', 'Severe recurrent temper outbursts, grossly out of proportion to the situation'),
      one('dmdd_b', 'Outbursts inconsistent with developmental level'),
      one('dmdd_c', 'Outbursts on average 3 or more times a week'),
      one('dmdd_d', 'Persistently irritable or angry mood between outbursts, most of the day, nearly every day, noticeable to others'),
      one('dmdd_e', 'Present for 12 months or more, never 3 or more months in a row without all of A–D'),
      one('dmdd_f', 'Present in at least 2 of 3 settings (home, school, with peers), severe in at least 1'),
    ] },
    { title: 'H–K', items: [
      one('dmdd_h', 'Onset of A–E before age 10'),
      one('dmdd_i', 'Never a distinct period of more than 1 day meeting full manic or hypomanic symptom criteria'),
      one('dmdd_j', 'Not occurring only during a major depressive episode, and not better explained by another mental disorder'),
      one('dmdd_k', NOT_SUBSTANCE),
    ] },
  ],
  autoCriteria: [{ label: 'G. Diagnosis not first made after age 18', rule: { age: { max: 18 } } }],
  rule: { all: ['dmdd_a', 'dmdd_b', 'dmdd_c', 'dmdd_d', 'dmdd_e', 'dmdd_f', { age: { max: 18 } }, 'dmdd_h', 'dmdd_i', 'dmdd_j', 'dmdd_k'] },
  specifiers: [],
  code: () => 'F34.8',
};

// ---------- Mood: bipolar disorders ----------

function maniaSymptoms(prefix) {
  return list(prefix, [
    'Inflated self-esteem or grandiosity',
    'Decreased need for sleep',
    'More talkative than usual or pressure to keep talking',
    'Flight of ideas or racing thoughts',
    'Distractibility',
    'Increased goal-directed activity or psychomotor agitation',
    'Excessive involvement in risky activities (e.g. spending sprees, sexual indiscretions)',
  ]);
}
// At least 3 symptoms, or at least 4 if the mood was only irritable.
function maniaCount(symptoms, irritableId) {
  return { any: [{ all: [{ not: irritableId }, { count: ids(symptoms), min: 3 }] }, { count: ids(symptoms), min: 4 }] };
}

const bp1B = maniaSymptoms('bp1_b');
const bipolar1 = {
  id: 'bipolar1',
  category: 'mood',
  name: 'Bipolar I disorder',
  groups: [
    { title: 'Manic episode — A', items: [
      one('bp1_a', 'Distinct period of abnormally elevated, expansive or irritable mood AND increased activity or energy, at least 1 week (or any duration if hospitalised)'),
      one('bp1_irr', 'The mood was ONLY irritable (then 4 symptoms are needed instead of 3)'),
    ] },
    { title: 'Manic episode — B. At least 3 (4 if mood only irritable)', items: bp1B },
    { title: 'Manic episode — C–D, and criterion B', items: [
      one('bp1_c', 'Marked impairment in functioning, OR hospitalisation needed, OR psychotic features'),
      one('bp1_d', 'Not attributable to a substance or another medical condition'),
      one('bp1_e', 'Not better explained by schizoaffective disorder, schizophrenia or another psychotic disorder'),
    ] },
  ],
  rule: { all: ['bp1_a', maniaCount(bp1B, 'bp1_irr'), 'bp1_c', 'bp1_d', 'bp1_e'] },
  specifiers: [
    { id: 'episode', label: 'Current or most recent episode', options: [
      { value: 'hypomanic', label: 'Hypomanic' },
      { value: 'manic', label: 'Manic, without psychotic features' },
      { value: 'manic_psy', label: 'Manic, with psychotic features' },
      { value: 'dep_mild', label: 'Depressed, mild or moderate' },
      { value: 'dep_severe', label: 'Depressed, severe, without psychotic features' },
      { value: 'dep_severe_psy', label: 'Depressed, severe, with psychotic features' },
      { value: 'mixed', label: 'Mixed' },
      { value: 'remission', label: 'In remission' },
    ] },
  ],
  code(s) {
    const map = {
      hypomanic: 'F31.0', manic: 'F31.1', manic_psy: 'F31.2', dep_mild: 'F31.3',
      dep_severe: 'F31.4', dep_severe_psy: 'F31.5', mixed: 'F31.6', remission: 'F31.7',
    };
    return map[s.episode] ?? 'F31.9';
  },
};

const bp2B = maniaSymptoms('bp2_b');
const bipolar2 = {
  id: 'bipolar2',
  category: 'mood',
  name: 'Bipolar II disorder',
  groups: [
    { title: 'Hypomanic episode — A', items: [
      one('bp2_a', 'Distinct period of abnormally elevated, expansive or irritable mood AND increased activity or energy, at least 4 consecutive days'),
      one('bp2_irr', 'The mood was ONLY irritable (then 4 symptoms are needed instead of 3)'),
    ] },
    { title: 'Hypomanic episode — B. At least 3 (4 if mood only irritable)', items: bp2B },
    { title: 'Hypomanic episode — C–F', items: [
      one('bp2_c', 'Unequivocal change in functioning, uncharacteristic of the person'),
      one('bp2_d', 'The change in mood and functioning is observable by others'),
      one('bp2_e', 'NOT severe enough for marked impairment or hospitalisation, and no psychotic features'),
      one('bp2_f', 'Not attributable to a substance or another medical condition'),
    ] },
    { title: 'Bipolar II — A–D', items: [
      one('bp2_mde', 'At least one past or current major depressive episode'),
      one('bp2_nomania', 'There has never been a manic episode'),
      one('bp2_psy', NOT_PSYCHOTIC),
      one('bp2_dist', 'Depression or frequent mood changes cause clinically significant distress or impairment'),
    ] },
  ],
  rule: { all: ['bp2_a', maniaCount(bp2B, 'bp2_irr'), 'bp2_c', 'bp2_d', 'bp2_e', 'bp2_f', 'bp2_mde', 'bp2_nomania', 'bp2_psy', 'bp2_dist'] },
  specifiers: [],
  code: () => 'F31.8',
  codeNote: 'WHO ICD-10 places bipolar II disorder under F31.8 (other bipolar affective disorders).',
};

const cyclothymic = {
  id: 'cyclothymic',
  category: 'mood',
  name: 'Cyclothymic disorder',
  groups: [
    { title: 'A–F', items: [
      one('cyc_a', 'For at least 2 years, many periods of hypomanic symptoms and many periods of depressive symptoms, never meeting full episode criteria'),
      one('cyc_b', 'Symptoms present at least half the time, never absent for more than 2 months'),
      one('cyc_c', 'Criteria for a major depressive, manic or hypomanic episode have never been met'),
      one('cyc_d', NOT_PSYCHOTIC),
      one('cyc_e', NOT_SUBSTANCE),
      one('cyc_f', DISTRESS),
    ] },
  ],
  rule: { all: ['cyc_a', 'cyc_b', 'cyc_c', 'cyc_d', 'cyc_e', 'cyc_f'] },
  specifiers: [],
  code: () => 'F34.0',
};

const SUBSTANCE_CODE_NOTE = 'The code depends on the substance: F10.8 alcohol, F11.8 opioids, F12.8 cannabis, F13.8 sedatives, F14.8 cocaine, F15.8 other stimulants, F19.8 multiple; for prescribed medicines, use the code for the medicine class (with a Y-code for the adverse effect if your system uses them).';

const substanceMood = {
  id: 'substance_mood',
  category: 'mood',
  name: 'Substance/medication-induced depressive or bipolar disorder',
  groups: [
    { title: 'A–E', items: [
      one('sm_a', 'Prominent and persistent depressed mood or loss of interest, or elevated, expansive or irritable mood'),
      one('sm_b1', 'Symptoms developed during or soon after intoxication, withdrawal or exposure to a medicine'),
      one('sm_b2', 'The substance or medicine can cause these symptoms'),
      one('sm_c', 'Not better explained by an independent mood disorder (e.g. symptoms started before use, or persist about 1 month after stopping)'),
      one('sm_d', 'Not occurring only during a delirium'),
      one('sm_e', DISTRESS),
    ] },
  ],
  rule: { all: ['sm_a', 'sm_b1', 'sm_b2', 'sm_c', 'sm_d', 'sm_e'] },
  specifiers: [],
  code: () => 'F1x.8 (by substance)',
  codeNote: SUBSTANCE_CODE_NOTE,
};

const medicalMood = {
  id: 'medical_mood',
  category: 'mood',
  name: 'Depressive or bipolar disorder due to another medical condition',
  groups: [
    { title: 'A–E', items: [
      one('mm_a', 'Prominent and persistent depressed mood or loss of interest, or elevated, expansive or irritable mood'),
      one('mm_b', 'Evidence (history, examination or tests) that it is a direct physiological consequence of another medical condition'),
      one('mm_c', 'Not better explained by another mental disorder (e.g. adjustment disorder)'),
      one('mm_d', 'Not occurring only during a delirium'),
      one('mm_e', DISTRESS),
    ] },
  ],
  rule: { all: ['mm_a', 'mm_b', 'mm_c', 'mm_d', 'mm_e'] },
  specifiers: [],
  code: () => 'F06.3',
  codeNote: 'Also code the medical condition itself.',
};

// ---------- Anxiety disorders ----------

const sepA = list('sep_a', [
  'Recurrent excessive distress when separation from home or attachment figures occurs or is expected',
  'Persistent excessive worry about losing attachment figures, or harm coming to them',
  'Persistent excessive worry about an event (e.g. getting lost) that causes separation',
  'Reluctance or refusal to go out (e.g. to work or school) because of fear of separation',
  'Persistent excessive fear of being alone without attachment figures',
  'Reluctance or refusal to sleep away from home or without an attachment figure nearby',
  'Repeated nightmares about separation',
  'Repeated physical complaints when separation occurs or is expected',
]);

const separation = {
  id: 'separation',
  category: 'anxiety',
  name: 'Separation anxiety disorder',
  groups: [
    { title: 'A. Excessive fear about separation from attachment figures: at least 3 of', items: sepA },
    { title: 'B–D', items: [
      one('sep_b', 'Lasts at least 6 months in adults (at least 4 weeks under 18)'),
      one('sep_c', DISTRESS),
      one('sep_d', 'Not better explained by another mental disorder (e.g. agoraphobia, GAD, illness anxiety, autism)'),
    ] },
  ],
  rule: { all: [{ count: ids(sepA), min: 3 }, 'sep_b', 'sep_c', 'sep_d'] },
  specifiers: [],
  code: () => 'F93.0',
  codeNote: 'WHO ICD-10 lists F93.0 under childhood-onset disorders; some systems use F41.8 for adults. Check your local coding rules.',
};

const mutism = {
  id: 'mutism',
  category: 'anxiety',
  name: 'Selective mutism',
  groups: [
    { title: 'A–E', items: [
      one('mut_a', 'Consistent failure to speak in specific social situations where speaking is expected, despite speaking in others'),
      one('mut_b', 'Interferes with education, work or social communication'),
      one('mut_c', 'Lasts at least 1 month (not only the first month of school)'),
      one('mut_d', 'Not due to lack of knowledge of, or comfort with, the spoken language'),
      one('mut_e', 'Not better explained by a communication disorder, and not only during autism or a psychotic disorder'),
    ] },
  ],
  rule: { all: ['mut_a', 'mut_b', 'mut_c', 'mut_d', 'mut_e'] },
  specifiers: [],
  code: () => 'F94.0',
};

const phobia = {
  id: 'phobia',
  category: 'anxiety',
  name: 'Specific phobia',
  groups: [
    { title: 'A–G', items: [
      one('pho_a', 'Marked fear or anxiety about a specific object or situation'),
      one('pho_b', 'The object or situation almost always provokes immediate fear or anxiety'),
      one('pho_c', 'It is actively avoided or endured with intense fear or anxiety'),
      one('pho_d', 'The fear is out of proportion to the actual danger and the sociocultural context'),
      one('pho_e', 'Persistent, typically 6 months or more'),
      one('pho_f', DISTRESS),
      one('pho_g', 'Not better explained by another mental disorder (e.g. agoraphobia, OCD, PTSD, social anxiety)'),
    ] },
  ],
  rule: { all: ['pho_a', 'pho_b', 'pho_c', 'pho_d', 'pho_e', 'pho_f', 'pho_g'] },
  specifiers: [
    { id: 'type', label: 'Type', options: [
      { value: 'animal', label: 'Animal' },
      { value: 'natural', label: 'Natural environment (e.g. heights, storms, water)' },
      { value: 'bii', label: 'Blood-injection-injury' },
      { value: 'situational', label: 'Situational (e.g. flying, lifts, enclosed places)' },
      { value: 'other', label: 'Other' },
    ] },
  ],
  code: () => 'F40.2',
};

const social = {
  id: 'social',
  category: 'anxiety',
  name: 'Social anxiety disorder',
  groups: [
    { title: 'A–J', items: [
      one('soc_a', 'Marked fear or anxiety about social situations where the person may be scrutinised by others'),
      one('soc_b', 'Fears acting in a way, or showing anxiety, that will be negatively evaluated'),
      one('soc_c', 'Social situations almost always provoke fear or anxiety'),
      one('soc_d', 'Social situations are avoided or endured with intense fear or anxiety'),
      one('soc_e', 'The fear is out of proportion to the actual threat and the sociocultural context'),
      one('soc_f', 'Persistent, typically 6 months or more'),
      one('soc_g', DISTRESS),
      one('soc_h', NOT_SUBSTANCE),
      one('soc_i', 'Not better explained by another mental disorder (e.g. panic disorder, body dysmorphic disorder, autism)'),
      one('soc_j', 'If another medical condition is present, the fear is clearly unrelated or excessive'),
    ] },
  ],
  rule: { all: ['soc_a', 'soc_b', 'soc_c', 'soc_d', 'soc_e', 'soc_f', 'soc_g', 'soc_h', 'soc_i', 'soc_j'] },
  specifiers: [
    { id: 'performance', label: 'Performance only', options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes (fear limited to speaking or performing in public)' },
    ] },
  ],
  code: () => 'F40.1',
};

const panicP = list('pan_p', [
  'Palpitations, pounding heart or fast heart rate',
  'Sweating',
  'Trembling or shaking',
  'Shortness of breath or smothering',
  'Feelings of choking',
  'Chest pain or discomfort',
  'Nausea or abdominal distress',
  'Dizzy, unsteady, light-headed or faint',
  'Chills or heat sensations',
  'Numbness or tingling',
  'Derealisation or depersonalisation',
  'Fear of losing control or "going crazy"',
  'Fear of dying',
]);

const panic = {
  id: 'panic',
  category: 'anxiety',
  name: 'Panic disorder',
  groups: [
    { title: 'A', items: [one('pan_a', 'Recurrent unexpected panic attacks (abrupt surge of intense fear peaking within minutes)')] },
    { title: 'A (continued). During attacks, at least 4 of', items: panicP },
    { title: 'B–D', items: [
      one('pan_b', 'At least one attack followed by 1 month or more of persistent worry about more attacks, or a maladaptive change in behaviour'),
      one('pan_c', NOT_SUBSTANCE),
      one('pan_d', 'Not better explained by another mental disorder (e.g. attacks only in feared social situations, or in response to trauma reminders)'),
    ] },
  ],
  rule: { all: ['pan_a', { count: ids(panicP), min: 4 }, 'pan_b', 'pan_c', 'pan_d'] },
  specifiers: [],
  code: () => 'F41.0',
};

const agoraA = list('ago_a', [
  'Using public transport',
  'Being in open spaces (e.g. car parks, markets, bridges)',
  'Being in enclosed places (e.g. shops, theatres, cinemas)',
  'Standing in line or being in a crowd',
  'Being outside the home alone',
]);

const agoraphobia = {
  id: 'agoraphobia',
  category: 'anxiety',
  name: 'Agoraphobia',
  groups: [
    { title: 'A. Marked fear or anxiety about at least 2 of', items: agoraA },
    { title: 'B–I', items: [
      one('ago_b', 'Fears or avoids them because escape might be difficult or help unavailable if panic-like symptoms occur'),
      one('ago_c', 'The situations almost always provoke fear or anxiety'),
      one('ago_d', 'Actively avoided, require a companion, or endured with intense fear'),
      one('ago_e', 'The fear is out of proportion to the actual danger and the sociocultural context'),
      one('ago_f', 'Persistent, typically 6 months or more'),
      one('ago_g', DISTRESS),
      one('ago_h', 'If another medical condition is present, the fear is clearly excessive'),
      one('ago_i', 'Not better explained by another mental disorder'),
    ] },
  ],
  rule: { all: [{ count: ids(agoraA), min: 2 }, 'ago_b', 'ago_c', 'ago_d', 'ago_e', 'ago_f', 'ago_g', 'ago_h', 'ago_i'] },
  specifiers: [],
  code: () => 'F40.0',
};

const gadC = list('gad_c', [
  'Restlessness, feeling keyed up or on edge',
  'Being easily fatigued',
  'Difficulty concentrating or mind going blank',
  'Irritability',
  'Muscle tension',
  'Sleep disturbance',
]);

const gad = {
  id: 'gad',
  category: 'anxiety',
  name: 'Generalized anxiety disorder',
  groups: [
    { title: 'A–B', items: [
      one('gad_a', 'Excessive anxiety and worry, more days than not, for at least 6 months, about several events or activities'),
      one('gad_b', 'Finds it difficult to control the worry'),
    ] },
    { title: 'C. At least 3 of (more days than not, past 6 months)', items: gadC },
    { title: 'D–F', items: [
      one('gad_d', DISTRESS),
      one('gad_e', NOT_SUBSTANCE),
      one('gad_f', 'Not better explained by another mental disorder (e.g. panic, social anxiety, OCD, PTSD, illness anxiety)'),
    ] },
  ],
  rule: { all: ['gad_a', 'gad_b', { count: ids(gadC), min: 3 }, 'gad_d', 'gad_e', 'gad_f'] },
  specifiers: [],
  code: () => 'F41.1',
};

const substanceAnxiety = {
  id: 'substance_anxiety',
  category: 'anxiety',
  name: 'Substance/medication-induced anxiety disorder',
  groups: [
    { title: 'A–E', items: [
      one('sa_a', 'Panic attacks or anxiety are prominent'),
      one('sa_b1', 'Symptoms developed during or soon after intoxication, withdrawal or exposure to a medicine'),
      one('sa_b2', 'The substance or medicine can cause these symptoms'),
      one('sa_c', 'Not better explained by an independent anxiety disorder'),
      one('sa_d', 'Not occurring only during a delirium'),
      one('sa_e', DISTRESS),
    ] },
  ],
  rule: { all: ['sa_a', 'sa_b1', 'sa_b2', 'sa_c', 'sa_d', 'sa_e'] },
  specifiers: [],
  code: () => 'F1x.8 (by substance)',
  codeNote: SUBSTANCE_CODE_NOTE,
};

const medicalAnxiety = {
  id: 'medical_anxiety',
  category: 'anxiety',
  name: 'Anxiety disorder due to another medical condition',
  groups: [
    { title: 'A–E', items: [
      one('ma_a', 'Panic attacks or anxiety predominate'),
      one('ma_b', 'Evidence (history, examination or tests) that it is a direct physiological consequence of another medical condition'),
      one('ma_c', 'Not better explained by another mental disorder'),
      one('ma_d', 'Not occurring only during a delirium'),
      one('ma_e', DISTRESS),
    ] },
  ],
  rule: { all: ['ma_a', 'ma_b', 'ma_c', 'ma_d', 'ma_e'] },
  specifiers: [],
  code: () => 'F06.4',
  codeNote: 'Also code the medical condition itself.',
};

// ---------- Personality disorders ----------

// The general criteria every personality disorder must also meet.
function generalPd(prefix) {
  return {
    title: 'General criteria for a personality disorder',
    items: [
      one(`${prefix}_g1`, 'Enduring pattern of inner experience and behaviour, deviating markedly from cultural expectations, in at least 2 of: thinking, emotions, relationships, impulse control'),
      one(`${prefix}_g2`, 'The pattern is inflexible and pervasive across many personal and social situations'),
      one(`${prefix}_g3`, DISTRESS),
      one(`${prefix}_g4`, 'Stable and long-lasting, with onset by adolescence or early adulthood'),
      one(`${prefix}_g5`, 'Not better explained by another mental disorder'),
      one(`${prefix}_g6`, NOT_SUBSTANCE),
    ],
  };
}
const generalIds = (prefix) => [1, 2, 3, 4, 5, 6].map((n) => `${prefix}_g${n}`);

const NOT_ONLY_PSYCHOSIS = 'Not occurring only during schizophrenia, a bipolar or depressive disorder with psychotic features, or another psychotic disorder';
const PD_UNDER_18 = 'Under 18: the features must have been present for at least 1 year.';

function personality({ id, name, code, min, criteria, extra = [], extraTitle, note, autoCriteria, extraRule = [] }) {
  const items = list(`${id}_`, criteria);
  return {
    id,
    category: 'personality',
    name,
    note: note ?? PD_UNDER_18,
    groups: [
      generalPd(id),
      { title: `Specific criteria: at least ${min} of`, items },
      ...(extra.length ? [{ title: extraTitle ?? 'Further criteria', items: extra }] : []),
    ],
    autoCriteria,
    rule: { all: [...generalIds(id), { count: ids(items), min }, ...extra.map((e) => e.id), ...extraRule] },
    specifiers: [],
    code: () => code,
  };
}

const paranoid = personality({
  id: 'ppd', name: 'Paranoid personality disorder', code: 'F60.0', min: 4,
  criteria: [
    'Suspects, without enough basis, that others are exploiting, harming or deceiving them',
    'Preoccupied with unjustified doubts about the loyalty or trustworthiness of others',
    'Reluctant to confide in others for fear the information will be used against them',
    'Reads hidden demeaning or threatening meanings into harmless remarks or events',
    'Persistently bears grudges',
    'Perceives attacks on their character not apparent to others, and reacts angrily',
    'Recurrent unjustified suspicions about the faithfulness of their partner',
  ],
  extra: [one('ppd_b', NOT_ONLY_PSYCHOSIS)],
});

const schizoid = personality({
  id: 'szpd', name: 'Schizoid personality disorder', code: 'F60.1', min: 4,
  criteria: [
    'Neither desires nor enjoys close relationships, including being part of a family',
    'Almost always chooses solitary activities',
    'Little, if any, interest in sexual experiences with another person',
    'Takes pleasure in few, if any, activities',
    'Lacks close friends or confidants other than close relatives',
    'Appears indifferent to praise or criticism',
    'Emotional coldness, detachment or flattened affect',
  ],
  extra: [one('szpd_b', `${NOT_ONLY_PSYCHOSIS}, or autism`)],
});

const schizotypal = personality({
  id: 'stpd', name: 'Schizotypal personality disorder', code: 'F21', min: 5,
  criteria: [
    'Ideas of reference (not delusions of reference)',
    'Odd beliefs or magical thinking that influence behaviour',
    'Unusual perceptual experiences, including bodily illusions',
    'Odd thinking and speech (e.g. vague, overelaborate, stereotyped)',
    'Suspiciousness or paranoid ideation',
    'Inappropriate or constricted affect',
    'Behaviour or appearance that is odd, eccentric or peculiar',
    'Lack of close friends or confidants other than close relatives',
    'Excessive social anxiety that does not lessen with familiarity, tied to paranoid fears',
  ],
  extra: [one('stpd_b', `${NOT_ONLY_PSYCHOSIS}, or autism`)],
});
schizotypal.codeNote = 'ICD-10 classifies schizotypal disorder with the psychotic disorders (F21), not with the personality disorders.';

const antisocial = personality({
  id: 'aspd', name: 'Antisocial personality disorder', code: 'F60.2', min: 3,
  criteria: [
    'Repeatedly fails to conform to social norms and the law (acts that are grounds for arrest)',
    'Deceitfulness: repeated lying, use of aliases, conning others for profit or pleasure',
    'Impulsivity or failure to plan ahead',
    'Irritability and aggressiveness: repeated physical fights or assaults',
    'Reckless disregard for the safety of self or others',
    'Consistent irresponsibility (work, finances)',
    'Lack of remorse',
  ],
  extraTitle: 'Further criteria (pattern since age 15)',
  extra: [
    one('aspd_c', 'Evidence of conduct disorder with onset before age 15'),
    one('aspd_d', 'Not occurring only during schizophrenia or bipolar disorder'),
  ],
  note: 'Can only be diagnosed at age 18 or older. Under 18, consider conduct disorder instead.',
  autoCriteria: [{ label: 'B. At least 18 years old', rule: { age: { min: 18 } } }],
  extraRule: [{ age: { min: 18 } }],
});

const borderline = personality({
  id: 'bpd', name: 'Borderline personality disorder', code: 'F60.3', min: 5,
  criteria: [
    'Frantic efforts to avoid real or imagined abandonment',
    'Unstable and intense relationships, alternating between idealisation and devaluation',
    'Identity disturbance: markedly unstable self-image or sense of self',
    'Impulsivity in at least 2 potentially self-damaging areas (e.g. spending, sex, substances, reckless driving, binge eating)',
    'Recurrent suicidal behaviour, gestures or threats, or self-harm',
    'Affective instability from marked reactivity of mood (lasting hours, rarely days)',
    'Chronic feelings of emptiness',
    'Inappropriate, intense anger or difficulty controlling anger',
    'Transient, stress-related paranoid ideation or severe dissociative symptoms',
  ],
});
borderline.codeNote = 'WHO ICD-10 F60.3 is "emotionally unstable personality disorder"; the borderline type is F60.31 where 5-character codes are used (as in ICD-10-SE).';

const histrionic = personality({
  id: 'hpd', name: 'Histrionic personality disorder', code: 'F60.4', min: 5,
  criteria: [
    'Uncomfortable in situations where they are not the centre of attention',
    'Interaction often inappropriately sexually seductive or provocative',
    'Rapidly shifting and shallow expression of emotions',
    'Consistently uses physical appearance to draw attention',
    'Speech that is excessively impressionistic and lacking in detail',
    'Self-dramatisation, theatricality and exaggerated expression of emotion',
    'Suggestible: easily influenced by others or circumstances',
    'Considers relationships to be more intimate than they are',
  ],
});

const narcissistic = personality({
  id: 'npd', name: 'Narcissistic personality disorder', code: 'F60.8', min: 5,
  criteria: [
    'Grandiose sense of self-importance',
    'Preoccupied with fantasies of unlimited success, power, brilliance, beauty or ideal love',
    'Believes they are "special" and unique, understood only by special people',
    'Requires excessive admiration',
    'Sense of entitlement',
    'Interpersonally exploitative',
    'Lacks empathy',
    'Often envious of others, or believes others are envious of them',
    'Arrogant, haughty behaviour or attitudes',
  ],
});
narcissistic.codeNote = 'WHO ICD-10 has no separate code; narcissistic personality disorder is coded under F60.8 (other specific personality disorders).';

const avoidant = personality({
  id: 'avpd', name: 'Avoidant personality disorder', code: 'F60.6', min: 4,
  criteria: [
    'Avoids work activities with significant interpersonal contact, for fear of criticism or rejection',
    'Unwilling to get involved with people unless certain of being liked',
    'Restraint within intimate relationships for fear of being shamed or ridiculed',
    'Preoccupied with being criticised or rejected in social situations',
    'Inhibited in new interpersonal situations because of feelings of inadequacy',
    'Views self as socially inept, unappealing or inferior',
    'Unusually reluctant to take risks or try new activities because they may be embarrassing',
  ],
});

const dependent = personality({
  id: 'dpd', name: 'Dependent personality disorder', code: 'F60.7', min: 5,
  criteria: [
    'Difficulty making everyday decisions without excessive advice and reassurance',
    'Needs others to take responsibility for most major areas of life',
    'Difficulty expressing disagreement, for fear of losing support or approval',
    'Difficulty starting projects or doing things on their own (lack of self-confidence)',
    'Goes to excessive lengths to obtain nurturance and support',
    'Feels uncomfortable or helpless when alone',
    'Urgently seeks another relationship as a source of care when a close one ends',
    'Unrealistically preoccupied with fears of being left to take care of themselves',
  ],
});

const ocpd = personality({
  id: 'ocpd', name: 'Obsessive-compulsive personality disorder', code: 'F60.5', min: 4,
  criteria: [
    'Preoccupied with details, rules, lists, order or schedules, to the extent that the point is lost',
    'Perfectionism that interferes with completing tasks',
    'Excessively devoted to work and productivity, excluding leisure and friendships',
    'Overconscientious, scrupulous and inflexible about morality, ethics or values',
    'Unable to discard worn-out or worthless objects without sentimental value',
    'Reluctant to delegate unless others do things exactly their way',
    'Miserly spending style',
    'Rigidity and stubbornness',
  ],
});

// ---------- Neurocognitive disorders ----------

const delirium = {
  id: 'delirium',
  category: 'neurocognitive',
  name: 'Delirium',
  note: 'A medical emergency: look for and treat the cause.',
  groups: [
    { title: 'A–E', items: [
      one('del_a', 'Disturbance in attention (directing, focusing, sustaining, shifting) and awareness'),
      one('del_b', 'Develops over a short time (hours to days), is a change from baseline, and fluctuates during the day'),
      one('del_c', 'An additional disturbance in cognition (memory, orientation, language, visuospatial ability or perception)'),
      one('del_d', 'Not better explained by a pre-existing neurocognitive disorder, and not in the context of a coma'),
      one('del_e', 'Evidence that it is a direct consequence of a medical condition, substance intoxication or withdrawal, a toxin, or several causes'),
    ] },
  ],
  rule: { all: ['del_a', 'del_b', 'del_c', 'del_d', 'del_e'] },
  specifiers: [],
  code: () => 'F05',
  codeNote: 'F05.0 not superimposed on dementia, F05.1 superimposed on dementia, where 4-character codes are used.',
};

const NCD_ETIOLOGY = {
  id: 'etiology',
  label: 'Probable cause',
  options: [
    { value: 'alzheimer', label: "Alzheimer's disease" },
    { value: 'vascular', label: 'Vascular disease' },
    { value: 'lewy', label: 'Lewy body disease' },
    { value: 'ftd', label: 'Frontotemporal degeneration' },
    { value: 'parkinson', label: "Parkinson's disease" },
    { value: 'tbi', label: 'Traumatic brain injury' },
    { value: 'substance', label: 'Substance or medication' },
    { value: 'unknown', label: 'Unknown / other' },
  ],
};

const majorNcd = {
  id: 'major_ncd',
  category: 'neurocognitive',
  name: 'Major neurocognitive disorder (dementia)',
  note: 'Cognitive domains: complex attention, executive function, learning and memory, language, perceptual-motor, social cognition.',
  groups: [
    { title: 'A. Significant decline from a previous level in at least one cognitive domain, based on', items: [
      one('mncd_a1', 'Concern of the person, an informant or the clinician about a significant decline'),
      one('mncd_a2', 'Substantial impairment on standardised testing (e.g. MoCA well below the cut-off) or clinical assessment'),
    ] },
    { title: 'B–D', items: [
      one('mncd_b', 'The deficits interfere with independence in everyday activities (e.g. paying bills, managing medicines)'),
      one('mncd_c', 'Not occurring only during a delirium'),
      one('mncd_d', 'Not better explained by another mental disorder (e.g. major depressive disorder, schizophrenia)'),
    ] },
  ],
  rule: { all: ['mncd_a1', 'mncd_a2', 'mncd_b', 'mncd_c', 'mncd_d'] },
  specifiers: [NCD_ETIOLOGY],
  code(s) {
    const map = {
      alzheimer: 'F00.9 + G30.9', vascular: 'F01.9', lewy: 'F02.8 + G31.8', ftd: 'F02.0 + G31.0',
      parkinson: 'F02.3 + G20', tbi: 'F02.8 + T90.5', substance: 'F1x.73 (by substance)', unknown: 'F03',
    };
    return map[s.etiology] ?? 'F03';
  },
  codeNote: 'ICD-10 codes dementia together with its cause. Confirm the cause with medical work-up (bloods, imaging) and specialist assessment.',
};

const mildNcd = {
  id: 'mild_ncd',
  category: 'neurocognitive',
  name: 'Mild neurocognitive disorder',
  groups: [
    { title: 'A. Modest decline from a previous level in at least one cognitive domain, based on', items: [
      one('lncd_a1', 'Concern of the person, an informant or the clinician about a mild decline'),
      one('lncd_a2', 'Modest impairment on standardised testing (e.g. MoCA below the cut-off) or clinical assessment'),
    ] },
    { title: 'B–D', items: [
      one('lncd_b', 'The deficits do NOT interfere with independence in everyday activities (greater effort may be needed)'),
      one('lncd_c', 'Not occurring only during a delirium'),
      one('lncd_d', 'Not better explained by another mental disorder (e.g. major depressive disorder)'),
    ] },
  ],
  rule: { all: ['lncd_a1', 'lncd_a2', 'lncd_b', 'lncd_c', 'lncd_d'] },
  specifiers: [NCD_ETIOLOGY],
  code: () => 'F06.7',
  codeNote: 'F06.7 (mild cognitive disorder). Also code the probable cause if known.',
};

export const DISORDERS = [
  mdd, pdd, pmdd, dmdd, bipolar1, bipolar2, cyclothymic, substanceMood, medicalMood,
  separation, mutism, phobia, social, panic, agoraphobia, gad, substanceAnxiety, medicalAnxiety,
  paranoid, schizoid, schizotypal, antisocial, borderline, histrionic, narcissistic, avoidant, dependent, ocpd,
  delirium, majorNcd, mildNcd,
];

export function findDisorder(id) {
  return DISORDERS.find((d) => d.id === id);
}

// Every criterion id of a disorder (used to validate what the form sends).
export function criterionIds(disorder) {
  return disorder.groups.flatMap((g) => g.items.map((i) => i.id));
}
