# Continuum

**Continuum** is a web app that supports a clinician through the whole assessment of a
patient aged **16 or older**, from the intake screening to a confirmed
diagnosis with an ICD-10 code.

It covers eight groups of DSM-5-TR disorders (60 in total):

| Group | Disorders |
| --- | --- |
| Mood disorders | Major depressive disorder, persistent depressive disorder, PMDD, DMDD (under 18 only), bipolar I and II, cyclothymic disorder, substance/medication-induced and medical-condition mood disorders |
| Anxiety disorders | Separation anxiety, selective mutism, specific phobia, social anxiety, panic disorder, agoraphobia, GAD, substance/medication-induced and medical-condition anxiety disorders |
| Personality disorders | All 10 (paranoid, schizoid, schizotypal, antisocial, borderline, histrionic, narcissistic, avoidant, dependent, obsessive-compulsive) |
| Neurocognitive disorders | Delirium, major neurocognitive disorder (dementia), mild neurocognitive disorder |
| Schizophrenia spectrum and other psychotic disorders | Delusional disorder, brief psychotic disorder, schizophreniform disorder, schizophrenia, schizoaffective disorder, substance/medication-induced and medical-condition psychotic disorders, catatonia (schizotypal personality disorder is listed with the personality disorders) |
| Trauma- and stressor-related disorders | PTSD, acute stress disorder, adjustment disorder, prolonged grief disorder, reactive attachment disorder and disinhibited social engagement disorder (both childhood-onset) |
| Obsessive-compulsive and related disorders | OCD, body dysmorphic disorder, hoarding disorder, trichotillomania, excoriation (skin-picking) disorder, substance/medication-induced and medical-condition OCRD |
| Feeding and eating disorders | Pica, rumination disorder, ARFID, anorexia nervosa, bulimia nervosa, binge-eating disorder, other specified and unspecified feeding or eating disorder |

**Languages of the clinical content.** All clinical content is in English
and Swedish: disorder names, criteria, specifiers, rule-out reasons,
combination rules, suggestion reasons, the screening report, response-
quality notes and follow-up summaries. In Swedish mode only Swedish is
shown; a test renders every clinician page in Swedish and fails if English
is left. The Swedish wording is an **unofficial translation** written for
this app (`src/i18n-clinical-sv*.js`, to be reviewed: TRA-6), because the
official Swedish DSM-5-TR text is licensed. Free text that clinicians type
is shown as written.

Other neurological symptoms (seizures, weakness, speech or vision loss,
tremor, new headaches, head injury) are **flagged for referral**, not
diagnosed. Findings outside these groups (e.g. illness anxiety, substance
use disorder) are listed as "outside this app" so they are not lost.

> **This app supports clinical judgement; it does not replace it.** The
> clinician confirms every diagnosis. Software that suggests diagnoses is
> likely a medical device under the EU MDR and must not be used with real
> patients without CE marking. See "Before real patients use this".

## The assessment process

1. **Start.** On the patient's page the clinician chooses **Send link to
   patient** (the patient answers at home and the clinician is emailed) or
   **Conduct on site**, and the patient's language (English or Swedish).
   On site, the assessment opens with the intake interview first.
