// The yearly check of Swedish guidance (approved by the clinic, 2026-11-15).
// These agencies have no feed or search interface the app can read, and
// their guidance changes every few years, so a research reviewer checks
// each one by hand once a year and records the result. The start page
// reminds reviewers when a check is due.

export const CHECK_EVERY_DAYS = 365;

// `what` is English text translated through t() (Swedish in i18n-clinician-sv.js).
export const GUIDANCE_SOURCES = [
  { id: 'sbu', name: 'SBU', url: 'https://www.sbu.se/',
    what: 'Swedish evidence reports (SBU utvärderar), SBU Kommenterar and answers from the enquiry service on psychiatric treatments.' },
  { id: 'socialstyrelsen', name: 'Socialstyrelsen',
    url: 'https://socialstyrelsen.se/kunskapsstod-och-regler/regler-och-riktlinjer/nationella-riktlinjer/information-till-patienter/om-publicerade-riktlinjer/',
    what: 'National guidelines (nationella riktlinjer), e.g. depression and anxiety, schizophrenia and eating disorders: new or revised recommendations.' },
  { id: 'kunskapsstyrning', name: 'Kunskapsstyrning vård', url: 'https://www.kunskapsstyrningvard.se/',
    what: 'Care pathways (vårdförlopp) and knowledge support from the national programme area for mental health.' },
  { id: 'lakemedelsverket', name: 'Läkemedelsverket', url: 'https://www.lakemedelsverket.se/',
    what: 'Treatment recommendations (behandlingsrekommendationer) and new safety information for psychiatric medicines.' },
];

export const OUTCOMES = { no_change: 'Nothing new that affects the disorder information', update_needed: 'New guidance: the disorder information needs updating' };

// Each source with its latest check and whether a check is due.
export function guidanceStatus(db, now = new Date()) {
  const latest = db.prepare(
    `SELECT g.*, c.name AS checked_by_name FROM guidance_checks g LEFT JOIN clinicians c ON c.id = g.checked_by
      WHERE g.source_id = ? ORDER BY g.checked_at DESC, g.id DESC LIMIT 1`
  );
  return GUIDANCE_SOURCES.map((s) => {
    const last = latest.get(s.id) ?? null;
    const age = last ? (now.getTime() - new Date(last.checked_at).getTime()) / 86400000 : Infinity;
    return { ...s, last, due: age >= CHECK_EVERY_DAYS };
  });
}

// Returns { check } or { errors }. A note is required when something needs updating.
export function parseGuidanceCheck(sourceId, body) {
  const errors = [];
  if (!GUIDANCE_SOURCES.some((s) => s.id === sourceId)) errors.push('No such source.');
  const outcome = Object.hasOwn(OUTCOMES, body.outcome) ? body.outcome : null;
  if (!outcome) errors.push('Choose what you found.');
  const note = String(body.note ?? '').trim().slice(0, 1000);
  if (outcome === 'update_needed' && !note) errors.push('Write what is new and what needs updating.');
  return errors.length ? { errors } : { check: { sourceId, outcome, note } };
}
