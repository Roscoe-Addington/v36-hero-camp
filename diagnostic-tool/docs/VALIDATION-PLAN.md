# Validation plan

What in Continuum (the assessment app) has not been validated, and how
to validate it. This is a **living document**: update it whenever the app
changes (see [How to keep this plan up to date](#how-to-keep-this-plan-up-to-date)).

- **Owner:** _(name of the person responsible)_
- **Last reviewed:** _(date)_
- **Status:** No validation work has started. Not for use with real patients.

## Contents

1. [Summary](#1-summary)
2. [The two routes](#2-the-two-routes)
3. [Item register](#3-item-register)
4. [Replacement candidates](#4-replacement-candidates)
5. [Gold-standard study protocol](#5-gold-standard-study-protocol)
6. [Rules, algorithms and clinical content](#6-rules-algorithms-and-clinical-content)
7. [Translations](#7-translations)
8. [Order of work](#8-order-of-work)
9. [How to keep this plan up to date](#how-to-keep-this-plan-up-to-date)
10. [Change log](#change-log)

## 1. Summary

The intake screening has **95 questions**:

| Source | Items | What it means |
| --- | --- | --- |
| Validated instruments, original wording | 27 | PHQ-9, GAD-7, AUDIT-C, PC-PTSD-5. Their English versions are validated. |
| Adapted from a validated instrument | 9 | SAPAS (8 items, reworded for self-report) and a single-question drug screen (reworded). The original validation does not automatically carry over. |
| Written for this app | 59 | Not validated. |

On top of the questions, the app contains **rules and clinical content**
that also need checking: the suggestion rules, differential screening,
rule-out lists, conflict rules, response-quality thresholds, 52 sets of
diagnostic criteria labels, ICD-10 codes, and the clinician forms (section 6).

**Validating a question is more than factor analysis.** For screening
questions the key evidence is **diagnostic accuracy against a gold
standard**: how many people with the disorder the question finds
(sensitivity) and how many without it it correctly clears (specificity).
Factor analysis is only relevant for groups of items meant to measure one
thing (section 5.6).

## 2. The two routes

For each non-validated item, choose one:

| Route | When | What to do |
| --- | --- | --- |
| **R: Replace** | A validated instrument exists for the same purpose, with a usable licence and (ideally) a Swedish version. | Replace the item(s) with the instrument. Use the instrument's own scoring and cut-offs. Record the licence. **Preferred**: it is far cheaper than a new validation study. |
| **G: Gold standard** | No suitable instrument exists. | Validate the item against a full diagnostic interview (section 5). |
| **C: Clinician** | The item asks about something a questionnaire cannot judge well (e.g. medical causes, neurological symptoms), or the disorder is too rare to validate. | Move it to the clinician's interview, or keep it only as a prompt for the interview, and check it by expert review instead of a validation study. |

Every item, whatever the route, also needs **cognitive interviews**
(section 5.2): patients thinking aloud while answering, to check that they
understand the question as intended.

## 3. Item register

One row per item that needs validation. The item IDs are those in
`src/questionnaire.js`; the source of every item is recorded in
`src/item-sources.js`. **A test fails if an adapted or own item is missing
here.**

Status values: **Open**, **Planned**, **In progress**, **Replaced**,
**Validated**, **Moved to clinician**, **Removed**.

### 3.1 Generalized anxiety: 6-month criteria (Part 3)

| Item | Measures | Source | Route | Plan | Status |
| --- | --- | --- | --- | --- | --- |
| `gadA` | GAD criterion A: excessive worry, 6+ months | own | R or G | Replace with GAD-Q-IV, or validate items gadA–gadC6 together against the interview diagnosis of GAD | Open |
| `gadB` | GAD criterion B: hard to control | own | R or G | As gadA | Open |
| `gadC1` | GAD criterion C: restlessness | own | R or G | As gadA | Open |
| `gadC2` | GAD criterion C: easily tired | own | R or G | As gadA | Open |
| `gadC3` | GAD criterion C: concentration | own | R or G | As gadA | Open |
| `gadC4` | GAD criterion C: irritability | own | R or G | As gadA | Open |
| `gadC5` | GAD criterion C: muscle tension | own | R or G | As gadA | Open |
| `gadC6` | GAD criterion C: sleep | own | R or G | As gadA | Open |

### 3.2 Mood over time (Part 4)

| Item | Measures | Source | Route | Plan | Status |
| --- | --- | --- | --- | --- | --- |
| `bp1` | Past hypomanic or manic period | own | R | Replace bp1–bp3 with the MDQ or HCL-32 | Open |
| `bp2` | Reduced need for sleep in that period | own | R | As bp1 | Open |
| `bp3` | Noticed by others or caused problems | own | R | As bp1 | Open |
| `pdd1` | Depressed mood for 2+ years (dysthymia) | own | G | No brief validated screener known: validate against interview diagnosis of persistent depressive disorder | Open |
| `cyclo1` | Mood swings for 2+ years (cyclothymia) | own | R or G | Covered in part by the HCL-32; otherwise validate against interview | Open |
| `psy1` | Hallucinations or persecutory ideas | own | R or G | Consider the PQ-B; otherwise validate against interview diagnoses of psychotic disorders | Open |
| `psy2` | Psychosis only during mood episodes | own | C | Timing is judged in the interview; keep as a prompt | Open |
| `psy3` | Psychosis for more than a month | own | C | As psy2 | Open |

### 3.3 Alcohol, drugs, medicines and health (Part 5)

| Item | Measures | Source | Route | Plan | Status |
| --- | --- | --- | --- | --- | --- |
| `drug1` | Non-medical drug use, past 12 months | adapted | R | Replace with DUDIT (or DUDIT-C), or use the original single-question wording | Open |
| `caf1` | High caffeine intake | own | C | Ask in the interview (substance use section) | Open |
| `med1` | Onset linked to a medicine change | own | C | Medication review in the interview | Open |
| `medcond` | Ongoing physical illness | own | C | Medical history in the interview | Open |
| `medonset` | Onset with illness, injury, pregnancy or birth | own | C | As medcond | Open |

### 3.4 Life events (Part 6)

| Item | Measures | Source | Route | Plan | Status |
| --- | --- | --- | --- | --- | --- |
| `stress1` | Stressor before onset (adjustment disorder) | own | R | Replace with ADNM-4 (or ADNM-20) | Open |
| `grief1` | Bereavement and timing | own | K | Factual question; check by cognitive interviews | Open |
| `grief2` | Intense longing or preoccupation (prolonged grief) | own | R | Replace with PG-13-R | Open |
| `pmdd1` | Symptoms linked to the premenstrual week | own | R | Replace with the PSST; diagnosis needs prospective daily ratings (DRSP) anyway | Open |

_K: keep the factual question; cognitive interviews only._

### 3.5 Other worries, fears and habits (Part 7)

| Item | Measures | Source | Route | Plan | Status |
| --- | --- | --- | --- | --- | --- |
| `panic1` | Panic attack, past 4 weeks | own | R | Replace panic1–panic2 with the PHQ panic module | Open |
| `panic2` | Worry about further attacks or avoidance | own | R | As panic1 | Open |
| `soc1` | Social fear or avoidance | own | R | Replace soc1–soc2 with the Mini-SPIN | Open |
| `soc2` | Worry mainly about others' opinions | own | R | As soc1 | Open |
| `ocd1` | Obsessions | own | R | Replace ocd1–ocd2 with the OCI-4 or OCI-R | Open |
| `ocd2` | Compulsions | own | R | As ocd1 | Open |
| `ill1` | Health worry | own | R | Replace with the Whiteley Index-7 or SHAI (short) | Open |
| `phobia1` | Specific phobia | own | R or G | Consider the DSM-5 Severity Measure for Specific Phobia; otherwise validate | Open |
| `agora1` | Agoraphobic situations | own | R | Replace with the DSM-5 Severity Measure for Agoraphobia | Open |
| `sep1` | Separation anxiety | own | R | Replace with the ASA-27 (Adult Separation Anxiety Questionnaire) | Open |
| `bdd1` | Appearance preoccupation (BDD) | own | R | Replace with the BDDQ | Open |
| `hoard1` | Difficulty discarding, clutter | own | R | Replace with the HRS-SR | Open |
| `trich1` | Hair pulling | own | R | Replace with the MGH-HPS | Open |
| `skin1` | Skin picking | own | R | Replace with the SPS-R | Open |
| `mutism1` | Selective mutism | own | C | Too rare to validate in a clinic sample (section 5.5); keep as an interview prompt | Open |

### 3.6 Difficult experiences (Part 8)

| Item | Measures | Source | Route | Plan | Status |
| --- | --- | --- | --- | --- | --- |
| `ptsd_recent` | Trauma within the past month (acute stress vs PTSD) | own | K | Factual question; check by cognitive interviews | Open |

### 3.7 How you usually are (Part 9)

| Item | Measures | Source | Route | Plan | Status |
| --- | --- | --- | --- | --- | --- |
| `pd1` | SAPAS area: friendships | adapted | R | Use the original SAPAS (as an interview) or the validated SAPAS self-report version, with its own cut-off | Open |
| `pd2` | SAPAS area: loner | adapted | R | As pd1 | Open |
| `pd3` | SAPAS area: trust | adapted | R | As pd1 | Open |
| `pd4` | SAPAS area: temper | adapted | R | As pd1 | Open |
| `pd5` | SAPAS area: impulsivity | adapted | R | As pd1 | Open |
| `pd6` | SAPAS area: worry | adapted | R | As pd1 | Open |
| `pd7` | SAPAS area: dependence | adapted | R | As pd1 | Open |
| `pd8` | SAPAS area: perfectionism | adapted | R | As pd1 | Open |
| `pd9` | Schizotypal traits | own | R | Replace with the SPQ-B | Open |
| `pd10` | Histrionic trait | own | R | Replace pd10–pd13 with a validated PD screen (e.g. IPDE screening questionnaire, or PDQ-4+ if licensed) | Open |
| `pd11` | Narcissistic trait | own | R | As pd10 | Open |
| `pd12` | Antisocial trait | own | R | As pd10 | Open |
| `pd13` | Avoidant trait | own | R | As pd10 | Open |
| `pd14` | Borderline: stormy relationships | own | R | Replace pd14–pd19 with the MSI-BPD | Open |
| `pd15` | Borderline: fear of abandonment | own | R | As pd14 | Open |
| `pd16` | Self-harm (also used for the risk check) | own | R | As pd14; keep a self-harm question for safety whatever the route | Open |
| `pd17` | Borderline: emptiness | own | R | As pd14 | Open |
| `pd18` | Borderline: identity | own | R | As pd14 | Open |
| `pd19` | Borderline: mood changes within hours | own | R | As pd14 | Open |

### 3.8 Memory and the nervous system (Part 10)

| Item | Measures | Source | Route | Plan | Status |
| --- | --- | --- | --- | --- | --- |
| `cog1` | Subjective memory decline | own | R | Replace cog1–cog2 with the AD8 (ideally answered by an informant) | Open |
| `cog2` | Memory affects everyday life | own | R | As cog1 | Open |
| `neuro1` | Seizures or blackouts | own | C | Red-flag prompts: expert review by a neurologist; follow up referral outcomes | Open |
| `neuro2` | New focal weakness or numbness | own | C | As neuro1 | Open |
| `neuro3` | New speech or vision loss | own | C | As neuro1 | Open |
| `neuro4` | Tremor, stiffness, slowness | own | C | As neuro1 | Open |
| `neuro5` | New severe headache | own | C | As neuro1 | Open |
| `neuro6` | Head injury with loss of consciousness | own | C | As neuro1 | Open |

## 4. Replacement candidates

Before replacing, check for each instrument: **licence** (some are free
for clinical use, some need permission or a fee, and digital use is often
licensed separately), a **validated Swedish version**, **age range** (the
app is for 16+), and **length** (the questionnaire is already long). All
licence notes below are **to be verified**; none has been checked.

| Instrument | Replaces | Items | Licence (verify) | Swedish version (verify) |
| --- | --- | --- | --- | --- |
| MDQ (Mood Disorder Questionnaire) | bp1–bp3 | 15 | Reported free for clinical use | Yes (verify) |
| HCL-32 (Hypomania Checklist) | bp1–bp3, cyclo1 | 32 | Verify | Yes (verify) |
| PQ-B (Prodromal Questionnaire, Brief) | psy1 | 21 | Verify | Verify |
| DUDIT / DUDIT-C | drug1 | 11 / 4 | Free (developed in Sweden; verify) | Yes |
| ADNM-4 / ADNM-20 | stress1 | 4 / 20 | Verify | Verify |
| PG-13-R | grief2 | 13 | Verify | Verify |
| PSST | pmdd1 | 19 | Verify | Verify |
| PHQ panic module | panic1–panic2 | 15 | Public domain (Pfizer PHQ; verify) | Verify |
| Mini-SPIN | soc1–soc2 | 3 | Verify | Yes (verify) |
| OCI-4 / OCI-R | ocd1–ocd2 | 4 / 18 | Verify | Yes (verify) |
| Whiteley Index-7 / SHAI (short) | ill1 | 7 / 18 | Verify | Yes (verify) |
| DSM-5 Severity Measures (agoraphobia, specific phobia) | agora1, phobia1 | 10 each | APA: may be reproduced by clinicians (verify) | Verify |
| ASA-27 | sep1 | 27 | Verify | Verify |
| BDDQ | bdd1 | 4–6 | Verify | Verify |
| HRS-SR (Hoarding Rating Scale) | hoard1 | 5 | Verify | Verify |
| MGH-HPS | trich1 | 7 | Verify | Verify |
| SPS-R (Skin Picking Scale) | skin1 | 8 | Verify | Verify |
| SAPAS (original / self-report version) | pd1–pd8 | 8 | Verify | Verify |
| SPQ-B | pd9 | 22 | Verify | Verify |
| IPDE screening questionnaire / PDQ-4+ | pd10–pd13 | 59 / 99 | IPDE: WHO (verify); PDQ-4+: fee (verify) | Verify |
| MSI-BPD | pd14–pd19 | 10 | Verify | Yes (verify) |
| AD8 | cog1–cog2 | 8 | Copyrighted; free for clinical use with permission (verify) | Yes (verify) |
| GAD-Q-IV | gadA–gadC6 | 9 | Verify | Verify |

Replacing everything above would make the questionnaire much longer.
Decide per disorder whether a screening question is needed at all, or
whether the clinician interview is enough (route C).

## 5. Gold-standard study protocol

For items on route **G**, and to validate the app's suggestions as a whole
(section 6).

### 5.1 Design

A **cross-sectional diagnostic accuracy study**: every participant answers
the app's questionnaire (the *index test*) and, separately, has a **full
structured diagnostic interview** (the *reference standard*). Report it
following **STARD 2015**.

- **Population:** people aged 16+ referred to the services that will use
  the app (e.g. adult psychiatric outpatient intake), consecutively
  recruited, so the sample matches real use.
- **Reference standard:**
  - Mood, anxiety, psychotic, trauma and OCD-related disorders: **SCID-5-CV**
    (or MINI 7.x) by trained interviewers.
  - Personality disorders: **SCID-5-PD**.
  - PTSD: **CAPS-5** where PTSD is in question.
  - Neurocognitive disorders: clinical consensus diagnosis (memory clinic
    work-up), not a questionnaire.
- **Blinding:** the interviewer does not see the app's answers or
  suggestions, and the questionnaire is completed before the interview.
- **Timing:** questionnaire and interview within 2 weeks of each other.
- **Outcomes per item (or item group):** sensitivity, specificity,
  positive and negative predictive values, likelihood ratios, and the area
  under the ROC curve for scored item groups, all with 95% confidence
  intervals. Cut-offs are chosen in one sample and checked in another (or
  by cross-validation), so the accuracy is not overestimated.

### 5.2 Cognitive interviews (before the main study)

10–20 patients per language think aloud while answering. Look for
questions that are misunderstood, ambiguous, upsetting, or answered in
different ways for the same experience. Revise, then repeat with a few new
patients. Do this for every own or adapted item, in English and Swedish.

### 5.3 Reliability

**Test-retest:** a subsample (about 100) answers again after 1–2 weeks,
without treatment changes. Report Cohen's kappa for yes/no items and the
intraclass correlation for scores.

### 5.4 Sample size

The number of people **with** each disorder sets the size. To estimate a
sensitivity of 0.85 within ±0.10 (95% CI), you need about
**1.96² × 0.85 × 0.15 / 0.10² ≈ 49 people with the disorder** (Buderer,
1996); within ±0.075 you need about 87. The total sample is that number
divided by the disorder's prevalence in the clinic:

| Example prevalence in the clinic (illustrative) | Total participants for 49 cases |
| --- | --- |
| 40% (e.g. depression) | about 125 |
| 25% (e.g. GAD) | about 200 |
| 10% (e.g. panic disorder) | about 490 |
| 5% (e.g. OCD) | about 980 |
| 2% (e.g. BDD) | about 2 450 |
| 0.2% (e.g. selective mutism) | about 24 500 |

Use the real prevalences from your own clinic. Disorders too rare to
validate this way should go to route **R** (an instrument validated
elsewhere) or route **C**.

### 5.5 Rare disorders

Selective mutism, disinhibited social engagement disorder, reactive
attachment disorder, DMDD and catatonia are too rare (or too
childhood-specific) for a clinic validation sample. Do not rely on a
screening question for them: keep them as clinician-assessed checklists.

### 5.6 Where factor analysis fits

Only for **groups of items meant to measure one thing**: the GAD 6-month
items (gadA–gadC6), the personality items (pd1–pd19, if kept), or a
replacement instrument used in a new population. Use confirmatory factor
analysis (ordinal data, so WLSMV estimation) with about 200+ participants,
and report it following **COSMIN**. Factor analysis does not show whether
an item finds the right patients; section 5.1 does.

### 5.7 Ethics and data protection

- Ethical approval before the study (in Sweden: **Etikprövningsmyndigheten**).
- Written informed consent; for 16–17-year-olds, follow the rules for minors.
- A data protection impact assessment (GDPR Article 35) for the study data.
- Pre-register the protocol (e.g. on ClinicalTrials.gov or OSF).

## 6. Rules, algorithms and clinical content

These are not questions, but they decide what the clinician sees.

| ID | Component | File | How to check | Status |
| --- | --- | --- | --- | --- |
| ALG-1 | Suggestions for in-depth assessment | `src/suggestions.js` | In the gold-standard study: compare each *Suggested* / *Consider* with the reference diagnoses (sensitivity, specificity per disorder). | Open |
| ALG-2 | Differential screening for MDD and GAD | `src/differential.js` | Same study; expert review of each rule. | Open |
| ALG-3 | Rule-out lists (52 disorders) | `src/differential-lists.js` | Expert review against DSM-5-TR by two psychiatrists independently; resolve disagreements. | Open |
| ALG-4 | Conflict rules for diagnoses | `src/conflicts.js` | Expert review against DSM-5-TR and ICD-10 coding rules. | Open |
| ALG-5 | Response-quality thresholds (2 s per question; tiredness 7/10) | `src/response-quality.js` | Compare flagged and unflagged patients for test-retest agreement and agreement with the interview; adjust thresholds. | Open |
| ALG-6 | Personality screen cut-off (3 of 8) and borderline count (5 of 8) | `src/suggestions.js` | Replaced by the cut-offs of the chosen instruments (route R), or set from the study. | Open |
| ALG-7 | MoCA cut-offs (26, bands) and education point | `src/moca.js` | Check against published Swedish norms; consider a lower cut-off (23–24). | Open |
| CON-1 | Criteria labels, rules and specifiers for 52 disorders | `src/disorders.js` | Expert review against the DSM-5-TR text, rule by rule; the test suite already checks that each rule works. | Open |
| CON-2 | ICD-10 codes | `src/disorders.js` | Check every code against ICD-10-SE. | Open |
| CON-3 | Intake interview and mental status examination form | `src/clinical-forms.js` | Expert review against local intake routines. | Open |
| CON-4 | Suicide risk assessment and safety plan form | `src/clinical-forms.js` | Expert review against national guidance; by design it gives no risk score, so no predictive validation is planned. | Open |
| CON-5 | Red-flag neurological prompts | `src/suggestions.js` | Neurologist review; audit of referrals. | Open |

## 7. Translations

| ID | What | Plan | Status |
| --- | --- | --- | --- |
| TRA-1 | Swedish PHQ-9, GAD-7, AUDIT-C, PC-PTSD-5 (unofficial translation in `src/i18n.js`) | Replace with the official validated Swedish versions; do not validate our own translation. | Open |
| TRA-2 | Swedish wording of the own and adapted items | Forward translation by two translators, reconciliation, back-translation, review, then cognitive interviews in Swedish (ISPOR / WHO translation guidance). Items replaced by instruments use the instrument's official Swedish version instead. | Open |
| TRA-3 | Swedish clinical terms on the clinician pages | Interface, forms and messages are translated (`src/i18n-clinician-sv.js`). Still in English: disorder names, criteria labels, specifiers, rule-out reasons, conflict messages, suggestion reasons, the differential report and the MoCA error messages. Use the official Swedish DSM-5-TR terminology (licensed) and ICD-10-SE names; do not invent terms. | Open |
| TRA-5 | Swedish interface text on the clinician pages and in the emails to clinicians; the Swedish copyright footer on the patient pages | Review by a Swedish-speaking clinician (written for this app). | Open |
| TRA-4 | Patient information text (consent page) | Written by the data protection officer in both languages. | Open |

## 8. Order of work

1. **Decide route R / G / C for each item** (section 3), with clinicians.
2. **Check licences and Swedish versions** of the chosen instruments (section 4).
3. **Replace** items on route R in the app; update `src/item-sources.js` and this plan.
4. **Expert reviews** of the clinical content (section 6, CON-1 to CON-5, ALG-3, ALG-4) and Swedish terminology (TRA-3).
5. **Cognitive interviews** in English and Swedish (section 5.2).
6. **Ethics application** and pre-registration (section 5.7).
7. **Gold-standard study** for route G items and the suggestions (section 5).
8. **Update cut-offs and rules** from the results; report the study.

## How to keep this plan up to date

- **Adding or changing a question:** record its source in
  `src/item-sources.js` (`validated`, `adapted` or `own`). If it is adapted
  or own, add a row in section 3. `npm test` fails until both are done.
- **Replacing items with an instrument:** mark them `validated` in
  `src/item-sources.js` with the instrument name, set their rows here to
  **Replaced**, and add the instrument to section 4 with its licence.
- **Adding a rule or clinical content:** add a row in section 6.
- **Finishing a step:** change the status, and add a line to the change log.

## Change log

| Date | Change |
| --- | --- |
| 2026-11-06 | First version: 68 items needing validation (59 own, 9 adapted), 12 rules and content components, 4 translation items. |
| 2026-11-06 | Clinician pages translated into Swedish: TRA-3 narrowed to the clinical content, TRA-5 added (review of the Swedish interface text). |
| 2026-11-09 | Patient's preferred language added; patient pages (and on-site questionnaires) now entirely in that language. TRA-5 extended to the Swedish emails and the patient-page copyright footer. |
