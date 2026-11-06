// Draws a form schema (see forms.js) as HTML, and summarises saved answers.

import { html } from './views.js';
import { summaryRows } from './forms.js';

function field(f, value, disabled) {
  const off = disabled ? html`disabled` : '';
  const req = f.required ? html` <span class="hint">(required)</span>` : '';
  if (f.type === 'text') {
    return html`<label>${f.label}${req}<textarea name="${f.id}" rows="3" maxlength="3000" ${off}>${value ?? ''}</textarea></label>`;
  }
  if (f.type === 'line') {
    return html`<label>${f.label}${req}<input name="${f.id}" maxlength="200" value="${value ?? ''}" ${off} /></label>`;
  }
  const multi = f.type === 'checks';
  const chosen = multi ? value ?? [] : [value];
  return html`<fieldset class="question">
    <legend>${f.label}${req}</legend>
    <div class="options">
      ${f.options.map(([v, label]) => html`<label class="choice"><input type="${multi ? 'checkbox' : 'radio'}" name="${f.id}" value="${v}" ${chosen.includes(v) ? html`checked` : ''} ${off} /> ${label}</label>`)}
    </div>
  </fieldset>`;
}

export function renderForm(schema, values = {}, { disabled = false } = {}) {
  return schema.map((section) => html`<section class="card">
    <h2>${section.title}</h2>
    ${section.fields.map((f) => field(f, values[f.id], disabled))}
  </section>`);
}

// A compact read-only summary: only the fields that have an answer.
export function renderSummary(schema, values) {
  if (!values) return html`<p class="hint">Not filled in yet.</p>`;
  const rows = summaryRows(schema, values);
  return rows.length
    ? html`<dl class="summary-list">${rows.map((r) => html`<dt>${r.label}</dt><dd class="prewrap">${r.value}</dd>`)}</dl>`
    : html`<p class="hint">No answers recorded.</p>`;
}
