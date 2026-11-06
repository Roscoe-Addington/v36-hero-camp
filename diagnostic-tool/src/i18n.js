// Patient-facing text in English and Swedish.
//
// IMPORTANT: the Swedish wording of PHQ-9, GAD-7, AUDIT-C and PC-PTSD-5 below
// is an UNOFFICIAL translation written for this app. Validated Swedish
// versions exist (e.g. PHQ-9 and GAD-7 at phqscreeners.com). A changed
// wording can change how an instrument performs, so replace these items with
// the official translations before real use. The other questions are this
// app's own and should be checked by a native speaker.
//
// The consent text is a template. Your organisation's data protection
// officer must check it (legal basis, retention, who has access, rights).

export const LANGUAGES = { en: 'English', sv: 'Svenska' };

export function lang(value) {
  return Object.hasOwn(LANGUAGES, value) ? value : 'en';
}

const CRISIS_EN =
  process.env.CRISIS_TEXT ||
  'If you are in danger or thinking about harming yourself, call 112 (emergency) now. In Sweden you can also call Mind Självmordslinjen on 90101 or 1177 for healthcare advice.';
const CRISIS_SV =
  process.env.CRISIS_TEXT_SV ||
  'Om du är i fara eller tänker på att skada dig själv, ring 112 nu. Du kan också ringa Mind Självmordslinjen på 90101, eller 1177 för sjukvårdsrådgivning.';

export const STRINGS = {
  en: {
    title: 'Questionnaire about your health',
    intro: 'Your clinician has asked you to fill in this questionnaire. It takes about 25 minutes. Please answer every question. You can save and continue later. Your answers go only to your clinician.',
    part: 'Part',
    twoWeeks: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    sixMonths: 'These questions are about the last 6 months.',
    submit: 'Submit answers',
    save: 'Save and continue later',
    missing: (n) => `Please answer every question before submitting. ${n} ${n === 1 ? 'question is' : 'questions are'} not answered yet. Your other answers are kept.`,
    savedTitle: 'Your answers are saved',
    savedText: (date) => `Open the same link again to continue where you left off. The link works until ${date}.`,
    thanksTitle: 'Thank you',
    thanksText: 'Your answers have been sent to your clinician, who will go through them with you.',
    safety: 'You mentioned having thoughts of being better off dead or of hurting yourself. You do not have to wait for your appointment.',
    close: 'You can close this page now.',
    crisis: CRISIS_EN,
    invalidTitle: 'Link not valid',
    invalidText: 'This link has expired, has already been used, or is not valid. Please contact your clinician for a new link.',
    consentTitle: 'Before you start',
    consent: [
      'This questionnaire is part of an assessment by your clinician. It asks about mood, worry, memory, habits and difficult experiences.',
      'Your answers are stored securely and are seen only by your clinician and the care team responsible for your assessment. They become part of your health record.',
      'Answering is voluntary. You can stop at any time, and you can talk with your clinician about any question.',
      'You have the right to know what is stored about you and to ask for mistakes to be corrected.',
      'If you are under 18, your clinician will talk with you about whether your guardians are informed.',
    ],
    consentCheck: 'I have read this information and want to start',
    consentNeeded: 'Please tick the box to confirm you have read the information.',
    start: 'Start',
    translationNote: '',
  },
  sv: {
    title: 'Frågeformulär om din hälsa',
    intro: 'Din behandlare har bett dig fylla i det här formuläret. Det tar ungefär 25 minuter. Svara på alla frågor. Du kan spara och fortsätta senare. Dina svar går bara till din behandlare.',
    part: 'Del',
    twoWeeks: 'Hur ofta under de senaste 2 veckorna har du besvärats av något av följande problem?',
    sixMonths: 'Dessa frågor handlar om de senaste 6 månaderna.',
    submit: 'Skicka svar',
    save: 'Spara och fortsätt senare',
    missing: (n) => `Svara på alla frågor innan du skickar. ${n} ${n === 1 ? 'fråga är' : 'frågor är'} inte besvarade ännu. Dina andra svar finns kvar.`,
    savedTitle: 'Dina svar är sparade',
    savedText: (date) => `Öppna samma länk igen för att fortsätta där du slutade. Länken fungerar till och med ${date}.`,
    thanksTitle: 'Tack',
    thanksText: 'Dina svar har skickats till din behandlare, som kommer att gå igenom dem med dig.',
    safety: 'Du har berättat att du haft tankar på att det vore bättre om du vore död eller på att skada dig själv. Du behöver inte vänta till ditt besök.',
    close: 'Du kan stänga sidan nu.',
    crisis: CRISIS_SV,
    invalidTitle: 'Länken fungerar inte',
    invalidText: 'Länken har gått ut, har redan använts eller är inte giltig. Kontakta din behandlare för att få en ny länk.',
    consentTitle: 'Innan du börjar',
    consent: [
      'Det här formuläret är en del av en bedömning som din behandlare gör. Det innehåller frågor om humör, oro, minne, vanor och svåra upplevelser.',
      'Dina svar sparas säkert och ses bara av din behandlare och det vårdteam som ansvarar för din bedömning. De blir en del av din journal.',
      'Det är frivilligt att svara. Du kan sluta när du vill, och du kan prata med din behandlare om alla frågor.',
      'Du har rätt att få veta vad som sparas om dig och att begära att fel rättas.',
      'Om du är under 18 år pratar din behandlare med dig om huruvida dina vårdnadshavare informeras.',
    ],
    consentCheck: 'Jag har läst informationen och vill börja',
    consentNeeded: 'Kryssa i rutan för att bekräfta att du har läst informationen.',
    start: 'Börja',
    translationNote: 'Svensk översättning. Översättningen av PHQ-9, GAD-7, AUDIT-C och PC-PTSD-5 är inte den officiella.',
  },
};

