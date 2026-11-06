// Pages for the assessment process after the intake screening:
//   casePage       one assessment from start to finish (the "hub")
//   checklistPage  in-depth criteria checklist for one disorder
//   finalReportPage the final report with confirmed diagnoses
//
// Uses the same auto-escaping html`...` helper as views.js.

import { html, layout, screeningSections } from './views.js';
import { DISORDERS, CATEGORIES, findDisorder } from './disorders.js';
import { evaluateDisorder, evaluateRule, STATUS, RATINGS } from './criteria.js';
import { MOCA_DOMAINS, MOCA_CUTOFF, scoreMoca } from './moca.js';
import { STRENGTH } from './suggestions.js';
import { DIFFERENTIALS } from './differential-lists.js';
import { conflictsAmong, conflictsFor, LEVEL } from './conflicts.js';

function levelBadge(level) {
  const cls = { [LEVEL.CONFLICT]: 'danger', [LEVEL.CHECK]: 'warn', [LEVEL.CODING]: 'info' }[level];
  return html`<span class="badge ${cls}">${level}</span>`;
}

// "Major depressive disorder + Bipolar I disorder"
function pairName(r) {
  return r.ids.map((id) => findDisorder(id).name).join(' + ');
}

function conflictList(rules) {
  return html`<ul class="conflicts">${rules.map((r) => html`<li>${levelBadge(r.level)} <strong>${pairName(r)}.</strong> ${r.message}</li>`)}</ul>`;
}

const RATING_LABELS = { present: 'Present', absent: 'Absent', unclear: 'Unclear' };

export function criteriaBadge(status) {
  const cls = { [STATUS.MET]: 'warn', [STATUS.NOT_MET]: 'ok', [STATUS.INCOMPLETE]: 'info' }[status] ?? 'info';
  return html`<span class="badge ${cls}">${status}</span>`;
}

function strengthBadge(strength) {
  return html`<span class="badge ${strength === STRENGTH.SUGGESTED ? 'warn' : 'info'}">${strength}</span>`;
}

function patientLine(patient) {
  return html`${patient.first_name} ${patient.last_name} · ${patient.age} years · ${patient.gender}`;
}

// The 5 stages, shown at the top of the assessment page.
function progress(c) {
  const assessed = Object.keys(c.checklists).length;
  const steps = [
    { label: 'Intake screening', done: Boolean(c.assessment.completed_at) },
    { label: 'Clinician intake', done: Boolean(c.intake?.updated_at) },
    { label: `In-depth assessment (${assessed})`, done: assessed > 0 },
    { label: `Diagnosis (${c.diagnoses.items.length})`, done: c.diagnoses.items.length > 0 },
    { label: 'Finalized', done: Boolean(c.assessment.finalized_at) },
  ];
  return html`<ol class="progress">
    ${steps.map((s) => html`<li class="${s.done ? 'done' : ''}"><span>${s.done ? '✓' : ''}</span>${s.label}</li>`)}
  </ol>`;
}

// ---------- The assessment hub ----------

