// Disorder information: search, and one disorder's page with a summary,
// treatments (most effective first), rule-outs, criteria and approved new
// research. In English and Swedish.

import { html, layout } from './views.js';
import { translator } from './i18n-clinician.js';
import { findDisorder, DISORDERS, CATEGORIES } from './disorders.js';
import { DIFFERENTIALS } from './differential-lists.js';
import { KNOWLEDGE, EVIDENCE_LABELS } from './knowledge.js';
import { rankedTreatments, categoryOf } from './disorder-search.js';
import { DESIGNS } from './evidence-watch.js';

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
              <span class="hint">${t(DESIGNS[e.design]?.label ?? 'Clinical trial')} · <span lang="en">${e.journal ?? ''}</span> ${e.year ?? ''} · <a href="${e.url}" rel="noopener noreferrer" target="_blank">PubMed ${e.source_id}</a> · ${t('Approved by {name} {date}', { name: e.reviewer_name ?? '', date: String(e.reviewed_at ?? '').slice(0, 10) })}</span>
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

// The research watch's review queue: articles found on PubMed, best study
// designs first. Approving needs a short summary in both languages; the
// article title stays in its original language (English), marked as such.
export function evidenceReviewPage({ clinician, pending = [], reviewed = [], lastRun = null, running = false, canReview = true, errors = {}, values = {}, message = '' }) {
  const t = translator(clinician?.language);
  const runText = lastRun
    ? t('Last search {date}: {found} articles found, {added} new.', { date: String(lastRun.finished_at ?? lastRun.started_at).slice(0, 16).replace('T', ' '), found: lastRun.found ?? 0, added: lastRun.added ?? 0 })
    : t('No search has been made yet.');
  return layout({
    title: t('New research to review'),
    clinician,
    body: html`
      <h1>${t('New research to review')}</h1>
      <p>${t('Continuum searches PubMed regularly for new meta-analyses, systematic reviews, guidelines and randomized trials on the treatment of each disorder. Nothing is shown in the disorder information until a clinician has read the article and approved it.')}</p>
      ${message ? html`<p class="note" role="status">${t(message)}</p>` : ''}
      <div class="card">
        <p>${runText}${lastRun?.error ? html` <span class="badge warn">${t('Some searches failed; they are tried again next time.')}</span>` : ''}</p>
        ${running
          ? html`<p class="hint">${t('A search is running. Reload the page in a minute or two.')}</p>`
          : canReview
            ? html`<form method="post" action="/clinician/evidence/run"><button class="secondary">${t('Search now')}</button></form>`
            : ''}
      </div>
      ${canReview ? '' : html`<p class="note">${t('Only the clinicians named as research reviewers can approve or reject articles.')}</p>`}

      <h2>${t('To review')} (${pending.length})</h2>
      <p class="hint">${t('Ranked by study design: meta-analyses and systematic reviews first, then guidelines and randomized controlled trials, then other clinical trials. Open the article and read at least the abstract before deciding.')}</p>
      ${pending.length
        ? pending.map((e) => html`<article class="card evidence-item" id="item-${e.id}">
            <p class="hint">${t(findDisorder(e.disorder_id)?.name ?? e.disorder_id)} · <span class="badge ${e.rank >= 4 ? 'ok' : 'info'}">${t(DESIGNS[e.design]?.label ?? 'Clinical trial')}</span> · <span lang="en">${e.journal ?? ''}</span> ${e.year ?? ''}</p>
            <h3><span class="hint">${t('Original title (English):')}</span> <span lang="en">${e.title}</span></h3>
            <p><a href="${e.url}" rel="noopener noreferrer" target="_blank">${t('Open in PubMed')} (PMID ${e.source_id})</a></p>
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
            <thead><tr><th>${t('Disorder')}</th><th>${t('Study design')}</th><th>PMID</th><th>${t('Decision')}</th><th>${t('Reviewed by')}</th></tr></thead>
            <tbody>${reviewed.map((e) => html`<tr>
              <td><a href="/clinician/disorders/${e.disorder_id}">${t(findDisorder(e.disorder_id)?.name ?? e.disorder_id)}</a></td>
              <td>${t(DESIGNS[e.design]?.label ?? 'Clinical trial')}</td>
              <td><a href="${e.url}" rel="noopener noreferrer" target="_blank">${e.source_id}</a></td>
              <td>${t(STATUS_LABELS[e.status])}</td>
              <td>${e.reviewer_name ?? ''} ${String(e.reviewed_at ?? '').slice(0, 10)}</td>
            </tr>`)}</tbody>
          </table></div>`
        : html`<p class="hint">${t('Nothing has been reviewed yet.')}</p>`}`,
  });
}