// ---------- Swedish questionnaire text ----------

const SV_ITEMS = {
  phq1: 'Lite intresse eller glädje i att göra saker',
  phq2: 'Känt dig nedstämd, deprimerad eller hopplös',
  phq3: 'Svårt att somna eller sova hela natten, eller sovit för mycket',
  phq4: 'Känt dig trött eller haft lite energi',
  phq5: 'Dålig aptit eller ätit för mycket',
  phq6: 'Dålig självkänsla – eller känt att du är misslyckad eller att du svikit dig själv eller din familj',
  phq7: 'Svårt att koncentrera dig, till exempel på att läsa tidningen eller titta på tv',
  phq8: 'Rört dig eller talat så långsamt att andra kunnat märka det? Eller motsatsen – varit så rastlös att du rört dig mycket mer än vanligt',
  phq9: 'Tankar på att det vore bättre om du vore död eller på att skada dig själv på något sätt',
  gad1: 'Känt dig nervös, ängslig eller på helspänn',
  gad2: 'Inte kunnat sluta oroa dig eller kontrollera din oro',
  gad3: 'Oroat dig för mycket för olika saker',
  gad4: 'Haft svårt att koppla av',
  gad5: 'Varit så rastlös att du haft svårt att sitta still',
  gad6: 'Blivit lätt irriterad eller retlig',
  gad7: 'Känt dig rädd för att något hemskt skulle kunna hända',
  gadA: 'Har du under de senaste 6 månaderna oroat dig mycket för flera olika saker (till exempel arbete, hälsa, familj eller pengar) fler dagar än inte?',
  gadB: 'Har det under dessa 6 månader varit svårt att kontrollera eller sluta oroa dig?',
  gadC1: 'Har du under dessa 6 månader ofta känt dig rastlös, uppskruvad eller på helspänn?',
  gadC2: 'Har du under dessa 6 månader ofta blivit lätt trött?',
  gadC3: 'Har du under dessa 6 månader ofta haft svårt att koncentrera dig, eller fått "hjärnsläpp"?',
  gadC4: 'Har du under dessa 6 månader ofta varit irriterad?',
  gadC5: 'Har du under dessa 6 månader ofta haft spända eller ömma muskler?',
  gadC6: 'Har du under dessa 6 månader ofta haft sömnproblem (svårt att somna, vaknat under natten eller sovit oroligt)?',
  bp1: 'Har du någon gång haft en period på minst 4 dagar i rad då du känt dig ovanligt glad, "uppe i varv", full av energi eller irriterad – tydligt annorlunda än vanligt?',
  bp2: 'Behövde du under en sådan period mycket mindre sömn än vanligt men kände dig ändå inte trött?',
  bp3: 'Märkte andra förändringen under en sådan period, eller ledde den till problem (till exempel på arbetet, med pengar eller i relationer)?',
  pdd1: 'Har du känt dig nedstämd eller deprimerad de flesta dagar under minst de senaste 2 åren?',
  cyclo1: 'Har ditt humör under minst de senaste 2 åren ofta svängt mellan perioder då du känt dig ovanligt uppåt eller energisk och perioder då du känt dig nere?',
  psy1: 'Har du hört röster eller sett saker som andra inte kunnat höra eller se, eller starkt känt att andra iakttar dig eller vill skada dig?',
  psy2: 'Om ja: hände detta ENDAST under perioder då ditt humör var extremt lågt eller extremt högt?',
  psy3: 'Om ja: har dessa upplevelser pågått i mer än en månad sammanlagt?',
  auditc1: 'Hur ofta dricker du alkohol?',
  auditc2: 'Hur många standardglas dricker du en typisk dag när du dricker alkohol?',
  auditc3: 'Hur ofta dricker du sex standardglas eller mer vid samma tillfälle?',
  drug1: 'Hur ofta har du under de senaste 12 månaderna använt narkotika, eller receptbelagda läkemedel på annat sätt än ordinerat (till exempel för att få ett rus)?',
  caf1: 'Dricker du vanligtvis mer än 4 koppar kaffe, eller flera energidrycker, om dagen?',
  med1: 'Började problemen du beskrivit, eller blev de tydligt värre, strax efter att du började, slutade med eller ändrade ett läkemedel?',
  medcond: 'Har du någon långvarig kroppslig sjukdom (till exempel sköldkörtelsjukdom, diabetes, hjärt- eller lungsjukdom, neurologisk sjukdom eller långvarig smärta)?',
  medonset: 'Började problemen ungefär samtidigt som en kroppslig sjukdom, en skada, en graviditet eller en förlossning?',
  stress1: 'Hände något mycket påfrestande eller en stor förändring i ditt liv (till exempel att du förlorade jobbet, en separation, sjukdom eller en flytt) under de 3 månaderna innan problemen började?',
  grief1: 'Har någon som stod dig nära dött?',
  grief2: 'Om ja: känner du fortfarande de flesta dagar en intensiv längtan efter personen, eller är du upptagen av tankar på hen?',
  pmdd1: 'Om du har mens: kommer problemen främst under veckan före mens och blir bättre inom några dagar efter att mensen börjat?',
  panic1: 'Har du under de senaste 4 veckorna haft en attack av intensiv rädsla eller obehag som kom plötsligt och nådde sin topp inom några minuter (till exempel hjärtklappning, andnöd, skakningar eller en känsla av att du skulle dö eller tappa kontrollen)?',
  panic2: 'Har du oroat dig mycket för att få en ny attack, eller ändrat det du gör för att undvika attacker?',
  soc1: 'Är du mycket rädd för, eller undviker du, sociala situationer där du kan bli iakttagen, bedömd eller hamna i en pinsam situation (till exempel att säga något i en grupp, träffa nya människor eller äta inför andra)?',
  soc2: 'Handlar din oro mest om vad andra tycker om dig?',
  ocd1: 'Besväras du av ovälkomna tankar, bilder eller impulser som kommer tillbaka trots att du försöker stoppa dem (till exempel rädsla för bakterier eller för att orsaka skada)?',
  ocd2: 'Känner du dig tvungen att upprepa handlingar eller tankeritualer (till exempel tvätta, kontrollera, räkna eller ordna) för att minska ångest?',
  ill1: 'Handlar det mesta av din oro om att ha eller få en allvarlig sjukdom?',
  phobia1: 'Är du mycket rädd för en viss sak eller situation (till exempel djur, höjder, att flyga, blod eller sprutor) som du undviker eller knappt står ut med?',
  agora1: 'Är du rädd för, eller undviker du, två eller fler av följande: kollektivtrafik, öppna platser, affärer eller biografer, köer eller folkmassor, att vara utanför hemmet ensam?',
  sep1: 'Oroar du dig mycket mer än andra för att skiljas från någon som står dig nära, eller för att något hemskt ska hända hen?',
  bdd1: 'Oroar du dig mycket för att någon del av ditt utseende är ful eller har en defekt, trots att andra säger att den ser bra ut?',
  hoard1: 'Har du mycket svårt att slänga saker, så att rum i ditt hem har blivit belamrade?',
  trich1: 'Drar du upprepade gånger ut ditt hår (från hårbotten, ögonbryn, ögonfransar eller annanstans) och har svårt att sluta?',
  skin1: 'Pillar du upprepade gånger på huden så att det blir sår, och har svårt att sluta?',
  mutism1: 'Finns det situationer (till exempel på arbetet eller i skolan) där du inte kan prata, trots att du pratar som vanligt hemma?',
  ptsd0: 'Har du någon gång varit med om en sådan händelse?',
  ptsd_recent: 'Om ja: hände den (senaste) händelsen under den senaste månaden?',
  ptsd1: 'Om ja: har du under den senaste månaden haft mardrömmar om händelsen eller tänkt på den när du inte velat det?',
  ptsd2: 'Har du under den senaste månaden ansträngt dig för att inte tänka på händelsen, eller gjort allt för att undvika situationer som påminner om den?',
  ptsd3: 'Har du under den senaste månaden ständigt varit på din vakt, vaksam eller lättskrämd?',
  ptsd4: 'Har du under den senaste månaden känt dig avstängd eller distanserad från människor, aktiviteter eller din omgivning?',
  ptsd5: 'Har du under den senaste månaden känt skuld eller inte kunnat sluta skylla dig själv eller andra för händelsen eller problem som den kan ha orsakat?',
  pd1: 'Har du i allmänhet svårt att få och behålla vänner?',
  pd2: 'Skulle du vanligtvis beskriva dig själv som en ensamvarg?',
  pd3: 'Litar du i allmänhet på andra människor?',
  pd4: 'Tappar du vanligtvis lätt humöret?',
  pd5: 'Är du vanligtvis en impulsiv person?',
  pd6: 'Är du vanligtvis en orolig person?',
  pd7: 'Är du i allmänhet mycket beroende av andra?',
  pd8: 'Är du i allmänhet en perfektionist?',
  pd9: 'Tycker andra ofta att du är udda, eller har du ovanliga upplevelser (till exempel att känna en närvaro, eller tro att du kan påverka händelser med dina tankar)?',
  pd10: 'Känner du dig obekväm när du inte är i centrum för uppmärksamheten?',
  pd11: 'Känner du att du är speciell, och att andra borde inse det och beundra dig?',
  pd12: 'Har du sedan tonåren upprepade gånger brutit mot regler eller lagar, ljugit för eller skadat andra, utan att ångra dig efteråt?',
  pd13: 'Undviker du människor, arbeten eller aktiviteter för att du är rädd att bli kritiserad eller avvisad?',
  pd14: 'Är dina nära relationer ofta stormiga, med intensiva toppar och dalar?',
  pd15: 'Gör du mycket för att undvika att bli lämnad eller övergiven av personer som står dig nära?',
  pd16: 'Har du någon gång medvetet skadat dig själv (till exempel genom att skära eller bränna dig)?',
  pd17: 'Känner du dig ofta tom inombords?',
  pd18: 'Känner du dig ofta osäker på vem du egentligen är?',
  pd19: 'Ändras ditt humör ofta kraftigt inom några timmar (till exempel från nöjd till mycket nere eller mycket arg)?',
  cog1: 'Har du, eller personer i din närhet, märkt att ditt minne eller din tankeförmåga blivit sämre under det senaste året?',
  cog2: 'Gör problem med minne eller tankeförmåga det svårare att klara vardagliga saker (till exempel pengar, mediciner, tider eller matlagning)?',
  neuro1: 'Har du haft krampanfall eller oförklarade medvetslöshetsattacker?',
  neuro2: 'Har du fått ny svaghet, domningar eller förlamning i ansiktet, en arm eller ett ben?',
  neuro3: 'Har du fått nya svårigheter att tala eller förstå tal, eller plötsligt förlorat synen?',
  neuro4: 'Har du fått skakningar (tremor), stelhet eller långsammare rörelser?',
  neuro5: 'Har du fått nya, svåra huvudvärksattacker som inte liknar någon du haft tidigare?',
  neuro6: 'Har du haft en skallskada där du blev medvetslös?',
};

