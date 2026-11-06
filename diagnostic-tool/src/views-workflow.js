// Pages for the assessment process after the intake screening:
//   casePage       one assessment from start to finish (the "hub")
//   checklistPage  in-depth criteria checklist for one disorder
//   finalReportPage the final report with confirmed diagnoses
//
// Uses the same auto-escaping html`...` helper as views.js. Interface text
// goes through t() (i18n-clinician.js) so the pages work in English and
// Swedish. Clinical rule content (criteria, rule-out reasons, suggestion
// reasons) is still English only; see TRA-3 in docs/VALIDATION-PLAN.md.

import { html, layout, screeningSections } from './views.js';
import { DISORDERS, CATEGORIES, findDisorder } from './disorders.js';
import { evaluateDisorder, evaluateRule, STATUS, RATINGS } from './criteria.js';
import { MOCA_DOMAINS, MOCA_CUTOFF, scoreMoca } from './moca.js';
import { STRENGTH } from './suggestions.js';
import { DIFFERENTIALS } from './differential-lists.js';
import { conflictsAmong, conflictsFor, LEVEL } from './conflicts.js';
import { INTERVIEW, MSE, INTERVIEW_FORM, RISK, INFORMANT, riskIndicators, finalizeBlocker } from './clinical-forms.js';
import { renderForm, renderSummary } from './views-forms.js';
import { optionLabel } from './forms.js';
import { translator } from './i18n-clinician.js';

function levelBadge(t, level) {
  const cls = { [LEVEL.CONFLICT]: 'danger', [LEVEL.CHECK]: 'warn', [LEVEL.CODING]: 'info' }[level];
  return html`<span class="badge ${cls}">${t(level)}</span>`;
}

// "Major depressive disorder + Bipolar I disorder"
function pairName(r) {
  return r.ids.map((id) => findDisorder(id).name).join(' + ');
}

function conflictList(t, rules) {
  return html`<ul class="conflicts">${rules.map((r) => html`<li>${levelBadge(t, r.level)} <strong>${pairName(r)}.</strong> ${r.message}</li>`)}</ul>`;
}

const RATING_LABELS = { present: 'Present', absent: 'Absent', unclear: 'Unclear' };

export function criteriaBadge(t, status) {
  const cls = { [STATUS.MET]: 'warn', [STATUS.NOT_MET]: 'ok', [STATUS.INCOMPLETE]: 'info' }[status] ?? 'info';
  return html`<span class="badge ${cls}">${t(status)}</span>`;
}

function strengthBadge(t, strength) {
  return html`<span class="badge ${strength === STRENGTH.SUGGESTED ? 'warn' : 'info'}">${t(strength)}</span>`;
}

function patientLine(t, patient) {
  return html`${patient.first_name} ${patient.last_name} · ${t('{age} years', { age: patient.age })} · ${t(patient.gender)}`;
}

// Fixed error messages are translated; ones with names or numbers in them stay as they are.
const errorList = (t, errors) =>
  errors.length ? html`<div class="error" role="alert"><ul>${errors.map((e) => html`<li>${t(e)}</li>`)}</ul></div>` : '';

// "1 sign …" / "3 signs …"
const signsToCheck = (t, n) => (n === 1 ? t('1 sign to check in the interview.') : t('{n} signs to check in the interview.', { n }));

// The stages, shown at the top of the assessment page.
function progress(t, c) {
  const assessed = Object.keys(c.checklists).length;
  const riskNeeded = riskIndicators(c).length > 0;
  const steps = [
    { label: t('Intake screening'), done: Boolean(c.assessment.completed_at) },
    { label: t('Intake interview'), done: Boolean(c.interview?.updated_at) },
    { label: t('MoCA & observations'), done: Boolean(c.intake?.updated_at) },
    { label: t('Informant'), done: Boolean(c.informant?.updated_at) },
    { label: riskNeeded ? t('Risk assessment (required)') : t('Risk assessment'), done: Boolean(c.risk?.updated_at) },
    { label: t('In-depth assessment ({n})', { n: assessed }), done: assessed > 0 },
    { label: t('Diagnosis ({n})', { n: c.diagnoses.items.length }), done: c.diagnoses.items.length > 0 },
    { label: t('Finalized'), done: Boolean(c.assessment.finalized_at) },
  ];
  return html`<ol class="progress">
    ${steps.map((s) => html`<li class="${s.done ? 'done' : ''}"><span>${s.done ? '✓' : ''}</span>${s.label}</li>`)}
  </ol>`;
}

// ---------- The assessment hub ----------

