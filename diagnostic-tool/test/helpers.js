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


// Fake research services (PubMed, Europe PMC, ClinicalTrials.gov), so the
// tests never use the network. Every disorder gets the same answers:
// - PubMed: a meta-analysis (111), a randomized trial (222) and a comment (333, left out);
// - Europe PMC: the same meta-analysis again (PMID 111, so it is merged), an
//   RCT in a priority journal only in PubMed Central, and a preprint (left out);
// - ClinicalTrials.gov: one trial with results.
export function fakeResearch(calls = []) {
  const pubmed = {
    111: { uid: '111', title: 'A meta-analysis', fulljournalname: 'Journal A', source: 'J A', pubdate: '2026 Oct 1', pubtype: ['Journal Article', 'Meta-Analysis'] },
    222: { uid: '222', title: 'A randomized trial', source: 'J B', pubdate: '2026 Sep', pubtype: ['Journal Article', 'Randomized Controlled Trial'] },
    333: { uid: '333', title: 'A comment', fulljournalname: 'Journal C', pubdate: '2026', pubtype: ['Comment'] },
  };
  const europePmc = { resultList: { result: [
    { id: '111', source: 'MED', pmid: '111', title: 'A meta-analysis', journalTitle: 'J A', pubYear: '2026', pubType: 'meta-analysis; systematic review; journal article' },
    { id: 'PMC999', source: 'PMC', title: 'A trial only in PubMed Central', journalTitle: 'Lancet Psychiatry', pubYear: '2026', pubType: 'research-article; randomized controlled trial' },
    { id: 'PPR1', source: 'PPR', title: 'A preprint', journalTitle: '', pubYear: '2026', pubType: 'preprint' },
  ] } };
  const trials = { studies: [{ protocolSection: {
    identificationModule: { nctId: 'NCT00000001', briefTitle: 'A registered trial with results' },
    statusModule: { resultsFirstPostDateStruct: { date: '2026-10-09' } },
    sponsorCollaboratorsModule: { leadSponsor: { name: 'A University' } },
  } }] };
  return async (url) => {
    calls.push(url);
    let body;
    if (url.includes('esearch.fcgi')) body = { esearchresult: { count: '3', idlist: ['111', '222', '333'] } };
    else if (url.includes('esummary.fcgi')) body = { result: { uids: ['111', '222', '333'], ...pubmed } };
    else if (url.includes('europepmc')) body = europePmc;
    else if (url.includes('clinicaltrials.gov')) body = trials;
    else throw new Error(`unexpected URL ${url}`);
    return { ok: true, json: async () => body };
  };
}
