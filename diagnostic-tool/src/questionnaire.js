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

// ---------- Differential diagnosis screening ----------
//
// These questions screen for conditions that can look like, or must be ruled
// out before diagnosing, major depressive disorder and generalized anxiety
// disorder (the "differential diagnosis" sections of DSM-5-TR).
//
// Validated items used (all free to use):
// - AUDIT-C (alcohol): Bush et al. (1998); cut-offs from Bradley et al. (2007).
// - Single-question drug screen: Smith et al. (2010), wording paraphrased.
// - PC-PTSD-5 (trauma): Prins et al. (2016), US National Center for PTSD.
// All other items are written for this tool and are NOT validated: they only
// tell the clinician what to ask about in the interview.

export const YES_NO_UNSURE_OPTIONS = [
  { value: 1, label: 'Yes' },
  { value: 0, label: 'No' },
  { value: 2, label: 'Not sure' },
];

export const YES_NO_NA_OPTIONS = [
  { value: 1, label: 'Yes' },
  { value: 0, label: 'No' },
  { value: 2, label: 'Does not apply to me' },
];

export const SCREENING_SECTIONS = [
  {
    title: 'Your mood over time',
    intro: 'These questions are about your whole life, not only the last few weeks.',
    items: [
      { id: 'bp1', text: 'Have you ever had a period of at least 4 days in a row when you felt unusually happy, "high", full of energy or irritable — clearly different from your normal self?', options: YES_NO_OPTIONS },
      { id: 'bp2', text: 'During such a period, did you need much less sleep than usual but still not feel tired?', options: YES_NO_NA_OPTIONS },
      { id: 'bp3', text: 'During such a period, did other people notice the change, or did it cause problems (for example at work, with money or in relationships)?', options: YES_NO_NA_OPTIONS },
      { id: 'pdd1', text: 'Have you felt down or depressed on most days for at least the past 2 years?', options: YES_NO_OPTIONS },
      { id: 'cyclo1', text: 'For at least the past 2 years, has your mood often swung between periods of feeling unusually up or energetic and periods of feeling down?', options: YES_NO_OPTIONS },
      { id: 'psy1', text: 'Have you heard voices or seen things that other people could not hear or see, or strongly felt that others were watching you or trying to harm you?', options: YES_NO_OPTIONS },
      { id: 'psy2', text: 'If so: did these experiences happen ONLY at times when your mood was extremely low or extremely high?', options: YES_NO_NA_OPTIONS },
      { id: 'psy3', text: 'If so: have these experiences gone on for more than a month in total?', options: YES_NO_NA_OPTIONS },
    ],
  },
  {
    title: 'Alcohol, drugs, medicines and health',
    intro: 'A "standard drink" is for example a 33 cl beer, a glass of wine or 4 cl of spirits.',
    items: [
      {
        id: 'auditc1',
        text: 'How often do you have a drink containing alcohol?',
        options: [
          { value: 0, label: 'Never' },
          { value: 1, label: 'Monthly or less' },
          { value: 2, label: '2–4 times a month' },
          { value: 3, label: '2–3 times a week' },
          { value: 4, label: '4 or more times a week' },
        ],
      },
      {
        id: 'auditc2',
        text: 'How many standard drinks containing alcohol do you have on a typical day when you drink?',
        options: [
          { value: 0, label: '1 or 2 (or I never drink)' },
          { value: 1, label: '3 or 4' },
          { value: 2, label: '5 or 6' },
          { value: 3, label: '7 to 9' },
          { value: 4, label: '10 or more' },
        ],
      },
      {
        id: 'auditc3',
        text: 'How often do you have six or more drinks on one occasion?',
        options: [
          { value: 0, label: 'Never' },
          { value: 1, label: 'Less than monthly' },
          { value: 2, label: 'Monthly' },
          { value: 3, label: 'Weekly' },
          { value: 4, label: 'Daily or almost daily' },
        ],
      },
      {
        id: 'drug1',
        text: 'In the past 12 months, how often have you used an illegal drug, or a prescription medicine for non-medical reasons (for example for the feeling it gives)?',
        options: [
          { value: 0, label: 'Never' },
          { value: 1, label: 'Once or twice' },
          { value: 2, label: 'Monthly' },
          { value: 3, label: 'Weekly or more often' },
        ],
      },
      { id: 'caf1', text: 'Do you usually have more than 4 cups of coffee, or several energy drinks, a day?', options: YES_NO_OPTIONS },
      { id: 'med1', text: 'Did the problems you described start, or get clearly worse, soon after you started, stopped or changed a medicine?', options: YES_NO_UNSURE_OPTIONS },
      { id: 'medcond', text: 'Do you have an ongoing physical illness or condition (for example thyroid disease, diabetes, heart or lung disease, a neurological condition or long-term pain)?', options: YES_NO_UNSURE_OPTIONS },
      { id: 'medonset', text: 'Did the problems start around the same time as a physical illness, an injury, a pregnancy or giving birth?', options: YES_NO_UNSURE_OPTIONS },
    ],
  },
  {
    title: 'Life events',
    intro: '',
    items: [
      { id: 'stress1', text: 'Did something very stressful or a big change happen in your life (for example job loss, separation, illness or moving) in the 3 months before these problems started?', options: YES_NO_OPTIONS },
      {
        id: 'grief1',
        text: 'Has someone close to you died?',
        options: [
          { value: 0, label: 'No' },
          { value: 1, label: 'Yes, in the past 12 months' },
          { value: 2, label: 'Yes, more than 12 months ago' },
        ],
      },
      { id: 'grief2', text: 'If so: on most days, do you still feel intense longing for the person, or are you preoccupied with thoughts of them?', options: YES_NO_NA_OPTIONS },
      { id: 'pmdd1', text: 'If you have menstrual periods: do these problems mainly come in the week before your period and get better within a few days after it starts?', options: YES_NO_NA_OPTIONS },
    ],
  },
  {
    title: 'Other worries, fears and habits',
    intro: '',
    items: [
      { id: 'panic1', text: 'In the past 4 weeks, have you had an attack of intense fear or discomfort that came on suddenly and peaked within minutes (for example racing heart, shortness of breath, shaking, or feeling you might die or lose control)?', options: YES_NO_OPTIONS },
      { id: 'panic2', text: 'Have you worried a lot about having another attack, or changed what you do to avoid attacks?', options: YES_NO_NA_OPTIONS },
      { id: 'soc1', text: 'Do you strongly fear or avoid social situations where you might be watched, judged or embarrassed (for example speaking up, meeting new people, eating in front of others)?', options: YES_NO_OPTIONS },
      { id: 'soc2', text: 'Is your worry mostly about what other people think of you?', options: YES_NO_OPTIONS },
      { id: 'ocd1', text: 'Are you bothered by unwanted thoughts, images or urges that keep coming back even though you try to stop them (for example fear of germs or of causing harm)?', options: YES_NO_OPTIONS },
      { id: 'ocd2', text: 'Do you feel driven to repeat actions or mental routines (for example washing, checking, counting or arranging) to reduce anxiety?', options: YES_NO_OPTIONS },
      { id: 'ill1', text: 'Is most of your worry about having or getting a serious illness?', options: YES_NO_OPTIONS },
      { id: 'phobia1', text: 'Do you have a strong fear of a particular thing or situation (for example animals, heights, flying, blood or injections) that you avoid or can hardly bear?', options: YES_NO_OPTIONS },
      { id: 'agora1', text: 'Do you fear or avoid two or more of these: public transport, open spaces, shops or cinemas, queues or crowds, being outside your home alone?', options: YES_NO_OPTIONS },
      { id: 'sep1', text: 'Do you worry much more than other people about being separated from someone close to you, or that something bad will happen to them?', options: YES_NO_OPTIONS },
      { id: 'bdd1', text: 'Do you worry a lot that some part of your appearance is ugly or flawed, even though others say it looks fine?', options: YES_NO_OPTIONS },
      { id: 'hoard1', text: 'Do you find it very hard to throw things away, so that rooms in your home have become cluttered?', options: YES_NO_OPTIONS },
      { id: 'trich1', text: 'Do you repeatedly pull out your hair (from your scalp, eyebrows, eyelashes or elsewhere) and find it hard to stop?', options: YES_NO_OPTIONS },
      { id: 'skin1', text: 'Do you repeatedly pick at your skin so that it causes sores, and find it hard to stop?', options: YES_NO_OPTIONS },
      { id: 'mutism1', text: 'Are there situations (for example at work or school) where you are unable to speak, even though you speak normally at home?', options: YES_NO_OPTIONS },
    ],
  },
  {
    title: 'Difficult experiences',
    intro:
      'Sometimes things happen to people that are unusually or especially frightening, horrible, or traumatic. For example: a serious accident or fire; a physical or sexual assault or abuse; an earthquake or flood; a war; seeing someone be killed or seriously injured; having a loved one die through homicide or suicide. You do not need to describe what happened.',
    items: [
      { id: 'ptsd0', text: 'Have you ever experienced this kind of event?', options: YES_NO_OPTIONS },
      { id: 'ptsd_recent', text: 'If yes: did the (most recent) event happen within the past month?', options: YES_NO_NA_OPTIONS },
      { id: 'ptsd1', text: 'If yes, in the past month, have you had nightmares about the event(s) or thought about the event(s) when you did not want to?', options: YES_NO_NA_OPTIONS },
      { id: 'ptsd2', text: 'In the past month, have you tried hard not to think about the event(s) or gone out of your way to avoid situations that reminded you of the event(s)?', options: YES_NO_NA_OPTIONS },
      { id: 'ptsd3', text: 'In the past month, have you been constantly on guard, watchful, or easily startled?', options: YES_NO_NA_OPTIONS },
      { id: 'ptsd4', text: 'In the past month, have you felt numb or detached from people, activities, or your surroundings?', options: YES_NO_NA_OPTIONS },
      { id: 'ptsd5', text: 'In the past month, have you felt guilty or unable to stop blaming yourself or others for the event(s) or any problems the event(s) may have caused?', options: YES_NO_NA_OPTIONS },
    ],
  },
  {
    title: 'How you usually are',
    intro: 'These questions are about how you usually are, for most of your adult life (or since your teens). There are no right or wrong answers.',
    items: [
      // pd1-pd8 follow the eight personality areas of the SAPAS screen
      // (Moran et al., 2003), reworded. pd14-pd19 follow borderline traits.
      { id: 'pd1', text: 'In general, do you find it hard to make and keep friends?', options: YES_NO_OPTIONS },
      { id: 'pd2', text: 'Would you normally describe yourself as a loner?', options: YES_NO_OPTIONS },
      { id: 'pd3', text: 'In general, do you trust other people?', options: YES_NO_OPTIONS },
      { id: 'pd4', text: 'Do you normally lose your temper easily?', options: YES_NO_OPTIONS },
      { id: 'pd5', text: 'Are you normally an impulsive sort of person?', options: YES_NO_OPTIONS },
      { id: 'pd6', text: 'Are you normally a worrier?', options: YES_NO_OPTIONS },
      { id: 'pd7', text: 'In general, do you depend on others a lot?', options: YES_NO_OPTIONS },
      { id: 'pd8', text: 'In general, are you a perfectionist?', options: YES_NO_OPTIONS },
      { id: 'pd9', text: 'Do other people often find you odd, or do you have unusual experiences (for example sensing a presence, or believing you can influence events with your thoughts)?', options: YES_NO_OPTIONS },
      { id: 'pd10', text: 'Do you feel uncomfortable when you are not the centre of attention?', options: YES_NO_OPTIONS },
      { id: 'pd11', text: 'Do you feel you are special, and that others should recognise this and admire you?', options: YES_NO_OPTIONS },
      { id: 'pd12', text: 'Since your teens, have you repeatedly broken rules or laws, lied to or hurt others, without feeling sorry afterwards?', options: YES_NO_OPTIONS },
      { id: 'pd13', text: 'Do you avoid people, jobs or activities because you fear being criticised or rejected?', options: YES_NO_OPTIONS },
      { id: 'pd14', text: 'Are your close relationships often stormy, with intense ups and downs?', options: YES_NO_OPTIONS },
      { id: 'pd15', text: 'Do you go to great lengths to avoid being left or abandoned by people close to you?', options: YES_NO_OPTIONS },
      { id: 'pd16', text: 'Have you ever deliberately hurt yourself (for example by cutting or burning)?', options: YES_NO_OPTIONS },
      { id: 'pd17', text: 'Do you often feel empty inside?', options: YES_NO_OPTIONS },
      { id: 'pd18', text: 'Do you often feel unsure of who you really are?', options: YES_NO_OPTIONS },
      { id: 'pd19', text: 'Does your mood often change strongly within a few hours (for example from content to very low or very angry)?', options: YES_NO_OPTIONS },
    ],
  },
  {
    title: 'Memory and the nervous system',
    intro: 'If any of the problems below started suddenly in the last few days, call 112 now.',
    items: [
      { id: 'cog1', text: 'Have you, or people close to you, noticed that your memory or thinking has got worse during the past year?', options: YES_NO_OPTIONS },
      { id: 'cog2', text: 'Do memory or thinking problems make it harder to manage everyday things (for example money, medicines, appointments or cooking)?', options: YES_NO_OPTIONS },
      { id: 'neuro1', text: 'Have you had seizures (fits) or unexplained blackouts?', options: YES_NO_OPTIONS },
      { id: 'neuro2', text: 'Have you had new weakness, numbness or paralysis in your face, an arm or a leg?', options: YES_NO_OPTIONS },
      { id: 'neuro3', text: 'Have you had new trouble speaking or understanding speech, or sudden loss of vision?', options: YES_NO_OPTIONS },
      { id: 'neuro4', text: 'Have you developed shaking (tremor), stiffness or slowed movements?', options: YES_NO_OPTIONS },
      { id: 'neuro5', text: 'Have you had new, severe headaches unlike any you had before?', options: YES_NO_OPTIONS },
      { id: 'neuro6', text: 'Have you had a head injury where you were knocked out?', options: YES_NO_OPTIONS },
    ],
  },
];

