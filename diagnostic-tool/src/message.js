// Messages with values in them ("PHQ-9 {total}/27"), so they can be shown
// in the reader's language. A message is plain text, or { text, vars }.
// A value in vars can be:
//   a number            shown as is (decimal comma in Swedish)
//   a string            free text (e.g. what the clinician typed), shown as is
//   a message           translated too (e.g. a severity label)
//   { item: 'phq9' }    the text of that questionnaire item, in the reader's language
//
// The English text is the translation key (i18n-clinician.js), as everywhere.

import { findItem } from './questionnaire.js';
import { itemText } from './i18n.js';

export const M = (text, vars) => (vars ? { text, vars } : { text });

const SHORT = 60;

export function render(t, message) {
  if (message === null || message === undefined) return '';
  if (typeof message === 'string') return t(message);
  const vars = Object.fromEntries(Object.entries(message.vars ?? {}).map(([k, v]) => [k, value(t, v)]));
  return t(message.text, vars);
}

function value(t, v) {
  if (typeof v === 'number') return t.language === 'sv' ? String(v).replace('.', ',') : String(v);
  if (v && typeof v === 'object') {
    if (v.item) {
      const text = itemText(t.language, findItem(v.item) ?? { text: v.item });
      return text.length > SHORT ? `${text.slice(0, SHORT)}…` : text;
    }
    return render(t, v);
  }
  return v ?? '';
}

// For tests and plain-text output in English.
export const english = (message) => render(Object.assign((text, vars) => String(text).replace(/\{(\w+)\}/g, (m, k) => (vars?.[k] ?? m)), { language: 'en' }), message);
