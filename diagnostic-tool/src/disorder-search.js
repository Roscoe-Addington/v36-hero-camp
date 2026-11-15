// Search the disorder information by name (English or Swedish), ICD-10 code
// or common abbreviation. Pure function, shared by the server and the demo.

import { DISORDERS, CATEGORIES } from './disorders.js';
import { translator } from './i18n-clinician.js';
import { KNOWLEDGE, EVIDENCE } from './knowledge.js';

// Abbreviations and other names people search for.
const ALIASES = {
  mdd: ['depression', 'MDD', 'egentlig depression'], pdd: ['dysthymia', 'dystymi', 'PDD'], pmdd: ['PMDD', 'PMDS'],
  dmdd: ['DMDD'], bipolar1: ['bipolar', 'mania', 'mani', 'BP1'], bipolar2: ['bipolar', 'hypomania', 'hypomani', 'BP2'],
  gad: ['GAD', 'generalized anxiety', 'generaliserat ångestsyndrom', 'worry', 'oro'], panic: ['panic', 'panik'],
  social: ['social phobia', 'social fobi', 'SAD'], ptsd: ['PTSD', 'trauma'], acute_stress: ['ASD', 'trauma'],
  ocd: ['OCD', 'tvång'], bdd: ['BDD', 'dysmorphophobia'], major_ncd: ['dementia', 'demens', 'Alzheimer'],
  mild_ncd: ['MCI', 'mild cognitive impairment', 'lindrig kognitiv störning'], schizophrenia: ['psychosis', 'psykos'],
  bpd: ['BPD', 'EIPS', 'emotionally unstable', 'emotionellt instabil', 'borderline'], aspd: ['ASPD', 'antisocial'],
  arfid: ['ARFID'], anorexia: ['anorexia', 'anorexi', 'AN'], bulimia: ['bulimia', 'bulimi', 'BN'],
  bed: ['BED', 'binge eating', 'hetsätning'], osfed: ['OSFED', 'atypical anorexia', 'atypisk anorexi'], ufed: ['UFED'],
  trich: ['hair pulling', 'hårdragning'], skin_picking: ['skin picking', 'hudplockande'], pgd: ['grief', 'sorg'],
};

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();

// Treatments with the most effective (best-supported) first; the order within
// an evidence level is the order in the guideline-based content.
export function rankedTreatments(id) {
  const list = KNOWLEDGE[id]?.treatments ?? [];
  return list.map((t, i) => ({ ...t, i })).sort((a, b) => EVIDENCE.indexOf(a.evidence) - EVIDENCE.indexOf(b.evidence) || a.i - b.i);
}

export function searchDisorders(query) {
  const q = norm(query);
  if (!q) return [];
  const sv = translator('sv');
  const scored = DISORDERS.map((d) => {
    const names = [d.name, sv(d.name)].map(norm);
    const code = norm(d.code({}));
    const aliases = (ALIASES[d.id] ?? []).map(norm);
    let score = 0;
    if (names.some((n) => n === q) || aliases.some((a) => a === q) || code === q) score = 100;
    else if (names.some((n) => n.startsWith(q)) || code.startsWith(q)) score = 60;
    else if (aliases.some((a) => a.startsWith(q))) score = 50;
    else if (names.some((n) => n.includes(q)) || aliases.some((a) => a.includes(q))) score = 30;
    else if (q.length >= 4 && (norm(KNOWLEDGE[d.id]?.summary.en).includes(q) || norm(KNOWLEDGE[d.id]?.summary.sv).includes(q))) score = 10;
    return { disorder: d, score };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.disorder.name.localeCompare(b.disorder.name)).map((x) => x.disorder);
}

export const categoryOf = (d) => CATEGORIES.find((c) => c.id === d.category);
