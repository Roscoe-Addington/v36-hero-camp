// The research watch: regularly searches for new treatment research on each
// disorder and stores what it finds as "to review". Nothing reaches the
// disorder information until a research reviewer has read it and approved
// it, writing a short summary in English and Swedish.
//
// Sources (approved by the clinic, 2026-11-15):
// - PubMed (NCBI E-utilities): peer-reviewed journals. Searched twice per
//   disorder: once in all journals and once in the priority journals below,
//   so their articles are never crowded out.
// - Europe PMC: PubMed plus PubMed Central and European content, searched in
//   titles and abstracts. Preprints are left out. Articles with a PubMed id
//   are stored as PubMed articles, so nothing is listed twice.
// - ClinicalTrials.gov: interventional trials whose results were posted in
//   the period. Not peer-reviewed, so ranked last and marked as such.
// Ranking: meta-analyses and systematic reviews first, then guidelines and
// randomized controlled trials, then other clinical trials, then trial
// registrations; within each, priority journals first. Preprints, retracted
// papers, comments, letters and editorials are left out.
//
// Settings (.env): EVIDENCE_WATCH=off to turn it off, EVIDENCE_WATCH_DAYS
// (how often, default 7), EVIDENCE_SOURCES (default all three:
// pubmed,europepmc,clinicaltrials), NCBI_EMAIL and NCBI_API_KEY (optional).
// No patient data is ever sent: only the disorder search terms.

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const EUROPE_PMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';
const CLINICAL_TRIALS = 'https://clinicaltrials.gov/api/v2/studies';