2. **Intake interview.** A structured psychiatric history: reason and
   onset, previous diagnoses and treatment, previous suicide attempts and
   self-harm, family history, medical history and medicines, pregnancy,
   substance use, social situation and development, and a **mental status
   examination**. It can be done before the screening (for example while
   the patient's link is still open).
3. **Intake screening.** The patient first confirms an information page
   (on site, the clinician confirms the patient was informed). Then 105
   questions (about 25–30 minutes): PHQ-9, GAD-7, GAD criteria items, mood
   history, psychotic experiences, AUDIT-C, drugs, medicines, health, life
   events, other anxiety disorders, obsessive-compulsive and related
   symptoms, PC-PTSD-5, personality traits, memory and neurological
   symptoms, and eating (SCOFF plus questions on binge eating,
   compensation, ARFID, pica and rumination), shown **one part per page**
   (11 pages) with a **progress
   bar**. Follow-up questions ("If so…") are only asked when they apply
   (**skip logic**, 13 questions), so many patients answer about 92. After
   parts 3 and 6 the patient rates **how tired they feel** (0–10); 7 or
   more offers a **break**. Answers are saved page by page and can be
   continued later from the same link.
4. **MoCA and observed signs.** On site, the clinician enters the **MoCA**
   domain scores (the app adds them up and adds 1 point for 12 years of
   education or fewer), signs of **delirium** and **catatonia**, and
   **height and weight**. The app works out the **BMI** and shows
   **medical warning signs**: BMI below 15 is an urgent alert (same-day
   medical assessment); low BMI, purging and rapid weight loss each say
   what to check (pulse, blood pressure, temperature, electrolytes, ECG).
   The BMI limits are for adults; under 18, BMI for age (ISO-BMI) applies.
5. **Informant.** Information from someone who knows the patient well
   (memory decline, everyday functioning, past periods of elevated mood,
   long-standing traits, safety worries). Saved only with the patient's
   consent.
6. **Suicide risk assessment.** Current thoughts and behaviour, previous
   attempts, risk and protective factors, a written formulation, an
   immediate-action decision, a management plan and a 7-step **safety
   plan** page for the patient. The app does **not** compute a risk score
   or category: guidelines such as NICE (2022) advise against using risk
   scales to predict suicide. A risk assessment is **required before
   finalizing** when item 9 is answered, self-harm or a previous attempt is
   reported, the informant is worried, or the MSE shows psychotic symptoms.
7. **Suggestions.** The app lists the disorders to assess in depth, each
   marked *Suggested* or *Consider*, with the reasons from the screening,
   interview, MoCA, observations and informant.
8. **In-depth assessment.** For each disorder, the clinician rates every
   DSM-5-TR criterion as *present*, *absent* or *unclear* and picks
   specifiers (e.g. severity). The app shows whether the criteria are
   **met**, **not met** or still **incomplete**, the ICD-10 code, and a
   rule-out table.
9. **Diagnosis.** The clinician confirms diagnoses. Confirming one whose
   criteria are not met requires a written reason. The app checks every
   combination of diagnoses (see below).
10. **Final report.** Finalizing (only after the intake interview, and the
    risk assessment where required) locks the assessment and produces a
    report with diagnoses, ICD-10 codes, checklist results, interview, MSE,
    informant, risk assessment and screening summary. A finalized
    assessment can be **reopened with a written reason**; the earlier
    diagnoses and the reason are kept in a change history.
11. **Follow-up.** PHQ-9 and GAD-7 (18 questions) can be repeated by link
    or on site. The patient page shows a chart and a table of all
    measurements and describes the change: 5+ points on PHQ-9 or 4+ on
    GAD-7 counts as clinically meaningful, plus PHQ-9 response (50% fall)
    and remission (below 5).

### Differential diagnosis and conflict checks

Every checklist page has a **rule-out table** (`src/differential-lists.js`):
the conditions to exclude for that disorder, each with a reason. Conditions
in the app link to their own checklist and show its result; conditions
outside the app (e.g. ADHD, PTSD, psychotic disorders) are named so they are
assessed in the interview.

When diagnoses are confirmed, the app checks each combination
(`src/conflicts.js`) on three levels:

| Level | Meaning | Example |
| --- | --- | --- |
| Not allowed together | DSM-5-TR does not allow both. Confirming needs a written reason. | Major depressive disorder + bipolar I |
| Check before giving both | Allowed only if a condition holds. Shown as a warning. | Substance-induced depression + major depressive disorder |
| Coding note | Allowed, coded in a special way. | Panic disorder + agoraphobia (ICD-10 F40.01) |

The rules for confirming diagnoses live in one pure function
(`src/diagnosis.js`) that both the server and the browser demo use.

### About the MoCA

The MoCA test itself is **not** in the app. It is copyrighted, must be given
by a trained and certified person, and its owners must give permission for
any digital version. The clinician gives the paper test and types in the
seven domain scores. The cut-off of 26 is shown with its range bands; many
studies suggest a lower cut-off (23–24), so the clinician decides.

### About the criteria and codes

The checklists show **short labels written for this app**, not the DSM-5-TR
text, which is copyrighted. Keep the DSM-5-TR at hand for the full wording.
Codes are WHO ICD-10; check them against ICD-10-SE before reporting. Where
ICD-10 has no direct code (e.g. PMDD, narcissistic personality disorder),
the checklist page explains the code used.

### Age rules

- Patients must be 16 or older (the form and the server both check this).
- **The age comes from the personal number.** The digits before the dash
  are the date of birth (19480405-XXXX is 5 April 1948). As the clinician
  types the personal number, the age box is filled in. The server fills it
  in too when it is left empty, and refuses an age that does not match the
  date of birth. Also accepted: no dash, the short form YYMMDD-XXXX (with
  `+` for 100 or older) and coordination numbers (day + 60). A number
  without a date, such as a reserve number, keeps the typed age
  (`public/personal-number.js`).
- The age is saved when the patient is registered or edited. It is not
  updated by itself on later birthdays.
- Antisocial personality disorder cannot be met under 18.
- DMDD cannot be met over 18.
- Other personality disorders under 18 need features present for 1 year or more.

## Intake screening details

### Differential diagnosis screening

The same email also contains a **differential diagnosis report**
(`src/differential.js`). It checks 18 conditions that DSM-5-TR says must be
ruled out, or may explain the symptoms better, before diagnosing MDD or GAD:

| Group | Conditions checked |
| --- | --- |
| Must be excluded first (marked **PRIORITY**) | Bipolar I/II disorder, psychotic features / psychotic disorder |
| Other depressive disorders | Persistent depressive disorder, PMDD, bereavement / prolonged grief |
| Other anxiety-related disorders | Panic, social anxiety, OCD, illness anxiety, PTSD (PC-PTSD-5) |
| Substances and medical causes | Alcohol (AUDIT-C) and drugs, medication, caffeine, medical conditions |
| Stress | Adjustment disorder (only if MDD/GAD criteria are not met) |
| Clinician only (no questionnaire) | Neurocognitive disorder (highlighted from age 60), ADHD, personality disorders |

For every condition the report shows **why it was checked, the exact rule,
the patient's answers to the questions it used, what it found, what it
would mean, and a suggested next step** (e.g. a validated follow-up tool).
Each one gets a status: *Screen positive*, *Unclear*, *Not indicated*, or
*Clinician to assess*.

It also shows how much each result depends on **symptoms shared by
depression and anxiety** (sleep, fatigue, concentration, restlessness), for
example: "The MDD symptom count (5) falls to 2 without symptoms also
attributed to anxiety."

The patient answers 30 extra questions for this (56 in total, about 10–15
minutes). Apart from AUDIT-C, the single-question drug screen and the
PC-PTSD-5, these questions are written for this tool and are **not
validated**. A positive screen tells the clinician what to ask about. It
does not mean the condition is present.

How the likelihood is decided (see `src/scoring.js`):

| Level | Depression | Anxiety |
| --- | --- | --- |
| High | DSM algorithm met **and** PHQ-9 ≥ 10 | Criteria A–C met **and** GAD-7 ≥ 10 |
| Moderate | Algorithm met **or** PHQ-9 ≥ 10 | Criteria A–C met **or** GAD-7 ≥ 10 |
| Low — subclinical | PHQ-9 5–9, or 2+ symptoms at threshold, or any item 9 answer | GAD-7 5–9, or some criteria items endorsed |
| Minimal | everything else | everything else |

These are ordered categories, not percentages. The questionnaires do not
give a valid individual probability, so the app does not invent one.

### How suggestions are made (`src/suggestions.js`)

| Screening finding | Suggests |
| --- | --- |
| PHQ-9 ≥ 10 or DSM algorithm met | Major depressive disorder |
| GAD-7 ≥ 10 or 6-month criteria met | Generalized anxiety disorder |
| Past elevated mood with less sleep or consequences | Bipolar I and II |
| Personality screen ≥ 3 of 8 plus a matching trait | The matching personality disorder (*Consider*) |
| 5 or more of 8 borderline traits | Borderline personality disorder |
| MoCA below 26 | Mild neurocognitive disorder |
| MoCA below 18, or below 26 with everyday activities affected | Major neurocognitive disorder |
| Memory complaint without a MoCA | Mild NCD (*Suggested* from age 60), and a prompt to give the MoCA |
| Acute onset + inattention + disorganised thinking or altered consciousness | Delirium |
| Psychotic experiences for more than a month, not only during mood episodes | Schizophrenia (*Consider* schizophreniform, delusional) |
| Psychotic experiences for less than a month | Brief psychotic disorder |
| Psychotic experiences only during extreme mood | The mood disorder "with psychotic features" (*Consider* schizoaffective) |
| Trauma + PC-PTSD-5 ≥ 3 | PTSD, or acute stress disorder if the event was in the past month |
| Bereavement over 12 months ago + ongoing longing | Prolonged grief disorder |
| Catatonic signs observed by the clinician | Catatonia |

The other disorders each have their own screening question (e.g. panic
attacks, agoraphobic situations, separation worry).

## Running it on your computer

You need [Node.js](https://nodejs.org) version 22.5 or newer.

```bash
cd diagnostic-tool
npm install
cp .env.example .env          # then edit .env if you want
npm run create-clinician -- "Dr Anna Svensson" anna@clinic.example
npm start
```

Open http://localhost:3000 and log in. Without SMTP settings, emails are
saved as text files in the `outbox/` folder instead of being sent.

Run the tests:

```bash
npm test
```

## Browser demo

`demo/` holds a one-file browser demo that runs the app's real page code
with made-up data (nothing is saved or sent). It walks through the
assessment in order: log in, add patient, start assessment, intake
interview, intake screening, risk assessment, criteria checklist, final
report, email, follow-up, audit log and retention. The demo's own texts
follow the language chosen in the app's top bar (English or Svenska).

```bash
npm run build:demo     # writes demo/dist/continuum-demo.html
```

## Tablets and phones (iPad, Android)

The app is ordinary web pages, so it runs in Safari on iPad and in Chrome on
Android tablets and phones; nothing needs installing. The pages adapt to the
screen width, text fields use 16px text (so Safari does not zoom in when you
tap one), and buttons and answer choices are at least 44px tall on touch
screens. Wide tables scroll sideways inside their box. On phones the answer
choices are listed one per row.

To check every page on emulated iPads and Android devices:

```bash
npm install --no-save playwright && npx playwright install chromium   # once
npm run check:devices            # all devices
npm run check:devices -- iPad    # only the iPads
```

It opens every clinician page, fills in the whole patient questionnaire by
tapping, downloads the PDF, and reports anything wider than the screen, text
fields that would make Safari zoom, and controls that are too small to tap.
Screenshots are saved in `device-check/`.

This uses Chromium with each device's screen size and touch, **not Safari
itself**. Before use with patients, also try the app on a real iPad and a
real Android device. Use iPadOS 15.4 or newer and Chrome 105 or newer: older
versions work, but the chosen answer is not highlighted. Two things to know:

- **`BASE_URL` must be the address the tablet uses.** Form posts from another
  address are refused (a security check), so set `BASE_URL` to the address
  people type on the iPad, not `localhost`.
- **On site, the clinician holds the tablet** and goes through the
  questions with the patient, so the clinician's menu stays on the page.

## Project layout

```
src/server.js          URLs and what happens on each one
src/questionnaire.js   the questions and answer options
src/scoring.js         the scoring rules  <- the clinical logic
src/differential.js    the differential diagnosis rules
src/suggestions.js     which disorders to assess in depth, and why
src/disorders.js       the 60 disorders: criteria, rules, ICD-10 codes
src/criteria.js        evaluates a checklist (met / not met / incomplete)
src/moca.js            MoCA score entry and interpretation
src/views-workflow.js  assessment, checklist and final report pages
src/differential-lists.js  what to rule out for each disorder
src/conflicts.js       which diagnoses may be given together
src/diagnosis.js       confirming and removing diagnoses (shared with the demo)
src/intake.js          reading the clinician intake form (shared with the demo)
src/forms.js           generic forms described as data (schemas)
src/clinical-forms.js  intake interview, MSE, risk assessment, informant
src/views-forms.js     draws the schema forms and their summaries
src/followup.js        follow-up scoring and change over time
src/i18n.js            English and Swedish patient-facing text
src/audit.js           the audit log
src/item-sources.js    where each question comes from (validated / adapted / own)
src/pdf-report.js      the final report as a PDF
docs/VALIDATION-PLAN.md  what needs validating, and how (living document)
src/access.js          who may see a patient, and assigning patients to clinicians
src/views-admin.js     the administration pages
src/retention.js       how long data is kept, and automatic cleanup
src/records.js         patient record entries and personal-number search
src/views-records.js   record search and the record timeline
src/knowledge.js       disorder summaries and treatments, with evidence levels
src/disorder-search.js disorder search and treatment ranking
src/evidence-watch.js  the research watch (PubMed, Europe PMC, ClinicalTrials.gov)
src/guidance.js        the yearly check of Swedish guidance
src/views-knowledge.js disorder information and the research review pages
src/response-quality.js  signs of tired or careless answering
public/skip.js         skip logic in the browser
src/email.js           the email to the clinician
src/views.js           the HTML pages
src/auth.js            passwords, login sessions, link tokens
src/db.js              database tables (SQLite file in data/)
scripts/create-clinician.js
test/                  automated tests
```

### Response quality

The assessment page shows a **Response quality** box (`src/response-quality.js`),
also summarised in the email:

- **Fast answering:** a part answered at under 2 seconds per question
  (patients answering by link only; on site the clinician may type in
  answers from paper).
- **Contradictions:** answers that cannot both be true, e.g. "never drinks
  alcohol" with drinks on a typical day, or "No" to a question and "Yes"
  to its follow-up (possible when the browser has JavaScript off).
- **Possible inconsistencies:** answers that rarely go together.
- **Tiredness:** ratings of 7/10 or more, and whether a break was taken.

It never changes answers or scores: the clinician checks the flagged
answers in the interview. Time per part is shown as well.

## Patient records

**Records** in the top bar searches by **personal number** (with or
without the dash, 10 or 12 digits). It only finds patients you may see:
your own and those shared with you (see below). The log records that a
search was made and how many records were found, never the number itself.

A patient's record is one timeline, newest first, that can be filtered:
assessments (with PHQ-9/GAD-7, safety alerts, diagnoses and links to the
final report and risk assessment), intake interviews, follow-ups,
**clinical notes** and **treatment reports**. The treating clinician adds
notes and treatment reports; colleagues with access read only. As in a
health record, an entry **cannot be changed or deleted** once saved; a
correction is a new entry. Entries count as "last entry" for retention.

## Disorder information and treatment

**Disorders** in the top bar, or the search box next to it, finds a
disorder by English or Swedish name, abbreviation (PTSD, OCD, BED, EIPS…)
or ICD-10 code (F32, F50…). An empty search lists all 60 by group. Each
disorder page has:

- a short summary;
- **treatments**, in two steps:
  1. where a **Swedish national guideline** (Socialstyrelsen) covers the
     disorder, in order of its **priority** (1 = most important), each
     with the recommendation's id so it can be checked in the guideline;
  2. then the treatments the Swedish guideline does not cover, by strength
     of evidence (strong, moderate, limited, expert consensus).
  Treatments Socialstyrelsen recommends only within research (FoU) or
  advises against (icke-göra) are listed separately. Because Continuum
  mainly supports psychologists, treatments with a medicine or a medical
  procedure (ECT, rTMS) are marked **"Prescribed by a physician"**, and
  combinations with psychological treatment **"The medicine part is
  prescribed by a physician"**. Blood tests, ECG, weight and electrolyte
  monitoring and medical work-ups are marked **"Medical check (physician
  or nurse)"** and shown **first**, in a box of their own ("Before and
  during treatment: medical checks"), because they concern safety; the
  numbered treatments below keep Socialstyrelsen's order.
  Treatments without a badge are given by the psychologist or by anyone
  the psychologist sees fit to perform the task.
  `npm run list:badges` prints every treatment with its badges, for review. Where NICE differs
  from Socialstyrelsen, the page says how ("Guidelines differ"). The
  sources are linked (`src/knowledge.js`, `src/disorder-search.js`);
- **new research approved by a clinician** (below);
- what to rule out, linked to those disorders' pages, and the criteria.

**Swedish national guidelines used** (checked against the guideline
documents on 2026-11-15; 27 of the 60 disorders):

| Guideline | Disorders |
| --- | --- |
| Depression and anxiety disorders (2021) | Depression, persistent depressive disorder, separation anxiety (16–17), specific phobia, social anxiety, panic disorder, agoraphobia, GAD, PTSD, acute stress disorder, OCD |
| Schizophrenia and schizophrenia-like conditions (2018) | Schizophrenia, schizophreniform, schizoaffective, delusional and brief psychotic disorder |
| Eating disorders (2024) | Anorexia (and atypical anorexia), bulimia, binge-eating disorder, ARFID, other specified eating disorder |
| Dementia (2017) | Major and mild neurocognitive disorder |
| Substance use and dependence (2019) | The four substance-induced disorders |

Socialstyrelsen's priority weighs the severity of the condition, the
effect, the evidence and cost-effectiveness, so it is not simply "most
effective first". Its recommendations on psychological treatment for adults
also apply when the treatment is delivered via the internet. The
depression/anxiety and schizophrenia guidelines will be replaced by one
guideline on psychiatric conditions in 2028. The other 33 disorders have no
Swedish national guideline.

> **The treatment content was written for this app from published
> guidelines and has not been reviewed by a psychiatrist or psychologist**
> (CON-6 in the validation plan). It supports, and does not replace, clinical judgement;
> doses and interactions are not given (check FASS). Treatment
> recommendations make medical-device regulation (MDR) more likely to
> apply; ask your regulatory adviser before use.

## Research watch

Once a week (`EVIDENCE_WATCH_DAYS`), Continuum searches three sources for
new research on the treatment of each disorder (`src/evidence-watch.js`).
The clinic approved these sources on 2026-11-15:

| Source | What it adds | How |
| --- | --- | --- |
| **PubMed** | Peer-reviewed journals | MeSH terms per disorder, treatment topic, study-design filter. Searched twice: in all journals, and in the **priority journals** only, so they are never crowded out |
| **Europe PMC** | PubMed Central and European content | Titles and abstracts; only MEDLINE and PubMed Central records, so **no preprints**. An article with a PubMed id is stored as the PubMed article, never twice |
| **ClinicalTrials.gov** | Registered interventional trials whose results were posted in the period | Marked **not peer-reviewed** and ranked last |

**Priority journals** (22, approved): JAMA Psychiatry, Lancet Psychiatry,
American Journal of Psychiatry, World Psychiatry, British Journal of
Psychiatry, Psychological Medicine, BMJ, Lancet, NEJM, Cochrane Database of
Systematic Reviews; Journal of Affective Disorders, Depression and Anxiety,
Journal of Anxiety Disorders, Behaviour Research and Therapy, International
Journal of Eating Disorders, Schizophrenia Bulletin, Bipolar Disorders,
Internet Interventions; Acta Psychiatrica Scandinavica, Nordic Journal of
Psychiatry, Läkartidningen, Cognitive Behaviour Therapy. Their articles get
a "Priority journal" badge and come first within each study design.

New articles go to **Research** in the top bar, **ranked by study design**:
meta-analyses (5), systematic reviews and guidelines (4), randomized
controlled trials (3), other clinical trials (2), trial registrations (1);
priority journals first within each. Comments, letters, editorials,
preprints and retracted papers are left out. Each article shows which
sources found it. **Nothing is added to the disorder information
automatically**: a research reviewer opens the article, then rejects it or
approves it with a short summary **in both English and Swedish** (the
article title stays in English, marked as the original title). Decisions
are final and in the audit log. "Search now" starts a search at once.

**Swedish guidance: yearly check.** SBU, Socialstyrelsen, Kunskapsstyrning
vård and Läkemedelsverket have no feed or search interface the app can
read, and their guidance changes every few years, so a research reviewer
checks each one by hand once a year (`src/guidance.js`). The Research page
links to each, says what to look for, and records who checked, when, and
whether the disorder information needs updating (a note is then required).
The start page reminds reviewers when a check is due.

- **Research reviewers** are named by an administrator on the
  Administration page. Only reviewers may approve, reject, start a search
  or record a guidance check; until one is named, nobody can.
- `EVIDENCE_SOURCES` limits the sources (default
  `pubmed,europepmc,clinicaltrials`). `EVIDENCE_WATCH=off` turns the watch off.
- `NCBI_EMAIL`, `NCBI_API_KEY`: NCBI asks for a contact email and allows
  more requests with a free API key. Use a service mailbox, not a person's.
- Only the disorder search terms and dates are sent; never patient data.
- The server needs to reach `eutils.ncbi.nlm.nih.gov`, `www.ebi.ac.uk` and
  `clinicaltrials.gov`. Behind a proxy, start Node with
  `NODE_USE_ENV_PROXY=1` (Node 22.21 or later), because Node's built-in
  `fetch` ignores `HTTPS_PROXY` otherwise.

The ranking is by study design and journal only. It does not judge the
quality, size or relevance of a study: that is the reviewer's job.

## Who can see a patient

Every clinician page, the patient records included, needs a login.
Patients are **assigned to a clinician**: the clinician's name is linked to
the patient (and so to the personal number), and the assignment history is
kept (`src/access.js`). Who may see a patient:

| Who | Access |
| --- | --- |
| The clinician the patient is assigned to now (treating clinician) | Reads and changes the file; gets the "results ready" emails |
| Clinicians the patient was assigned to before ("have worked with") | Read-only. With `FORMER_ACCESS_MONTHS` set, only for that many months after the assignment ended |
| A supervisor or close colleague the treating clinician names | Read-only, with a reason and an optional end date |
| Administrators (the highest access) | Read-only for every patient; assign and reassign patients; make other administrators; name research reviewers |
| Everyone else | "Not found", as if the record did not exist |

- A new patient is assigned to the clinician who registers them.
- **Administration** (top bar, administrators only) lists every patient
  with their treating clinician, searchable by personal number or name and
  filterable by clinician. "Assign" moves a patient to another clinician
  with a **reason**; the earlier clinician keeps read-only access. The
  start page still lists only the administrator's own patients.
- Under **Clinicians** on the same page, an administrator makes other
  clinicians administrators or research reviewers, and takes the roles away
  again. There is always at least one administrator: the last one cannot
  step down. Every change is in the audit log.
- The first administrator is set up on the server:
  `npm run create-clinician -- "Name" email --admin`.
- Only the treating clinician can grant or revoke colleague access and
  delete the record. Assignments, grants, revocations and every view are in
  the audit log.
- One shared access condition is used in every query that loads patient
  data, so no page can forget the check.

> **Wide access needs a decision by the care provider.** Patientdatalagen
> allows access to a patient's record only for those who take part in the
> patient's care or otherwise need it for their work, and the care
> provider must decide who gets which access (a needs analysis) and check
> the access logs regularly. Before real use, decide who should be an
> administrator, and whether former clinicians should keep access without
> a limit (`FORMER_ACCESS_MONTHS`).

## How long data is kept

GDPR sets no fixed periods: data may be kept "no longer than necessary"
(Article 5(1)(e)), unless a law requires keeping it. For Swedish health
records, Patientdatalagen requires at least 10 years after the last
entry. The periods are set in `.env` (`src/retention.js`):

| Data | Default | Then |
| --- | --- | --- |
| Patient records | 10 years after the last entry | Listed on **Retention** for the treating clinician to review and delete (never automatic: ongoing care or a legal hold may require keeping them) |
| Questionnaires never completed, including drafts | 30 days after the link expired or was cancelled | Deleted automatically |
| Audit log entries | 10 years | Deleted automatically |
| Expired logins | – | Deleted automatically |

Automatic deletion runs when the server starts and once a day; it can
also be run by hand with `npm run retention`. Each patient page shows the
date until which the record is kept. Emails sent to clinicians are outside
the app: delete them according to the same rules.

## Languages

Two languages are set separately: the clinician's own, and the patient's.

**The clinician's language.** After logging in, each clinician chooses
**English or Svenska** in the top bar (the current one is marked). The
choice is saved on their account and used for all clinician pages and for
the "results ready" emails they get. The login page has the same choice.

**The patient's language.** The clinician records the patient's
**preferred language** when registering the patient (it starts as the
clinician's own language). It is preselected whenever the clinician sends
a questionnaire link, starts an on-site questionnaire or a follow-up; if
the clinician picks the other language there, that becomes the patient's
new preference. From then on **everything the patient sees is in that
language only**: the information page, every questionnaire page with its
top bar, buttons and footer, the break, saved and thank-you pages, and the
"link not valid" page. The patient cannot switch language; if the language
is wrong, the clinician sends a new link. On site, the questionnaire pages
(including the clinician's menu and buttons on them) are in the patient's
language too; the clinician's own language returns on the next clinician
page. A test renders every patient page in both languages and fails if any
text from the other language appears (`test/patient-language.test.js`).

Patient texts are in `src/i18n.js`. The PDF report follows the language
of the clinician who downloads it. The interface
text, the forms (interview, MSE, risk, informant) and the server messages
are translated (`src/i18n-clinician.js`, `src/i18n-clinician-sv.js`); a
test fails if a text on the clinician pages has no Swedish translation.
The clinical content (disorder names, criteria, rule-out reasons,
suggestion reasons, the differential report) is translated too, with an
unofficial Swedish clinical dictionary (TRA-6 in the validation plan).

> **The Swedish PHQ-9, GAD-7, AUDIT-C and PC-PTSD-5 wording is an
> unofficial translation written for this app.** Validated Swedish
> versions exist. Changed wording can change how an instrument performs,
> so replace them with the official translations before real use. The
> other Swedish questions should be checked by a native speaker.

## Emails

Emails to clinicians contain **no names, personal numbers or health
information**: only that results are ready (marked urgent when they need
review today), an assessment number and a link to log in.

## Data protection features

- **Information page** before the questionnaire (template text in
  `src/i18n.js` for your data protection officer to adapt), with the time
  of confirmation saved.
- **Audit log** of every view and change of a patient's information
  (`src/audit.js`), shown per patient. Edits record which fields changed,
  not the new values. The log is kept even after a record is deleted.
- **Edit patient details**, with the same checks as a new patient.
- **Delete a patient record** only after typing the last name. Health
  records usually must be kept for a set time (in Sweden at least 10 years
  under Patientdatalagen), so this is meant for records created by mistake.
- **Reopen** a finalized assessment only with a reason, kept in a change
  history.

## Security measures already in place

- Clinicians log in with a password (stored as a slow scrypt hash). Each
  clinician sees only their own patients.
- Patient links contain a 256-bit random token; only a hash of it is stored.
  Links expire (14 days by default), work once, and creating a new link
  cancels the old one.
- The patient page shows no personal details, in case a link is forwarded.
- All inserted text is HTML-escaped; strict Content-Security-Policy; no
  caching of pages; login attempts are rate-limited; posts from other
  websites are rejected.
- Emails mask the personal number (last 4 digits only) unless
  `EMAIL_INCLUDE_PERSONAL_NUMBER=true`. The SMTP connection requires TLS.

## Validation

**[docs/VALIDATION-PLAN.md](docs/VALIDATION-PLAN.md)** lists everything that
is not validated (74 of the 105 questions, the rules, the clinical content
and the translations) and how to validate or replace it: replace an item
with a validated instrument where one exists, or check it against a full
diagnostic interview (gold standard). It is a living document: the source
of every question is recorded in `src/item-sources.js`, and `npm test`
fails if a new question is not classified, or not listed in the plan.

## Before real patients use this

This app handles health data linked to identity numbers. In the EU/Sweden
that is special-category data under GDPR, and software that gives
diagnostic support can fall under the EU Medical Device Regulation (MDR).
Before using it with real patients, at minimum:

- [ ] Run it only over **HTTPS** (`BASE_URL=https://...`).
- [ ] Decide with your data protection officer whether results may go by
      **ordinary email** at all. Safer: email only "results are ready" and
      read the results in the portal.
- [ ] Encrypt the database at rest and set up backups.
- [ ] Add an audit log (who viewed which patient, when).
- [ ] Have clinicians review `src/scoring.js`, `src/differential.js`,
      `src/suggestions.js`, every criteria label and rule in
      `src/disorders.js`, the rule-out lists in `src/differential-lists.js`,
      the combination rules in `src/conflicts.js`, and the ICD-10 codes
      against ICD-10-SE.
- [ ] Get the screening questions written for this tool validated, or
      replace them with validated instruments (they are not validated).
- [ ] Clarify the medical device (MDR) classification. Software that
      suggests diagnoses is likely class IIa or higher.
- [ ] Decide how 16–17-year-olds consent and who may see their results.
- [ ] Replace the Swedish PHQ-9, GAD-7, AUDIT-C and PC-PTSD-5 items with
      the official validated translations.
- [ ] Have the data protection officer rewrite the patient information
      text (legal basis, retention, access, rights).
- [ ] Confirm the retention periods (`.env`) with the data protection
      officer, including how long audit logs must be kept.
- [ ] Check the Swedish clinician texts with a Swedish-speaking clinician.
- [ ] Have clinicians review the intake interview, risk assessment and
      safety plan forms against your organisation's routines.
- [ ] Use a validated translation if patients answer in another language
      (official PHQ-9 and GAD-7 translations exist, including Swedish).
- [ ] Check the MDR classification question with your organisation.
- [ ] Set `CRISIS_TEXT` to the right crisis numbers for your service.
- [ ] Test on the real iPads and Android devices you will use
      (`npm run check:devices` covers emulated ones only).

## Licence of the questionnaires

PHQ-9 and GAD-7 were developed by Drs. Robert L. Spitzer, Janet B.W.
Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer
Inc. No permission is required to reproduce, translate, display or
distribute them. The DSM-5-TR criteria are copyrighted by the American
Psychiatric Association; this app paraphrases them and does not reproduce
the criteria text.
