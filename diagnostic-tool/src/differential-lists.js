// What to rule out for each disorder in the catalog (DSM-5-TR "differential
// diagnosis" sections, summarised in short reasons written for this app).
//
// Each entry is either
//   d('bipolar1', 'why')           a disorder in this app's catalog, so the
//                                  checklist page can show its status and link to it
//   out('Adjustment disorder', 'why')  a condition outside this app's catalog
//
// This is clinical content written from general knowledge of DSM-5-TR. It
// must be reviewed by a clinician, like the criteria in disorders.js.

const d = (id, why) => ({ id, why });
const out = (name, why) => ({ name, why, outside: true });

const ADHD = out('ADHD', 'Lifelong attention problems and restlessness since childhood, not episodic.');
const PTSD = out('Posttraumatic stress disorder', 'Symptoms started after a trauma and include re-experiencing and avoidance of reminders.');
const OCD = out('Obsessive-compulsive disorder', 'Intrusive, unwanted obsessions and compulsions rather than everyday worries or traits.');
const PSYCHOTIC = out('Schizophrenia spectrum and other psychotic disorders', 'Delusions or hallucinations outside mood episodes.');
const AUTISM = out('Autism spectrum disorder', 'Lifelong social communication differences and restricted interests from early childhood.');
const SUBSTANCE_USE = out('Substance use disorder', 'A pattern of problematic use; can cause or worsen the symptoms.');
const ADJUSTMENT = out('Adjustment disorder', 'Symptoms within 3 months of a stressor and not meeting criteria for another disorder.');
const ILLNESS_ANXIETY = out('Illness anxiety disorder', 'Worry focused mainly on having or getting a serious illness.');
const AGEING = out('Normal ageing', 'Mild slowing and word-finding pauses without decline on testing or in daily life.');

