// Disorder information with treatment suggestions, in English and Swedish.
//
// For each disorder: a short summary, treatments in order, the strength of
// the evidence, and the guidelines it is based on.
//
// Swedish national guidelines (Socialstyrelsen) come first where they exist.
// Treatments written with G() carry Socialstyrelsen's priority (1 = most
// important ... 10 = least; 'fou' = only within research and development;
// 'dont' = icke-göra, advised against) and the recommendation's id in the
// guideline's list of recommendations, so every line can be checked. Checked
// against the guideline documents on 2026-11-15:
//   depression and anxiety disorders 2021 (art. 2021-4-7339, appendix 2),
//   schizophrenia and schizophrenia-like conditions 2018 (2018-9-6, appendix 1),
//   dementia 2017 (2017-12-2, appendix 1), eating disorders 2024
//   (2024-12-9352, appendix 1), substance use and dependence 2019 (2019-1-16).
// Socialstyrelsen's priority weighs the severity of the condition, the effect,
// the evidence and cost-effectiveness; it is not the same as "most effective".
// Where NICE and Socialstyrelsen differ, `differs` says how.
// Treatments written with T() are not in a Swedish national guideline
// (NICE or other sources, or expert consensus).
//
// IMPORTANT: clinical content. It supports, but does not replace, clinical
// judgement and current national guidelines, and must be reviewed by a
// psychiatrist or psychologist before use (CON-6 in docs/VALIDATION-PLAN.md).
// Medicines are prescribed by a physician; check doses, contraindications and
// interactions in FASS / the product information.
//
// Evidence levels:
//   strong     recommended first-line in national guidelines, several good trials
//   moderate   recommended, or supported by some trials
//   limited    few or small trials; consider when the above are not possible
//   consensus  expert opinion; little or no trial evidence

export const EVIDENCE = ['strong', 'moderate', 'limited', 'consensus'];
export const EVIDENCE_LABELS = {
  strong: { en: 'Strong evidence (first-line)', sv: 'Starkt stöd (förstahandsval)' },
  moderate: { en: 'Moderate evidence', sv: 'Måttligt stöd' },
  limited: { en: 'Limited evidence', sv: 'Begränsat stöd' },
  consensus: { en: 'Expert consensus', sv: 'Konsensus bland experter' },
};

const S = (en, sv) => ({ en, sv });
const T = (evidence, en, sv, noteEn, noteSv) => ({ evidence, what: { en, sv }, note: noteEn ? { en: noteEn, sv: noteSv } : null, sos: null });
// A treatment from a Socialstyrelsen guideline: priority, recommendation id, evidence, text, { note, differs }.
const G = (sos, sosId, evidence, en, sv, { note = null, differs = null } = {}) => ({ evidence, what: { en, sv }, note, differs, sos, sosId });

// Socialstyrelsen's national guidelines (overview pages with the documents).
const SOS_BASE = 'https://socialstyrelsen.se/kunskapsstod-och-regler/regler-och-riktlinjer/nationella-riktlinjer/riktlinjer-och-utvarderingar/';
export const SOS = {
  dep: { label: S('Socialstyrelsen (2021): National guidelines for depression and anxiety disorders', 'Socialstyrelsen (2021): Nationella riktlinjer för vård vid depression och ångestsyndrom'), url: `${SOS_BASE}depression-och-angest/` },
  sz: { label: S('Socialstyrelsen (2018): National guidelines for schizophrenia and schizophrenia-like conditions', 'Socialstyrelsen (2018): Nationella riktlinjer för vård och stöd vid schizofreni och schizofreniliknande tillstånd'), url: `${SOS_BASE}schizofreni/` },
  dem: { label: S('Socialstyrelsen (2017): National guidelines for dementia care', 'Socialstyrelsen (2017): Nationella riktlinjer för vård och omsorg vid demenssjukdom'), url: `${SOS_BASE}demens/` },
  ed: { label: S('Socialstyrelsen (2024): National guidelines for eating disorders', 'Socialstyrelsen (2024): Nationella riktlinjer för vård och stöd vid ätstörningar'), url: `${SOS_BASE}atstorningar/` },
  sud: { label: S('Socialstyrelsen (2019): National guidelines for substance use and dependence', 'Socialstyrelsen (2019): Nationella riktlinjer för vård och stöd vid missbruk och beroende'), url: `${SOS_BASE}skadligt-bruk-och-beroende/` },
};
// The depression and anxiety guideline: its recommendations on psychological
// treatment for adults also apply when the treatment is delivered via the internet.
const INTERNET = S('Socialstyrelsen’s recommendations on psychological treatment for adults also apply when it is delivered via the internet.', 'Socialstyrelsens rekommendationer om psykologisk behandling för vuxna gäller även när behandlingen förmedlas via internet.');
const BENZODIAZEPINES = (id) => G('dont', id, 'limited', 'Benzodiazepines', 'Bensodiazepiner');

// Treatments used for several disorders.
const STOP_SUBSTANCE = T('strong', 'Stop or reduce the substance or medicine, with support and safe withdrawal management', 'Avsluta eller minska substansen eller läkemedlet, med stöd och säker abstinensbehandling');
const TREAT_SUD = T('moderate', 'Treat a substance use disorder: motivational interviewing, CBT, relapse-prevention medicines where indicated', 'Behandla ett substansbrukssyndrom: motiverande samtal, KBT, återfallsförebyggande läkemedel vid behov', 'See Socialstyrelsen’s guideline for substance use and dependence.', 'Se Socialstyrelsens riktlinjer för missbruk och beroende.');
const REASSESS_AFTER_STOP = T('moderate', 'If symptoms persist about 1 month after stopping, treat as an independent disorder', 'Om symtomen kvarstår ungefär 1 månad efter att bruket upphört, behandla som ett självständigt syndrom');
const TREAT_CAUSE = T('strong', 'Treat the underlying medical condition, together with the physician responsible', 'Behandla den bakomliggande kroppsliga sjukdomen, tillsammans med ansvarig läkare');
const MEDICINE_REVIEW = T('moderate', 'Review medicines that can cause or worsen the symptoms', 'Gå igenom läkemedel som kan orsaka eller förvärra symtomen');

// Schizophrenia and schizophrenia-like conditions (Socialstyrelsen 2018).
const PSY = {
  firstEpisode: G(1, '46', 'strong', 'First episode of psychosis: coordinated care with antipsychotic medicine, family intervention and psychological support for recovery', 'Förstagångsinsjuknande i psykos: samordnade insatser med antipsykotisk läkemedelsbehandling, familjeintervention och psykologiskt stöd för återhämtning'),
  antipsychotic: G(2, '1, 2', 'strong', 'Antipsychotic medicine: aripiprazole or risperidone first', 'Antipsykotiskt läkemedel: i första hand aripiprazol eller risperidon', { note: S('Other oral antipsychotics: paliperidone priority 3, olanzapine 4, haloperidol 7, quetiapine 8, ziprasidone and zuclopenthixol 9.', 'Andra perorala antipsykotiska läkemedel: paliperidon prioritet 3, olanzapin 4, haloperidol 7, quetiapin 8, ziprasidon och zuklopentixol 9.') }),
  clozapine: G(1, '9', 'strong', 'Treatment-resistant schizophrenia: clozapine', 'Svårbehandlad schizofreni: klozapin', { note: S('Also priority 2 when suicide risk is suspected (id 10).', 'Även prioritet 2 vid misstänkt ökad suicidrisk (id 10).') }),
  depot: G(1, '11', 'strong', 'Repeated relapse or interrupted treatment: long-acting injectable (depot) antipsychotic', 'Upprepat återinsjuknande eller behandlingsavbrott: antipsykotiskt läkemedel i depåform'),
  caseManagement: G(1, '21', 'strong', 'Case management', 'Case management', { note: S('Intensive case management (ACT) when there is also substance use: priority 1 (id 37).', 'Intensiv case management enligt ACT-modellen vid samtidigt missbruk eller beroende: prioritet 1 (id 37).') }),
  ips: G(1, '28', 'strong', 'Supported employment (Individual Placement and Support, IPS)', 'Individanpassat stöd till arbete (IPS)'),
  programmes: G(1, '64', 'strong', 'Difficulties with everyday activities or social interaction: psychoeducational treatment programmes', 'Svårigheter med vardagliga aktiviteter eller socialt samspel: psykopedagogiska behandlingsprogram'),
  metabolic: G(1, '43', 'strong', 'Regular checks of metabolic risk factors (blood tests and physical examination)', 'Regelbundna kontroller av metabola riskfaktorer med blodprov och fysisk undersökning'),
  suicide: G(1, '69', 'strong', 'Suspected increased suicide risk: structured assessment of suicide risk', 'Misstänkt ökad suicidrisk: strukturerad bedömning av självmordsrisk'),
  family: G(2, '50', 'strong', 'Psychoeducation for relatives (family psychoeducation)', 'Psykoedukation till närstående (familjepsykoedukation)'),
  education: G(2, '48', 'moderate', 'Psychoeducation, with or without relatives', 'Psykopedagogisk utbildning med eller utan anhöriga'),
  cbt: G(2, '55', 'strong', 'Persisting psychotic symptoms: CBT', 'Kvarstående psykossymtom: kognitiv beteendeterapi (KBT)'),
  integrated: G(2, '63', 'moderate', 'Persisting symptoms with cognitive and social difficulties: integrated psychological therapy', 'Kvarstående psykossymtom, kognitiva funktionsnedsättningar och nedsatta sociala färdigheter: integrerad psykologisk terapi'),
  shared: G(2, '25', 'moderate', 'Shared decision-making', 'Delat beslutsfattande'),
  cognitiveTraining: G(3, '62', 'moderate', 'Cognitive difficulties: computer-based cognitive training', 'Kognitiva funktionsnedsättningar: datorbaserad kognitiv träning'),
  groupCbt: G('fou', '56', 'limited', 'Persisting psychotic symptoms: CBT in groups', 'Kvarstående psykossymtom: kognitiv beteendeterapi i grupp'),
  psychodynamic: G('fou', '57', 'limited', 'Persisting psychotic symptoms: psychodynamic psychotherapy', 'Kvarstående psykossymtom: psykodynamisk psykoterapi'),
};
const SZ_LIKE = S('Socialstyrelsen’s recommendations are written for schizophrenia and schizophrenia-like conditions as a group (including schizoaffective, delusional and brief psychotic disorders).', 'Socialstyrelsens rekommendationer gäller schizofreni och schizofreniliknande tillstånd som grupp (bland annat schizoaffektivt syndrom, vanföreställningssyndrom och kortvariga psykotiska syndrom).');

