// Clinician pages in English and Swedish.
//
// The dictionary key is the English text itself, so English needs no
// dictionary and untranslated text falls back to English. Placeholders like
// {name} are filled in from the second argument:
//   t('Completed {date}', { date })
//
// A test (test/i18n-clinician.test.js) reads the page files, finds every
// t('…') text and fails if one has no Swedish translation, and also checks
// the fixed lists that are translated by lookup (statuses, form labels …).
//
// Clinical content (disorder names, criteria, rule-out reasons, suggestion
// reasons) goes through the same translator, with its own dictionary
// (i18n-clinical-sv.js, an unofficial translation). Content added before the
// rule "everything new in both languages" has no entry yet and is shown in
// English: it needs the official Swedish DSM-5-TR terminology (TRA-3).

import { SV } from './i18n-clinician-sv.js';
import { CLINICAL_SV } from './i18n-clinical-sv.js';

export const CLINICIAN_LANGUAGES = { en: 'English', sv: 'Svenska' };

export function clinicianLanguage(value) {
  return Object.hasOwn(CLINICIAN_LANGUAGES, value) ? value : 'en';
}

export function translator(language) {
  const lang = clinicianLanguage(language);
  const dict = lang === 'sv' ? SV : null;
  const t = (text, vars) => {
    let out = dict ? dict[text] ?? CLINICAL_SV[text] ?? text : text;
    if (vars) out = String(out).replace(/\{(\w+)\}/g, (match, key) => (vars[key] !== undefined ? String(vars[key]) : match));
    return out;
  };
  t.language = lang;
  return t;
}

export function hasSwedish(text) {
  return Object.hasOwn(SV, text) || Object.hasOwn(CLINICAL_SV, text);
}