// Answer options, translated by their English label.
const SV_OPTIONS = {
  'Not at all': 'Inte alls',
  'Several days': 'Flera dagar',
  'More than half the days': 'Mer än hälften av dagarna',
  'Nearly every day': 'Nästan varje dag',
  'Not difficult at all': 'Inte alls svårt',
  'Somewhat difficult': 'Ganska svårt',
  'Very difficult': 'Mycket svårt',
  'Extremely difficult': 'Extremt svårt',
  Yes: 'Ja',
  No: 'Nej',
  'Not sure': 'Vet inte',
  'Does not apply to me': 'Gäller inte mig',
  Never: 'Aldrig',
  'Monthly or less': 'En gång i månaden eller mer sällan',
  '2–4 times a month': '2–4 gånger i månaden',
  '2–3 times a week': '2–3 gånger i veckan',
  '4 or more times a week': '4 gånger i veckan eller oftare',
  '1 or 2 (or I never drink)': '1–2 (eller jag dricker aldrig)',
  '3 or 4': '3–4',
  '5 or 6': '5–6',
  '7 to 9': '7–9',
  '10 or more': '10 eller fler',
  'Less than monthly': 'Mer sällan än en gång i månaden',
  Monthly: 'Varje månad',
  Weekly: 'Varje vecka',
  'Daily or almost daily': 'Dagligen eller nästan dagligen',
  'Once or twice': 'En eller två gånger',
  'Weekly or more often': 'Varje vecka eller oftare',
  'Yes, in the past 12 months': 'Ja, under de senaste 12 månaderna',
  'Yes, more than 12 months ago': 'Ja, för mer än 12 månader sedan',
};

