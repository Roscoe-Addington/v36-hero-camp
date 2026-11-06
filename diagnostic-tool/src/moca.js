// MoCA (Montreal Cognitive Assessment) score handling.
//
// The MoCA test itself is NOT in this app: it is copyrighted, must be given
// by a trained and certified person, and needs permission from MoCA
// Cognition for any digital version. The clinician gives the paper test on
// site and types the domain scores in here.
//
// Scoring rules (MoCA instructions): total 0-30, add 1 point if the person
// has 12 years of formal education or fewer (maximum still 30). 26 or more
// is considered normal. Many studies find 26 too strict and use 23-24; the
// cut-off is shown to the clinician, who decides.

export const MOCA_DOMAINS = [
  { id: 'visexec', label: 'Visuospatial / executive', max: 5 },
  { id: 'naming', label: 'Naming', max: 3 },
  { id: 'attention', label: 'Attention', max: 6 },
  { id: 'language', label: 'Language', max: 3 },
  { id: 'abstraction', label: 'Abstraction', max: 2 },
  { id: 'recall', label: 'Delayed recall', max: 5 },
  { id: 'orientation', label: 'Orientation', max: 6 },
];

export const MOCA_CUTOFF = 26;

// Education levels in the patient form that mean 12 years of school or fewer.
const LOW_EDUCATION_LEVELS = ['Primary / compulsory school', 'Upper secondary school'];

export function defaultLowEducation(patient) {
  return LOW_EDUCATION_LEVELS.includes(patient?.education);
}

export function mocaBand(score) {
  if (score >= 26) return 'Normal range (26–30)';
  if (score >= 18) return 'Mild impairment range (18–25)';
  if (score >= 10) return 'Moderate impairment range (10–17)';
  return 'Severe impairment range (below 10)';
}

// Turns form fields into a validated MoCA record, or a list of errors.
export function parseMoca(body) {
  if (body.moca_administered !== 'yes') return { moca: { administered: false }, errors: [] };
  const domains = {};
  const errors = [];
  for (const d of MOCA_DOMAINS) {
    const raw = body[`moca_${d.id}`];
    const value = Number(raw);
    if (raw === undefined || raw === '' || !Number.isInteger(value) || value < 0 || value > d.max) {
      errors.push(`MoCA ${d.label}: enter a whole number from 0 to ${d.max}.`);
    } else {
      domains[d.id] = value;
    }
  }
  return { moca: { administered: true, domains, lowEducation: body.moca_low_education === 'yes' }, errors };
}

export function scoreMoca(moca) {
  if (!moca?.administered) return null;
  const raw = MOCA_DOMAINS.reduce((sum, d) => sum + (moca.domains[d.id] ?? 0), 0);
  const adjusted = Math.min(30, raw + (moca.lowEducation ? 1 : 0));
  return {
    raw,
    adjusted,
    educationPoint: moca.lowEducation,
    belowCutoff: adjusted < MOCA_CUTOFF,
    band: mocaBand(adjusted),
    domains: MOCA_DOMAINS.map((d) => ({ label: d.label, score: moca.domains[d.id], max: d.max })),
  };
}