export function casePage({ clinician, c, suggestions, errors = [] }) {
  const { assessment, patient } = c;
  const base = `/clinician/assessments/${assessment.id}`;
  const locked = Boolean(assessment.finalized_at);

  const header = html`
    <p><a href="/clinician/patients/${patient.id}">← ${patient.first_name} ${patient.last_name}</a></p>
    <h1>Assessment</h1>
    <p class="hint">${patientLine(patient)} · ${assessment.mode === 'onsite' ? 'On site' : 'Link sent to patient'} · started ${assessment.created_at}</p>
    ${progress(c)}
    ${errors.length ? html`<div class="error" role="alert"><ul>${errors.map((e) => html`<li>${e}</li>`)}</ul></div>` : ''}`;

  // Screening not done yet: nothing else to show.
  if (!assessment.completed_at) {
    return layout({
      title: 'Assessment',
      clinician,
      body: html`${header}
        <section class="card">
          <h2>1. Intake screening</h2>
          ${assessment.mode === 'onsite'
            ? html`<p>The on-site screening has not been finished.</p><p><a class="button" href="${base}/screening">Continue the screening</a></p>`
            : html`<p>Waiting for the patient to answer the questionnaire link. You will get an email when it is done.</p>`}
        </section>`,
    });
  }

  const r = c.results;
  const evaluations = Object.fromEntries(
    Object.entries(c.checklists).map(([id, cl]) => [id, evaluateDisorder(findDisorder(id), cl, patient)])
  );

  return layout({
    title: `Assessment — ${patient.last_name}`,
    clinician,
    body: html`${header}
      ${locked ? html`<p class="note">This assessment was finalized ${assessment.finalized_at} and can no longer be changed. <a href="${base}/final">Open the final report</a>.</p>` : ''}
      ${r.safetyFlag ? html`<div class="alert" role="alert"><strong>Safety alert:</strong> the patient answered “${r.safetyAnswer}” to PHQ-9 item 9 (thoughts of death or self-harm). Assess suicide risk.</div>` : ''}
      ${suggestions.neuroReferral.some((n) => n.urgent)
        ? html`<div class="alert" role="alert"><strong>Possible urgent neurological symptoms:</strong> ${suggestions.neuroReferral.filter((n) => n.urgent).map((n) => n.finding).join('; ')}. Ask when they started; if within the last days, arrange emergency assessment.</div>`
        : ''}

      <section class="card">
        <h2>2. Clinician intake</h2>
        ${intakeSummary(c.intake, suggestions)}
        ${locked ? '' : intakeForm(base, c)}
      </section>

      <section class="card">
        <h2>3. In-depth assessment</h2>
        <p>Based on the intake screening, assess these disorders with the full criteria checklist. You decide which to assess; the list only shows where the screening points.</p>
        ${suggestions.suggestions.length === 0
          ? html`<p class="hint">The screening does not point toward any disorder in this app.</p>`
          : html`<div class="table-scroll"><table>
              <thead><tr><th>Disorder</th><th>Screening</th><th>Why</th><th>Checklist</th></tr></thead>
              <tbody>
                ${suggestions.suggestions.map((s) => html`<tr>
                  <td><a href="${base}/checklist?disorder=${s.disorderId}">${s.name}</a></td>
                  <td>${strengthBadge(s.strength)}</td>
                  <td><ul class="compact">${s.reasons.map((x) => html`<li>${x}</li>`)}</ul></td>
                  <td>${evaluations[s.disorderId] ? criteriaBadge(evaluations[s.disorderId].status) : html`<span class="hint">Not started</span>`}</td>
                </tr>`)}
              </tbody>
            </table></div>`}

        ${locked
          ? ''
          : html`<form method="get" action="${base}/checklist" class="inline-form">
              <label>Assess another disorder
                <select name="disorder" required>
                  <option value="">Choose…</option>
                  ${CATEGORIES.map((cat) => html`<optgroup label="${cat.title}">
                    ${DISORDERS.filter((d) => d.category === cat.id).map((d) => html`<option value="${d.id}">${d.name}</option>`)}
                  </optgroup>`)}
                </select>
              </label>
              <button>Open checklist</button>
            </form>`}

        ${suggestions.neuroReferral.length
          ? html`<h3>Neurological symptoms: refer, do not diagnose here</h3>
              <ul>${suggestions.neuroReferral.map((n) => html`<li><strong>${n.finding}.</strong> ${n.action}</li>`)}</ul>`
          : ''}
        ${suggestions.outOfScope.length
          ? html`<h3>Findings outside this app</h3>
              <ul>${suggestions.outOfScope.map((o) => html`<li><strong>${o.condition}.</strong> ${o.reason}</li>`)}</ul>`
          : ''}
      </section>

      <section class="card">
        <h2>4. Diagnosis</h2>
        ${diagnosisSection(base, c, evaluations, locked)}
      </section>

      <h2 class="section-title">Intake screening results</h2>
      <p class="hint">Completed ${assessment.completed_at} (UTC). Email: ${assessment.email_status || 'unknown'}.</p>
      ${screeningSections(r)}`,
  });
}

// ---------- Clinician intake: MoCA, delirium observations, notes ----------

