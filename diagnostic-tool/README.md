# Mental Health Assessment

A web app that supports a clinician through the whole assessment of a
patient aged **16 or older**, from the intake screening to a confirmed
diagnosis with an ICD-10 code.

It covers seven groups of DSM-5-TR disorders (52 in total):

| Group | Disorders |
| --- | --- |
| Mood disorders | Major depressive disorder, persistent depressive disorder, PMDD, DMDD (under 18 only), bipolar I and II, cyclothymic disorder, substance/medication-induced and medical-condition mood disorders |
| Anxiety disorders | Separation anxiety, selective mutism, specific phobia, social anxiety, panic disorder, agoraphobia, GAD, substance/medication-induced and medical-condition anxiety disorders |
| Personality disorders | All 10 (paranoid, schizoid, schizotypal, antisocial, borderline, histrionic, narcissistic, avoidant, dependent, obsessive-compulsive) |
| Neurocognitive disorders | Delirium, major neurocognitive disorder (dementia), mild neurocognitive disorder |
| Schizophrenia spectrum and other psychotic disorders | Delusional disorder, brief psychotic disorder, schizophreniform disorder, schizophrenia, schizoaffective disorder, substance/medication-induced and medical-condition psychotic disorders, catatonia (schizotypal personality disorder is listed with the personality disorders) |
| Trauma- and stressor-related disorders | PTSD, acute stress disorder, adjustment disorder, prolonged grief disorder, reactive attachment disorder and disinhibited social engagement disorder (both childhood-onset) |
| Obsessive-compulsive and related disorders | OCD, body dysmorphic disorder, hoarding disorder, trichotillomania, excoriation (skin-picking) disorder, substance/medication-induced and medical-condition OCRD |

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
   **Conduct on site**, and the questionnaire language (English or Swedish).
2. **Intake screening.** The patient first confirms an information page
   (on site, the clinician confirms the patient was informed). Then 95
   questions (about 25 minutes): PHQ-9, GAD-7, GAD criteria items, mood
   history, psychotic experiences, AUDIT-C, drugs, medicines, health, life
   events, other anxiety disorders, obsessive-compulsive and related
   symptoms, PC-PTSD-5, personality traits, memory and neurological
   symptoms, shown **one part per page** (10 pages) with a **progress
   bar**. Follow-up questions ("If so…") are only asked when they apply
   (**skip logic**, 13 questions), so many patients answer about 82. After
   parts 3 and 6 the patient rates **how tired they feel** (0–10); 7 or
   more offers a **break**. Answers are saved page by page and can be
   continued later from the same link.
3. **Intake interview.** A structured psychiatric history: reason and
   onset, previous diagnoses and treatment, previous suicide attempts and
   self-harm, family history, medical history and medicines, pregnancy,
   substance use, social situation and development, and a **mental status
   examination**.
4. **MoCA and observed signs.** On site, the clinician enters the **MoCA**
   domain scores (the app adds them up and adds 1 point for 12 years of
   education or fewer), and signs of **delirium** and **catatonia**.
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

## Project layout

```
src/server.js          URLs and what happens on each one
src/questionnaire.js   the questions and answer options
src/scoring.js         the scoring rules  <- the clinical logic
src/differential.js    the differential diagnosis rules
src/suggestions.js     which disorders to assess in depth, and why
src/disorders.js       the 31 disorders: criteria, rules, ICD-10 codes
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
src/access.js          who may see a patient (treating clinician + named colleagues)
src/retention.js       how long data is kept, and automatic cleanup
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

## Who can see a patient

Only the **treating clinician** (who created the patient) and the
**supervisors or close colleagues they name** can see a patient
(`src/access.js`). Everyone else gets "not found", as if the record did
not exist.

- A grant needs the colleague's clinician account, a role (supervisor or
  close colleague), a **reason**, and optionally an **end date**.
- Only the treating clinician can grant or revoke access and delete the
  record. Grants, revocations and every view are in the audit log.
- One shared access condition is used in every query that loads patient
  data, so no page can forget the check.

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

Patient pages (information page, questionnaire, follow-up, thank-you
page) are in **English or Swedish** (`src/i18n.js`). The clinician picks
the language when starting; the patient can switch.

Clinician pages are in **English or Swedish** too: each clinician switches
in the menu, and the choice is saved on their account. The PDF report
follows the language of the clinician who downloads it. The interface
text, the forms (interview, MSE, risk, informant) and the server messages
are translated (`src/i18n-clinician.js`, `src/i18n-clinician-sv.js`); a
test fails if a text on the clinician pages has no Swedish translation.
**Still in English:** disorder names, criteria, rule-out reasons,
suggestion reasons and the differential report. They need the official
Swedish DSM-5-TR terminology (TRA-3 in the validation plan).

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
is not validated (68 of the 95 questions, the rules, the clinical content
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

## Licence of the questionnaires

PHQ-9 and GAD-7 were developed by Drs. Robert L. Spitzer, Janet B.W.
Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer
Inc. No permission is required to reproduce, translate, display or
distribute them. The DSM-5-TR criteria are copyrighted by the American
Psychiatric Association; this app paraphrases them and does not reproduce
the criteria text.