// Section titles and intros, by English title.
const SV_SECTIONS = {
  'Your mood over time': ['Ditt humör över tid', 'Dessa frågor handlar om hela ditt liv, inte bara de senaste veckorna.'],
  'Alcohol, drugs, medicines and health': ['Alkohol, droger, läkemedel och hälsa', 'Ett "standardglas" är till exempel en burk öl (33 cl), ett glas vin eller 4 cl sprit.'],
  'Life events': ['Livshändelser', ''],
  'Other worries, fears and habits': ['Andra bekymmer, rädslor och vanor', ''],
  'Difficult experiences': ['Svåra upplevelser', 'Ibland händer det människor saker som är ovanligt eller särskilt skrämmande, fruktansvärda eller traumatiska. Till exempel: en allvarlig olycka eller brand; ett fysiskt eller sexuellt övergrepp; en jordbävning eller översvämning; krig; att se någon bli dödad eller allvarligt skadad; att en närstående dött genom mord eller självmord. Du behöver inte beskriva vad som hände.'],
  'How you usually are': ['Hur du brukar vara', 'Dessa frågor handlar om hur du brukar vara under större delen av ditt vuxna liv (eller sedan tonåren). Det finns inga rätta eller felaktiga svar.'],
  'Memory and the nervous system': ['Minne och nervsystem', 'Om något av problemen nedan började plötsligt de senaste dagarna, ring 112 nu.'],
};

const SV_DIFFICULTY = 'Om du har markerat några problem: hur svårt har dessa problem gjort det för dig att sköta ditt arbete, ta hand om saker hemma eller komma överens med andra människor?';

export function itemText(language, item) {
  return language === 'sv' ? SV_ITEMS[item.id] ?? item.text : item.text;
}
export function optionText(language, label) {
  return language === 'sv' ? SV_OPTIONS[label] ?? label : label;
}
export function sectionText(language, section) {
  if (language !== 'sv' || !SV_SECTIONS[section.title]) return [section.title, section.intro];
  return SV_SECTIONS[section.title];
}
export function difficultyText(language, english) {
  return language === 'sv' ? SV_DIFFICULTY : english;
}

// For tests: ids and labels that have no Swedish text.
export function missingSwedish(itemIds, optionLabels, sectionTitles) {
  return {
    items: itemIds.filter((id) => !SV_ITEMS[id]),
    options: optionLabels.filter((l) => !SV_OPTIONS[l]),
    sections: sectionTitles.filter((t) => !SV_SECTIONS[t]),
  };
}
