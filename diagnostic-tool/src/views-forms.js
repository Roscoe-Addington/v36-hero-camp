// Draws a form schema (see forms.js) as HTML, and summarises saved answers.

import { html } from './views.js';
import { fieldsOf, optionLabel } from './forms.js';

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
  const rows = fieldsOf(schema)
    .map((f) => {
      const v = values[f.id];
      if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return null;
      const shown = Array.isArray(v) ? v.map((x) => optionLabel(schema, f.id, x)).join(', ') : f.options ? optionLabel(schema, f.id, v) : v;
      return html`<dt>${f.label}</dt><dd class="prewrap">${shown}</dd>`;
    })
    .filter(Boolean);
  return rows.length ? html`<dl class="summary-list">${rows}</dl>` : html`<p class="hint">No answers recorded.</p>`;
}
