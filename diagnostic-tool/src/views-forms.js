// Draws a form schema (see forms.js) as HTML, and summarises saved answers.
// `t` translates labels for the clinician's language (i18n-clinician.js).

import { html } from './views.js';
import { summaryRows } from './forms.js';

const same = (text) => text;

function field(f, value, disabled, t) {
  const off = disabled ? html`disabled` : '';
  const req = f.required ? html` <span class="hint">${t('(required)')}</span>` : '';
  if (f.type === 'text') {
    return html`<label>${t(f.label)}${req}<textarea name="${f.id}" rows="3" maxlength="3000" ${off}>${value ?? ''}</textarea></label>`;
  }
  if (f.type === 'line') {
    return html`<label>${t(f.label)}${req}<input name="${f.id}" maxlength="200" value="${value ?? ''}" ${off} /></label>`;
  }
  const multi = f.type === 'checks';
  const chosen = multi ? value ?? [] : [value];
  return html`<fieldset class="question">
    <legend>${t(f.label)}${req}</legend>
    <div class="options">
      ${f.options.map(([v, label]) => html`<label class="choice"><input type="${multi ? 'checkbox' : 'radio'}" name="${f.id}" value="${v}" ${chosen.includes(v) ? html`checked` : ''} ${off} /> ${t(label)}</label>`)}
    </div>
  </fieldset>`;
}

export function renderForm(schema, values = {}, { disabled = false, t = same } = {}) {
  return schema.map((section) => html`<section class="card">
    <h2>${t(section.title)}</h2>
    ${section.fields.map((f) => field(f, values[f.id], disabled, t))}
  </section>`);
}

// A compact read-only summary: only the fields that have an answer.
export function renderSummary(schema, values, t = same) {
  if (!values) return html`<p class="hint">${t('Not filled in yet.')}</p>`;
  const rows = summaryRows(schema, values, t);
  return rows.length
    ? html`<dl class="summary-list">${rows.map((r) => html`<dt>${r.label}</dt><dd class="prewrap">${r.value}</dd>`)}</dl>`
    : html`<p class="hint">${t('No answers recorded.')}</p>`;
}