export const DIFFERENTIALS = {
  // ----- Mood -----
  mdd: [
    d('bipolar1', 'Any past manic episode rules out MDD (criterion E). Ask about elevated mood, ideally with an informant.'),
    d('bipolar2', 'Any past hypomanic episode rules out MDD. Hypomania is often missed by the patient.'),
    d('pdd', 'Depressed mood for 2 years or more; can be diagnosed together with MDD.'),
    d('medical_mood', 'Medical causes such as hypothyroidism, anaemia, B12 deficiency, stroke, Parkinson’s or cancer.'),
    d('substance_mood', 'Alcohol, drugs or medicines (e.g. corticosteroids, interferon) can cause depression.'),
    d('pmdd', 'Symptoms only in the week before menstruation.'),
    d('major_ncd', 'In older adults, depression can look like dementia and the reverse; reassess cognition after treatment.'),
    ADJUSTMENT,
    out('Normal grief', 'Waves of sadness focused on the loss, with self-esteem preserved.'),
    ADHD,
    out('Schizoaffective disorder', 'Psychotic symptoms also occur outside mood episodes.'),
  ],
  pdd: [
    d('mdd', 'Full major depressive episodes on top of the chronic low mood; both can be diagnosed.'),
    d('cyclothymic', 'Hypomanic symptoms as well as depressive ones over 2 years.'),
    d('bipolar1', 'Any past manic episode rules out persistent depressive disorder.'),
    d('bipolar2', 'Any past hypomanic episode rules out persistent depressive disorder.'),
    d('medical_mood', 'Chronic medical illness causing long-lasting low mood.'),
    d('substance_mood', 'Long-term alcohol, drug or medicine use.'),
    d('bpd', 'Chronic emptiness and mood instability in borderline personality disorder.'),
  ],
  pmdd: [
    d('mdd', 'Premenstrual worsening of an existing depressive disorder is not PMDD (criterion E).'),
    d('pdd', 'Chronic low mood that only worsens before menstruation.'),
    d('bipolar2', 'Mood episodes that happen to coincide with the cycle.'),
    d('medical_mood', 'Thyroid disease or other medical causes; effects of hormonal contraception.'),
    out('Premenstrual syndrome', 'Milder symptoms that do not meet the 5-symptom threshold or cause marked impairment.'),
  ],
  dmdd: [
    d('bipolar1', 'Episodic mania with elevated mood, versus chronic non-episodic irritability. Any manic or hypomanic episode rules out DMDD.'),
    d('bipolar2', 'Episodic hypomania versus chronic irritability.'),
    d('mdd', 'Irritability only during depressive episodes.'),
    out('Oppositional defiant disorder', 'Defiance without the severe, chronic mood component; DMDD takes precedence if both are met.'),
    out('Intermittent explosive disorder', 'Outbursts without persistent irritability between them.'),
    ADHD,
    AUTISM,
  ],
  bipolar1: [
    d('bipolar2', 'Hypomania only (no marked impairment, hospitalisation or psychosis).'),
    d('mdd', 'Depression without any past manic or hypomanic episode.'),
    d('cyclothymic', 'Milder mood swings that never meet full episode criteria.'),
    d('substance_mood', 'Mania caused by stimulants, corticosteroids or antidepressants (if it fully persists beyond the drug effect, it counts as bipolar I).'),
    d('medical_mood', 'Hyperthyroidism, brain injury, multiple sclerosis or other medical causes.'),
    d('bpd', 'Mood changes in borderline personality disorder last hours and react to events; manic episodes last days.'),
    ADHD,
    PSYCHOTIC,
  ],
  bipolar2: [
    d('bipolar1', 'Any past full manic episode makes it bipolar I.'),
    d('mdd', 'Depression without a past hypomanic episode (check carefully: hypomania is often missed).'),
    d('cyclothymic', 'Hypomanic and depressive symptoms that never meet full episode criteria.'),
    d('bpd', 'Short, reactive mood changes rather than distinct hypomanic periods of 4 days or more.'),
    d('substance_mood', 'Hypomania caused by stimulants, corticosteroids or antidepressants.'),
    ADHD,
  ],
  cyclothymic: [
    d('bipolar2', 'A full hypomanic episode and a major depressive episode.'),
    d('bipolar1', 'A full manic episode.'),
    d('mdd', 'A full major depressive episode rules out cyclothymic disorder.'),
    d('bpd', 'Reactive mood instability in borderline personality disorder.'),
    d('substance_mood', 'Mood swings caused by substances or medicines.'),
    d('medical_mood', 'Medical causes such as thyroid disease.'),
  ],
  substance_mood: [
    d('mdd', 'An independent depressive disorder: started before the use, or persists about 1 month after stopping.'),
    d('bipolar1', 'An independent bipolar disorder.'),
    d('pdd', 'Long-lasting low mood that started before the use.'),
    d('delirium', 'Symptoms only during a delirium (e.g. in withdrawal).'),
    out('Substance intoxication or withdrawal', 'Mood symptoms that are typical of intoxication or withdrawal alone and need no separate diagnosis.'),
  ],
  medical_mood: [
    d('mdd', 'An independent depressive disorder that happens to occur in a medically ill person.'),
    d('substance_mood', 'Mood symptoms caused by the medicines used to treat the illness.'),
    d('delirium', 'Symptoms only during a delirium.'),
    d('major_ncd', 'Apathy and low mood as part of a neurocognitive disorder.'),
    ADJUSTMENT,
  ],

  // ----- Anxiety -----
  separation: [
    d('agoraphobia', 'Fear of situations because escape is hard, rather than fear of being away from attachment figures.'),
    d('gad', 'Worry about many topics, not mainly separation.'),
    d('panic', 'Fear of panic attacks themselves.'),
    d('social', 'Fear of being judged by others.'),
    d('dpd', 'Pervasive dependence on others in dependent personality disorder.'),
    d('bpd', 'Fear of abandonment in borderline personality disorder.'),
    ILLNESS_ANXIETY,
    PTSD,
  ],
  mutism: [
    d('social', 'Often occurs together with selective mutism; both can be diagnosed.'),
    AUTISM,
    out('Communication disorders', 'Speech or language problems present in all situations.'),
    out('Limited knowledge of the language', 'Not speaking because of unfamiliarity with the language (criterion D).'),
    PSYCHOTIC,
  ],
  phobia: [
    d('agoraphobia', 'Fear of 2 or more agoraphobic situations rather than one specific one.'),
    d('social', 'Fear of being judged in social situations.'),
    d('panic', 'Unexpected panic attacks not tied to one object or situation.'),
    d('separation', 'Fear of being separated from attachment figures.'),
    OCD,
    PTSD,
    out('Eating disorders', 'Avoidance of food because of body-image concerns.'),
  ],
  social: [
    d('avpd', 'Broader, lifelong avoidance and feelings of inadequacy; often both are met.'),
    d('agoraphobia', 'Fear of situations because escape is hard, not because of being judged.'),
    d('panic', 'Fear of the panic attacks themselves.'),
    d('gad', 'Worry about many topics, not mainly social evaluation.'),
    d('separation', 'Fear of separation from attachment figures.'),
    d('mutism', 'Not speaking in specific situations.'),
    d('mdd', 'Social withdrawal because of low mood and loss of interest.'),
    out('Body dysmorphic disorder', 'Fear of negative evaluation focused on a perceived flaw in appearance.'),
    AUTISM,
  ],
  panic: [
    d('agoraphobia', 'Often occurs with panic disorder; both can be diagnosed.'),
    d('medical_anxiety', 'Hyperthyroidism, heart arrhythmia, asthma or COPD, low blood sugar.'),
    d('substance_anxiety', 'Stimulants, caffeine, cannabis, or alcohol and sedative withdrawal.'),
    d('gad', 'Background worry rather than sudden attacks.'),
    d('social', 'Attacks only in feared social situations (expected attacks).'),
    d('phobia', 'Attacks only when facing the feared object or situation.'),
    PTSD,
  ],
  agoraphobia: [
    d('panic', 'Often occurs together; both can be diagnosed.'),
    d('phobia', 'Fear limited to one situation (situational specific phobia).'),
    d('social', 'Fear of being judged rather than of being unable to escape.'),
    d('separation', 'Fear of being away from attachment figures.'),
    d('mdd', 'Staying at home because of apathy or low energy.'),
    PTSD,
  ],
  gad: [
    d('panic', 'Worry mainly about panic attacks.'),
    d('social', 'Worry mainly about being judged.'),
    d('separation', 'Worry mainly about separation from attachment figures.'),
    d('mdd', 'Worry and rumination only during depressive episodes.'),
    d('substance_anxiety', 'Caffeine, stimulants, or alcohol and sedative withdrawal.'),
    d('medical_anxiety', 'Hyperthyroidism and other medical causes.'),
    OCD,
    ILLNESS_ANXIETY,
    PTSD,
    ADJUSTMENT,
  ],
  substance_anxiety: [
    d('gad', 'An independent anxiety disorder: started before the use, or persists after stopping.'),
    d('panic', 'Independent panic attacks.'),
    d('medical_anxiety', 'A medical cause of the anxiety.'),
    d('delirium', 'Anxiety only during a delirium (e.g. alcohol withdrawal).'),
  ],
  medical_anxiety: [
    d('gad', 'An independent anxiety disorder in a medically ill person.'),
    d('panic', 'Independent panic attacks.'),
    d('substance_anxiety', 'Anxiety caused by the medicines used for the illness (e.g. inhalers, thyroid hormone, corticosteroids).'),
    ADJUSTMENT,
    ILLNESS_ANXIETY,
  ],

  // ----- Personality -----
  ppd: [
    d('stpd', 'Also has odd thinking, unusual perceptions and eccentric behaviour.'),
    d('szpd', 'Detachment without suspiciousness.'),
    d('bpd', 'Paranoid ideas only briefly under stress.'),
    d('npd', 'Suspiciousness linked to fear of exposing flaws.'),
    d('avpd', 'Reluctance to confide from fear of embarrassment rather than malice.'),
    out('Delusional disorder', 'Fixed delusions rather than suspicious traits.'),
    out('Personality change due to another medical condition', 'Traits that began with a brain injury or other illness.'),
  ],
  szpd: [
    d('stpd', 'Also has odd thinking, unusual perceptions and eccentric behaviour.'),
    d('avpd', 'Avoids people from fear of rejection but wants relationships.'),
    d('ppd', 'Distance driven by suspiciousness.'),
    d('mdd', 'Loss of interest only during a depressive episode.'),
    AUTISM,
    PSYCHOTIC,
  ],
  stpd: [
    d('szpd', 'Detachment without odd thinking or perceptions.'),
    d('ppd', 'Suspiciousness without eccentricity.'),
    d('avpd', 'Social anxiety from fear of rejection, without oddness.'),
    d('bpd', 'Brief stress-related paranoia or dissociation.'),
    AUTISM,
    PSYCHOTIC,
  ],
  aspd: [
    d('bpd', 'Impulsivity and anger together with emotional instability and fear of abandonment.'),
    d('npd', 'Exploitation driven by a need for admiration, without aggression or criminality.'),
    d('hpd', 'Manipulation to gain attention.'),
    d('bipolar1', 'Antisocial acts only during manic episodes.'),
    SUBSTANCE_USE,
    out('Conduct disorder', 'Under 18, or the pattern did not continue into adulthood.'),
  ],
  bpd: [
    d('bipolar1', 'Distinct manic episodes lasting days, versus mood changes lasting hours.'),
    d('bipolar2', 'Distinct hypomanic episodes of 4 days or more.'),
    d('cyclothymic', 'Longer mood periods that are less tied to events.'),
    d('hpd', 'Attention seeking without self-harm, emptiness or intense anger.'),
    d('npd', 'Stable grandiose self-image.'),
    d('aspd', 'Manipulation for gain rather than for care and attention.'),
    d('dpd', 'Dependence without anger or instability.'),
    PTSD,
    ADHD,
    SUBSTANCE_USE,
  ],
  hpd: [
    d('bpd', 'Also self-harm, emptiness, intense anger and identity disturbance.'),
    d('npd', 'Wants admiration for superiority rather than general attention.'),
    d('aspd', 'Manipulation for gain or power.'),
    d('dpd', 'Dependence without flamboyant emotions.'),
    out('Somatic symptom disorder', 'Attention-seeking focused on physical symptoms.'),
  ],
  npd: [
    d('hpd', 'Attention seeking without grandiosity.'),
    d('aspd', 'Aggression, deceit and lawbreaking.'),
    d('bpd', 'Unstable self-image rather than a grandiose one.'),
    d('ppd', 'Suspiciousness of others’ motives.'),
    d('bipolar1', 'Grandiosity only during manic or hypomanic episodes.'),
    SUBSTANCE_USE,
  ],
  avpd: [
    d('social', 'Fear limited to social situations; often both are met.'),
    d('szpd', 'Lack of interest in relationships rather than fear of rejection.'),
    d('stpd', 'Odd thinking and eccentric behaviour.'),
    d('dpd', 'Clinging to others rather than avoiding them.'),
    d('ppd', 'Distrust of others’ motives.'),
  ],
  dpd: [
    d('bpd', 'Dependence together with anger, emptiness and unstable relationships.'),
    d('hpd', 'Flamboyant attention seeking.'),
    d('avpd', 'Avoidance from fear of rejection rather than clinging.'),
    d('separation', 'Fear focused on separation from specific attachment figures.'),
    d('mdd', 'Dependence only during depression.'),
    d('agoraphobia', 'Needing a companion only in agoraphobic situations.'),
  ],
  ocpd: [
    OCD,
    d('npd', 'Perfectionism driven by a sense of superiority.'),
    d('szpd', 'Detachment from lack of interest rather than devotion to work.'),
    d('avpd', 'Restraint from fear of rejection.'),
    out('Hoarding disorder', 'Inability to discard possessions causing clutter, beyond keeping worthless objects.'),
  ],

  // ----- Neurocognitive -----
  delirium: [
    d('major_ncd', 'Gradual decline over months with stable attention; delirium can occur on top of dementia.'),
    d('mild_ncd', 'Mild gradual decline without fluctuation.'),
    d('mdd', 'Hypoactive delirium can look like depression (slowed, withdrawn).'),
    d('bipolar1', 'Agitation and disorganisation in mania, with clear consciousness.'),
    PSYCHOTIC,
    out('Substance intoxication or withdrawal', 'Symptoms typical of intoxication or withdrawal without disturbed attention and awareness.'),
  ],
  major_ncd: [
    d('delirium', 'Acute onset and fluctuating attention. Dementia cannot be diagnosed from symptoms that occur only during a delirium.'),
    d('mild_ncd', 'Decline without loss of independence in everyday activities.'),
    d('mdd', 'Depression can cause concentration and memory problems that improve with treatment.'),
    out('Reversible medical causes', 'Hypothyroidism, B12 deficiency, normal-pressure hydrocephalus, infections, medicines: check before diagnosing dementia.'),
    AGEING,
    out('Intellectual disability', 'Lifelong limitation rather than a decline from an earlier level.'),
  ],
  mild_ncd: [
    d('major_ncd', 'Decline severe enough to affect independence.'),
    d('delirium', 'Acute onset and fluctuating attention.'),
    d('mdd', 'Concentration and memory problems caused by depression.'),
    d('gad', 'Concentration problems from worry.'),
    AGEING,
    out('Medicine side effects', 'Anticholinergic medicines, sedatives and others can impair cognition.'),
  ],
};
