// Disorder information: search, and one disorder's page with a summary,
// treatments (most effective first), rule-outs, criteria and approved new
// research. In English and Swedish.

import { html, layout } from './views.js';
import { translator } from './i18n-clinician.js';
import { findDisorder, DISORDERS, CATEGORIES } from './disorders.js';
import { DIFFERENTIALS } from './differential-lists.js';
import { KNOWLEDGE, EVIDENCE_LABELS } from './knowledge.js';
import { rankedTreatments, categoryOf } from './disorder-search.js';
import { DESIGNS, SOURCES } from './evidence-watch.js';
import { OUTCOMES } from './guidance.js';

const pick = (both, lang) => (both ? both[lang] ?? both.en : '');

export function disorderSearchPage({ clinician, query = '', results = [] }) {
  const t = translator(clinician?.language);
  const lang = t.language;
  return layout({
    title: t('Disorder information'),
    clinician,
    body: html`
      <h1>${t('Disorder information')}</h1>
      <form method="get" action="/clinician/disorders" class="card search" role="search">
        <label>${t('Search for a disorder')}
          <input name="q" type="search" required maxlength="80" value="${query}" placeholder="${t('Name, abbreviation or ICD-10 code, e.g. PTSD or F32')}" />
        </label>
        <button>${t('Search')}</button>
      </form>
      ${query
        ? results.length
          ? html`<ul class="disorder-results">${results.map((d) => html`<li class="card">
              <a href="/clinician/disorders/${d.id}"><strong>${t(d.name)}</strong></a>
              <span class="hint">${t(categoryOf(d).title)} · ICD-10 ${t(d.code({}))}</span>
              <p>${pick(KNOWLEDGE[d.id]?.summary, lang)}</p>
            </li>`)}</ul>`
          : html`<p class="note">${t('No disorder matches the search.')}</p>`
        : CATEGORIES.map((c) => html`<section class="card">
            <h2>${t(c.title)}</h2>
            <ul class="disorder-list">${DISORDERS.filter((d) => d.category === c.id).map((d) => html`<li><a href="/clinician/disorders/${d.id}">${t(d.name)}</a></li>`)}</ul>
          </section>`)}`,
  });
}

export function disorderInfoPage({ clinician, disorder, evidence = [] }) {
  const t = translator(clinician?.language);
  const lang = t.language;
  const info = KNOWLEDGE[disorder.id];
  const treatments = rankedTreatments(disorder.id);
  const rules = DIFFERENTIALS[disorder.id] ?? [];
  return layout({
    title: t(disorder.name),
    clinician,
    body: html`
      <p><a href="/clinician/disorders">← ${t('Disorder information')}</a></p>
      <h1>${t(disorder.name)}</h1>
      <p class="hint">${t(categoryOf(disorder).title)} · ICD-10 <span class="code">${t(disorder.code({}))}</span></p>
      <p class="lead">${pick(info.summary, lang)}</p>

      <section class="card">
        <h2>${t('Treatment')}</h2>
        <p class="hint">${t('Most effective first: ordered by the strength of the evidence, then by guideline recommendation.')}</p>
        <ol class="treatments">${treatments.map((x) => html`<li>
          <strong>${pick(x.what, lang)}</strong> <span class="badge ${x.evidence === 'strong' ? 'ok' : x.evidence === 'moderate' ? 'info' : 'warn'}">${pick(EVIDENCE_LABELS[x.evidence], lang)}</span>
          ${x.note ? html`<br /><span class="hint">${pick(x.note, lang)}</span>` : ''}
        </li>`)}</ol>
        ${info.sources.length ? html`<p class="hint">${t('Based on:')} ${info.sources.join('; ')}</p>` : html`<p class="hint">${t('No national guideline covers this disorder; based on smaller studies and expert consensus.')}</p>`}
        <p class="note">${t('Treatment information supports, but does not replace, clinical judgement and current national guidelines. Check doses, contraindications and interactions in FASS or the product information.')}</p>
      </section>

      <section class="card">
        <h2>${t('New research reviewed by a clinician')}</h2>
        ${evidence.length
          ? html`<ul class="evidence">${evidence.map((e) => html`<li>
              <strong>${pick({ en: e.summary_en, sv: e.summary_sv }, lang)}</strong><br />
              <span class="hint">${t(DESIGNS[e.design]?.label ?? 'Clinical trial')} · <span lang="en">${e.journal ?? ''}</span> ${e.year ?? ''} · <a href="${e.url}" rel="noopener noreferrer" target="_blank">${sourceLabel(e)} ${e.source_id}</a> · ${t('Approved by {name} {date}', { name: e.reviewer_name ?? '', date: String(e.reviewed_at ?? '').slice(0, 10) })}</span>
            </li>`)}</ul>`
          : html`<p class="hint">${t('No new research has been approved for this disorder yet.')}</p>`}
      </section>

      <section class="card">
        <h2>${t('Differential diagnosis: rule out')}</h2>
        <ul>${rules.map((r) => (r.outside
          ? html`<li><strong>${t(r.name)}.</strong> ${t(r.why)}</li>`
          : html`<li><a href="/clinician/disorders/${r.id}"><strong>${t(findDisorder(r.id).name)}</strong></a>. ${t(r.why)}</li>`))}</ul>
      </section>

      <details class="card">
        <summary>${t('Diagnostic criteria (short labels)')}</summary>
        ${disorder.groups.map((g) => html`<h3>${t(g.title)}</h3><ul>${g.items.map((i) => html`<li>${t(i.label)}</li>`)}</ul>`)}
        <p class="hint">${t('Criteria are short reminders, not the DSM-5-TR text. Check the DSM-5-TR for the full wording. “Unclear” keeps the result open until you can decide.')}</p>
      </details>`,
  });
}