function intakeSummary(intake, suggestions) {
  if (!intake?.updated_at) return html`<p class="hint">Not filled in yet. The MoCA can only be given on site.</p>`;
  const m = suggestions.moca;
  return html`<ul class="facts">
    <li>MoCA: ${m
      ? html`<strong>${m.adjusted}/30</strong> (${m.band}${m.educationPoint ? '; includes +1 for 12 years of education or fewer' : ''}). Cut-off ${MOCA_CUTOFF}: ${m.belowCutoff ? 'below' : 'at or above'}.`
      : 'not given'}</li>
    <li>Delirium signs (CAM-style rule): ${suggestions.delirium.positive ? html`<strong>positive</strong>` : 'negative'}</li>
    <li>Catatonic signs: ${intake.catatonia === 'yes' ? html`<strong>observed</strong>` : 'not observed'}</li>
    ${intake.notes ? html`<li>Notes: ${intake.notes}</li>` : ''}
  </ul>`;
}

function yesNo(name, label, value) {
  return html`<fieldset class="question">
    <legend>${label}</legend>
    <div class="options">
      <label class="choice"><input type="radio" name="${name}" value="yes" ${value === 'yes' ? html`checked` : ''} /> Yes</label>
      <label class="choice"><input type="radio" name="${name}" value="no" ${value !== 'yes' ? html`checked` : ''} /> No</label>
    </div>
  </fieldset>`;
}

function intakeForm(base, c) {
  const intake = c.intake ?? {};
  const moca = intake.moca ?? {};
  const lowEducation = moca.administered ? moca.lowEducation : c.defaultLowEducation;
  const obs = intake.delirium ?? {};
  return html`<details ${intake.updated_at ? '' : html`open`}>
    <summary>${intake.updated_at ? 'Edit clinician intake' : 'Fill in clinician intake'}</summary>
    <form method="post" action="${base}/intake" class="intake">
      <h3>MoCA (given on paper)</h3>
      <p class="hint">Give the MoCA as trained and certified, then enter the domain scores. The app adds them up and applies the education point.</p>
      ${yesNo('moca_administered', 'MoCA given at this assessment?', moca.administered ? 'yes' : 'no')}
      <div class="moca-grid">
        ${MOCA_DOMAINS.map((d) => html`<label>${d.label} <span class="hint">(0–${d.max})</span>
          <input type="number" name="moca_${d.id}" min="0" max="${d.max}" step="1" value="${moca.domains?.[d.id] ?? ''}" />
        </label>`)}
      </div>
      <label class="check"><input type="checkbox" name="moca_low_education" value="yes" ${lowEducation ? html`checked` : ''} /> 12 years of formal education or fewer (+1 point)</label>

      <h3>Observed signs of delirium</h3>
      ${yesNo('del_acute', 'Acute onset or fluctuating course of confusion', obs.acute)}
      ${yesNo('del_inattention', 'Inattention (e.g. easily distracted, cannot follow the conversation)', obs.inattention)}
      ${yesNo('del_disorganized', 'Disorganised thinking (rambling, illogical, switching topics)', obs.disorganized)}
      ${yesNo('del_consciousness', 'Altered level of consciousness (e.g. drowsy, hyperalert)', obs.consciousness)}

      <h3>Observed signs of catatonia</h3>
      ${yesNo('cat_signs', 'Three or more catatonic signs (e.g. stupor, mutism, posturing, negativism, waxy flexibility, echolalia)', intake.catatonia)}

      <label>Intake interview notes
        <textarea name="notes" rows="4" maxlength="5000">${intake.notes ?? ''}</textarea>
      </label>
      <button>Save clinician intake</button>
    </form>
  </details>`;
}

// ---------- Diagnosis ----------