export function casePage({ clinician, c, suggestions, errors = [] }) {
  const t = translator(clinician?.language);
  const { assessment, patient } = c;
  const base = `/clinician/assessments/${assessment.id}`;
  const finalized = Boolean(assessment.finalized_at);
  // Locked: finalized, or opened by a colleague with read-only access.
  const locked = finalized || c.readOnly;

  const header = html`
    <p><a href="/clinician/patients/${patient.id}">← ${patient.first_name} ${patient.last_name}</a></p>
    <h1>${t('Assessment')}</h1>
    <p class="hint">${patientLine(t, patient)} · ${assessment.mode === 'onsite' ? t('On site') : t('Link sent to patient')} · ${t('started {date}', { date: assessment.created_at })}</p>
    ${progress(t, c)}
    ${c.readOnly ? html`<p class="note"><strong>${t('Read-only access.')}</strong> ${t('Only the treating clinician can make changes.')}</p>` : ''}
    ${errorList(t, errors)}`;

  // Screening not done yet: nothing else to show.
  if (!assessment.completed_at) {
    return layout({
      title: t('Assessment'),
      clinician,
      body: html`${header}
        <section class="card">
          <h2>${t('1. Intake screening')}</h2>
          ${assessment.mode === 'onsite'
            ? html`<p>${t('The on-site screening has not been finished.')}</p>${c.readOnly ? '' : html`<p><a class="button" href="${base}/screening">${t('Continue the screening')}</a></p>`}`
            : html`<p>${t('Waiting for the patient to answer the questionnaire link. You will get an email when it is done.')}</p>`}
        </section>`,
    });
  }

  const r = c.results;
  const evaluations = Object.fromEntries(
    Object.entries(c.checklists).map(([id, cl]) => [id, evaluateDisorder(findDisorder(id), cl, patient)])
  );

  return layout({
    title: `${t('Assessment')} — ${patient.last_name}`,
    clinician,
    body: html`${header}
      ${finalized
        ? html`<div class="note">
            <p>${t('This assessment was finalized {date} and is locked.', { date: assessment.finalized_at })} <a href="${base}/final">${t('Open the final report')}</a>.</p>
            ${c.readOnly ? '' : html`<details><summary>${t('Reopen to make a correction')}</summary>
              <form method="post" action="${base}/reopen">
                <label>${t('Why is it reopened? (kept in the change history)')} <input name="reason" required maxlength="1000" /></label>
                <button class="small">${t('Reopen assessment')}</button>
              </form>
            </details>`}
          </div>`
        : ''}
      ${amendmentHistory(t, c.amendments)}
      ${r.safetyFlag
        ? html`<div class="alert" role="alert"><strong>${t('Safety alert:')}</strong> ${t('the patient answered “{answer}” to PHQ-9 item 9 (thoughts of death or self-harm).', { answer: t(r.safetyAnswer) })} <a href="${base}/risk">${c.risk?.updated_at ? t('Open the risk assessment') : t('Start the suicide risk assessment')}</a>.</div>`
        : ''}
      ${suggestions.neuroReferral.some((n) => n.urgent)
        ? html`<div class="alert" role="alert"><strong>${t('Possible urgent neurological symptoms:')}</strong> ${suggestions.neuroReferral.filter((n) => n.urgent).map((n) => n.finding).join('; ')}. ${t('Ask when they started; if within the last days, arrange emergency assessment.')}</div>`
        : ''}

      ${qualityBox(t, r.quality)}

      <section class="card">
        <h2>${t('2. Intake interview')}</h2>
        <p class="hint">${t('History, family history, medical history, social situation and mental status examination.')}</p>
        ${c.interview?.updated_at ? interviewHighlights(t, c.interview) : html`<p class="hint">${t('Not done yet.')}</p>`}
        <p><a class="button" href="${base}/interview">${c.interview?.updated_at ? (locked ? t('View intake interview') : t('Open intake interview')) : t('Start intake interview')}</a></p>
      </section>

      <section class="card">
        <h2>${t('3. MoCA and observed signs')}</h2>
        ${intakeSummary(t, c.intake, suggestions)}
        ${locked ? '' : intakeForm(t, base, c)}
      </section>

      <section class="card">
        <h2>${t('4. Informant')}</h2>
        <p class="hint">${t('Information from someone who knows the patient well, with the patient’s consent. Especially useful for memory problems, past periods of elevated mood and long-standing personality traits.')}</p>
        ${c.informant?.updated_at
          ? html`<p>${t('{name} ({relationship}), recorded {date}.', { name: c.informant.inf_name, relationship: c.informant.inf_relationship, date: c.informant.updated_at })}</p>`
          : html`<p class="hint">${t('No informant recorded.')}</p>`}
        <p><a class="button secondary-link" href="${base}/informant">${c.informant?.updated_at ? t('Open informant information') : t('Add informant information')}</a></p>
      </section>

      ${riskCard(t, base, c, locked)}

      <section class="card">
        <h2>${t('6. In-depth assessment')}</h2>
        <p>${t('Based on the intake screening, assess these disorders with the full criteria checklist. You decide which to assess; the list only shows where the screening points.')}</p>
        ${t.language === 'sv' ? html`<p class="hint">${t('Disorder names, criteria and reasons are in English until the official Swedish DSM-5-TR terminology is added.')}</p>` : ''}
        ${suggestions.suggestions.length === 0
          ? html`<p class="hint">${t('The screening does not point toward any disorder in this app.')}</p>`
          : html`<div class="table-scroll"><table>
              <thead><tr><th>${t('Disorder')}</th><th>${t('Screening')}</th><th>${t('Why')}</th><th>${t('Checklist')}</th></tr></thead>
              <tbody>
                ${suggestions.suggestions.map((s) => html`<tr>
                  <td><a href="${base}/checklist?disorder=${s.disorderId}">${s.name}</a></td>
                  <td>${strengthBadge(t, s.strength)}</td>
                  <td><ul class="compact">${s.reasons.map((x) => html`<li>${x}</li>`)}</ul></td>
                  <td>${evaluations[s.disorderId] ? criteriaBadge(t, evaluations[s.disorderId].status) : html`<span class="hint">${t('Not started')}</span>`}</td>
                </tr>`)}
              </tbody>
            </table></div>`}

        ${locked
          ? ''
          : html`<form method="get" action="${base}/checklist" class="inline-form">
              <label>${t('Assess another disorder')}
                <select name="disorder" required>
                  <option value="">${t('Choose…')}</option>
                  ${CATEGORIES.map((cat) => html`<optgroup label="${cat.title}">
                    ${DISORDERS.filter((d) => d.category === cat.id).map((d) => html`<option value="${d.id}">${d.name}</option>`)}
                  </optgroup>`)}
                </select>
              </label>
              <button>${t('Open checklist')}</button>
            </form>`}

        ${suggestions.neuroReferral.length
          ? html`<h3>${t('Neurological symptoms: refer, do not diagnose here')}</h3>
              <ul>${suggestions.neuroReferral.map((n) => html`<li><strong>${n.finding}.</strong> ${n.action}</li>`)}</ul>`
          : ''}
        ${suggestions.outOfScope.length
          ? html`<h3>${t('Findings outside this app')}</h3>
              <ul>${suggestions.outOfScope.map((o) => html`<li><strong>${o.condition}.</strong> ${o.reason}</li>`)}</ul>`
          : ''}
      </section>

      <section class="card">
        <h2>${t('7. Diagnosis')}</h2>
        ${diagnosisSection(t, base, c, evaluations, locked)}
      </section>

      <h2 class="section-title">${t('Intake screening results')}</h2>
      <p class="hint">${t('Completed {date} (UTC). Email: {status}.', { date: assessment.completed_at, status: assessment.email_status || t('unknown') })}</p>
      ${screeningSections(r, t)}`,
  });
}