const STATUS_LABELS = { pending: 'To review', approved: 'Approved', rejected: 'Rejected' };
const sourceLabel = (e) => SOURCES[e.source]?.label ?? e.source;
// Every source that found the article (PubMed's priority-journal search counts as PubMed).
const foundIn = (e) => [...new Set(String(e.found_via ?? e.source).split(',').map((v) => SOURCES[v.replace('-priority', '')]?.label ?? v))].join(', ');

// The research watch's review queue: articles found on PubMed, Europe PMC
// and ClinicalTrials.gov, best study designs first, priority journals first
// within each. Approving needs a short summary in both languages; the
// article title stays in its original language (English), marked as such.
export function evidenceReviewPage({ clinician, pending = [], reviewed = [], lastRun = null, running = false, canReview = true, reviewerNames = [], errors = {}, values = {}, message = '', guidance = [], guidanceErrors = {}, guidanceValues = {} }) {
  const t = translator(clinician?.language);
  const runText = lastRun
    ? t('Last search {date}: {found} articles found, {added} new.', { date: String(lastRun.finished_at ?? lastRun.started_at).slice(0, 16).replace('T', ' '), found: lastRun.found ?? 0, added: lastRun.added ?? 0 })
    : t('No search has been made yet.');
  return layout({
    title: t('New research to review'),
    clinician,
    body: html`
      <h1>${t('New research to review')}</h1>
      <p>${t('Continuum searches PubMed, Europe PMC and ClinicalTrials.gov every week for new meta-analyses, systematic reviews, guidelines and trials on the treatment of each disorder, with a separate search in the priority journals. Nothing is shown in the disorder information until a research reviewer has read the article and approved it.')}</p>
      ${message ? html`<p class="note" role="status">${t(message)}</p>` : ''}
      <div class="card">
        <p>${runText}${lastRun?.error ? html` <span class="badge warn">${t('Some searches failed; they are tried again next time.')}</span>` : ''}</p>
        ${running
          ? html`<p class="hint">${t('A search is running. Reload the page in a minute or two.')}</p>`
          : canReview
            ? html`<form method="post" action="/clinician/evidence/run"><button class="secondary">${t('Search now')}</button></form>`
            : ''}
      </div>
      ${canReview ? '' : html`<p class="note">${t('Only the clinicians named as research reviewers can approve or reject articles.')}
        ${reviewerNames.length
          ? t('Research reviewers: {names}.', { names: reviewerNames.join(', ') })
          : t('No research reviewer has been named yet.')}
        ${clinician?.role === 'admin' ? html`<a href="/clinician/admin#clinicians">${t('Name reviewers under Administration.')}</a>` : t('An administrator names them.')}</p>`}

      <h2>${t('To review')} (${pending.length})</h2>
      <p class="hint">${t('Ranked by study design: meta-analyses and systematic reviews first, then guidelines and randomized controlled trials, then other clinical trials, then trial registrations (not peer-reviewed); priority journals first within each. Open the article and read at least the abstract before deciding.')}</p>
      ${pending.length
        ? pending.map((e) => html`<article class="card evidence-item" id="item-${e.id}">
            <p class="hint">${t(findDisorder(e.disorder_id)?.name ?? e.disorder_id)} · <span class="badge ${e.rank >= 4 ? 'ok' : e.rank <= 1 ? 'warn' : 'info'}">${t(DESIGNS[e.design]?.label ?? 'Clinical trial')}</span>${e.priority ? html` <span class="badge ok">${t('Priority journal')}</span>` : ''} · <span lang="en">${e.journal ?? ''}</span> ${e.year ?? ''}</p>
            <h3><span class="hint">${t('Original title (English):')}</span> <span lang="en">${e.title}</span></h3>
            <p><a href="${e.url}" rel="noopener noreferrer" target="_blank">${t('Open in {source}', { source: sourceLabel(e) })} (${e.source === 'pubmed' ? 'PMID ' : ''}${e.source_id})</a> · <span class="hint">${t('Found in: {sources}', { sources: foundIn(e) })}</span></p>
            ${canReview
              ? html`<form method="post" action="/clinician/evidence/${e.id}">
                  ${errors[e.id] ? html`<div class="error" role="alert"><ul>${errors[e.id].map((x) => html`<li>${t(x)}</li>`)}</ul></div>` : ''}
                  <label>${t('Summary in English (what was studied and what was found)')}
                    <textarea name="summary_en" rows="2" maxlength="1000" lang="en">${values[e.id]?.summary_en ?? ''}</textarea></label>
                  <label>${t('Summary in Swedish')}
                    <textarea name="summary_sv" rows="2" maxlength="1000" lang="sv">${values[e.id]?.summary_sv ?? ''}</textarea></label>
                  <label>${t('Note for the review (optional, not shown on the disorder page)')}
                    <input name="note" maxlength="1000" value="${values[e.id]?.note ?? ''}" /></label>
                  <div class="form-buttons">
                    <button name="action" value="approve">${t('Approve and add to the disorder information')}</button>
                    <button name="action" value="reject" class="secondary">${t('Reject')}</button>
                  </div>
                </form>`
              : ''}
          </article>`)
        : html`<p class="hint">${t('Nothing to review right now.')}</p>`}

      <h2>${t('Recently reviewed')}</h2>
      ${reviewed.length
        ? html`<div class="table-scroll"><table>
            <thead><tr><th>${t('Disorder')}</th><th>${t('Study design')}</th><th>${t('Source')}</th><th>${t('Decision')}</th><th>${t('Reviewed by')}</th></tr></thead>
            <tbody>${reviewed.map((e) => html`<tr>
              <td><a href="/clinician/disorders/${e.disorder_id}">${t(findDisorder(e.disorder_id)?.name ?? e.disorder_id)}</a></td>
              <td>${t(DESIGNS[e.design]?.label ?? 'Clinical trial')}</td>
              <td><a href="${e.url}" rel="noopener noreferrer" target="_blank">${sourceLabel(e)} ${e.source_id}</a></td>
              <td>${t(STATUS_LABELS[e.status])}</td>
              <td>${e.reviewer_name ?? ''} ${String(e.reviewed_at ?? '').slice(0, 10)}</td>
            </tr>`)}</tbody>
          </table></div>`
        : html`<p class="hint">${t('Nothing has been reviewed yet.')}</p>`}

      ${guidance.length ? guidanceSection(t, guidance, canReview, guidanceErrors, guidanceValues) : ''}`,
  });
}

