// Administration: every patient with the clinician they are assigned to, and
// assigning a patient to another clinician (with the history). Only for
// administrators. All text through t(), in English and Swedish.

import { html, layout } from './views.js';
import { translator } from './i18n-clinician.js';

const day = (text) => String(text ?? '').slice(0, 10);

export function adminPage({ clinician, query = '', clinicianFilter = null, patients = [], total = patients.length, clinicians = [] }) {
  const t = translator(clinician?.language);
  return layout({
    title: t('Administration'),
    clinician,
    body: html`
      <h1>${t('Administration')}</h1>
      <p>${t('Every patient and the clinician they are assigned to. Only the assigned clinician can change a patient’s file; earlier clinicians keep read-only access. Every view and assignment is in the audit log.')}</p>
      <form method="get" action="/clinician/admin" class="card search" role="search">
        <label>${t('Personal number or name')}
          <input name="q" type="search" maxlength="80" value="${query}" placeholder="${t('e.g. YYYYMMDD-XXXX')}" autocomplete="off" />
        </label>
        <label>${t('Clinician')}
          <select name="clinician">
            <option value="">${t('All clinicians')}</option>
            ${clinicians.map((c) => html`<option value="${c.id}" ${c.id === clinicianFilter ? html`selected` : ''}>${c.name}</option>`)}
          </select>
        </label>
        <button>${t('Search')}</button>
      </form>

      <h2>${t('Patients')} (${total})</h2>
      ${patients.length
        ? html`<div class="table-scroll"><table>
            <thead><tr><th>${t('Name')}</th><th>${t('Personal number')}</th><th>${t('Treating clinician')}</th><th>${t('Since')}</th><th></th></tr></thead>
            <tbody>${patients.map((p) => html`<tr>
              <td>${p.last_name}, ${p.first_name}</td>
              <td class="code">${p.personal_number}</td>
              <td>${p.clinician_name}</td>
              <td>${day(p.assigned_since)}</td>
              <td><a class="button" href="/clinician/admin/patients/${p.id}">${t('Assign')}</a></td>
            </tr>`)}</tbody>
          </table></div>
          ${total > patients.length ? html`<p class="hint">${t('Showing the first {n}. Search to narrow the list.', { n: patients.length })}</p>` : ''}`
        : html`<p class="note">${t('No patient matches the search.')}</p>`}

      <h2>${t('Clinicians')}</h2>
      <div class="table-scroll"><table>
        <thead><tr><th>${t('Name')}</th><th>${t('Email')}</th><th>${t('Role')}</th><th>${t('Patients')}</th></tr></thead>
        <tbody>${clinicians.map((c) => html`<tr>
          <td><a href="/clinician/admin?clinician=${c.id}">${c.name}</a></td>
          <td>${c.email}</td>
          <td>${c.role === 'admin' ? t('Administrator') : t('Clinician')}</td>
          <td>${c.patient_count}</td>
        </tr>`)}</tbody>
      </table></div>
      <p class="hint">${t('New accounts and the administrator role are set up on the server: npm run create-clinician (add --admin for an administrator).')}</p>`,
  });
}

export function assignPage({ clinician, patient, owner, history = [], clinicians = [], errors = [], values = {}, saved = false }) {
  const t = translator(clinician?.language);
  const others = clinicians.filter((c) => c.id !== patient.clinician_id);
  return layout({
    title: `${t('Assign')}: ${patient.last_name}`,
    clinician,
    body: html`
      <p><a href="/clinician/admin">← ${t('Administration')}</a></p>
      <h1>${patient.first_name} ${patient.last_name}</h1>
      <dl class="card details">
        <dt>${t('Personal number')}</dt><dd>${patient.personal_number}</dd>
        <dt>${t('Treating clinician')}</dt><dd>${owner?.name ?? ''}</dd>
      </dl>
      <p><a href="/clinician/patients/${patient.id}">${t('Open the patient’s file (read-only)')}</a></p>
      ${saved ? html`<p class="note" role="status">${t('The patient has been assigned. The earlier clinician keeps read-only access.')}</p>` : ''}
      ${errors.length ? html`<div class="error" role="alert"><ul>${errors.map((e) => html`<li>${t(e)}</li>`)}</ul></div>` : ''}

      <form method="post" action="/clinician/admin/patients/${patient.id}/assign" class="card">
        <h2>${t('Assign to another clinician')}</h2>
        <label>${t('New treating clinician')}
          <select name="clinician_id" required>
            <option value="">${t('Choose…')}</option>
            ${others.map((c) => html`<option value="${c.id}" ${String(values.clinician_id) === String(c.id) ? html`selected` : ''}>${c.name} (${c.patient_count})</option>`)}
          </select>
        </label>
        <label>${t('Reason')}
          <input name="reason" required maxlength="300" value="${values.reason ?? ''}" placeholder="${t('e.g. Dr Ek has left the clinic')}" />
        </label>
        <p class="hint">${t('The new clinician can change the file and gets the “results ready” emails. The earlier clinician keeps read-only access.')}</p>
        <button>${t('Assign')}</button>
      </form>

      <h2>${t('Assignment history')}</h2>
      <div class="table-scroll"><table>
        <thead><tr><th>${t('Clinician')}</th><th>${t('From')}</th><th>${t('To')}</th><th>${t('Assigned by')}</th><th>${t('Reason')}</th></tr></thead>
        <tbody>${history.map((a) => html`<tr>
          <td>${a.clinician_name}</td>
          <td>${day(a.started_at)}</td>
          <td>${a.ended_at ? day(a.ended_at) : html`<span class="badge ok">${t('Now')}</span>`}</td>
          <td>${a.assigned_by_name ?? ''}</td>
          <td>${a.reason ?? ''}</td>
        </tr>`)}</tbody>
      </table></div>`,
  });
}