// ---------- Clinician intake: MoCA, delirium observations, notes ----------

function intakeSummary(t, intake, suggestions) {
  if (!intake?.updated_at) return html`<p class="hint">${t('Not filled in yet. The MoCA can only be given on site.')}</p>`;
  const m = suggestions.moca;
  return html`<ul class="facts">
    <li>MoCA: ${m
      ? html`<strong>${m.adjusted}/30</strong> (${t(m.band)}${m.educationPoint ? `; ${t('includes +1 for 12 years of education or fewer')}` : ''}). ${t('Cut-off {cutoff}:', { cutoff: MOCA_CUTOFF })} ${m.belowCutoff ? t('below') : t('at or above')}.`
      : t('not given')}</li>
    <li>${t('Delirium signs (CAM-style rule):')} ${suggestions.delirium.positive ? html`<strong>${t('positive')}</strong>` : t('negative')}</li>
    <li>${t('Catatonic signs:')} ${intake.catatonia === 'yes' ? html`<strong>${t('observed')}</strong>` : t('not observed')}</li>
    ${intake.notes ? html`<li>${t('Notes:')} ${intake.notes}</li>` : ''}
  </ul>`;
}

function yesNo(t, name, label, value) {
  return html`<fieldset class="question">
    <legend>${label}</legend>
    <div class="options">
      <label class="choice"><input type="radio" name="${name}" value="yes" ${value === 'yes' ? html`checked` : ''} /> ${t('Yes')}</label>
      <label class="choice"><input type="radio" name="${name}" value="no" ${value !== 'yes' ? html`checked` : ''} /> ${t('No')}</label>
    </div>
  </fieldset>`;
}

function intakeForm(t, base, c) {
  const intake = c.intake ?? {};
  const moca = intake.moca ?? {};
  const lowEducation = moca.administered ? moca.lowEducation : c.defaultLowEducation;
  const obs = intake.delirium ?? {};
  return html`<details ${intake.updated_at ? '' : html`open`}>
    <summary>${intake.updated_at ? t('Edit clinician intake') : t('Fill in clinician intake')}</summary>
    <form method="post" action="${base}/intake" class="intake">
      <h3>${t('MoCA (given on paper)')}</h3>
      <p class="hint">${t('Give the MoCA as trained and certified, then enter the domain scores. The app adds them up and applies the education point.')}</p>
      ${yesNo(t, 'moca_administered', t('MoCA given at this assessment?'), moca.administered ? 'yes' : 'no')}
      <div class="moca-grid">
        ${MOCA_DOMAINS.map((d) => html`<label>${t(d.label)} <span class="hint">(0–${d.max})</span>
          <input type="number" name="moca_${d.id}" min="0" max="${d.max}" step="1" value="${moca.domains?.[d.id] ?? ''}" />
        </label>`)}
      </div>
      <label class="check"><input type="checkbox" name="moca_low_education" value="yes" ${lowEducation ? html`checked` : ''} /> ${t('12 years of formal education or fewer (+1 point)')}</label>

      <h3>${t('Observed signs of delirium')}</h3>
      ${yesNo(t, 'del_acute', t('Acute onset or fluctuating course of confusion'), obs.acute)}
      ${yesNo(t, 'del_inattention', t('Inattention (e.g. easily distracted, cannot follow the conversation)'), obs.inattention)}
      ${yesNo(t, 'del_disorganized', t('Disorganised thinking (rambling, illogical, switching topics)'), obs.disorganized)}
      ${yesNo(t, 'del_consciousness', t('Altered level of consciousness (e.g. drowsy, hyperalert)'), obs.consciousness)}

      <h3>${t('Observed signs of catatonia')}</h3>
      ${yesNo(t, 'cat_signs', t('Three or more catatonic signs (e.g. stupor, mutism, posturing, negativism, waxy flexibility, echolalia)'), intake.catatonia)}

      <label>${t('Intake interview notes')}
        <textarea name="notes" rows="4" maxlength="5000">${intake.notes ?? ''}</textarea>
      </label>
      <button>${t('Save clinician intake')}</button>
    </form>
  </details>`;
}

