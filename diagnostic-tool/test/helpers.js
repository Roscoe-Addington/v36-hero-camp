// A complete set of answers where everything is "Not at all" / "No" / "Never",
// with the overrides a test cares about applied on top.
import { ALL_FIELDS } from '../src/questionnaire.js';

export function answers(overrides = {}) {
  const base = Object.fromEntries(ALL_FIELDS.map((field) => [field.id, 0]));
  return { ...base, ...overrides };
}

// A personal number (YYYYMMDD-0000) for someone who is `age` years old
// today: born `age` years and 30 days ago, so the age stays right whatever
// day the tests run.
export function pnForAge(age, today = new Date()) {
  const d = new Date(today.getFullYear() - age, today.getMonth(), today.getDate() - 30);
  const two = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-0000`;
}

// "Only Swedish in Swedish mode": common English words left in a page's
// visible text (used by swedish-clinical.test.js and knowledge.test.js).
// Words that only occur in English text (Swedish never uses them as words).
const ENGLISH = /(?<![\p{L}\d])(the|and|with|not|only|are|of|to|from|this|that|have|has|been|was|were|which|when|than|during|after|before|should|could|would|your|their|there|these|those|without|because|between|within|also|other|another|about|into|over|more|less|most|least|any|each|every|some|such|both|either|neither|while|until|since|then|they|them|it|its|be|by|an|at|on|as|if|or|no|yes|can|may|must|will|do|does|did)(?![\p{L}\d])/giu;

// Allowed: proper names, instrument names and author citations.
const ALLOWED = [
  /Mind Självmordslinjen/g, /et al\.?/g, /FT-AN/g, /US National Center for PTSD/g, /Pfizer Inc\./g,
];

export function englishLeft(page) {
  let text = String(page)
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    // Text marked as English on purpose: original article titles and journal names
    .replace(/<(span|textarea)\b[^>]*\blang="en"[^>]*>[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
  for (const re of ALLOWED) text = text.replace(re, ' ');
  const hits = [];
  for (const m of text.matchAll(ENGLISH)) {
    const start = Math.max(0, m.index - 50);
    hits.push(text.slice(start, m.index + 50).replace(/\s+/g, ' ').trim());
  }
  return [...new Set(hits)];
}


// A fake PubMed: esearch returns three ids, esummary their publication types.
export function fakePubmed(calls = []) {
  const records = {
    111: { uid: '111', title: 'A meta-analysis', fulljournalname: 'Journal A', pubdate: '2026 Oct 1', pubtype: ['Journal Article', 'Meta-Analysis'] },
    222: { uid: '222', title: 'A randomized trial', source: 'J B', pubdate: '2026 Sep', pubtype: ['Journal Article', 'Randomized Controlled Trial'] },
    333: { uid: '333', title: 'A comment', fulljournalname: 'Journal C', pubdate: '2026', pubtype: ['Comment'] },
  };
  return async (url) => {
    calls.push(url);
    const body = url.includes('esearch.fcgi')
      ? { esearchresult: { count: '3', idlist: ['111', '222', '333'] } }
      : { result: { uids: ['111', '222', '333'], ...records } };
    return { ok: true, json: async () => body };
  };
}
