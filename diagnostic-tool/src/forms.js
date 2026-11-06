// Generic clinician forms, described as data ("schemas").
//
// A schema is a list of sections, each with fields:
//   { id, type: 'text' | 'line' | 'choice' | 'checks', label, options?, required? }
//     text    multi-line notes          -> string
//     line    one-line answer           -> string
//     choice  pick one (radio buttons)  -> one option value, or ''
//     checks  pick any (checkboxes)     -> array of option values
//   options: [['value', 'Label'], ...]
//
// Describing a form as data means the same description is used to draw the
// form (views-forms.js) and to check what comes back (parseForm below). Pure
// functions: the server and the browser demo both use them.

const MAX_TEXT = 3000;

export function fieldsOf(schema) {
  return schema.flatMap((section) => section.fields);
}

// A form value can arrive as a string or, for checkboxes, an array.
const asList = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

// Returns { values, errors }. Unknown options are dropped, never stored.
export function parseForm(schema, body) {
  const values = {};
  const errors = [];
  for (const f of fieldsOf(schema)) {
    const raw = body?.[f.id];
    const allowed = (f.options ?? []).map(([v]) => v);
    if (f.type === 'checks') {
      values[f.id] = asList(raw).filter((v) => allowed.includes(v));
    } else if (f.type === 'choice') {
      values[f.id] = allowed.includes(raw) ? raw : '';
    } else {
      values[f.id] = String(asList(raw)[0] ?? '').trim().slice(0, f.type === 'line' ? 200 : MAX_TEXT);
    }
    const empty = Array.isArray(values[f.id]) ? values[f.id].length === 0 : values[f.id] === '';
    if (f.required && empty) errors.push(`${f.label}: this is required.`);
  }
  return { values, errors };
}

// The label of a chosen option, for summaries ("Slowed" instead of "retarded").
export function optionLabel(schema, fieldId, value) {
  const field = fieldsOf(schema).find((f) => f.id === fieldId);
  return field?.options?.find(([v]) => v === value)?.[1] ?? value;
}