export const SCREENING_ITEMS = SCREENING_SECTIONS.flatMap((section) => section.items);

// Looks up any question by id (used to quote questions in the report).
export function findItem(id) {
  return [...PHQ9_ITEMS, ...GAD7_ITEMS, ...GAD_CRITERIA_ITEMS, ...SCREENING_ITEMS].find((item) => item.id === id);
}

// The answer label for a question, e.g. ('phq1', 2) -> 'More than half the days'.
export function answerLabel(id, value) {
  const item = findItem(id);
  let options;
  if (item?.options) options = item.options;
  else if (GAD_CRITERIA_ITEMS.includes(item)) options = YES_NO_OPTIONS;
  else options = FREQUENCY_OPTIONS;
  return options.find((o) => o.value === value)?.label ?? String(value);
}

// Every answer the form must contain, with the values allowed for it.
// Used to validate what the browser sends to the server.
export const ALL_FIELDS = [
  ...PHQ9_ITEMS.map((item) => ({ id: item.id, allowed: [0, 1, 2, 3] })),
  { id: PHQ_DIFFICULTY_ID, allowed: [0, 1, 2, 3] },
  ...GAD7_ITEMS.map((item) => ({ id: item.id, allowed: [0, 1, 2, 3] })),
  { id: GAD_DIFFICULTY_ID, allowed: [0, 1, 2, 3] },
  ...GAD_CRITERIA_ITEMS.map((item) => ({ id: item.id, allowed: [0, 1] })),
  ...SCREENING_ITEMS.map((item) => ({ id: item.id, allowed: item.options.map((o) => o.value) })),
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
