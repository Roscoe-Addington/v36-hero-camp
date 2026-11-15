// Disorder information with treatment suggestions, in English and Swedish.
//
// For each disorder: a short summary, treatments ordered with the most
// effective (best-supported, first-line) first, the strength of the
// evidence, and the guidelines it is based on. Written from general
// knowledge of clinical guidelines (mainly NICE and Socialstyrelsen); the
// guideline numbers are given so they can be checked.
//
// IMPORTANT: clinical content. It supports, but does not replace, clinical
// judgement and current national guidelines, and must be reviewed by a
// psychiatrist before use (CON-6 in docs/VALIDATION-PLAN.md). Check medicine
// doses, contraindications and interactions in FASS / the product information.
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

const T = (evidence, en, sv, noteEn, noteSv) => ({ evidence, what: { en, sv }, note: noteEn ? { en: noteEn, sv: noteSv } : null });
const S = (en, sv) => ({ en, sv });

// Treatments used for several disorders.
const STOP_SUBSTANCE = T('strong', 'Stop or reduce the substance or medicine, with support and safe withdrawal management', 'Avsluta eller minska substansen eller läkemedlet, med stöd och säker abstinensbehandling');
const TREAT_SUD = T('moderate', 'Treat a substance use disorder: motivational interviewing, CBT, relapse-prevention medicines where indicated', 'Behandla ett substansbrukssyndrom: motiverande samtal, KBT, återfallsförebyggande läkemedel vid behov');
const REASSESS_AFTER_STOP = T('moderate', 'If symptoms persist about 1 month after stopping, treat as an independent disorder', 'Om symtomen kvarstår ungefär 1 månad efter att bruket upphört, behandla som ett självständigt syndrom');
const TREAT_CAUSE = T('strong', 'Treat the underlying medical condition, together with the physician responsible', 'Behandla den bakomliggande kroppsliga sjukdomen, tillsammans med ansvarig läkare');
const MEDICINE_REVIEW = T('moderate', 'Review medicines that can cause or worsen the symptoms', 'Gå igenom läkemedel som kan orsaka eller förvärra symtomen');