// ---------- Diagnosis ----------

function diagnosisSection(t, base, c, evaluations, locked) {
  const confirmed = c.diagnoses.items;
  const confirmedIds = new Set(confirmed.map((d) => d.disorderId));
  const assessedNotConfirmed = Object.keys(evaluations).filter((id) => !confirmedIds.has(id));
  const checks = conflictsAmong(confirmed.map((d) => d.disorderId));

  return html`
    ${confirmed.length
      ? html`<div class="table-scroll"><table>
          <thead><tr><th>ICD-10</th><th>${t('Diagnosis')}</th><th>${t('Criteria')}</th><th>${t('Note')}</th>${locked ? '' : html`<th></th>`}</tr></thead>
          <tbody>${confirmed.map((d) => html`<tr>
            <td class="code">${d.code}</td>
            <td>${d.name}</td>
            <td>${criteriaBadge(t, d.criteriaStatus)}</td>
            <td>${d.note}</td>
            ${locked
              ? ''
              : html`<td><form method="post" action="${base}/diagnoses"><input type="hidden" name="disorder" value="${d.disorderId}" /><input type="hidden" name="action" value="remove" /><button class="small secondary">${t('Remove')}</button></form></td>`}
          </tr>`)}</tbody>
        </table></div>`
      : html`<p class="hint">${t('No diagnosis confirmed yet.')}</p>`}
    ${checks.length ? html`<h3>${t('Checks for the confirmed diagnoses')}</h3>${conflictList(t, checks)}` : ''}
    ${confirmed.filter((d) => d.conflictOverride).map((d) => html`<p class="note">${t('Reason for giving {name} despite a conflict:', { name: d.name })} ${d.conflictOverride}</p>`)}

    ${locked
      ? ''
      : html`
        ${assessedNotConfirmed.length
          ? html`<h3>${t('Confirm a diagnosis')}</h3>
              <p class="hint">${t('Only disorders you have assessed with the checklist can be confirmed. If the criteria are not met, write why you still confirm it.')}</p>
              ${assessedNotConfirmed.map((id) => {
                const d = findDisorder(id);
                const ev = evaluations[id];
                const preview = conflictsFor(id, [...confirmedIds]);
                const blocking = preview.some((r) => r.level === LEVEL.CONFLICT);
                return html`<form method="post" action="${base}/diagnoses" class="confirm-row">
                  <input type="hidden" name="disorder" value="${id}" />
                  <input type="hidden" name="action" value="confirm" />
                  <div><strong>${d.name}</strong> ${criteriaBadge(t, ev.status)} <span class="code">${ev.code}</span></div>
                  <label>${ev.status === STATUS.MET ? t('Note (optional)') : t('Note (required)')}
                    <input name="note" maxlength="1000" ${ev.status === STATUS.MET ? '' : html`required`} />
                  </label>
                  ${preview.length ? conflictList(t, preview) : ''}
                  ${blocking
                    ? html`<label>${t('Reason for giving both despite the conflict (required)')}
                        <input name="override" maxlength="1000" required />
                      </label>`
                    : ''}
                  <button class="small">${t('Confirm diagnosis')}</button>
                </form>`;
              })}`
          : Object.keys(evaluations).length
            ? html`<p class="hint">${t('Every disorder you assessed has been confirmed. Assess another one in step 6 to confirm more.')}</p>`
            : html`<p class="hint">${t('Assess a disorder in step 6 to be able to confirm it here.')}</p>`}

        <h3>${t('Finalize')}</h3>
        ${finalizeBlocker(c) ? html`<p class="note">${t(finalizeBlocker(c))}</p>` : ''}
        <form method="post" action="${base}/finalize">
          <label>${t('Summary for the final report')}
            <textarea name="final_note" rows="3" maxlength="5000">${c.diagnoses.finalNote ?? ''}</textarea>
          </label>
          <p class="hint">${t('After finalizing, the assessment cannot be changed.')} ${confirmed.length === 0 ? t('No diagnosis is confirmed: the report will say that no diagnosis in this app was made.') : ''}</p>
          <button>${t('Finalize assessment')}</button>
        </form>`}`;
}

function amendmentHistory(t, amendments) {
  if (!amendments?.length) return '';
  return html`<section class="card">
    <h2>${t('Change history')}</h2>
    <ul>${amendments.map((a) => html`<li>${t('Reopened {date} by {who} (finalized {finalized}). Reason: {reason}. Diagnoses before: {before}.', {
      date: a.reopened_at, who: a.by, finalized: a.previously_finalized_at, reason: a.reason, before: a.diagnoses_before.join('; ') || t('none'),
    })}</li>`)}</ul>
  </section>`;
}