export const SOURCES = {
  pubmed: { label: 'PubMed', host: 'eutils.ncbi.nlm.nih.gov' },
  europepmc: { label: 'Europe PMC', host: 'www.ebi.ac.uk' },
  clinicaltrials: { label: 'ClinicalTrials.gov', host: 'clinicaltrials.gov' },
};
export function enabledSources(env = process.env) {
  const listed = String(env.EVIDENCE_SOURCES ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  return (listed.length ? listed : Object.keys(SOURCES)).filter((s) => Object.hasOwn(SOURCES, s));
}

// Priority journals (approved by the clinic), as NLM abbreviations: the name
// PubMed and Europe PMC give for each journal.
export const PRIORITY_JOURNALS = {
  international: ['JAMA Psychiatry', 'Lancet Psychiatry', 'Am J Psychiatry', 'World Psychiatry', 'Br J Psychiatry', 'Psychol Med', 'BMJ', 'Lancet', 'N Engl J Med', 'Cochrane Database Syst Rev'],
  specialty: ['J Affect Disord', 'Depress Anxiety', 'J Anxiety Disord', 'Behav Res Ther', 'Int J Eat Disord', 'Schizophr Bull', 'Bipolar Disord', 'Internet Interv'],
  nordic: ['Acta Psychiatr Scand', 'Nord J Psychiatry', 'Lakartidningen', 'Cogn Behav Ther'],
};
const normJournal = (x) => String(x ?? '').toLowerCase().replace(/[.\s]+/g, ' ').trim();
const PRIORITY_SET = new Set(Object.values(PRIORITY_JOURNALS).flat().map(normJournal));
export const isPriorityJournal = (abbreviation) => PRIORITY_SET.has(normJournal(abbreviation));
const PRIORITY_FILTER = `(${Object.values(PRIORITY_JOURNALS).flat().map((j) => `"${j}"[ta]`).join(' OR ')})`;

// PubMed search terms per disorder (MeSH where one exists).
export const SEARCH_TERMS = {
  mdd: 'depressive disorder, major[mh]', pdd: 'dysthymic disorder[mh]', pmdd: 'premenstrual dysphoric disorder[mh]',
  dmdd: '"disruptive mood dysregulation"[tiab]', bipolar1: 'bipolar disorder[mh]', bipolar2: '"bipolar II"[tiab]',
  cyclothymic: 'cyclothymic disorder[mh]', substance_mood: '"substance-induced depressive"[tiab]', medical_mood: '"depression due to"[tiab]',
  separation: '"separation anxiety disorder"[tiab]', mutism: '"selective mutism"[tiab]', phobia: 'phobia, specific[mh]',
  social: 'phobia, social[mh]', panic: 'panic disorder[mh]', agoraphobia: 'agoraphobia[mh]', gad: '"generalized anxiety disorder"[tiab]',
  substance_anxiety: '"substance-induced anxiety"[tiab]', medical_anxiety: '"anxiety disorder due to"[tiab]',
  ppd: 'paranoid personality disorder[mh]', szpd: 'schizoid personality disorder[mh]', stpd: 'schizotypal personality disorder[mh]',
  aspd: 'antisocial personality disorder[mh]', bpd: 'borderline personality disorder[mh]', hpd: 'histrionic personality disorder[mh]',
  npd: '"narcissistic personality disorder"[tiab]', avpd: '"avoidant personality disorder"[tiab]', dpd: 'dependent personality disorder[mh]',
  ocpd: 'compulsive personality disorder[mh]', delirium: 'delirium[mh]', major_ncd: 'dementia[mh]', mild_ncd: 'cognitive dysfunction[mh]',
  delusional: '"delusional disorder"[tiab]', brief_psychotic: '"brief psychotic disorder"[tiab]', schizophreniform: 'schizophreniform[tiab]',
  schizophrenia: 'schizophrenia[mh]', schizoaffective: 'schizoaffective[tiab]', substance_psychotic: 'psychoses, substance-induced[mh]',
  medical_psychotic: '"secondary psychosis"[tiab]', catatonia: 'catatonia[mh]', rad: 'reactive attachment disorder[mh]',
  dsed: '"disinhibited social engagement"[tiab]', ptsd: 'stress disorders, post-traumatic[mh]', acute_stress: 'stress disorders, traumatic, acute[mh]',
  adjustment: 'adjustment disorders[mh]', pgd: '"prolonged grief"[tiab]', ocd: 'obsessive-compulsive disorder[mh]',
  bdd: 'body dysmorphic disorders[mh]', hoarding: 'hoarding disorder[mh]', trich: 'trichotillomania[mh]',
  skin_picking: '("skin picking"[tiab] OR "excoriation disorder"[tiab])', substance_ocrd: '"substance-induced obsessive"[tiab]',
  medical_ocrd: '"secondary obsessive-compulsive"[tiab]', pica: 'pica[mh]', rumination: '"rumination syndrome"[tiab]',
  arfid: '("avoidant/restrictive food intake"[tiab] OR ARFID[tiab])', anorexia: 'anorexia nervosa[mh]', bulimia: 'bulimia nervosa[mh]',
  bed: 'binge-eating disorder[mh]', osfed: '("other specified feeding or eating disorder"[tiab] OR "atypical anorexia"[tiab])',
  ufed: '"unspecified feeding or eating disorder"[tiab]',
};

const DESIGN_FILTER = '(meta-analysis[pt] OR systematic review[pt] OR randomized controlled trial[pt] OR practice guideline[pt] OR guideline[pt] OR clinical trial[pt])';
const TOPIC_FILTER = '(therapeutics[mh] OR therapy[sh] OR treatment[tiab] OR intervention[tiab])';

export function searchQuery(id) {
  return `(${SEARCH_TERMS[id]}) AND ${TOPIC_FILTER} AND ${DESIGN_FILTER} AND hasabstract AND (english[la] OR swedish[la])`;
}

// Plain search phrases per disorder, for Europe PMC (titles and abstracts)
// and ClinicalTrials.gov (conditions).
export const PLAIN_TERMS = {
  mdd: ['major depressive disorder', 'major depression', 'depressive disorder'], pdd: ['persistent depressive disorder', 'dysthymia'],
  pmdd: ['premenstrual dysphoric disorder'], dmdd: ['disruptive mood dysregulation disorder'], bipolar1: ['bipolar disorder', 'bipolar I', 'mania'],
  bipolar2: ['bipolar II', 'hypomania'], cyclothymic: ['cyclothymia', 'cyclothymic disorder'], substance_mood: ['substance-induced depressive disorder'],
  medical_mood: ['depression due to another medical condition', 'secondary depression'], separation: ['separation anxiety disorder'],
  mutism: ['selective mutism'], phobia: ['specific phobia'], social: ['social anxiety disorder', 'social phobia'], panic: ['panic disorder'],
  agoraphobia: ['agoraphobia'], gad: ['generalized anxiety disorder', 'generalised anxiety disorder'], substance_anxiety: ['substance-induced anxiety disorder'],
  medical_anxiety: ['anxiety disorder due to another medical condition'], ppd: ['paranoid personality disorder'], szpd: ['schizoid personality disorder'],
  stpd: ['schizotypal personality disorder', 'schizotypal disorder'], aspd: ['antisocial personality disorder'],
  bpd: ['borderline personality disorder', 'emotionally unstable personality disorder'], hpd: ['histrionic personality disorder'],
  npd: ['narcissistic personality disorder'], avpd: ['avoidant personality disorder'], dpd: ['dependent personality disorder'],
  ocpd: ['obsessive-compulsive personality disorder'], delirium: ['delirium'], major_ncd: ['dementia', 'major neurocognitive disorder', 'Alzheimer disease'],
  mild_ncd: ['mild cognitive impairment', 'mild neurocognitive disorder'], delusional: ['delusional disorder'], brief_psychotic: ['brief psychotic disorder'],
  schizophreniform: ['schizophreniform disorder'], schizophrenia: ['schizophrenia'], schizoaffective: ['schizoaffective disorder'],
  substance_psychotic: ['substance-induced psychosis', 'substance-induced psychotic disorder'], medical_psychotic: ['secondary psychosis', 'psychosis due to another medical condition'],
  catatonia: ['catatonia'], rad: ['reactive attachment disorder'], dsed: ['disinhibited social engagement disorder'],
  ptsd: ['post-traumatic stress disorder', 'posttraumatic stress disorder', 'PTSD'], acute_stress: ['acute stress disorder'], adjustment: ['adjustment disorder'],
  pgd: ['prolonged grief disorder', 'complicated grief'], ocd: ['obsessive-compulsive disorder'], bdd: ['body dysmorphic disorder'], hoarding: ['hoarding disorder'],
  trich: ['trichotillomania', 'hair-pulling disorder'], skin_picking: ['excoriation disorder', 'skin picking'], substance_ocrd: ['substance-induced obsessive-compulsive disorder'],
  medical_ocrd: ['obsessive-compulsive disorder due to another medical condition'], pica: ['pica'], rumination: ['rumination syndrome', 'rumination disorder'],
  arfid: ['avoidant/restrictive food intake disorder', 'ARFID'], anorexia: ['anorexia nervosa'], bulimia: ['bulimia nervosa'],
  bed: ['binge-eating disorder', 'binge eating disorder'], osfed: ['other specified feeding or eating disorder', 'atypical anorexia'],
  ufed: ['unspecified feeding or eating disorder'],
};
const quoted = (p) => (/[\s\-/]/.test(p) ? `"${p}"` : p);

// Study design from the publication types (PubMed and Europe PMC use the
// same names; Europe PMC in lower case), and its rank (higher first).
// Returns null for publications that should not be suggested.
export const DESIGNS = {
  meta: { rank: 5, label: 'Meta-analysis' },
  review: { rank: 4, label: 'Systematic review' },
  guideline: { rank: 4, label: 'Clinical guideline' },
  rct: { rank: 3, label: 'Randomized controlled trial' },
  trial: { rank: 2, label: 'Clinical trial' },
  registry: { rank: 1, label: 'Trial registration with results (not peer-reviewed)' },
};
export function classify(pubtypes = []) {
  const types = new Set([...pubtypes].map((x) => String(x).trim().toLowerCase()));
  const has = (x) => types.has(x);
  if (['preprint', 'retracted publication', 'retraction of publication', 'comment', 'letter', 'editorial', 'erratum', 'published erratum'].some(has)) return null;
  if (has('meta-analysis')) return 'meta';
  if (has('systematic review')) return 'review';
  if (has('practice guideline') || has('guideline')) return 'guideline';
  if (has('randomized controlled trial')) return 'rct';
  if (has('clinical trial') || [...types].some((p) => p.startsWith('clinical trial, phase'))) return 'trial';
  return null;
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ymd = (d, sep = '/') => d.toISOString().slice(0, 10).replace(/-/g, sep);
const getJson = async (fetchImpl, url) => {
  const res = await fetchImpl(url);
  if (res.ok === false) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// NCBI allows 3 requests a second without an API key, 10 with one.
const defaultPause = (env) => (env.NCBI_API_KEY ? 110 : 350);

// PubMed: new articles since `since`. With `priorityOnly`, only in the
// priority journals.
export async function searchPubmed(id, { since, until = new Date(), fetchImpl = fetch, env = process.env, max = 10, pauseMs = defaultPause(env), priorityOnly = false } = {}) {
  const common = `tool=continuum${env.NCBI_EMAIL ? `&email=${encodeURIComponent(env.NCBI_EMAIL)}` : ''}${env.NCBI_API_KEY ? `&api_key=${encodeURIComponent(env.NCBI_API_KEY)}` : ''}`;
  const term = priorityOnly ? `${searchQuery(id)} AND ${PRIORITY_FILTER}` : searchQuery(id);
  const found = await getJson(fetchImpl, `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=${max}&sort=relevance&datetype=edat&mindate=${ymd(since)}&maxdate=${ymd(until)}&term=${encodeURIComponent(term)}&${common}`);
  const ids = found?.esearchresult?.idlist ?? [];
  if (!ids.length) return [];
  await pause(pauseMs);
  const summary = await getJson(fetchImpl, `${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}&${common}`);
  return ids
    .map((pmid) => summary?.result?.[pmid])
    .filter(Boolean)
    .map((r) => ({ r, design: classify(r.pubtype) }))
    .filter((x) => x.design)
    .map(({ r, design }) => ({
      disorder_id: id,
      source: 'pubmed',
      source_id: String(r.uid),
      title: String(r.title ?? '').slice(0, 500),
      journal: String(r.fulljournalname || r.source || '').slice(0, 200),
      year: Number(String(r.pubdate ?? r.sortpubdate ?? '').slice(0, 4)) || null,
      design,
      rank: DESIGNS[design].rank,
      priority: isPriorityJournal(r.source) ? 1 : 0,
      url: `https://pubmed.ncbi.nlm.nih.gov/${r.uid}/`,
      found_via: priorityOnly ? 'pubmed-priority' : 'pubmed',
    }));
}
// Kept for callers of the first version.
export const searchDisorder = searchPubmed;

export function europePmcQuery(id, since, until) {
  const terms = PLAIN_TERMS[id].map((p) => `TITLE_ABS:${quoted(p)}`).join(' OR ');
  return `(${terms}) AND (TITLE_ABS:treatment OR TITLE_ABS:therapy OR TITLE_ABS:intervention)`
    + ' AND (PUB_TYPE:"Meta-Analysis" OR PUB_TYPE:"Systematic Review" OR PUB_TYPE:"Randomized Controlled Trial" OR PUB_TYPE:"Practice Guideline" OR PUB_TYPE:"Guideline" OR PUB_TYPE:"Clinical Trial")'
    + ` AND (LANG:eng OR LANG:swe) AND (SRC:MED OR SRC:PMC) AND FIRST_PDATE:[${ymd(since, '-')} TO ${ymd(until, '-')}]`;
}

// Europe PMC: articles with a PubMed id become PubMed articles (the same
// row as PubMed's own find); the rest link to Europe PMC.
export async function searchEuropePmc(id, { since, until = new Date(), fetchImpl = fetch, max = 10 } = {}) {
  const data = await getJson(fetchImpl, `${EUROPE_PMC}?format=json&resultType=lite&pageSize=${max}&query=${encodeURIComponent(europePmcQuery(id, since, until))}`);
  return (data?.resultList?.result ?? [])
    .map((r) => ({ r, design: classify(String(r.pubType ?? '').split(';')) }))
    .filter((x) => x.design)
    .map(({ r, design }) => ({
      disorder_id: id,
      source: r.pmid ? 'pubmed' : 'europepmc',
      source_id: r.pmid ? String(r.pmid) : `${r.source}:${r.id}`,
      title: String(r.title ?? '').slice(0, 500),
      journal: String(r.journalTitle ?? '').slice(0, 200),
      year: Number(r.pubYear) || null,
      design,
      rank: DESIGNS[design].rank,
      priority: isPriorityJournal(r.journalTitle) ? 1 : 0,
      url: r.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/` : `https://europepmc.org/article/${r.source}/${r.id}`,
      found_via: 'europepmc',
    }));
}

// ClinicalTrials.gov: interventional trials with results first posted in the period.
export async function searchClinicalTrials(id, { since, until = new Date(), fetchImpl = fetch, max = 10 } = {}) {
  const params = new URLSearchParams({
    'query.cond': PLAIN_TERMS[id].map((p) => (/\s/.test(p) ? `"${p}"` : p)).join(' OR '),
    'filter.advanced': `AREA[StudyType]INTERVENTIONAL AND AREA[ResultsFirstPostDate]RANGE[${ymd(since, '-')},${ymd(until, '-')}]`,
    pageSize: String(max),
    fields: 'NCTId,BriefTitle,ResultsFirstPostDate,LeadSponsorName',
  });
  const data = await getJson(fetchImpl, `${CLINICAL_TRIALS}?${params}`);
  return (data?.studies ?? [])
    .map((s) => s.protocolSection ?? {})
    .filter((p) => p.identificationModule?.nctId)
    .map((p) => ({
      disorder_id: id,
      source: 'clinicaltrials',
      source_id: p.identificationModule.nctId,
      title: String(p.identificationModule.briefTitle ?? '').slice(0, 500),
      journal: String(p.sponsorCollaboratorsModule?.leadSponsor?.name ?? '').slice(0, 200),
      year: Number(String(p.statusModule?.resultsFirstPostDateStruct?.date ?? '').slice(0, 4)) || null,
      design: 'registry',
      rank: DESIGNS.registry.rank,
      priority: 0,
      url: `https://clinicaltrials.gov/study/${p.identificationModule.nctId}`,
      found_via: 'clinicaltrials',
    }));
}

// Everything the enabled sources find for one disorder, each article once
// (found_via lists every source that found it). Errors are collected, so one
// failing source does not stop the others.
export async function searchAllSources(id, { since, until = new Date(), fetchImpl = fetch, env = process.env, pauseMs = defaultPause(env), sources = enabledSources(env) } = {}) {
  const searches = [];
  if (sources.includes('pubmed')) {
    searches.push(['pubmed', () => searchPubmed(id, { since, until, fetchImpl, env, pauseMs })]);
    searches.push(['pubmed', () => searchPubmed(id, { since, until, fetchImpl, env, pauseMs, priorityOnly: true })]);
  }
  if (sources.includes('europepmc')) searches.push(['europepmc', () => searchEuropePmc(id, { since, until, fetchImpl })]);
  if (sources.includes('clinicaltrials')) searches.push(['clinicaltrials', () => searchClinicalTrials(id, { since, until, fetchImpl })]);
  const items = new Map();
  const errors = [];
  for (const [source, search] of searches) {
    try {
      for (const item of await search()) {
        const key = `${item.source}:${item.source_id}`;
        const seen = items.get(key);
        if (!seen) items.set(key, item);
        else {
          seen.priority = Math.max(seen.priority, item.priority);
          if (!seen.found_via.split(',').includes(item.found_via)) seen.found_via += `,${item.found_via}`;
        }
      }
    } catch (err) {
      errors.push(`${SOURCES[source].label} ${id}: ${err.message}`);
    }
    await pause(pauseMs);
  }
  return { items: [...items.values()], errors };
}

// Searches every disorder in every enabled source and stores new articles
// as "to review". Returns { found, added, errors }.
export async function runEvidenceWatch(db, { now = new Date(), fetchImpl = fetch, env = process.env, ids = Object.keys(SEARCH_TERMS), pauseMs = defaultPause(env), sources = enabledSources(env) } = {}) {
  const last = db.prepare("SELECT MAX(finished_at) AS at FROM evidence_runs WHERE error IS NULL").get()?.at;
  // From the last complete search, but never more than a year back (and 90
  // days back the first time), so a search that keeps failing stays small.
  const day = 24 * 3600 * 1000;
  const since = new Date(Math.max(last ? new Date(last).getTime() : now.getTime() - 90 * day, now.getTime() - 365 * day));
  const run = db.prepare('INSERT INTO evidence_runs (started_at) VALUES (?)').run(now.toISOString());
  const insert = db.prepare(`INSERT OR IGNORE INTO evidence_items (disorder_id, source, source_id, title, journal, year, design, rank, priority, url, found_via, found_at, status)
                             VALUES (:disorder_id, :source, :source_id, :title, :journal, :year, :design, :rank, :priority, :url, :found_via, :found_at, 'pending')`);
  let found = 0;
  let added = 0;
  const errors = [];
  for (const id of ids) {
    const result = await searchAllSources(id, { since, until: now, fetchImpl, env, pauseMs, sources });
    errors.push(...result.errors);
    found += result.items.length;
    for (const item of result.items) added += insert.run({ ...item, found_at: now.toISOString() }).changes;
  }
  db.prepare('UPDATE evidence_runs SET finished_at = ?, found = ?, added = ?, error = ? WHERE id = ?')
    .run(new Date().toISOString(), found, added, errors.length ? errors.join('; ').slice(0, 1000) : null, run.lastInsertRowid);
  return { found, added, errors };
}

// Checks a clinician's review. Approving needs a summary in both languages.
export function parseReview(body) {
  const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : null;
  const summary_en = String(body.summary_en ?? '').trim().slice(0, 1000);
  const summary_sv = String(body.summary_sv ?? '').trim().slice(0, 1000);
  const note = String(body.note ?? '').trim().slice(0, 1000);
  const errors = [];
  if (!action) errors.push('Choose approve or reject.');
  if (action === 'approve' && (!summary_en || !summary_sv)) errors.push('Write a short summary in both English and Swedish before approving.');
  return errors.length ? { errors } : { review: { action, summary_en, summary_sv, note } };
}