export const KNOWLEDGE = {
  // ----- Mood -----
  mdd: {
    summary: S('Depressed mood or loss of interest for at least 2 weeks, with at least 5 symptoms in total, causing distress or impairment.', 'Nedstämdhet eller minskat intresse i minst 2 veckor, med minst 5 symtom sammanlagt, som ger lidande eller funktionsnedsättning.'),
    treatments: [
      T('strong', 'Psychological treatment: CBT, behavioural activation or interpersonal therapy (IPT)', 'Psykologisk behandling: KBT, beteendeaktivering eller interpersonell terapi (IPT)', 'First choice in mild to moderate depression; also as guided or internet-delivered CBT.', 'Förstahandsval vid lindrig till medelsvår depression; även som guidad eller internetbaserad KBT.'),
      T('strong', 'Antidepressant (an SSRI first, e.g. sertraline or escitalopram), combined with psychological treatment in moderate to severe depression', 'Antidepressivt läkemedel (först en SSRI, t.ex. sertralin eller escitalopram), kombinerat med psykologisk behandling vid medelsvår till svår depression', 'The combination is the most effective option in moderate to severe depression. Continue for at least 6 months after remission.', 'Kombinationen är mest effektiv vid medelsvår till svår depression. Fortsätt minst 6 månader efter remission.'),
      T('strong', 'Electroconvulsive therapy (ECT)', 'Elektrokonvulsiv behandling (ECT)', 'For severe or psychotic depression, high suicide risk, or when a rapid response is needed.', 'Vid svår eller psykotisk depression, hög suicidrisk eller när snabb effekt behövs.'),
      T('moderate', 'Structured physical activity', 'Strukturerad fysisk aktivitet', 'As part of treatment of mild to moderate depression.', 'Som del av behandlingen vid lindrig till medelsvår depression.'),
      T('moderate', 'If there is no response: switch antidepressant, or add lithium or an antipsychotic; consider repetitive transcranial magnetic stimulation (rTMS)', 'Vid utebliven effekt: byt antidepressivt läkemedel, eller lägg till litium eller ett antipsykotiskt läkemedel; överväg repetitiv transkraniell magnetstimulering (rTMS)'),
    ],
    sources: ['NICE NG222 (2022)', 'Socialstyrelsen (2021)'],
  },
  pdd: {
    summary: S('Depressed mood on most days for at least 2 years.', 'Nedstämdhet de flesta dagar i minst 2 år.'),
    treatments: [
      T('strong', 'Antidepressant (SSRI) combined with psychotherapy (CBT or CBASP)', 'Antidepressivt läkemedel (SSRI) kombinerat med psykoterapi (KBT eller CBASP)'),
      T('moderate', 'Antidepressant (SSRI) alone', 'Enbart antidepressivt läkemedel (SSRI)'),
      T('moderate', 'Psychotherapy alone (CBASP, CBT or IPT)', 'Enbart psykoterapi (CBASP, KBT eller IPT)'),
    ],
    sources: ['NICE NG222 (2022)'],
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
    sources: [],
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
      T('moderate', 'CBT with gradual exposure to separation', 'KBT med gradvis exponering för separation'),
      T('limited', 'SSRI if CBT is not enough', 'SSRI om KBT inte räcker'),
    ],
    sources: [],
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
      T('strong', 'Exposure-based CBT (often few sessions, sometimes a single long session)', 'Exponeringsbaserad KBT (ofta få sessioner, ibland en enda lång session)'),
      T('moderate', 'Applied tension for blood-injection-injury phobia (fainting)', 'Tillämpad spänning vid blod-, injektions- och skadefobi (svimning)'),
      T('consensus', 'Medicines are not a first choice', 'Läkemedel är inte förstahandsval'),
    ],
    sources: ['Socialstyrelsen (2021)'],
  },
  social: {
    summary: S('Marked fear of social situations where one may be judged by others.', 'Påtaglig rädsla för sociala situationer där man kan bli bedömd av andra.'),
    treatments: [
      T('strong', 'Individual CBT developed for social anxiety', 'Individuell KBT utvecklad för social ångest'),
      T('strong', 'SSRI (escitalopram or sertraline)', 'SSRI (escitalopram eller sertralin)', 'If CBT is declined or not enough.', 'Om KBT inte önskas eller inte räcker.'),
      T('moderate', 'Guided internet-delivered CBT', 'Guidad internetbaserad KBT'),
      T('limited', 'Short-term psychodynamic therapy if CBT and medicine are declined', 'Korttids psykodynamisk terapi om KBT och läkemedel inte önskas'),
    ],
    sources: ['NICE CG159 (2013)', 'Socialstyrelsen (2021)'],
  },
  panic: {
    summary: S('Recurrent unexpected panic attacks with worry about new attacks or avoidance.', 'Återkommande oväntade panikattacker med oro för nya attacker eller undvikande.'),
    treatments: [
      T('strong', 'CBT for panic disorder', 'KBT vid paniksyndrom'),
      T('strong', 'SSRI', 'SSRI', 'Avoid long-term benzodiazepines.', 'Undvik långvarig användning av bensodiazepiner.'),
      T('moderate', 'Guided self-help or internet-delivered CBT', 'Guidad självhjälp eller internetbaserad KBT'),
    ],
    sources: ['NICE CG113 (2011)', 'Socialstyrelsen (2021)'],
  },
  agoraphobia: {
    summary: S('Fear and avoidance of situations where escape could be difficult, such as public transport or crowds.', 'Rädsla för och undvikande av situationer där det kan vara svårt att ta sig därifrån, som kollektivtrafik eller folkmassor.'),
    treatments: [
      T('strong', 'CBT with gradual exposure', 'KBT med gradvis exponering'),
      T('strong', 'SSRI', 'SSRI'),
      T('moderate', 'Internet-delivered CBT', 'Internetbaserad KBT'),
    ],
    sources: ['NICE CG113 (2011)', 'Socialstyrelsen (2021)'],
  },
  gad: {
    summary: S('Excessive, hard-to-control worry about many things for at least 6 months, with physical tension.', 'Överdriven, svårkontrollerad oro för många saker i minst 6 månader, med kroppslig spänning.'),
    treatments: [
      T('strong', 'CBT for GAD or applied relaxation', 'KBT vid generaliserat ångestsyndrom eller tillämpad avslappning', 'Start with guided self-help or psychoeducation in milder cases.', 'Börja med guidad självhjälp eller psykopedagogik vid lindrigare fall.'),
      T('strong', 'SSRI (sertraline first)', 'SSRI (i första hand sertralin)'),
      T('moderate', 'SNRI (e.g. venlafaxine or duloxetine) or pregabalin if an SSRI does not help', 'SNRI (t.ex. venlafaxin eller duloxetin) eller pregabalin om SSRI inte hjälper'),
      T('consensus', 'Avoid benzodiazepines except briefly in a crisis', 'Undvik bensodiazepiner utom kortvarigt i en kris'),
    ],
    sources: ['NICE CG113 (2011)', 'Socialstyrelsen (2021)'],
  },
  substance_anxiety: {
    summary: S('Anxiety or panic caused by a substance or medicine, or by withdrawal.', 'Ångest eller panik orsakad av en substans eller ett läkemedel, eller av abstinens.'),
    treatments: [STOP_SUBSTANCE, TREAT_SUD, REASSESS_AFTER_STOP],
    sources: [],
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
      T('strong', 'Alzheimer’s, Lewy body and Parkinson’s dementia: a cholinesterase inhibitor (donepezil, galantamine, rivastigmine) in mild to moderate dementia; memantine in moderate to severe dementia', 'Alzheimers sjukdom, Lewykroppsdemens och demens vid Parkinsons sjukdom: kolinesterashämmare (donepezil, galantamin, rivastigmin) vid lindrig till medelsvår demens; memantin vid medelsvår till svår demens'),
      T('strong', 'Support and training for carers; cognitive stimulation', 'Stöd och utbildning för anhöriga; kognitiv stimulering'),
      T('moderate', 'Behavioural and psychological symptoms: non-drug measures first; antipsychotics only for severe risk, short term and never in Lewy body dementia', 'Beteendemässiga och psykiska symtom: åtgärder utan läkemedel först; antipsykotika bara vid allvarlig risk, kortvarigt och aldrig vid Lewykroppsdemens'),
    ],
    sources: ['NICE NG97 (2018)', 'Socialstyrelsen (2017)'],
  },
  mild_ncd: {
    summary: S('Modest cognitive decline without loss of independence.', 'Måttlig kognitiv försämring utan förlorad självständighet.'),
    treatments: [
      T('moderate', 'Treat vascular risk factors (blood pressure, diabetes, smoking) and encourage physical activity', 'Behandla vaskulära riskfaktorer (blodtryck, diabetes, rökning) och uppmuntra fysisk aktivitet'),
      T('moderate', 'Follow up cognition, e.g. once a year', 'Följ upp kognitionen, t.ex. en gång om året'),
      T('consensus', 'No medicine is approved for mild cognitive impairment', 'Inget läkemedel är godkänt vid lindrig kognitiv störning'),
    ],
    sources: ['NICE NG97 (2018)'],
  },

  // ----- Psychotic -----
  delusional: {
    summary: S('One or more delusions for at least 1 month, without other marked psychotic symptoms.', 'En eller flera vanföreställningar i minst 1 månad, utan andra tydliga psykotiska symtom.'),
    treatments: [
      T('moderate', 'Antipsychotic medicine', 'Antipsykotiskt läkemedel'),
      T('moderate', 'CBT for psychosis, with a trusting treatment relationship', 'KBT vid psykos, med en förtroendefull behandlingsrelation'),
    ],
    sources: [],
  },
  brief_psychotic: {
    summary: S('Psychotic symptoms lasting at least 1 day but less than 1 month, with full recovery.', 'Psykotiska symtom som varar minst 1 dag men mindre än 1 månad, med full återhämtning.'),
    treatments: [
      T('moderate', 'Safety, a calm environment and close follow-up', 'Säkerhet, en lugn miljö och tät uppföljning'),
      T('moderate', 'Short-term antipsychotic medicine', 'Kortvarigt antipsykotiskt läkemedel'),
      T('consensus', 'Follow up for recurrence or development of schizophrenia', 'Följ upp återfall eller utveckling av schizofreni'),
    ],
    sources: [],
  },
  schizophreniform: {
    summary: S('Schizophrenia-like symptoms lasting 1 to 6 months.', 'Schizofreniliknande symtom som varar 1–6 månader.'),
    treatments: [
      T('strong', 'Treatment as for a first psychotic episode: antipsychotic medicine together with psychosocial treatment, ideally in an early-intervention team', 'Behandling som vid en första psykosepisod: antipsykotiskt läkemedel tillsammans med psykosocial behandling, helst i ett team för tidiga insatser'),
      T('strong', 'CBT for psychosis and family intervention', 'KBT vid psykos och familjeinterventioner'),
    ],
    sources: ['NICE CG178 (2014)', 'Socialstyrelsen (2018)'],
  },
  schizophrenia: {
    summary: S('Psychotic symptoms with continuous signs for at least 6 months and a decline in functioning.', 'Psykotiska symtom med fortlöpande tecken i minst 6 månader och försämrad funktion.'),
    treatments: [
      T('strong', 'Antipsychotic medicine, chosen together with the patient by side-effect profile', 'Antipsykotiskt läkemedel, valt tillsammans med patienten utifrån biverkningsprofil'),
      T('strong', 'Clozapine if two antipsychotics have not helped (treatment-resistant schizophrenia)', 'Klozapin om två antipsykotiska läkemedel inte hjälpt (terapiresistent schizofreni)'),
      T('strong', 'CBT for psychosis and family intervention', 'KBT vid psykos och familjeinterventioner'),
      T('strong', 'Supported employment (IPS) and monitoring of physical health (weight, blood sugar, lipids)', 'Individanpassat stöd till arbete (IPS) och uppföljning av den fysiska hälsan (vikt, blodsocker, blodfetter)'),
    ],
    sources: ['NICE CG178 (2014)', 'Socialstyrelsen (2018)'],
  },
  schizoaffective: {
    summary: S('Psychotic symptoms together with major mood episodes for most of the illness.', 'Psykotiska symtom tillsammans med förstämningsepisoder under större delen av sjukdomen.'),
    treatments: [
      T('moderate', 'Antipsychotic medicine', 'Antipsykotiskt läkemedel'),
      T('moderate', 'Bipolar type: add a mood stabiliser (e.g. lithium); depressive type: consider an antidepressant', 'Bipolär typ: lägg till stämningsstabiliserare (t.ex. litium); depressiv typ: överväg antidepressivt läkemedel'),
      T('moderate', 'Psychosocial treatment as in schizophrenia', 'Psykosocial behandling som vid schizofreni'),
    ],
    sources: [],
  },
  substance_psychotic: {
    summary: S('Psychotic symptoms caused by a substance or medicine, or by withdrawal.', 'Psykotiska symtom orsakade av en substans eller ett läkemedel, eller av abstinens.'),
    treatments: [STOP_SUBSTANCE, T('moderate', 'Short-term antipsychotic if needed for safety', 'Kortvarigt antipsykotiskt läkemedel vid behov av säkerhetsskäl'), TREAT_SUD, REASSESS_AFTER_STOP],
    sources: [],
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
      T('strong', 'Trauma-focused CBT (e.g. cognitive processing therapy, prolonged exposure, cognitive therapy for PTSD)', 'Traumafokuserad KBT (t.ex. kognitiv processterapi, förlängd exponering, kognitiv terapi vid PTSD)'),
      T('strong', 'EMDR', 'EMDR'),
      T('moderate', 'SSRI (sertraline or paroxetine) or venlafaxine if trauma-focused therapy is declined or not enough', 'SSRI (sertralin eller paroxetin) eller venlafaxin om traumafokuserad terapi inte önskas eller inte räcker'),
      T('limited', 'Prazosin or an antipsychotic as an add-on in specialist care for severe symptoms', 'Prazosin eller ett antipsykotiskt läkemedel som tillägg i specialistvård vid svåra symtom'),
    ],
    sources: ['NICE NG116 (2018)', 'Socialstyrelsen (2021)'],
  },
  acute_stress: {
    summary: S('Marked stress symptoms from 3 days to 1 month after a trauma.', 'Påtagliga stressymtom från 3 dagar till 1 månad efter ett trauma.'),
    treatments: [
      T('moderate', 'Trauma-focused CBT for those with marked symptoms in the first month', 'Traumafokuserad KBT för den som har påtagliga symtom under den första månaden'),
      T('moderate', 'Practical support, information and active monitoring', 'Praktiskt stöd, information och aktiv uppföljning'),
      T('consensus', 'Do not use single-session psychological debriefing', 'Använd inte avlastningssamtal (debriefing) vid ett enda tillfälle'),
    ],
    sources: ['NICE NG116 (2018)'],
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
      T('strong', 'CBT with exposure and response prevention (ERP)', 'KBT med exponering och responsprevention (ERP)'),
      T('strong', 'SSRI, often at higher doses and for at least 12 weeks before judging the effect', 'SSRI, ofta i högre doser och i minst 12 veckor innan effekten bedöms', 'Combine with ERP in moderate to severe OCD.', 'Kombinera med ERP vid medelsvårt till svårt tvångssyndrom.'),
      T('moderate', 'Clomipramine if SSRIs have not helped', 'Klomipramin om SSRI inte hjälpt'),
      T('limited', 'Add a low-dose antipsychotic in specialist care for treatment-resistant OCD', 'Lägg till antipsykotiskt läkemedel i låg dos i specialistvård vid terapiresistent tvångssyndrom'),
    ],
    sources: ['NICE CG31 (2005)', 'Socialstyrelsen (2021)'],
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
    sources: [],
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
      T('limited', 'CBT for ARFID (CBT-AR) or family-based treatment', 'KBT vid ARFID (CBT-AR) eller familjebaserad behandling'),
      T('consensus', 'Nutritional support with a dietitian; medical monitoring if weight is low', 'Nutritionsstöd med dietist; medicinsk uppföljning vid låg vikt'),
    ],
    sources: [],
  },
  anorexia: {
    summary: S('Restriction leading to significantly low weight, with fear of weight gain and a disturbed body image.', 'Begränsat intag som leder till betydligt låg vikt, med rädsla för viktuppgång och störd kroppsuppfattning.'),
    treatments: [
      T('strong', 'Under 18: family therapy focused on anorexia (FT-AN)', 'Under 18 år: familjeterapi inriktad på anorexi (FT-AN)'),
      T('strong', 'Adults: eating-disorder-focused CBT (CBT-ED), MANTRA or specialist supportive clinical management (SSCM)', 'Vuxna: ätstörningsinriktad KBT (KBT-E), MANTRA eller specialiserat stödjande kliniskt omhändertagande (SSCM)'),
      T('strong', 'Weight restoration with medical monitoring; watch for refeeding syndrome', 'Viktuppgång med medicinsk uppföljning; var uppmärksam på refeeding-syndrom'),
      T('limited', 'No medicine treats anorexia itself; treat co-occurring disorders', 'Inget läkemedel behandlar själva anorexin; behandla samtidiga syndrom'),
    ],
    sources: ['NICE NG69 (2017)'],
  },
  bulimia: {
    summary: S('Recurrent binge eating with compensatory behaviour, and self-evaluation tied to body shape and weight.', 'Återkommande hetsätning med kompensatoriskt beteende, och självvärdering som är kopplad till kroppsform och vikt.'),
    treatments: [
      T('strong', 'Adults: guided self-help based on CBT-ED; if not enough, individual CBT-ED', 'Vuxna: guidad självhjälp baserad på KBT-E; om det inte räcker, individuell KBT-E'),
      T('strong', 'Under 18: family therapy focused on bulimia (FT-BN)', 'Under 18 år: familjeterapi inriktad på bulimi (FT-BN)'),
      T('limited', 'Fluoxetine as an add-on (not as the only treatment)', 'Fluoxetin som tillägg (inte som enda behandling)'),
      T('consensus', 'Check electrolytes (potassium) and the ECG when there is vomiting or laxative use', 'Kontrollera elektrolyter (kalium) och EKG vid kräkningar eller laxermedelsbruk'),
    ],
    sources: ['NICE NG69 (2017)'],
  },
  bed: {
    summary: S('Recurrent binge eating with loss of control and distress, without regular compensatory behaviour.', 'Återkommande hetsätning med kontrollförlust och lidande, utan regelbundet kompensatoriskt beteende.'),
    treatments: [
      T('strong', 'Guided self-help based on CBT-ED; if not enough, group or individual CBT-ED', 'Guidad självhjälp baserad på KBT-E; om det inte räcker, KBT-E i grupp eller individuellt'),
      T('limited', 'Lisdexamfetamine (approved for binge-eating disorder in some countries)', 'Lisdexamfetamin (godkänt vid hetsätningsstörning i vissa länder)'),
      T('consensus', 'Weight loss programmes are not a treatment for the binge eating itself', 'Viktminskningsprogram är ingen behandling av själva hetsätningen'),
    ],
    sources: ['NICE NG69 (2017)'],
  },
  osfed: {
    summary: S('Feeding or eating symptoms causing distress or impairment without meeting full criteria for a specific disorder.', 'Symtom på ätstörning som ger lidande eller funktionsnedsättning utan att uppfylla alla kriterier för ett visst syndrom.'),
    treatments: [
      T('moderate', 'Treat as the eating disorder it most resembles (e.g. CBT-ED)', 'Behandla som den ätstörning den mest liknar (t.ex. KBT-E)'),
      T('consensus', 'Medical monitoring as for the full disorder (weight, electrolytes)', 'Medicinsk uppföljning som vid det fullständiga syndromet (vikt, elektrolyter)'),
    ],
    sources: ['NICE NG69 (2017)'],
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
