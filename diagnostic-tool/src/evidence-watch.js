// The research watch: regularly searches PubMed for new treatment research
// on each disorder and stores what it finds as "to review". Nothing reaches
// the disorder information until a clinician has read it and approved it,
// writing a short summary in English and Swedish.
//
// Source: PubMed (NCBI E-utilities), which indexes peer-reviewed journals.
// Ranking: meta-analyses and systematic reviews first, then guidelines and
// randomized controlled trials, then other clinical trials. Preprints,
// retracted papers, comments, letters and editorials are left out.
//
// Settings (.env): EVIDENCE_WATCH=off to turn it off, EVIDENCE_WATCH_DAYS
// (how often, default 7), NCBI_EMAIL and NCBI_API_KEY (optional; NCBI asks
// for an email address and allows more requests with a key). No patient data
// is ever sent: only the disorder search terms.

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

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

// Study design from PubMed's publication types, and its rank (higher first).
// Returns null for publications that should not be suggested.
export const DESIGNS = {
  meta: { rank: 5, label: 'Meta-analysis' },
  review: { rank: 4, label: 'Systematic review' },
  guideline: { rank: 4, label: 'Clinical guideline' },
  rct: { rank: 3, label: 'Randomized controlled trial' },
  trial: { rank: 2, label: 'Clinical trial' },
};
export function classify(pubtypes = []) {
  const has = (x) => pubtypes.includes(x);
  if (['Preprint', 'Retracted Publication', 'Retraction of Publication', 'Comment', 'Letter', 'Editorial', 'Erratum'].some(has)) return null;
  if (has('Meta-Analysis')) return 'meta';
  if (has('Systematic Review')) return 'review';
  if (has('Practice Guideline') || has('Guideline')) return 'guideline';
  if (has('Randomized Controlled Trial')) return 'rct';
  if (has('Clinical Trial') || [...pubtypes].some((p) => /^Clinical Trial, Phase/.test(p))) return 'trial';
  return null;
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '/');

// One search for one disorder: new articles since `since`, ranked.
// NCBI allows 3 requests a second without an API key, 10 with one.
const defaultPause = (env) => (env.NCBI_API_KEY ? 110 : 350);

export async function searchDisorder(id, { since, until = new Date(), fetchImpl = fetch, env = process.env, max = 10, pauseMs = defaultPause(env) } = {}) {
  const common = `tool=continuum${env.NCBI_EMAIL ? `&email=${encodeURIComponent(env.NCBI_EMAIL)}` : ''}${env.NCBI_API_KEY ? `&api_key=${encodeURIComponent(env.NCBI_API_KEY)}` : ''}`;
  const search = `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=${max}&sort=relevance&datetype=edat&mindate=${ymd(since)}&maxdate=${ymd(until)}&term=${encodeURIComponent(searchQuery(id))}&${common}`;
  const found = await (await fetchImpl(search)).json();
  const ids = found?.esearchresult?.idlist ?? [];
  if (!ids.length) return [];
  await pause(pauseMs);
  const summary = await (await fetchImpl(`${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}&${common}`)).json();
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
      url: `https://pubmed.ncbi.nlm.nih.gov/${r.uid}/`,
    }));
}

// Searches every disorder and stores new articles as "to review".
// Returns { found, added, errors }.
export async function runEvidenceWatch(db, { now = new Date(), fetchImpl = fetch, env = process.env, ids = Object.keys(SEARCH_TERMS), pauseMs = defaultPause(env) } = {}) {
  const last = db.prepare("SELECT MAX(finished_at) AS at FROM evidence_runs WHERE error IS NULL").get()?.at;
  // From the last complete search, but never more than a year back (and 90
  // days back the first time), so a search that keeps failing stays small.
  const day = 24 * 3600 * 1000;
  const since = new Date(Math.max(last ? new Date(last).getTime() : now.getTime() - 90 * day, now.getTime() - 365 * day));
  const run = db.prepare('INSERT INTO evidence_runs (started_at) VALUES (?)').run(now.toISOString());
  const insert = db.prepare(`INSERT OR IGNORE INTO evidence_items (disorder_id, source, source_id, title, journal, year, design, rank, url, found_at, status)
                             VALUES (:disorder_id, :source, :source_id, :title, :journal, :year, :design, :rank, :url, :found_at, 'pending')`);
  let found = 0;
  let added = 0;
  const errors = [];
  for (const id of ids) {
    try {
      const items = await searchDisorder(id, { since, until: now, fetchImpl, env, pauseMs });
      found += items.length;
      for (const item of items) added += insert.run({ ...item, found_at: now.toISOString() }).changes;
    } catch (err) {
      errors.push(`${id}: ${err.message}`);
    }
    await pause(pauseMs);
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