// ---------- Response quality (tired or careless answering) ----------

function qualityBox(t, q) {
  if (!q) return '';
  return html`<section class="card ${q.flags.length ? 'quality-warn' : ''}">
    <h2>${t('Response quality')}</h2>
    <p><strong>${q.flags.length ? signsToCheck(t, q.flags.length) : t('No signs of tired or careless answering.')}</strong> ${q.flags.length ? t('The scores are unchanged; check these answers in the interview.') : ''}</p>
    ${q.flags.length ? html`<ul class="conflicts">${q.flags.map((f) => html`<li><span class="badge ${f.kind === 'Contradiction' ? 'danger' : 'warn'}">${t(f.kind)}</span> ${f.text}</li>`)}</ul>` : ''}
    <details><summary>${t('Time per part')}${q.mode === 'onsite' ? ` ${t('(on site: speed is not checked)')}` : ''}</summary>
      <div class="table-scroll"><table>
        <thead><tr><th>${t('Part')}</th><th>${t('Time')}</th><th>${t('Seconds per question')}</th></tr></thead>
        <tbody>${q.pages.map((p) => html`<tr><td>${p.part}</td><td>${p.seconds === null ? '–' : `${Math.floor(p.seconds / 60)} min ${p.seconds % 60} s`}</td><td>${p.perQuestion ?? '–'}</td></tr>`)}</tbody>
      </table></div>
      ${q.totalMinutes !== null ? html`<p class="hint">${t('Total answering time: {minutes} minutes (breaks between parts not included).', { minutes: q.totalMinutes })}</p>` : ''}
      ${q.tiredness.length ? html`<p class="hint">${t('Tiredness ratings:')} ${q.tiredness.map((x) => t('{value}/10 after part {part}', x)).join(', ')}.</p>` : ''}
    </details>
  </section>`;
}

// ---------- Risk assessment card on the assessment page ----------

function riskCard(t, base, c, locked) {
  const reasons = riskIndicators(c);
  const r = c.risk;
  return html`<section class="card ${reasons.length && !r?.updated_at ? 'attention' : ''}">
    <h2>${t('5. Suicide risk assessment')}</h2>
    ${reasons.length
      ? html`<p><strong>${t('Required before finalizing')}</strong>, ${t('because of:')}</p><ul>${reasons.map((x) => html`<li>${t(x)}</li>`)}</ul>`
      : html`<p class="hint">${t('No screening or interview finding requires it, but you can always do one.')}</p>`}
    ${r?.updated_at
      ? html`<ul class="facts">
          <li>${t('Current suicidal thoughts:')} <strong>${t(optionLabel(RISK, 'ideation', r.ideation))}</strong></li>
          <li>${t('Immediate action needed:')} <strong>${r.immediate === 'yes' ? t('Yes') : t('No')}</strong></li>
          <li>${t('Recorded {date}', { date: r.updated_at })}</li>
        </ul>`
      : ''}
    <p>
      <a class="button" href="${base}/risk">${r?.updated_at ? (locked ? t('View risk assessment') : t('Open risk assessment')) : t('Start risk assessment')}</a>
      ${r?.updated_at ? html` <a href="${base}/risk/plan">${t('Safety plan for the patient')}</a>` : ''}
    </p>
  </section>`;
}

function interviewHighlights(t, iv) {
  const items = [];
  if (iv.reason) items.push(html`<li>${t('Reason:')} ${iv.reason.slice(0, 160)}${iv.reason.length > 160 ? '…' : ''}</li>`);
  if (iv.family?.length) items.push(html`<li>${t('Family history:')} ${iv.family.map((v) => t(optionLabel(INTERVIEW, 'family', v))).join(', ')}</li>`);
  if (iv.prev_attempt && iv.prev_attempt !== 'none') items.push(html`<li>${t('Previous suicide attempts:')} ${t(optionLabel(INTERVIEW, 'prev_attempt', iv.prev_attempt))}</li>`);
  const mseLabel = (id) => t(MSE[0].fields.find((f) => f.id === id).label);
  const mse = ['mse_delusions', 'mse_hallucinations', 'mse_obsessions'].filter((id) => iv[id] === 'yes').map(mseLabel);
  if (mse.length) items.push(html`<li>${t('Mental status:')} ${mse.join(', ')}</li>`);
  return items.length ? html`<ul class="facts">${items}</ul>` : html`<p class="hint">${t('Recorded {date}', { date: iv.updated_at })}.</p>`;
}

// ---------- Interview, informant and risk pages (one generic page) ----------

export function formPage({ clinician, c, title, intro, schema, values, action, errors = [], extra }) {
  const t = translator(clinician?.language);
  const locked = Boolean(c.assessment.finalized_at) || c.readOnly;
  return layout({
    title,
    clinician,
    body: html`
      <p><a href="/clinician/assessments/${c.assessment.id}">← ${t('Back to the assessment')}</a></p>
      <h1>${title}</h1>
      <p class="hint">${patientLine(t, c.patient)}</p>
      ${intro ? html`<p>${intro}</p>` : ''}
      ${errorList(t, errors)}
      ${extra ?? ''}
      <form method="post" action="${action}">
        ${renderForm(schema, values ?? {}, { disabled: locked, t })}
        ${locked ? '' : html`<button>${t('Save')}</button>`}
      </form>`,
  });
}