function diagnosisSection(base, c, evaluations, locked) {
  const confirmed = c.diagnoses.items;
  const confirmedIds = new Set(confirmed.map((d) => d.disorderId));
  const assessedNotConfirmed = Object.keys(evaluations).filter((id) => !confirmedIds.has(id));

  return html`
    ${confirmed.length
      ? html`<div class="table-scroll"><table>
          <thead><tr><th>ICD-10</th><th>Diagnosis</th><th>Criteria</th><th>Note</th>${locked ? '' : html`<th></th>`}</tr></thead>
          <tbody>${confirmed.map((d) => html`<tr>
            <td class="code">${d.code}</td>
            <td>${d.name}</td>
            <td>${criteriaBadge(d.criteriaStatus)}</td>
            <td>${d.note}</td>
            ${locked
              ? ''
              : html`<td><form method="post" action="${base}/diagnoses"><input type="hidden" name="disorder" value="${d.disorderId}" /><input type="hidden" name="action" value="remove" /><button class="small secondary">Remove</button></form></td>`}
          </tr>`)}</tbody>
        </table></div>`
      : html`<p class="hint">No diagnosis confirmed yet.</p>`}
    ${conflictsAmong(confirmed.map((d) => d.disorderId)).length
      ? html`<h3>Checks for the confirmed diagnoses</h3>${conflictList(conflictsAmong(confirmed.map((d) => d.disorderId)))}`
      : ''}
    ${confirmed.filter((d) => d.conflictOverride).map((d) => html`<p class="note">Reason for giving ${d.name} despite a conflict: ${d.conflictOverride}</p>`)}

    ${locked
      ? ''
      : html`
        ${assessedNotConfirmed.length
          ? html`<h3>Confirm a diagnosis</h3>
              <p class="hint">Only disorders you have assessed with the checklist can be confirmed. If the criteria are not met, write why you still confirm it.</p>
              ${assessedNotConfirmed.map((id) => {
                const d = findDisorder(id);
                const ev = evaluations[id];
                const preview = conflictsFor(id, [...confirmedIds]);
                const blocking = preview.some((r) => r.level === LEVEL.CONFLICT);
                return html`<form method="post" action="${base}/diagnoses" class="confirm-row">
                  <input type="hidden" name="disorder" value="${id}" />
                  <input type="hidden" name="action" value="confirm" />
                  <div><strong>${d.name}</strong> ${criteriaBadge(ev.status)} <span class="code">${ev.code}</span></div>
                  <label>Note${ev.status === STATUS.MET ? ' (optional)' : ' (required)'}
                    <input name="note" maxlength="1000" ${ev.status === STATUS.MET ? '' : html`required`} />
                  </label>
                  ${preview.length ? conflictList(preview) : ''}
                  ${blocking
                    ? html`<label>Reason for giving both despite the conflict (required)
                        <input name="override" maxlength="1000" required />
                      </label>`
                    : ''}
                  <button class="small">Confirm diagnosis</button>
                </form>`;
              })}`
          : Object.keys(evaluations).length
            ? html`<p class="hint">Every disorder you assessed has been confirmed. Assess another one in step 3 to confirm more.</p>`
            : html`<p class="hint">Assess a disorder in step 3 to be able to confirm it here.</p>`}

        <h3>Finalize</h3>
        <form method="post" action="${base}/finalize">
          <label>Summary for the final report
            <textarea name="final_note" rows="3" maxlength="5000">${c.diagnoses.finalNote ?? ''}</textarea>
          </label>
          <p class="hint">After finalizing, the assessment cannot be changed. ${confirmed.length === 0 ? 'No diagnosis is confirmed: the report will say that no diagnosis in this app was made.' : ''}</p>
          <button>Finalize assessment</button>
        </form>`}`;
}

// ---------- Checklist for one disorder ----------

