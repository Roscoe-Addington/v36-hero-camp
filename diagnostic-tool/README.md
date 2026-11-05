# Mood & Anxiety Screening

A small web app where a clinician registers a patient, sends them a private
link, and receives the scored results by email when the patient has answered.

It screens for:

- **Major depressive disorder (MDD)** with the **PHQ-9**, scored with the
  published DSM-based algorithm (Kroenke et al., 2001).
- **Generalized anxiety disorder (GAD)** with the **GAD-7** (Spitzer et al.,
  2006), plus 8 yes/no questions covering DSM-5-TR criteria A–C (6 months of
  hard-to-control worry and 3+ associated symptoms), which the GAD-7 alone
  does not ask about.

> **This is a screening tool, not a diagnostic tool.** It gives a likelihood
> (High / Moderate / Low–subclinical / Minimal), never a diagnosis. A
> diagnosis needs a clinical interview. The app is not a certified medical
> device; see "Before real patients use this" below.

## How it works

1. The clinician logs in and adds a patient: first name, last name, personal
   number, gender, age, education level, employed yes/no.
2. The clinician clicks **Create new questionnaire link** and sends the link
   to the patient (e.g. via the clinic's secure messaging).
3. The patient opens the link (no login needed), answers 26 questions and
   submits. The link then stops working.
4. The app scores the answers and emails the result to the clinician's email
   address. The full report, with every answer, is in the clinician portal.

If the patient answers anything other than "Not at all" to PHQ-9 question 9
(thoughts of death or self-harm), the patient is immediately shown crisis
phone numbers, and the clinician's email is marked **URGENT**.

## What the report contains

For each condition:

- the likelihood level and the total score with its severity band
- whether the DSM-5-TR symptom criteria were endorsed
- **symptoms at diagnostic threshold** (e.g. "more than half the days")
- **subclinical symptoms**: symptoms the person has, but below the
  threshold that counts toward a diagnosis
- functional impairment
- a checklist of what the clinician must still rule out

How the likelihood is decided (see `src/scoring.js`):

| Level | Depression | Anxiety |
| --- | --- | --- |
| High | DSM algorithm met **and** PHQ-9 ≥ 10 | Criteria A–C met **and** GAD-7 ≥ 10 |
| Moderate | Algorithm met **or** PHQ-9 ≥ 10 | Criteria A–C met **or** GAD-7 ≥ 10 |
| Low — subclinical | PHQ-9 5–9, or 2+ symptoms at threshold, or any item 9 answer | GAD-7 5–9, or some criteria items endorsed |
| Minimal | everything else | everything else |

These are ordered categories, not percentages. The questionnaires do not
give a valid individual probability, so the app does not invent one.

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
- [ ] Have a clinician who knows the instruments review `src/scoring.js` and
      the supplementary GAD questions (they are not a validated instrument).
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