export function interviewPage({ clinician, c, errors, values }) {
  const t = translator(clinician?.language);
  return formPage({
    clinician, c, errors,
    title: t('Intake interview'),
    intro: t('Structured psychiatric history and mental status examination. Fill in what is relevant; only the reason for assessment is required.'),
    schema: INTERVIEW_FORM,
    values: values ?? c.interview,
    action: `/clinician/assessments/${c.assessment.id}/interview`,
  });
}

export function informantPage({ clinician, c, errors, values }) {
  const t = translator(clinician?.language);
  return formPage({
    clinician, c, errors,
    title: t('Informant information'),
    intro: t('Information from someone who knows the patient well. Record it only with the patient’s consent, unless the law allows otherwise.'),
    schema: INFORMANT,
    values: values ?? c.informant,
    action: `/clinician/assessments/${c.assessment.id}/informant`,
  });
}

export function riskPage({ clinician, c, errors, values }) {
  const t = translator(clinician?.language);
  const reasons = riskIndicators(c);
  const a = c.answers ?? {};
  const extra = html`<section class="card">
    <h2>${t('From the screening and interview')}</h2>
    <ul class="facts">
      <li>${t('PHQ-9 item 9:')} <strong>${c.results?.safetyAnswer ? t(c.results.safetyAnswer) : t('not answered')}</strong></li>
      <li>${t('PHQ-9 total: {total}/27; hopelessness (item 2): {answer}', { total: c.results?.depression.total ?? '–', answer: t(c.results?.depression.itemScores[1].answer ?? '–') })}</li>
      <li>${t('Self-harm ever (screening):')} ${a.pd16 === 1 ? t('Yes') : t('No')}</li>
      <li>${t('Previous suicide attempts (interview):')} ${c.interview?.prev_attempt ? t(optionLabel(INTERVIEW, 'prev_attempt', c.interview.prev_attempt)) : t('not recorded')}</li>
      <li>${t('Alcohol/drug screening:')} ${c.results?.differential?.entries.find((e) => e.id === 'substance')?.finding ?? '–'}</li>
    </ul>
    ${reasons.length ? html`<p><strong>${t('A risk assessment is required')}</strong> ${t('because of:')} ${reasons.map((x) => t(x)).join(' ')}</p>` : ''}
    <p class="hint">${t('This form does not calculate a risk score or category. Guidelines (e.g. NICE 2022) advise against using risk scales to predict suicide; write a formulation and a plan based on the person’s needs.')}</p>
  </section>`;
  return formPage({
    clinician, c, errors, extra,
    title: t('Suicide risk assessment'),
    schema: RISK,
    values: values ?? c.risk,
    action: `/clinician/assessments/${c.assessment.id}/risk`,
  });
}

// The safety plan as a clean page to give or read to the patient.
export function safetyPlanPage({ clinician, c }) {
  const t = translator(clinician?.language);
  const r = c.risk ?? {};
  const steps = RISK.find((s) => s.title.startsWith('Safety plan')).fields;
  return layout({
    title: t('Safety plan'),
    clinician,
    body: html`
      <p><a href="/clinician/assessments/${c.assessment.id}">← ${t('Back to the assessment')}</a></p>
      <h1>${t('My safety plan')}</h1>
      <p>${c.patient.first_name} ${c.patient.last_name} · ${t('made {date}', { date: r.updated_at ?? '' })}</p>
      <ol class="safety-plan">
        ${steps.map((f) => html`<li><h2>${t(f.label).replace(/^\d+\.\s*/, '')}</h2><p class="prewrap">${r[f.id] || '—'}</p></li>`)}
      </ol>
      <p class="crisis">${t('If you are in danger or thinking about harming yourself: call 112. In Sweden you can also call Mind Självmordslinjen on 90101, or 1177 for healthcare advice.')}</p>`,
  });
}

// ---------- Checklist for one disorder ----------