export function checklistPage({ clinician, c, disorder, suggestion, errors = [] }) {
  const { assessment, patient } = c;
  const base = `/clinician/assessments/${assessment.id}`;
  const checklist = c.checklists[disorder.id] ?? { ratings: {}, specifiers: {} };
  const ev = evaluateDisorder(disorder, checklist, patient);
  const locked = Boolean(assessment.finalized_at);
  const disabled = locked ? html`disabled` : '';

  return layout({
    title: disorder.name,
    clinician,
    body: html`
      <p><a href="${base}">← Back to the assessment</a></p>
      <h1>${disorder.name}</h1>
      <p class="hint">${patientLine(patient)}</p>
      ${errors.length ? html`<div class="error" role="alert"><ul>${errors.map((e) => html`<li>${e}</li>`)}</ul></div>` : ''}

      <section class="card summary">
        <p>Current result: ${criteriaBadge(ev.status)} · ICD-10 <span class="code">${ev.code}</span></p>
        <ul class="facts">
          <li>${ev.present.length} present, ${ev.absent.length} absent, ${ev.unclear.length} unclear, ${ev.unrated.length} not rated</li>
          ${ev.counts.map((n) => html`<li>Symptom count: ${n.present} of ${n.of} present (at least ${n.min} needed)</li>`)}
        </ul>
        ${disorder.note ? html`<p class="note">${disorder.note}</p>` : ''}
        ${disorder.codeNote ? html`<p class="hint">Code: ${disorder.codeNote}</p>` : ''}
        ${suggestion ? html`<p><strong>Why the screening suggested this:</strong></p><ul>${suggestion.reasons.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
      </section>

      ${ruleOutSection(base, c, disorder)}

      <p class="hint">Criteria are short reminders, not the DSM-5-TR text. Check the DSM-5-TR for the full wording. "Unclear" keeps the result open until you can decide.</p>

      <form method="post" action="${base}/checklist?disorder=${disorder.id}">
        ${disorder.groups.map((g) => html`<section class="card">
          <h2>${g.title}</h2>
          ${g.items.map((item) => html`<fieldset class="criterion">
            <legend>${item.label}</legend>
            <div class="options">
              ${RATINGS.map((r) => html`<label class="choice rating-${r}"><input type="radio" name="${item.id}" value="${r}" ${checklist.ratings[item.id] === r ? html`checked` : ''} ${disabled} /> ${RATING_LABELS[r]}</label>`)}
            </div>
          </fieldset>`)}
        </section>`)}

        ${disorder.autoCriteria?.length
          ? html`<section class="card"><h2>From the patient record</h2><ul>
              ${disorder.autoCriteria.map((a) => html`<li>${a.label}: <strong>${evaluateRule(a.rule, {}, patient) ? 'Yes' : 'No'}</strong> (age ${patient.age})</li>`)}
            </ul></section>`
          : ''}

        ${disorder.specifiers.length
          ? html`<section class="card"><h2>Specifiers</h2>
              ${disorder.specifiers.map((sp) => html`<label>${sp.label}
                <select name="spec_${sp.id}" ${disabled}>
                  <option value="">Not chosen</option>
                  ${sp.options.map((o) => html`<option value="${o.value}" ${checklist.specifiers[sp.id] === o.value ? html`selected` : ''}>${o.label}</option>`)}
                </select>
              </label>`)}
            </section>`
          : ''}

        <section class="card">
          <label>Clinical notes for this disorder
            <textarea name="notes" rows="3" maxlength="5000" ${disabled}>${checklist.notes ?? ''}</textarea>
          </label>
          ${locked ? '' : html`<button>Save checklist</button>`}
        </section>
      </form>`,
  });
}

// ---------- Differential diagnosis on the checklist page ----------

function ruleOutSection(base, c, disorder) {
  const list = DIFFERENTIALS[disorder.id] ?? [];
  const confirmedIds = c.diagnoses.items.map((d) => d.disorderId).filter((id) => id !== disorder.id);
  const preview = conflictsFor(disorder.id, confirmedIds);
  return html`<section class="card">
    <h2>Differential diagnosis: rule out</h2>
    <p class="hint">Conditions that can look like this disorder, or must be excluded before diagnosing it. Assessed ones show their checklist result.</p>
    <div class="table-scroll"><table>
      <thead><tr><th>Condition</th><th>Why consider it</th><th>Status</th></tr></thead>
      <tbody>
        ${list.map((item) => {
          if (item.outside) {
            return html`<tr><td>${item.name}</td><td>${item.why}</td><td><span class="hint">Not in this app: assess in the interview</span></td></tr>`;
          }
          const other = findDisorder(item.id);
          const checklist = c.checklists[item.id];
          const confirmed = c.diagnoses.items.some((d) => d.disorderId === item.id);
          return html`<tr>
            <td><a href="${base}/checklist?disorder=${item.id}">${other.name}</a></td>
            <td>${item.why}</td>
            <td>${confirmed ? html`<span class="badge warn">Diagnosis confirmed</span> ` : ''}${checklist
              ? criteriaBadge(evaluateDisorder(other, checklist, c.patient).status)
              : html`<span class="hint">Not assessed</span>`}</td>
          </tr>`;
        })}
      </tbody>
    </table></div>
    ${preview.length ? html`<h3>If you confirm this diagnosis</h3>${conflictList(preview)}` : ''}
  </section>`;
}

// ---------- Final report ----------

export function finalReportPage({ clinician, c, suggestions }) {
  const { assessment, patient } = c;
  const r = c.results;
  const evaluations = Object.entries(c.checklists).map(([id, cl]) => ({
    disorder: findDisorder(id),
    ev: evaluateDisorder(findDisorder(id), cl, patient),
    notes: cl.notes,
  }));
  const m = scoreMoca(c.intake?.moca);

  return layout({
    title: `Final report — ${patient.last_name}`,
    clinician,
    body: html`
      <p><a href="/clinician/assessments/${assessment.id}">← Back to the assessment</a></p>
      <h1>Final assessment report</h1>
      <dl class="card details">
        <dt>Patient</dt><dd>${patient.first_name} ${patient.last_name}</dd>
        <dt>Personal number</dt><dd>${patient.personal_number}</dd>
        <dt>Age / gender</dt><dd>${patient.age} / ${patient.gender}</dd>
        <dt>Education</dt><dd>${patient.education}</dd>
        <dt>Employed</dt><dd>${patient.employed ? 'Yes' : 'No'}</dd>
        <dt>Clinician</dt><dd>${clinician.name}</dd>
        <dt>Intake screening</dt><dd>${assessment.mode === 'onsite' ? 'On site' : 'By link'}, completed ${assessment.completed_at}</dd>
        <dt>Finalized</dt><dd>${assessment.finalized_at}</dd>
      </dl>

      <section class="card">
        <h2>Diagnoses</h2>
        ${c.diagnoses.items.length
          ? html`<div class="table-scroll"><table>
              <thead><tr><th>ICD-10</th><th>Diagnosis (DSM-5-TR)</th><th>Criteria at confirmation</th><th>Note</th></tr></thead>
              <tbody>${c.diagnoses.items.map((d) => html`<tr><td class="code">${d.code}</td><td>${d.name}</td><td>${criteriaBadge(d.criteriaStatus)}</td><td>${d.note}</td></tr>`)}</tbody>
            </table></div>`
          : html`<p>No diagnosis in the scope of this app was made.</p>`}
        ${conflictsAmong(c.diagnoses.items.map((d) => d.disorderId)).length
          ? html`<h3>Combination checks</h3>${conflictList(conflictsAmong(c.diagnoses.items.map((d) => d.disorderId)))}`
          : ''}
        ${c.diagnoses.items.filter((d) => d.conflictOverride).map((d) => html`<p class="note">Reason for giving ${d.name} despite a conflict: ${d.conflictOverride}</p>`)}
        ${c.diagnoses.finalNote ? html`<h3>Summary</h3><p class="prewrap">${c.diagnoses.finalNote}</p>` : ''}
      </section>

      <section class="card">
        <h2>In-depth assessments</h2>
        ${evaluations.length
          ? html`<ul>${evaluations.map((e) => html`<li><strong>${e.disorder.name}</strong>: ${criteriaBadge(e.ev.status)}
              ${e.ev.counts.map((n) => html` · ${n.present} of ${n.of} symptoms (≥ ${n.min})`)}
              ${e.notes ? html`<br /><span class="hint">${e.notes}</span>` : ''}</li>`)}</ul>`
          : html`<p class="hint">No in-depth checklists were completed.</p>`}
      </section>

      <section class="card">
        <h2>Screening summary</h2>
        <ul class="facts">
          <li>PHQ-9 ${r.depression.total}/27 (${r.depression.severity}) · GAD-7 ${r.anxiety.total}/21 (${r.anxiety.severity})</li>
          <li>Safety (PHQ-9 item 9): ${r.safetyFlag ? html`<strong>${r.safetyAnswer}</strong>` : 'Not at all'}</li>
          <li>MoCA: ${m ? `${m.adjusted}/30 (${m.band})` : 'not given'}</li>
          <li>Personality screen: ${suggestions.personality.score}/8 ${suggestions.personality.positive ? '(positive)' : ''}</li>
          <li>Differential screening, positive: ${r.differential?.summary.flagged.join('; ') || 'none'}</li>
        </ul>
        ${suggestions.neuroReferral.length ? html`<h3>Neurological referral</h3><ul>${suggestions.neuroReferral.map((n) => html`<li>${n.finding}. ${n.action}</li>`)}</ul>` : ''}
        ${suggestions.outOfScope.length ? html`<h3>Findings outside this app</h3><ul>${suggestions.outOfScope.map((o) => html`<li>${o.condition}</li>`)}</ul>` : ''}
      </section>

      <p class="disclaimer">Diagnoses were confirmed by the clinician named above. The app's criteria checklists and suggestions support, but do not replace, clinical judgement. ICD-10 codes should be checked against ICD-10-SE before reporting.</p>`,
  });
}