// The yearly check of Swedish guidance: these agencies cannot be searched
// automatically, so a research reviewer checks each one once a year.
function guidanceSection(t, guidance, canReview, errors, values) {
  return html`<section class="card" id="guidance">
    <h2>${t('Swedish guidance: yearly check')}</h2>
    <p class="hint">${t('SBU, Socialstyrelsen, Kunskapsstyrning vård and Läkemedelsverket cannot be searched automatically. A research reviewer checks each one once a year and records what was found; the start page reminds reviewers when a check is due.')}</p>
    ${guidance.map((g) => html`<article class="guidance-item">
      <h3><a href="${g.url}" rel="noopener noreferrer" target="_blank">${g.name}</a>
        <span class="badge ${g.due ? 'warn' : 'ok'}">${g.due ? t('Check due') : t('Checked')}</span></h3>
      <p>${t(g.what)}</p>
      <p class="hint">${g.last
        ? t('Last checked {date} by {name}: {outcome}', { date: String(g.last.checked_at).slice(0, 10), name: g.last.checked_by_name ?? '', outcome: t(OUTCOMES[g.last.outcome]) })
        : t('Not checked yet.')}${g.last?.note ? html` <span class="prewrap">(${g.last.note})</span>` : ''}</p>
      ${canReview
        ? html`<form method="post" action="/clinician/evidence/guidance/${g.id}">
            ${errors[g.id] ? html`<div class="error" role="alert"><ul>${errors[g.id].map((x) => html`<li>${t(x)}</li>`)}</ul></div>` : ''}
            <fieldset><legend>${t('What did you find?')}</legend>
              <div class="options">${Object.entries(OUTCOMES).map(([k, label]) => html`<label class="choice"><input type="radio" name="outcome" value="${k}" required ${values[g.id]?.outcome === k ? html`checked` : ''} /> ${t(label)}</label>`)}</div>
            </fieldset>
            <label>${t('Note (required if something needs updating)')} <input name="note" maxlength="1000" value="${values[g.id]?.note ?? ''}" /></label>
            <button class="secondary">${t('Record the check')}</button>
          </form>`
        : ''}
    </article>`)}
  </section>`;
}
