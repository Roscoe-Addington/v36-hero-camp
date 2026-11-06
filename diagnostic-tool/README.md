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
   **Conduct on site** (the clinician goes through the questions with the
   patient on the same device).
2. **Intake screening.** 95 questions (about 25 minutes): PHQ-9, GAD-7,
   GAD criteria items, mood history, psychotic experiences (timing and
   duration), AUDIT-C, drugs, medicines, health, life events, other
   anxiety disorders, obsessive-compulsive and related symptoms,
   PC-PTSD-5, personality traits, memory and neurological symptoms.
3. **Clinician intake.** On site, the clinician enters the **MoCA** domain
   scores (the app adds them up and adds 1 point for 12 years of education
   or fewer), signs of **delirium** and **catatonia** they observe, and
   interview notes.
4. **Suggestions.** The app lists the disorders to assess in depth, each
   marked *Suggested* or *Consider*, with the reasons from the screening.
   The clinician can also open any other disorder.
5. **In-depth assessment.** For each disorder, the clinician rates every
   DSM-5-TR criterion as *present*, *absent* or *unclear* and picks
   specifiers (e.g. severity). The app shows whether the criteria are
   **met**, **not met** or still **incomplete**, and the ICD-10 code.
6. **Diagnosis.** The clinician confirms diagnoses. Confirming one whose
   criteria are not met requires a written reason. The app checks every
   combination of diagnoses (see below).
7. **Final report.** Finalizing locks the assessment and produces a report
   with the diagnoses, ICD-10 codes, checklist results, MoCA and screening
   summary.

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
src/email.js           the email to the clinician
src/views.js           the HTML pages
src/auth.js            passwords, login sessions, link tokens
src/db.js              database tables (SQLite file in data/)
scripts/create-clinician.js
test/                  automated tests
```

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