// Eating disorders (Socialstyrelsen 2024): recommendations for all eating disorders.
const ED_OTHER_DISORDER = G(2, 'O9', 'consensus', 'If treatment does not help enough and there are signs of another psychiatric disorder: assess it systematically alongside the eating-disorder treatment', 'Om behandlingen inte haft tillräcklig effekt och det finns tecken på annan psykiatrisk sjukdom: utred den systematiskt parallellt med ätstörningsbehandlingen');
const ED_BOOSTER = G(3, 'O15', 'moderate', 'Setback after improvement or recovery: booster sessions (a few extra sessions)', 'Bakslag efter förbättring eller tillfrisknande: boostersessioner (ett fåtal kompletterande samtal)');
const ED_EMOTION = G(4, 'O13', 'moderate', 'If treatment does not help enough and there are problems with emotion regulation: treatment targeting emotion regulation', 'Om behandlingen inte haft tillräcklig effekt och det finns problem med känsloreglering: behandling inriktad mot känsloregleringen');
const ED_ACT = G(7, 'O12', 'limited', 'Remaining severe body dissatisfaction after treatment: add acceptance and commitment therapy (ACT)', 'Kvarstående svårt kroppsmissnöje efter behandling: komplettera med acceptance and commitment therapy (ACT)');

export const KNOWLEDGE = {
  // ----- Mood -----
  mdd: {
    summary: S('Depressed mood or loss of interest for at least 2 weeks, with at least 5 symptoms in total, causing distress or impairment.', 'Nedstämdhet eller minskat intresse i minst 2 veckor, med minst 5 symtom sammanlagt, som ger lidande eller funktionsnedsättning.'),
    treatments: [
      G(1, '80', 'strong', 'Severe depression: antidepressant medicine', 'Svår depression: antidepressiva läkemedel'),
      G(1, '85', 'strong', 'Severe depression: electroconvulsive therapy (ECT)', 'Svår depression: elektrokonvulsiv behandling (ECT)', { note: S('Especially with psychotic symptoms, high suicide risk or when a rapid effect is needed.', 'Särskilt vid psykotiska symtom, hög suicidrisk eller när snabb effekt behövs.') }),
      G(1, '88', 'strong', 'Recurrent depression in remission: relapse prevention with antidepressant medicine', 'Recidiverande depression i remission: återfallsförebyggande behandling med antidepressiva läkemedel'),
      G(2, '68', 'strong', 'Mild to moderate depression: cognitive behavioural therapy (CBT)', 'Lindrig till medelsvår depression: kognitiv beteendeterapi (KBT)', { note: S('16–17-year-olds: CBT has priority 2 (id 19).', '16–17 år: KBT har prioritet 2 (id 19).') }),
      G(2, '81', 'strong', 'Severe, treatment-resistant depression: lithium added to an antidepressant', 'Svår, behandlingsresistent depression: litium som tillägg till antidepressiva läkemedel'),
      G(3, '69', 'strong', 'Mild to moderate depression: interpersonal psychotherapy (IPT)', 'Lindrig till medelsvår depression: interpersonell psykoterapi (IPT)'),
      G(3, '73', 'strong', 'Mild to moderate depression: antidepressant medicine', 'Lindrig till medelsvår depression: antidepressiva läkemedel'),
      G(3, '78', 'moderate', 'Moderate to severe depression: repetitive transcranial magnetic stimulation (rTMS)', 'Medelsvår till svår depression: repetitiv transkraniell magnetstimulering (rTMS)'),
      G(3, '86', 'strong', 'Recurrent depression in remission: relapse prevention with CBT or mindfulness-based cognitive therapy (MBCT)', 'Recidiverande depression i remission: återfallsförebyggande behandling med KBT eller mindfulnessbaserad kognitiv terapi (MBKT)'),
      G(6, '62', 'moderate', 'Mild to moderate depression: physical activity', 'Lindrig till medelsvår depression: fysisk aktivitet'),
      G(7, '70', 'moderate', 'Mild to moderate depression: short-term psychodynamic therapy', 'Lindrig till medelsvår depression: psykodynamisk korttidsterapi'),
      G(7, '76', 'moderate', 'Mild to moderate depression: antidepressant combined with CBT, IPT or short-term psychodynamic therapy', 'Lindrig till medelsvår depression: antidepressiva läkemedel kombinerat med KBT, IPT eller psykodynamisk korttidsterapi', { differs: S('NICE (NG222) recommends combining medicine and psychological therapy as a first-line option in more severe depression; Socialstyrelsen gives the combination priority 7 here and priority 10 in severe depression (id 84).', 'NICE (NG222) rekommenderar kombinationen läkemedel och psykologisk behandling som förstahandsval vid svårare depression; Socialstyrelsen ger kombinationen prioritet 7 här och prioritet 10 vid svår depression (id 84).') }),
      G(7, '82', 'moderate', 'Severe, treatment-resistant depression: an antipsychotic (aripiprazole, olanzapine, quetiapine or risperidone) added to an antidepressant', 'Svår, behandlingsresistent depression: antipsykotiskt läkemedel (aripiprazol, olanzapin, quetiapin eller risperidon) som tillägg till antidepressiva läkemedel'),
      G(10, '79', 'limited', 'Moderate to severe, treatment-resistant depression: esketamine added to an antidepressant', 'Medelsvår till svår, behandlingsresistent depression: esketamin som tillägg till antidepressiva läkemedel'),
      G('fou', '64', 'limited', 'Mild to moderate depression: mindfulness-based cognitive therapy (MBCT) as treatment of the episode', 'Lindrig till medelsvår depression: mindfulnessbaserad kognitiv terapi (MBKT) som behandling av episoden'),
      G('dont', '77a, 77b', 'limited', 'Light therapy with white morning light (also in seasonal depression)', 'Ljusterapi med vitt morgonljus (även vid årstidsbunden depression)'),
    ],
    sources: [SOS.dep, 'NICE NG222 (2022)'],
    note: INTERNET,
  },
  pdd: {
    summary: S('Depressed mood on most days for at least 2 years.', 'Nedstämdhet de flesta dagar i minst 2 år.'),
    treatments: [
      G(3, '65', 'moderate', 'Antidepressant medicine', 'Antidepressiva läkemedel'),
      G(10, '67', 'limited', 'Antidepressant combined with CBT or IPT', 'Antidepressiva läkemedel kombinerat med KBT eller IPT', { differs: S('NICE (NG222) and international guidelines recommend combining medicine and psychotherapy in persistent depression; Socialstyrelsen gives the combination priority 10.', 'NICE (NG222) och internationella riktlinjer rekommenderar kombinationen läkemedel och psykoterapi vid långvarig depression; Socialstyrelsen ger kombinationen prioritet 10.') }),
      T('moderate', 'Psychotherapy alone (CBASP, CBT or IPT)', 'Enbart psykoterapi (CBASP, KBT eller IPT)', 'Not a separate recommendation in Socialstyrelsen’s guideline.', 'Inte en egen rekommendation i Socialstyrelsens riktlinjer.'),
    ],
    sources: [SOS.dep, 'NICE NG222 (2022)'],
    note: INTERNET,
  },
  pmdd: {
    summary: S('Mood symptoms in the week before menstruation that ease within a few days after it starts.', 'Humörsymtom veckan före mens som lättar inom några dagar efter att den börjat.'),
    treatments: [
      T('strong', 'SSRI, taken continuously or only in the second half of the cycle', 'SSRI, kontinuerligt eller bara under cykelns andra halva'),
      T('moderate', 'Combined oral contraceptive containing drospirenone', 'Kombinerat p-piller med drospirenon'),
      T('limited', 'CBT', 'KBT'),
      T('consensus', 'In severe cases that do not respond: hormonal treatment that suppresses ovulation (specialist gynaecology)', 'Vid svåra fall utan effekt: hormonbehandling som hämmar ägglossningen (specialist i gynekologi)'),
    ],
    sources: ['RCOG Green-top Guideline 48 (2016)'],
  },
  dmdd: {
    summary: S('Chronic irritability and severe temper outbursts starting before age 10 (diagnosed only before age 18).', 'Kronisk irritabilitet och svåra vredesutbrott med debut före 10 års ålder (diagnostiseras bara före 18 års ålder).'),
    treatments: [
      T('moderate', 'Parent training and CBT aimed at irritability and anger', 'Föräldraträning och KBT riktad mot irritabilitet och ilska'),
      T('limited', 'Stimulant medicine if ADHD is also present', 'Centralstimulerande läkemedel om ADHD också finns'),
      T('limited', 'In severe cases: SSRI or an antipsychotic, prescribed by a specialist', 'Vid svåra fall: SSRI eller ett antipsykotiskt läkemedel, förskrivet av specialist'),
    ],
    sources: [],
  },
  bipolar1: {
    summary: S('At least one manic episode; depressive episodes are common.', 'Minst en manisk episod; depressiva episoder är vanliga.'),
    treatments: [
      T('strong', 'Acute mania: an antipsychotic (e.g. olanzapine, quetiapine, risperidone, haloperidol) or lithium', 'Akut mani: ett antipsykotiskt läkemedel (t.ex. olanzapin, quetiapin, risperidon, haloperidol) eller litium', 'Stop antidepressants during mania.', 'Sätt ut antidepressiva läkemedel under mani.'),
      T('strong', 'Long-term prevention: lithium first', 'Långsiktigt skydd: i första hand litium', 'Valproate must not be given to women who can become pregnant.', 'Valproat får inte ges till kvinnor som kan bli gravida.'),
      T('moderate', 'Bipolar depression: quetiapine, lurasidone, olanzapine (with fluoxetine) or lamotrigine; avoid an antidepressant without a mood stabiliser', 'Bipolär depression: quetiapin, lurasidon, olanzapin (med fluoxetin) eller lamotrigin; undvik antidepressiva utan stämningsstabiliserare'),
      T('moderate', 'Psychoeducation, family-focused therapy or CBT, added to medicine', 'Psykopedagogik, familjefokuserad terapi eller KBT, som tillägg till läkemedel'),
    ],
    sources: ['NICE CG185 (2014)'],
  },
  bipolar2: {
    summary: S('Hypomanic and major depressive episodes, never a manic episode.', 'Hypomana och egentliga depressiva episoder, aldrig en manisk episod.'),
    treatments: [
      T('moderate', 'Depressive episodes: quetiapine or lurasidone; lamotrigine to prevent new depressions', 'Depressiva episoder: quetiapin eller lurasidon; lamotrigin för att förebygga nya depressioner'),
      T('strong', 'Long-term prevention: lithium', 'Långsiktigt skydd: litium'),
      T('moderate', 'Psychoeducation and regular daily rhythm (e.g. interpersonal and social rhythm therapy)', 'Psykopedagogik och regelbunden dygnsrytm (t.ex. interpersonell och social rytmterapi)'),
      T('consensus', 'Avoid antidepressants without a mood stabiliser', 'Undvik antidepressiva läkemedel utan stämningsstabiliserare'),
    ],
    sources: ['NICE CG185 (2014)'],
  },
  cyclothymic: {
    summary: S('At least 2 years of many hypomanic and depressive symptoms that never meet full episode criteria.', 'Minst 2 år med många hypomana och depressiva symtom som aldrig uppfyller kriterierna för en hel episod.'),
    treatments: [
      T('limited', 'Psychoeducation, mood diary and regular daily rhythm', 'Psykopedagogik, stämningsdagbok och regelbunden dygnsrytm'),
      T('limited', 'CBT', 'KBT'),
      T('consensus', 'Mood stabiliser (e.g. lithium or lamotrigine) if the symptoms cause marked problems', 'Stämningsstabiliserare (t.ex. litium eller lamotrigin) om symtomen ger tydliga problem'),
    ],
    sources: [],
  },
  substance_mood: {
    summary: S('Depressive or manic symptoms caused by a substance or medicine.', 'Depressiva eller maniska symtom orsakade av en substans eller ett läkemedel.'),
    treatments: [STOP_SUBSTANCE, TREAT_SUD, REASSESS_AFTER_STOP],
    sources: [SOS.sud],
  },
  medical_mood: {
    summary: S('Depressive or manic symptoms that are a direct result of another medical condition.', 'Depressiva eller maniska symtom som är en direkt följd av annan kroppslig sjukdom.'),
    treatments: [
      TREAT_CAUSE,
      T('moderate', 'Treat the depression as usual (psychological treatment, antidepressant), checking interactions with other medicines', 'Behandla depressionen som vanligt (psykologisk behandling, antidepressivt läkemedel) med kontroll av interaktioner med andra läkemedel'),
      MEDICINE_REVIEW,
    ],
    sources: ['NICE CG91 (2009)'],
  },

  // ----- Anxiety -----
  separation: {
    summary: S('Excessive fear of being separated from attachment figures.', 'Överdriven rädsla för att skiljas från anknytningspersoner.'),
    treatments: [
      G(2, '37', 'strong', 'Sertraline combined with CBT', 'Sertralin och KBT som kombinationsbehandling'),
      G(3, '34', 'strong', 'CBT with gradual exposure to separation', 'KBT med gradvis exponering för separation'),
      G(3, '36', 'moderate', 'An SSRI or SNRI', 'SSRI- eller SNRI-preparat'),
    ],
    sources: [SOS.dep],
    note: S('Socialstyrelsen’s priorities for separation anxiety apply to children and adolescents (in this app, 16–17-year-olds); there is no recommendation for adults.', 'Socialstyrelsens prioriteringar vid separationsångest gäller barn och ungdomar (i den här appen 16–17-åringar); det finns ingen rekommendation för vuxna.'),
  },
  mutism: {
    summary: S('Consistent failure to speak in certain social situations despite speaking in others.', 'Talar genomgående inte i vissa sociala situationer trots att personen talar i andra.'),
    treatments: [
      T('moderate', 'Behavioural therapy with gradual exposure to speaking, at school or work', 'Beteendeterapi med gradvis exponering för att tala, i skolan eller på arbetet'),
      T('limited', 'SSRI (e.g. fluoxetine) in severe or long-standing cases', 'SSRI (t.ex. fluoxetin) vid svåra eller långvariga fall'),
    ],
    sources: [],
  },
  phobia: {
    summary: S('Marked fear and avoidance of a specific object or situation.', 'Påtaglig rädsla för och undvikande av ett visst föremål eller en viss situation.'),
    treatments: [
      G(5, '121', 'strong', 'CBT with exposure (often few sessions, sometimes a single long session)', 'KBT med exponering (ofta få sessioner, ibland en enda lång session)', { note: S('16–17-year-olds: priority 3 (id 38).', '16–17 år: prioritet 3 (id 38).') }),
      T('moderate', 'Applied tension for blood-injection-injury phobia (fainting)', 'Tillämpad spänning vid blod-, injektions- och skadefobi (svimning)', 'Not a separate recommendation in Socialstyrelsen’s guideline.', 'Inte en egen rekommendation i Socialstyrelsens riktlinjer.'),
      T('consensus', 'Medicines are not a first choice', 'Läkemedel är inte förstahandsval'),
    ],
    sources: [SOS.dep],
    note: INTERNET,
  },
  social: {
    summary: S('Marked fear of social situations where one may be judged by others.', 'Påtaglig rädsla för sociala situationer där man kan bli bedömd av andra.'),
    treatments: [
      G(3, '114', 'strong', 'CBT for social anxiety (individual or guided via the internet)', 'KBT vid social ångest (individuell eller guidad via internet)', { note: S('16–17-year-olds: CBT priority 3, SSRI or SNRI priority 3, sertraline combined with CBT priority 2 (id 34, 36, 37).', '16–17 år: KBT prioritet 3, SSRI- eller SNRI-preparat prioritet 3, sertralin och KBT som kombinationsbehandling prioritet 2 (id 34, 36, 37).') }),
      G(5, '118', 'moderate', 'Antidepressant medicine (an SSRI, e.g. escitalopram or sertraline)', 'Antidepressiva läkemedel (SSRI, t.ex. escitalopram eller sertralin)'),
      G(10, '116', 'limited', 'Short-term psychodynamic therapy focused on social anxiety', 'Psykodynamisk korttidsterapi med fokus på social fobi'),
      G(10, '119', 'limited', 'Antidepressant combined with CBT', 'Antidepressiva läkemedel och KBT som kombinationsbehandling'),
      G('fou', '117', 'limited', 'Interpersonal psychotherapy (IPT)', 'Interpersonell psykoterapi (IPT)'),
      G('fou', '113', 'limited', 'Mindfulness-based stress reduction (MBSR) or mindfulness-based cognitive therapy (MBCT)', 'Mindfulnessbaserad stressreduktion (MBSR) eller mindfulnessbaserad kognitiv terapi (MBKT)'),
      BENZODIAZEPINES('120'),
    ],
    sources: [SOS.dep, 'NICE CG159 (2013)'],
    note: INTERNET,
  },
  panic: {
    summary: S('Recurrent unexpected panic attacks with worry about new attacks or avoidance.', 'Återkommande oväntade panikattacker med oro för nya attacker eller undvikande.'),
    treatments: [
      G(3, '105', 'strong', 'CBT for panic disorder (individual or guided via the internet)', 'KBT vid paniksyndrom (individuell eller guidad via internet)'),
      G(5, '108', 'moderate', 'Antidepressant medicine (an SSRI)', 'Antidepressiva läkemedel (SSRI)'),
      G(9, '110', 'limited', 'Antidepressant combined with CBT', 'Antidepressiva läkemedel och KBT som kombinationsbehandling'),
      G(10, '107', 'limited', 'Panic-focused psychodynamic psychotherapy (PFPP)', 'Panikfokuserad psykodynamisk korttidsterapi (PFPP)'),
      BENZODIAZEPINES('109'),
    ],
    sources: [SOS.dep, 'NICE CG113 (2011)'],
    note: INTERNET,
  },
  agoraphobia: {
    summary: S('Fear and avoidance of situations where escape could be difficult, such as public transport or crowds.', 'Rädsla för och undvikande av situationer där det kan vara svårt att ta sig därifrån, som kollektivtrafik eller folkmassor.'),
    treatments: [
      G(3, '105', 'strong', 'CBT with gradual exposure (individual or guided via the internet)', 'KBT med gradvis exponering (individuell eller guidad via internet)'),
      G(5, '108', 'moderate', 'Antidepressant medicine (an SSRI)', 'Antidepressiva läkemedel (SSRI)'),
      BENZODIAZEPINES('109'),
    ],
    sources: [SOS.dep, 'NICE CG113 (2011)'],
    note: S('Socialstyrelsen’s recommendations for panic disorder, which describe agoraphobic avoidance as part of it. Its recommendations on psychological treatment for adults also apply via the internet.', 'Socialstyrelsens rekommendationer för paniksyndrom, där agorafobiskt undvikande beskrivs som en del. Rekommendationerna om psykologisk behandling för vuxna gäller även via internet.'),
  },
  gad: {
    summary: S('Excessive, hard-to-control worry about many things for at least 6 months, with physical tension.', 'Överdriven, svårkontrollerad oro för många saker i minst 6 månader, med kroppslig spänning.'),
    treatments: [
      G(3, '98', 'strong', 'Antidepressant medicine (an SSRI, e.g. sertraline, or an SNRI)', 'Antidepressiva läkemedel (SSRI, t.ex. sertralin, eller SNRI)'),
      G(5, '95', 'strong', 'CBT for generalized anxiety disorder (individual or guided via the internet)', 'KBT vid generaliserat ångestsyndrom (individuell eller guidad via internet)', { differs: S('NICE (CG113) puts psychological treatment (guided self-help, then CBT or applied relaxation) before medicine; Socialstyrelsen gives antidepressants priority 3 and CBT priority 5.', 'NICE (CG113) sätter psykologisk behandling (guidad självhjälp, sedan KBT eller tillämpad avslappning) före läkemedel; Socialstyrelsen ger antidepressiva läkemedel prioritet 3 och KBT prioritet 5.') }),
      G(9, '100', 'limited', 'Hydroxyzine', 'Hydroxizin'),
      G(10, '101', 'limited', 'Pregabalin', 'Pregabalin'),
      T('moderate', 'Applied relaxation', 'Tillämpad avslappning', 'Recommended by NICE; not among Socialstyrelsen’s recommendations.', 'Rekommenderas av NICE; finns inte bland Socialstyrelsens rekommendationer.'),
      G('fou', '97', 'limited', 'Short-term psychodynamic therapy', 'Psykodynamisk korttidsterapi'),
      G('fou', '94', 'limited', 'Mindfulness-based stress reduction (MBSR) or mindfulness-based cognitive therapy (MBCT)', 'Mindfulnessbaserad stressreduktion (MBSR) eller mindfulnessbaserad kognitiv terapi (MBKT)'),
      BENZODIAZEPINES('99'),
    ],
    sources: [SOS.dep, 'NICE CG113 (2011)'],
    note: INTERNET,
  },
  substance_anxiety: {
    summary: S('Anxiety or panic caused by a substance or medicine, or by withdrawal.', 'Ångest eller panik orsakad av en substans eller ett läkemedel, eller av abstinens.'),
    treatments: [STOP_SUBSTANCE, TREAT_SUD, REASSESS_AFTER_STOP],
    sources: [SOS.sud],
  },
  medical_anxiety: {
    summary: S('Anxiety that is a direct result of another medical condition (e.g. hyperthyroidism).', 'Ångest som är en direkt följd av annan kroppslig sjukdom (t.ex. överfunktion i sköldkörteln).'),
    treatments: [TREAT_CAUSE, MEDICINE_REVIEW, T('moderate', 'Treat remaining anxiety as usual (CBT, SSRI)', 'Behandla kvarvarande ångest som vanligt (KBT, SSRI)')],
    sources: [],
  },
  // ----- Personality -----
  ppd: {
    summary: S('Pervasive distrust and suspiciousness of others since early adulthood.', 'Genomgående misstro och misstänksamhet mot andra sedan tidig vuxen ålder.'),
    treatments: [
      T('limited', 'Psychotherapy focused on building trust (e.g. CBT or schema therapy), with a stable treatment relationship', 'Psykoterapi med fokus på att bygga tillit (t.ex. KBT eller schematerapi), med en stabil behandlingsrelation'),
      T('consensus', 'Low-dose antipsychotic for short periods of marked paranoid ideas', 'Antipsykotiskt läkemedel i låg dos under kortare perioder med tydliga paranoida idéer'),
    ],
    sources: [],
  },
  szpd: {
    summary: S('Detachment from social relationships and restricted emotional expression since early adulthood.', 'Distans till sociala relationer och begränsat känslouttryck sedan tidig vuxen ålder.'),
    treatments: [
      T('consensus', 'Supportive psychotherapy and social skills training if the person wants it', 'Stödjande psykoterapi och social färdighetsträning om personen önskar det'),
      T('consensus', 'Treat co-occurring depression or anxiety', 'Behandla samtidig depression eller ångest'),
    ],
    sources: [],
  },
  stpd: {
    summary: S('Odd beliefs and perceptions, eccentric behaviour and discomfort in close relationships.', 'Udda föreställningar och upplevelser, excentriskt beteende och obehag i nära relationer.'),
    treatments: [
      T('limited', 'CBT and social skills training', 'KBT och social färdighetsträning'),
      T('limited', 'Low-dose antipsychotic for perceptual disturbances and suspiciousness', 'Antipsykotiskt läkemedel i låg dos vid perceptionsstörningar och misstänksamhet'),
      T('consensus', 'Follow up for signs of developing psychosis', 'Följ upp tecken på att en psykos utvecklas'),
    ],
    sources: [],
  },
  aspd: {
    summary: S('A pattern of disregard for and violation of the rights of others since age 15 (diagnosed from age 18).', 'Ett mönster av likgiltighet för och kränkning av andras rättigheter sedan 15 års ålder (diagnostiseras från 18 års ålder).'),
    treatments: [
      T('moderate', 'Group-based cognitive and behavioural programmes to reduce offending', 'Gruppbaserade kognitiva och beteendeinriktade program för att minska brottslighet'),
      T('moderate', 'Treat co-occurring substance use, depression and anxiety', 'Behandla samtidigt substansbruk, depression och ångest'),
      T('consensus', 'Medicines are not used for the personality disorder itself', 'Läkemedel används inte mot själva personlighetsstörningen'),
    ],
    sources: ['NICE CG77 (2009)'],
  },
  bpd: {
    summary: S('A pattern of unstable relationships, self-image and emotions, with marked impulsivity, since early adulthood.', 'Ett mönster av instabila relationer, självbild och känslor, med påtaglig impulsivitet, sedan tidig vuxen ålder.'),
    treatments: [
      T('strong', 'Structured psychotherapy: dialectical behaviour therapy (DBT) or mentalisation-based treatment (MBT)', 'Strukturerad psykoterapi: dialektisk beteendeterapi (DBT) eller mentaliseringsbaserad terapi (MBT)', 'DBT has the most evidence for reducing self-harm.', 'DBT har mest stöd för att minska självskadebeteende.'),
      T('moderate', 'Schema therapy or transference-focused psychotherapy', 'Schematerapi eller överföringsfokuserad psykoterapi'),
      T('consensus', 'A written crisis plan agreed with the patient', 'En skriftlig krisplan som gjorts tillsammans med patienten'),
      T('limited', 'Medicines are not recommended for the core symptoms; use only short term in a crisis or for co-occurring disorders', 'Läkemedel rekommenderas inte mot kärnsymtomen; använd bara kortvarigt i kris eller vid samtidiga syndrom'),
    ],
    sources: ['NICE CG78 (2009)'],
  },
  hpd: {
    summary: S('A pattern of excessive emotionality and attention seeking.', 'Ett mönster av överdriven emotionalitet och uppmärksamhetssökande.'),
    treatments: [T('consensus', 'Psychotherapy (e.g. psychodynamic or schema therapy)', 'Psykoterapi (t.ex. psykodynamisk terapi eller schematerapi)'), T('consensus', 'Treat co-occurring depression or anxiety', 'Behandla samtidig depression eller ångest')],
    sources: [],
  },
  npd: {
    summary: S('A pattern of grandiosity, need for admiration and lack of empathy.', 'Ett mönster av grandiositet, behov av beundran och bristande empati.'),
    treatments: [T('consensus', 'Psychotherapy (e.g. schema therapy, transference-focused or mentalisation-based therapy)', 'Psykoterapi (t.ex. schematerapi, överföringsfokuserad eller mentaliseringsbaserad terapi)'), T('consensus', 'Treat co-occurring depression and substance use', 'Behandla samtidig depression och substansbruk')],
    sources: [],
  },
  avpd: {
    summary: S('A pattern of social inhibition, feelings of inadequacy and sensitivity to criticism.', 'Ett mönster av social hämning, känslor av otillräcklighet och känslighet för kritik.'),
    treatments: [
      T('moderate', 'CBT, individually or in a group (as for social anxiety)', 'KBT, individuellt eller i grupp (som vid social ångest)'),
      T('limited', 'Schema therapy', 'Schematerapi'),
      T('limited', 'SSRI if social anxiety is also present', 'SSRI om även social ångest finns'),
    ],
    sources: [],
  },
  dpd: {
    summary: S('An excessive need to be taken care of, with submissive and clinging behaviour.', 'Ett överdrivet behov av att bli omhändertagen, med undergivet och klängigt beteende.'),
    treatments: [T('limited', 'CBT with assertiveness training, or psychodynamic therapy', 'KBT med träning i självhävdelse, eller psykodynamisk terapi'), T('consensus', 'Treat co-occurring depression or anxiety', 'Behandla samtidig depression eller ångest')],
    sources: [],
  },
  ocpd: {
    summary: S('A pattern of preoccupation with order, perfectionism and control.', 'Ett mönster av upptagenhet av ordning, perfektionism och kontroll.'),
    treatments: [T('limited', 'CBT or schema therapy', 'KBT eller schematerapi'), T('consensus', 'Treat co-occurring OCD, depression or anxiety', 'Behandla samtidigt tvångssyndrom, depression eller ångest')],
    sources: [],
  },

  // ----- Neurocognitive -----
  delirium: {
    summary: S('An acute, fluctuating disturbance of attention and awareness caused by a medical condition, substance or withdrawal: a medical emergency.', 'En akut, fluktuerande störning av uppmärksamhet och medvetenhet orsakad av kroppslig sjukdom, substans eller abstinens: ett akut medicinskt tillstånd.'),
    treatments: [
      T('strong', 'Find and treat the cause(s): infection, medicines, dehydration, pain, urinary retention, constipation, withdrawal', 'Hitta och behandla orsaken (orsakerna): infektion, läkemedel, uttorkning, smärta, urinstämma, förstoppning, abstinens'),
      T('strong', 'Non-drug care: orientation, glasses and hearing aids, sleep, fluids, mobilisation, familiar people', 'Omvårdnad utan läkemedel: orientering, glasögon och hörapparat, sömn, vätska, mobilisering, välkända personer'),
      T('moderate', 'Short-term low-dose antipsychotic (e.g. haloperidol) only if the person is distressed or a danger and other measures have failed', 'Kortvarigt antipsykotiskt läkemedel i låg dos (t.ex. haloperidol) bara om personen lider svårt eller är en fara och andra åtgärder inte räckt', 'Avoid benzodiazepines except in alcohol withdrawal; avoid antipsychotics in Parkinson’s and Lewy body disease.', 'Undvik bensodiazepiner utom vid alkoholabstinens; undvik antipsykotika vid Parkinsons sjukdom och Lewykroppssjukdom.'),
    ],
    sources: ['NICE CG103 (2010, updated 2023)'],
  },
  major_ncd: {
    summary: S('Significant cognitive decline that affects independence in everyday life (dementia).', 'Betydande kognitiv försämring som påverkar självständigheten i vardagen (demens).'),
    treatments: [
      T('strong', 'Medical work-up and treatment of reversible causes (e.g. B12 deficiency, hypothyroidism, medicines)', 'Medicinsk utredning och behandling av behandlingsbara orsaker (t.ex. B12-brist, underfunktion i sköldkörteln, läkemedel)'),
      G(1, '56A', 'strong', 'Alzheimer’s disease, mild to moderate: a cholinesterase inhibitor (donepezil, galantamine, rivastigmine)', 'Alzheimers sjukdom, mild till måttlig: kolinesterashämmare (donepezil, galantamin, rivastigmin)'),
      G(1, '31', 'strong', 'Behavioural and psychological symptoms (BPSD): structured follow-up and evaluation of the measures taken', 'Beteendemässiga och psykiska symtom (BPSD): strukturerad uppföljning och utvärdering av insatta åtgärder'),
      G(2, '59, 60', 'strong', 'Alzheimer’s disease, moderate to severe: memantine, alone or added to a cholinesterase inhibitor', 'Alzheimers sjukdom, måttlig till svår: memantin, ensamt eller som tillägg till kolinesterashämmare'),
      G(2, '91', 'moderate', 'Lewy body dementia: a cholinesterase inhibitor', 'Lewykroppsdemens: kolinesterashämmare'),
      G(2, '39', 'moderate', 'Individually adapted cognitive aids', 'Individuellt anpassade kognitiva hjälpmedel'),
      G(2, '85', 'strong', 'Relatives: education programme', 'Anhöriga: utbildningsprogram'),
      G(4, '32', 'moderate', 'Mild to moderate dementia: psychosocial support programmes in groups', 'Demenssjukdom, mild till måttlig: psykosociala stödprogram i grupp'),
      G(6, '90', 'limited', 'Cognitive stimulation', 'Kognitiv stimulering'),
      G(7, '78, 79', 'limited', 'Dementia with depression: an antidepressant (SSRI, or mirtazapine)', 'Demenssjukdom och samtidig depression: antidepressiva läkemedel (SSRI-preparat eller mirtazapin)'),
      T('moderate', 'Behavioural and psychological symptoms: non-drug measures first; antipsychotics only for severe risk, short term and never in Lewy body dementia', 'Beteendemässiga och psykiska symtom: åtgärder utan läkemedel först; antipsykotika bara vid allvarlig risk, kortvarigt och aldrig vid Lewykroppsdemens'),
      G(10, '50', 'limited', 'Mild to moderate dementia: cognitive training', 'Demenssjukdom, mild till måttlig: kognitiv träning'),
      G('dont', '68, 69', 'limited', 'Frontotemporal dementia: cholinesterase inhibitors or memantine', 'Frontotemporal demenssjukdom: kolinesterashämmare eller memantin'),
    ],
    sources: [SOS.dem, 'NICE NG97 (2018)'],
  },
  mild_ncd: {
    summary: S('Modest cognitive decline without loss of independence.', 'Måttlig kognitiv försämring utan förlorad självständighet.'),
    treatments: [
      T('moderate', 'Treat vascular risk factors (blood pressure, diabetes, smoking) and encourage physical activity', 'Behandla vaskulära riskfaktorer (blodtryck, diabetes, rökning) och uppmuntra fysisk aktivitet'),
      T('moderate', 'Follow up cognition, e.g. once a year', 'Följ upp kognitionen, t.ex. en gång om året'),
      G('dont', '55', 'limited', 'Cholinesterase inhibitors for mild cognitive impairment', 'Kolinesterashämmare vid lindrig kognitiv störning', { note: S('Exception: Alzheimer’s disease confirmed by biomarkers, priority 10 (id 57).', 'Undantag: Alzheimers sjukdom fastställd med biomarkörer, prioritet 10 (id 57).') }),
    ],
    sources: [SOS.dem, 'NICE NG97 (2018)'],
  },

  // ----- Psychotic -----
  delusional: {
    summary: S('One or more delusions for at least 1 month, without other marked psychotic symptoms.', 'En eller flera vanföreställningar i minst 1 månad, utan andra tydliga psykotiska symtom.'),
    treatments: [
      PSY.antipsychotic,
      PSY.suicide,
      G(2, '55', 'moderate', 'CBT, with a trusting treatment relationship', 'KBT, med en förtroendefull behandlingsrelation'),
      PSY.shared,
      PSY.family,
    ],
    sources: [SOS.sz],
    note: SZ_LIKE,
  },
  brief_psychotic: {
    summary: S('Psychotic symptoms lasting at least 1 day but less than 1 month, with full recovery.', 'Psykotiska symtom som varar minst 1 dag men mindre än 1 månad, med full återhämtning.'),
    treatments: [
      PSY.firstEpisode,
      PSY.suicide,
      T('moderate', 'Safety, a calm environment and close follow-up', 'Säkerhet, en lugn miljö och tät uppföljning'),
      T('moderate', 'Short-term antipsychotic medicine', 'Kortvarigt antipsykotiskt läkemedel'),
      T('consensus', 'Follow up for recurrence or development of schizophrenia', 'Följ upp återfall eller utveckling av schizofreni'),
    ],
    sources: [SOS.sz],
    note: SZ_LIKE,
  },
  schizophreniform: {
    summary: S('Schizophrenia-like symptoms lasting 1 to 6 months.', 'Schizofreniliknande symtom som varar 1–6 månader.'),
    treatments: [PSY.firstEpisode, PSY.metabolic, PSY.suicide, PSY.antipsychotic, PSY.family, PSY.cbt, PSY.shared, PSY.education],
    sources: [SOS.sz, 'NICE CG178 (2014)'],
    note: SZ_LIKE,
  },
  schizophrenia: {
    summary: S('Psychotic symptoms with continuous signs for at least 6 months and a decline in functioning.', 'Psykotiska symtom med fortlöpande tecken i minst 6 månader och försämrad funktion.'),
    treatments: [
      PSY.firstEpisode, PSY.clozapine, PSY.depot, PSY.caseManagement, PSY.ips, PSY.programmes, PSY.metabolic, PSY.suicide,
      PSY.antipsychotic, PSY.family, PSY.education, PSY.cbt, PSY.integrated, PSY.shared, PSY.cognitiveTraining, PSY.groupCbt, PSY.psychodynamic,
    ],
    sources: [SOS.sz, 'NICE CG178 (2014)'],
  },
  schizoaffective: {
    summary: S('Psychotic symptoms together with major mood episodes for most of the illness.', 'Psykotiska symtom tillsammans med förstämningsepisoder under större delen av sjukdomen.'),
    treatments: [
      PSY.depot, PSY.caseManagement, PSY.ips, PSY.metabolic, PSY.suicide, PSY.antipsychotic, PSY.family, PSY.cbt,
      T('moderate', 'Bipolar type: add a mood stabiliser (e.g. lithium); depressive type: consider an antidepressant', 'Bipolär typ: lägg till stämningsstabiliserare (t.ex. litium); depressiv typ: överväg antidepressivt läkemedel'),
    ],
    sources: [SOS.sz],
    note: SZ_LIKE,
  },
  substance_psychotic: {
    summary: S('Psychotic symptoms caused by a substance or medicine, or by withdrawal.', 'Psykotiska symtom orsakade av en substans eller ett läkemedel, eller av abstinens.'),
    treatments: [STOP_SUBSTANCE, T('moderate', 'Short-term antipsychotic if needed for safety', 'Kortvarigt antipsykotiskt läkemedel vid behov av säkerhetsskäl'), TREAT_SUD, REASSESS_AFTER_STOP],
    sources: [SOS.sud],
  },
  medical_psychotic: {
    summary: S('Psychotic symptoms that are a direct result of another medical condition.', 'Psykotiska symtom som är en direkt följd av annan kroppslig sjukdom.'),
    treatments: [TREAT_CAUSE, T('moderate', 'Short-term antipsychotic if the symptoms are distressing or dangerous', 'Kortvarigt antipsykotiskt läkemedel om symtomen är plågsamma eller farliga'), MEDICINE_REVIEW],
    sources: [],
  },
  catatonia: {
    summary: S('A syndrome of marked motor and behavioural signs (e.g. stupor, mutism, posturing); can be life-threatening.', 'Ett syndrom med påtagliga motoriska och beteendemässiga tecken (t.ex. stupor, mutism, posering); kan vara livshotande.'),
    treatments: [
      T('strong', 'Benzodiazepine (lorazepam), starting with a test dose', 'Bensodiazepin (lorazepam), med start med en testdos'),
      T('strong', 'ECT if benzodiazepines do not help, or at once in malignant catatonia', 'ECT om bensodiazepiner inte hjälper, eller direkt vid malign katatoni'),
      T('consensus', 'Supportive care: fluids, nutrition, prevention of blood clots; avoid antipsychotics until neuroleptic malignant syndrome is excluded', 'Omvårdnad: vätska, nutrition, förebyggande av blodpropp; undvik antipsykotika tills malignt neuroleptikasyndrom är uteslutet'),
      T('moderate', 'Treat the underlying psychiatric or medical condition', 'Behandla den bakomliggande psykiatriska eller kroppsliga sjukdomen'),
    ],
    sources: [],
  },
  // ----- Trauma and stressor-related -----
  rad: {
    summary: S('Emotionally withdrawn behaviour towards caregivers after severe neglect in early childhood.', 'Känslomässigt tillbakadraget beteende mot omvårdare efter svår försummelse i tidig barndom.'),
    treatments: [
      T('moderate', 'A stable, sensitive caregiver and attachment-based caregiver interventions', 'En stabil, lyhörd omvårdare och anknytningsbaserade insatser för omvårdaren'),
      T('consensus', 'Treat co-occurring problems (e.g. developmental delays, trauma symptoms)', 'Behandla samtidiga problem (t.ex. utvecklingsförsening, traumasymtom)'),
    ],
    sources: [],
  },
  dsed: {
    summary: S('Overly familiar behaviour with unfamiliar adults after insufficient care in early childhood.', 'Överdrivet familjärt beteende mot okända vuxna efter bristande omsorg i tidig barndom.'),
    treatments: [
      T('moderate', 'Stable caregiving and caregiver support', 'Stabil omsorg och stöd till omvårdaren'),
      T('consensus', 'Training in social boundaries and safety', 'Träning i sociala gränser och säkerhet'),
    ],
    sources: [],
  },
  ptsd: {
    summary: S('Re-experiencing, avoidance, negative changes in thinking and mood, and hyperarousal for more than 1 month after a trauma.', 'Återupplevande, undvikande, negativa förändringar i tankar och stämningsläge samt ökad vaksamhet i mer än 1 månad efter ett trauma.'),
    treatments: [
      G(3, '130', 'strong', 'Trauma-focused CBT with exposure', 'Traumafokuserad KBT med exponering', { note: S('16–17-year-olds: priority 2 (id 39).', '16–17 år: prioritet 2 (id 39).') }),
      G(5, '133', 'moderate', 'Antidepressant medicine (e.g. an SSRI)', 'Antidepressiva läkemedel (t.ex. SSRI)'),
      G(7, '129', 'moderate', 'EMDR', 'EMDR', { differs: S('NICE (NG116) recommends EMDR for adults as an alternative first-line treatment after non-combat trauma; Socialstyrelsen gives it priority 7.', 'NICE (NG116) rekommenderar EMDR för vuxna som ett alternativt förstahandsval efter trauma som inte är krigsrelaterat; Socialstyrelsen ger EMDR prioritet 7.') }),
      G(10, '134', 'limited', 'An SSRI combined with CBT', 'SSRI-preparat och KBT som kombinationsbehandling'),
      T('limited', 'Prazosin or an antipsychotic as an add-on in specialist care for severe symptoms', 'Prazosin eller ett antipsykotiskt läkemedel som tillägg i specialistvård vid svåra symtom', 'Not among Socialstyrelsen’s recommendations.', 'Finns inte bland Socialstyrelsens rekommendationer.'),
      G('fou', '132', 'limited', 'Short-term psychodynamic therapy', 'Psykodynamisk korttidsterapi'),
      G('fou', '135', 'limited', 'Interpersonal psychotherapy (IPT)', 'Interpersonell psykoterapi (IPT)'),
      G('dont', '128', 'limited', 'Preventive single-session debriefing after a traumatic event', 'Förebyggande krisbearbetning (debriefing) efter en traumatisk händelse'),
      BENZODIAZEPINES('137'),
    ],
    sources: [SOS.dep, 'NICE NG116 (2018)'],
    note: INTERNET,
  },
  acute_stress: {
    summary: S('Marked stress symptoms from 3 days to 1 month after a trauma.', 'Påtagliga stressymtom från 3 dagar till 1 månad efter ett trauma.'),
    treatments: [
      T('moderate', 'Trauma-focused CBT for those with marked symptoms in the first month', 'Traumafokuserad KBT för den som har påtagliga symtom under den första månaden'),
      T('moderate', 'Practical support, information and active monitoring', 'Praktiskt stöd, information och aktiv uppföljning'),
      G('dont', '128', 'limited', 'Single-session debriefing to prevent PTSD', 'Krisbearbetning (debriefing) för att förebygga PTSD'),
      BENZODIAZEPINES('137'),
    ],
    sources: [SOS.dep, 'NICE NG116 (2018)'],
  },
  adjustment: {
    summary: S('Emotional or behavioural symptoms within 3 months of a stressor, out of proportion or impairing.', 'Känslomässiga symtom eller beteendesymtom inom 3 månader efter en stressfaktor, oproportionerliga eller funktionsnedsättande.'),
    treatments: [
      T('moderate', 'Brief psychological treatment: problem-solving, stress management or CBT', 'Kort psykologisk behandling: problemlösning, stresshantering eller KBT'),
      T('consensus', 'Practical support with the stressor (e.g. work, finances, relationships)', 'Praktiskt stöd kring stressfaktorn (t.ex. arbete, ekonomi, relationer)'),
      T('consensus', 'Follow up: if symptoms persist or worsen, reassess for another disorder', 'Följ upp: om symtomen kvarstår eller förvärras, bedöm om det finns annan störning'),
    ],
    sources: [],
  },
  pgd: {
    summary: S('Intense, persistent grief at least 12 months after a death (6 months under 18), beyond cultural norms.', 'Intensiv, ihållande sorg minst 12 månader efter ett dödsfall (6 månader under 18 år), utöver kulturella normer.'),
    treatments: [
      T('moderate', 'Grief-focused psychotherapy (e.g. prolonged grief disorder therapy or grief-focused CBT)', 'Sorgfokuserad psykoterapi (t.ex. terapi för långvarigt sorgsyndrom eller sorgfokuserad KBT)'),
      T('limited', 'Antidepressant only for co-occurring depression', 'Antidepressivt läkemedel bara vid samtidig depression'),
    ],
    sources: [],
  },

  // ----- Obsessive-compulsive and related -----
  ocd: {
    summary: S('Obsessions and/or compulsions that take time or cause distress or impairment.', 'Tvångstankar och/eller tvångshandlingar som tar tid eller ger lidande eller funktionsnedsättning.'),
    treatments: [
      G(1, '122', 'strong', 'CBT with exposure and response prevention (ERP)', 'KBT med exponering och responsprevention (ERP)', { note: S('Also priority 1 for 16–17-year-olds (id 48).', 'Även prioritet 1 för 16–17-åringar (id 48).') }),
      G(2, '125', 'strong', 'Antidepressant medicine (usually an SSRI)', 'Antidepressiva läkemedel (oftast SSRI)', { note: S('Often higher doses, and at least 12 weeks before judging the effect.', 'Ofta högre doser, och minst 12 veckor innan effekten bedöms.') }),
      G(3, '126', 'moderate', 'Severe, treatment-resistant OCD: an antipsychotic added to the antidepressant', 'Svårt, behandlingsresistent tvångssyndrom: antipsykotiskt läkemedel som tillägg till antidepressiva läkemedel'),
      G(8, '127', 'limited', 'Moderate to severe OCD: antidepressant combined with CBT or behaviour therapy', 'Medelsvårt till svårt tvångssyndrom: antidepressiva läkemedel och KBT eller beteendeterapi som kombinationsbehandling', { differs: S('NICE (CG31) recommends an SSRI combined with CBT with ERP in severe OCD; Socialstyrelsen gives the combination priority 8.', 'NICE (CG31) rekommenderar SSRI i kombination med KBT med ERP vid svårt tvångssyndrom; Socialstyrelsen ger kombinationen prioritet 8.') }),
      T('moderate', 'Clomipramine if SSRIs have not helped', 'Klomipramin om SSRI inte hjälpt'),
    ],
    sources: [SOS.dep, 'NICE CG31 (2005)'],
    note: INTERNET,
  },
  bdd: {
    summary: S('Preoccupation with perceived flaws in appearance, with repetitive behaviours.', 'Upptagenhet av upplevda brister i utseendet, med upprepade beteenden.'),
    treatments: [
      T('strong', 'CBT for BDD with exposure and response prevention', 'KBT vid dysmorfofobi med exponering och responsprevention'),
      T('strong', 'SSRI', 'SSRI'),
      T('consensus', 'Cosmetic procedures are not a treatment and usually do not help', 'Kosmetiska ingrepp är ingen behandling och hjälper oftast inte'),
    ],
    sources: ['NICE CG31 (2005)'],
  },
  hoarding: {
    summary: S('Persistent difficulty discarding possessions, leading to clutter.', 'Ihållande svårighet att slänga ägodelar, som leder till belamring.'),
    treatments: [
      T('moderate', 'CBT for hoarding, including work in the home', 'KBT vid samlarsyndrom, även med arbete i hemmet'),
      T('limited', 'SSRI', 'SSRI'),
      T('consensus', 'Safety measures (fire risk) together with social services when needed', 'Säkerhetsåtgärder (brandrisk) tillsammans med socialtjänsten vid behov'),
    ],
    sources: [],
  },
  trich: {
    summary: S('Recurrent hair pulling causing hair loss, with failed attempts to stop.', 'Återkommande hårdragning som ger håravfall, med misslyckade försök att sluta.'),
    treatments: [
      T('moderate', 'Habit reversal training (HRT) or comprehensive behavioural treatment', 'Habit reversal training (HRT) eller omfattande beteendebehandling'),
      T('limited', 'N-acetylcysteine', 'N-acetylcystein'),
    ],
    sources: [],
  },
  skin_picking: {
    summary: S('Recurrent skin picking causing lesions, with failed attempts to stop.', 'Återkommande hudplockande som ger sår, med misslyckade försök att sluta.'),
    treatments: [
      T('moderate', 'Habit reversal training (HRT)', 'Habit reversal training (HRT)'),
      T('limited', 'SSRI or N-acetylcysteine', 'SSRI eller N-acetylcystein'),
      T('consensus', 'Treat skin infections and other skin conditions', 'Behandla hudinfektioner och andra hudsjukdomar'),
    ],
    sources: [],
  },
  substance_ocrd: {
    summary: S('Obsessive-compulsive or related symptoms caused by a substance or medicine.', 'Tvångssymtom eller relaterade symtom orsakade av en substans eller ett läkemedel.'),
    treatments: [STOP_SUBSTANCE, TREAT_SUD, REASSESS_AFTER_STOP],
    sources: [SOS.sud],
  },
  medical_ocrd: {
    summary: S('Obsessive-compulsive or related symptoms that are a direct result of another medical condition.', 'Tvångssymtom eller relaterade symtom som är en direkt följd av annan kroppslig sjukdom.'),
    treatments: [TREAT_CAUSE, T('moderate', 'Treat remaining symptoms as in OCD (ERP, SSRI)', 'Behandla kvarvarande symtom som vid tvångssyndrom (ERP, SSRI)')],
    sources: [],
  },

  // ----- Feeding and eating -----
  pica: {
    summary: S('Persistent eating of non-food substances for at least 1 month.', 'Ihållande ätande av sådant som inte är mat i minst 1 månad.'),
    treatments: [
      T('consensus', 'Check for and treat deficiencies (iron, zinc) and complications (poisoning, bowel obstruction)', 'Kontrollera och behandla brister (järn, zink) och komplikationer (förgiftning, tarmhinder)'),
      T('limited', 'Behavioural interventions', 'Beteendeinriktade insatser'),
    ],
    sources: [],
  },
  rumination: {
    summary: S('Repeated regurgitation of food for at least 1 month.', 'Upprepade uppstötningar av mat i minst 1 månad.'),
    treatments: [
      T('moderate', 'Behavioural treatment with diaphragmatic breathing after meals', 'Beteendebehandling med diafragmaandning efter måltider'),
      T('consensus', 'Rule out gastrointestinal disease together with a physician', 'Uteslut mag-tarmsjukdom tillsammans med läkare'),
    ],
    sources: [],
  },
  arfid: {
    summary: S('Restricted eating, not driven by weight or shape, that leads to weight loss, deficiency or impairment.', 'Begränsat ätande, som inte drivs av vikt eller kroppsform, och som leder till viktnedgång, brist eller funktionsnedsättning.'),
    treatments: [
      G(2, 'AR2', 'consensus', 'Extensive eating difficulties: a multi-professional approach', 'Omfattande ätsvårigheter: multiprofessionellt arbetssätt'),
      G(3, 'AR1', 'consensus', 'A clear care structure, with routines for cooperation and clear responsibilities', 'En tydlig vårdstruktur, med rutiner för samarbete och tydlig ansvarsfördelning'),
      G(4, 'AR5', 'moderate', 'CBT adapted for ARFID (from 10 years and adults)', 'KBT anpassad för ARFID (från 10 år och vuxna)'),
      T('consensus', 'Nutritional support with a dietitian; medical monitoring if weight is low', 'Nutritionsstöd med dietist; medicinsk uppföljning vid låg vikt'),
      G('fou', 'AR4', 'limited', 'Family-based therapy adapted for ARFID (children)', 'Familjebaserad terapi anpassad för ARFID (barn)'),
    ],
    sources: [SOS.ed],
  },
  anorexia: {
    summary: S('Restriction leading to significantly low weight, with fear of weight gain and a disturbed body image.', 'Begränsat intag som leder till betydligt låg vikt, med rädsla för viktuppgång och störd kroppsuppfattning.'),
    treatments: [
      G(2, 'AN11', 'moderate', 'When more intensive care is needed: intensified outpatient care', 'Vid behov av intensifierade insatser: förstärkt öppenvård'),
      G(2, 'AN9', 'consensus', 'Severe, long-standing anorexia, when earlier treatment has not helped enough: individualised support focused on quality of life', 'Svår och långvarig anorexi, när tidigare behandling inte gett tillräcklig effekt: individanpassat stöd med fokus på livskvalitet'),
      ED_OTHER_DISORDER,
      G(3, 'AN4', 'strong', 'Adults: eating-disorder-focused CBT (CBT-E)', 'Vuxna: ätstörningsanpassad KBT', { differs: S('NICE (NG69) offers CBT-ED, MANTRA or SSCM as equal first options for adults; MANTRA and SSCM are not among Socialstyrelsen’s recommendations.', 'NICE (NG69) erbjuder KBT-E, MANTRA eller SSCM som likvärdiga förstahandsval för vuxna; MANTRA och SSCM finns inte bland Socialstyrelsens rekommendationer.') }),
      G(3, 'AN2', 'strong', '16–17-year-olds: manual-based family-based therapy, or eating-disorder-focused CBT if suitable given ability and family situation', '16–17 år: familjebaserad terapi enligt manual, eller ätstörningsanpassad KBT om det är lämpligt utifrån förmåga och familjesituation'),
      T('strong', 'Weight restoration with medical monitoring; watch for refeeding syndrome', 'Viktuppgång med medicinsk uppföljning; var uppmärksam på refeeding-syndrom'),
      ED_BOOSTER,
      ED_EMOTION,
      G(5, 'AN4', 'moderate', 'Young adults (18–25): age-adapted manual-based family-based therapy, if suitable given the family situation', 'Unga vuxna (18–25 år): åldersanpassad familjebaserad terapi enligt manual, om det är lämpligt utifrån familjesituationen'),
      G(5, 'AN10', 'limited', 'Severe, long-standing anorexia: self-chosen admission as part of the care plan', 'Svår och långvarig anorexi: självvald inläggning som en del av vårdplanen'),
      ED_ACT,
      G(9, 'AN1', 'limited', 'If the chosen treatment has not helped enough: add motivational interviewing (MI) or motivational enhancement therapy (MET)', 'Om den valda behandlingen inte gett tillräcklig effekt: lägg till motiverande samtal (MI) eller motivational enhancement therapy (MET)'),
      G(10, 'AN8', 'limited', 'Adults, in exceptional cases: an SSRI as an add-on when other measures have not helped', 'Vuxna, i undantagsfall: SSRI-läkemedel som tillägg när andra insatser inte har haft effekt'),
    ],
    sources: [SOS.ed, 'NICE NG69 (2017)'],
    note: S('Socialstyrelsen’s anorexia recommendations also apply to atypical anorexia.', 'Socialstyrelsens rekommendationer vid anorexi gäller även atypisk anorexi.'),
  },
  bulimia: {
    summary: S('Recurrent binge eating with compensatory behaviour, and self-evaluation tied to body shape and weight.', 'Återkommande hetsätning med kompensatoriskt beteende, och självvärdering som är kopplad till kroppsform och vikt.'),
    treatments: [
      ED_OTHER_DISORDER,
      G(3, 'BN4', 'strong', 'Eating-disorder-focused CBT (CBT-E), from 15 years', 'Ätstörningsanpassad KBT, från 15 år', { differs: S('NICE (NG69) starts adults with guided self-help based on CBT-ED; Socialstyrelsen gives CBT-E priority 3 and guided self-help priority 5.', 'NICE (NG69) börjar för vuxna med guidad självhjälp baserad på KBT-E; Socialstyrelsen ger ätstörningsanpassad KBT prioritet 3 och guidad självhjälp prioritet 5.') }),
      ED_BOOSTER,
      ED_EMOTION,
      G(5, 'BN1', 'moderate', 'Manual-based CBT self-help programme with therapist support', 'Manualbaserat självhjälpsprogram (KBT) med behandlarstöd'),
      G(5, 'BN6', 'moderate', 'CBT-E partly delivered by video', 'Ätstörningsanpassad KBT delvis via videolänk'),
      G(5, 'BN9', 'moderate', 'Adolescents up to 16: family-based therapy', 'Ungdomar upp till 16 år: familjebaserad terapi'),
      G(6, 'BN7', 'moderate', 'Interpersonal psychotherapy (IPT)', 'Interpersonell psykoterapi (IPT)'),
      G(6, 'BN3', 'limited', 'Adults: fluoxetine', 'Vuxna: fluoxetin'),
      ED_ACT,
      T('consensus', 'Check electrolytes (potassium) and the ECG when there is vomiting or laxative use', 'Kontrollera elektrolyter (kalium) och EKG vid kräkningar eller laxermedelsbruk'),
    ],
    sources: [SOS.ed, 'NICE NG69 (2017)'],
    note: S('Socialstyrelsen’s bulimia recommendations also apply to bulimia with low frequency or short duration.', 'Socialstyrelsens rekommendationer vid bulimi gäller även bulimi med låg frekvens eller kort duration.'),
  },
  bed: {
    summary: S('Recurrent binge eating with loss of control and distress, without regular compensatory behaviour.', 'Återkommande hetsätning med kontrollförlust och lidande, utan regelbundet kompensatoriskt beteende.'),
    treatments: [
      ED_OTHER_DISORDER,
      G(3, 'H4', 'strong', 'Eating-disorder-focused CBT (CBT-E), from 15 years', 'Ätstörningsanpassad KBT, från 15 år', { differs: S('NICE (NG69) starts with guided self-help based on CBT-ED; Socialstyrelsen gives CBT-E priority 3 and guided self-help priority 4.', 'NICE (NG69) börjar med guidad självhjälp baserad på KBT-E; Socialstyrelsen ger ätstörningsanpassad KBT prioritet 3 och guidad självhjälp prioritet 4.') }),
      ED_BOOSTER,
      G(4, 'H1', 'moderate', 'Manual-based CBT self-help programme with therapist support', 'Manualbaserat självhjälpsprogram (KBT) med behandlarstöd'),
      G(4, 'H5', 'moderate', 'CBT-E in groups', 'Ätstörningsanpassad KBT i grupp'),
      G(4, 'H7', 'moderate', 'Interpersonal psychotherapy (IPT)', 'Interpersonell psykoterapi (IPT)'),
      ED_EMOTION,
      G(7, 'H3', 'limited', 'Adults: an SSRI', 'Vuxna: SSRI-läkemedel'),
      G(7, 'H6', 'limited', 'CBT-E by video', 'Ätstörningsanpassad KBT via videolänk'),
      ED_ACT,
      T('limited', 'Lisdexamfetamine', 'Lisdexamfetamin', 'Not among Socialstyrelsen’s recommendations.', 'Finns inte bland Socialstyrelsens rekommendationer.'),
      T('consensus', 'Weight loss programmes are not a treatment for the binge eating itself', 'Viktminskningsprogram är ingen behandling av själva hetsätningen'),
    ],
    sources: [SOS.ed, 'NICE NG69 (2017)'],
    note: S('Socialstyrelsen’s recommendations also apply to binge-eating disorder with low frequency or short duration.', 'Socialstyrelsens rekommendationer gäller även hetsätningsstörning med låg frekvens eller kort duration.'),
  },
  osfed: {
    summary: S('Feeding or eating symptoms causing distress or impairment without meeting full criteria for a specific disorder.', 'Symtom på ätstörning som ger lidande eller funktionsnedsättning utan att uppfylla alla kriterier för ett visst syndrom.'),
    treatments: [
      G(3, 'AN4', 'strong', 'Atypical anorexia: as anorexia (adults: eating-disorder-focused CBT)', 'Atypisk anorexi: som vid anorexi (vuxna: ätstörningsanpassad KBT)'),
      G(3, 'BN4, H4', 'strong', 'Bulimia or binge eating with low frequency or short duration: as bulimia or binge-eating disorder (eating-disorder-focused CBT)', 'Bulimi eller hetsätning med låg frekvens eller kort duration: som vid bulimi eller hetsätningsstörning (ätstörningsanpassad KBT)'),
      T('moderate', 'Other presentations: treat as the eating disorder it most resembles', 'Andra former: behandla som den ätstörning den mest liknar'),
      T('consensus', 'Medical monitoring as for the full disorder (weight, electrolytes)', 'Medicinsk uppföljning som vid det fullständiga syndromet (vikt, elektrolyter)'),
    ],
    sources: [SOS.ed, 'NICE NG69 (2017)'],
  },
  ufed: {
    summary: S('Feeding or eating symptoms where the reason the full criteria are not met is not (yet) specified.', 'Symtom på ätstörning där skälet till att alla kriterier inte är uppfyllda inte (ännu) anges.'),
    treatments: [
      T('consensus', 'Complete the assessment, then treat as the most similar eating disorder', 'Slutför bedömningen och behandla sedan som den mest liknande ätstörningen'),
      T('consensus', 'Medical monitoring if weight is low or purging is present', 'Medicinsk uppföljning vid låg vikt eller kompensatoriskt beteende'),
    ],
    sources: [],
  },
};