export function checklistPage({ clinician, c, disorder, suggestion, errors = [] }) {
  const t = translator(clinician?.language);
  const { assessment, patient } = c;
  const base = `/clinician/assessments/${assessment.id}`;
  const checklist = c.checklists[disorder.id] ?? { ratings: {}, specifiers: {} };
  const ev = evaluateDisorder(disorder, checklist, patient);
  const locked = Boolean(assessment.finalized_at) || c.readOnly;
  const disabled = locked ? html`disabled` : '';

  return layout({
    title: disorder.name,
    clinician,
    body: html`
      <p><a href="${base}">← ${t('Back to the assessment')}</a></p>
      <h1>${disorder.name}</h1>
      <p class="hint">${patientLine(t, patient)}</p>
      ${errorList(t, errors)}

      <section class="card summary">
        <p>${t('Current result:')} ${criteriaBadge(t, ev.status)} · ICD-10 <span class="code">${ev.code}</span></p>
        <ul class="facts">
          <li>${t('{present} present, {absent} absent, {unclear} unclear, {unrated} not rated', { present: ev.present.length, absent: ev.absent.length, unclear: ev.unclear.length, unrated: ev.unrated.length })}</li>
          ${ev.counts.map((n) => html`<li>${t('Symptom count: {present} of {of} present (at least {min} needed)', n)}</li>`)}
        </ul>
        ${disorder.note ? html`<p class="note">${disorder.note}</p>` : ''}
        ${disorder.codeNote ? html`<p class="hint">${t('Code:')} ${disorder.codeNote}</p>` : ''}
        ${suggestion ? html`<p><strong>${t('Why the screening suggested this:')}</strong></p><ul>${suggestion.reasons.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
      </section>

      ${ruleOutSection(t, base, c, disorder)}

      <p class="hint">${t('Criteria are short reminders, not the DSM-5-TR text. Check the DSM-5-TR for the full wording. “Unclear” keeps the result open until you can decide.')}</p>

      <form method="post" action="${base}/checklist?disorder=${disorder.id}">
        ${disorder.groups.map((g) => html`<section class="card">
          <h2>${g.title}</h2>
          ${g.items.map((item) => html`<fieldset class="criterion">
            <legend>${item.label}</legend>
            <div class="options">
              ${RATINGS.map((r) => html`<label class="choice rating-${r}"><input type="radio" name="${item.id}" value="${r}" ${checklist.ratings[item.id] === r ? html`checked` : ''} ${disabled} /> ${t(RATING_LABELS[r])}</label>`)}
            </div>
          </fieldset>`)}
        </section>`)}

        ${disorder.autoCriteria?.length
          ? html`<section class="card"><h2>${t('From the patient record')}</h2><ul>
              ${disorder.autoCriteria.map((a) => html`<li>${a.label}: <strong>${evaluateRule(a.rule, {}, patient) ? t('Yes') : t('No')}</strong> (${t('age {age}', { age: patient.age })})</li>`)}
            </ul></section>`
          : ''}

        ${disorder.specifiers.length
          ? html`<section class="card"><h2>${t('Specifiers')}</h2>
              ${disorder.specifiers.map((sp) => html`<label>${sp.label}
                <select name="spec_${sp.id}" ${disabled}>
                  <option value="">${t('Not chosen')}</option>
                  ${sp.options.map((o) => html`<option value="${o.value}" ${checklist.specifiers[sp.id] === o.value ? html`selected` : ''}>${o.label}</option>`)}
                </select>
              </label>`)}
            </section>`
          : ''}

        <section class="card">
          <label>${t('Clinical notes for this disorder')}
            <textarea name="notes" rows="3" maxlength="5000" ${disabled}>${checklist.notes ?? ''}</textarea>
          </label>
          ${locked ? '' : html`<button>${t('Save checklist')}</button>`}
        </section>
      </form>`,
  });
}

// ---------- Differential diagnosis on the checklist page ----------

function ruleOutSection(t, base, c, disorder) {
  const list = DIFFERENTIALS[disorder.id] ?? [];
  const confirmedIds = c.diagnoses.items.map((d) => d.disorderId).filter((id) => id !== disorder.id);
  const preview = conflictsFor(disorder.id, confirmedIds);
  return html`<section class="card">
    <h2>${t('Differential diagnosis: rule out')}</h2>
    <p class="hint">${t('Conditions that can look like this disorder, or must be excluded before diagnosing it. Assessed ones show their checklist result.')}</p>
    <div class="table-scroll"><table>
      <thead><tr><th>${t('Condition')}</th><th>${t('Why consider it')}</th><th>${t('Status')}</th></tr></thead>
      <tbody>
        ${list.map((item) => {
          if (item.outside) {
            return html`<tr><td>${item.name}</td><td>${item.why}</td><td><span class="hint">${t('Not in this app: assess in the interview')}</span></td></tr>`;
          }
          const other = findDisorder(item.id);
          const checklist = c.checklists[item.id];
          const confirmed = c.diagnoses.items.some((d) => d.disorderId === item.id);
          return html`<tr>
            <td><a href="${base}/checklist?disorder=${item.id}">${other.name}</a></td>
            <td>${item.why}</td>
            <td>${confirmed ? html`<span class="badge warn">${t('Diagnosis confirmed')}</span> ` : ''}${checklist
              ? criteriaBadge(t, evaluateDisorder(other, checklist, c.patient).status)
              : html`<span class="hint">${t('Not assessed')}</span>`}</td>
          </tr>`;
        })}
      </tbody>
    </table></div>
    ${preview.length ? html`<h3>${t('If you confirm this diagnosis')}</h3>${conflictList(t, preview)}` : ''}
  </section>`;
}

// ---------- Final report ----------

export function finalReportPage({ clinician, c, suggestions }) {
  const t = translator(clinician?.language);
  const { assessment, patient } = c;
  const r = c.results;
  const evaluations = Object.entries(c.checklists).map(([id, cl]) => ({
    disorder: findDisorder(id),
    ev: evaluateDisorder(findDisorder(id), cl, patient),
    notes: cl.notes,
  }));
  const m = scoreMoca(c.intake?.moca);
  const checks = conflictsAmong(c.diagnoses.items.map((d) => d.disorderId));

  return layout({
    title: `${t('Final report')} — ${patient.last_name}`,
    clinician,
    body: html`
      <p><a href="/clinician/assessments/${assessment.id}">← ${t('Back to the assessment')}</a></p>
      <h1>${t('Final assessment report')}</h1>
      <p><a class="button" href="/clinician/assessments/${assessment.id}/final.pdf">${t('Download PDF')}</a></p>
      <dl class="card details">
        <dt>${t('Patient')}</dt><dd>${patient.first_name} ${patient.last_name}</dd>
        <dt>${t('Personal number')}</dt><dd>${patient.personal_number}</dd>
        <dt>${t('Age / gender')}</dt><dd>${patient.age} / ${t(patient.gender)}</dd>
        <dt>${t('Education')}</dt><dd>${t(patient.education)}</dd>
        <dt>${t('Employed')}</dt><dd>${patient.employed ? t('Yes') : t('No')}</dd>
        <dt>${t('Treating clinician')}</dt><dd>${c.ownerName ?? clinician.name}</dd>
        <dt>${t('Intake screening')}</dt><dd>${assessment.mode === 'onsite' ? t('On site') : t('By link')}, ${t('completed {date}', { date: assessment.completed_at })}</dd>
        <dt>${t('Finalized')}</dt><dd>${assessment.finalized_at}</dd>
      </dl>

      <section class="card">
        <h2>${t('Diagnoses')}</h2>
        ${c.diagnoses.items.length
          ? html`<div class="table-scroll"><table>
              <thead><tr><th>ICD-10</th><th>${t('Diagnosis (DSM-5-TR)')}</th><th>${t('Criteria at confirmation')}</th><th>${t('Note')}</th></tr></thead>
              <tbody>${c.diagnoses.items.map((d) => html`<tr><td class="code">${d.code}</td><td>${d.name}</td><td>${criteriaBadge(t, d.criteriaStatus)}</td><td>${d.note}</td></tr>`)}</tbody>
            </table></div>`
          : html`<p>${t('No diagnosis in the scope of this app was made.')}</p>`}
        ${checks.length ? html`<h3>${t('Combination checks')}</h3>${conflictList(t, checks)}` : ''}
        ${c.diagnoses.items.filter((d) => d.conflictOverride).map((d) => html`<p class="note">${t('Reason for giving {name} despite a conflict:', { name: d.name })} ${d.conflictOverride}</p>`)}
        ${c.diagnoses.finalNote ? html`<h3>${t('Summary')}</h3><p class="prewrap">${c.diagnoses.finalNote}</p>` : ''}
      </section>

      <section class="card">
        <h2>${t('In-depth assessments')}</h2>
        ${evaluations.length
          ? html`<ul>${evaluations.map((e) => html`<li><strong>${e.disorder.name}</strong>: ${criteriaBadge(t, e.ev.status)}
              ${e.ev.counts.map((n) => html` · ${t('{present} of {of} symptoms (at least {min})', n)}`)}
              ${e.notes ? html`<br /><span class="hint">${e.notes}</span>` : ''}</li>`)}</ul>`
          : html`<p class="hint">${t('No in-depth checklists were completed.')}</p>`}
      </section>

      <section class="card">
        <h2>${t('Intake interview')}</h2>
        ${renderSummary(INTERVIEW, c.interview, t)}
        <h3>${t('Mental status examination')}</h3>
        ${renderSummary(MSE, c.interview, t)}
      </section>

      ${c.informant ? html`<section class="card"><h2>${t('Informant')}</h2>${renderSummary(INFORMANT, c.informant, t)}</section>` : ''}

      <section class="card">
        <h2>${t('Suicide risk assessment')}</h2>
        ${c.risk ? renderSummary(RISK, c.risk, t) : html`<p class="hint">${riskIndicators(c).length ? t('Not done.') : t('Not done (no indication found).')}</p>`}
      </section>

      <section class="card">
        <h2>${t('Screening summary')}</h2>
        <ul class="facts">
          <li>PHQ-9 ${r.depression.total}/27 (${t(r.depression.severity)}) · GAD-7 ${r.anxiety.total}/21 (${t(r.anxiety.severity)})</li>
          <li>${t('Safety (PHQ-9 item 9):')} ${r.safetyFlag ? html`<strong>${t(r.safetyAnswer)}</strong>` : t('Not at all')}</li>
          <li>MoCA: ${m ? `${m.adjusted}/30 (${t(m.band)})` : t('not given')}</li>
          <li>${t('Personality screen:')} ${suggestions.personality.score}/8 ${suggestions.personality.positive ? t('(positive)') : ''}</li>
          <li>${t('Differential screening, positive:')} ${r.differential?.summary.flagged.join('; ') || t('none')}</li>
          <li>${t('Response quality:')} ${r.quality ? (r.quality.flags.length ? signsToCheck(t, r.quality.flags.length) : t('No signs of tired or careless answering.')) : t('not recorded')}</li>
        </ul>
        ${suggestions.neuroReferral.length ? html`<h3>${t('Neurological referral')}</h3><ul>${suggestions.neuroReferral.map((n) => html`<li>${n.finding}. ${n.action}</li>`)}</ul>` : ''}
        ${suggestions.outOfScope.length ? html`<h3>${t('Findings outside this app')}</h3><ul>${suggestions.outOfScope.map((o) => html`<li>${o.condition}</li>`)}</ul>` : ''}
      </section>

      ${amendmentHistory(t, c.amendments)}

      <p class="disclaimer">${t('Diagnoses were confirmed by the treating clinician named above. The app’s criteria checklists and suggestions support, but do not replace, clinical judgement. ICD-10 codes should be checked against ICD-10-SE before reporting.')}</p>`,
  });
}
