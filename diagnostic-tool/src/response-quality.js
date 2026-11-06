// Response quality: signs that the patient was tired or answered without
// reading. Shown to the clinician as "check these answers in the interview".
// It NEVER changes or discards answers or scores: a fast or tired answer can
// still be true.
//
// Checks (as agreed: speed and contradictions, plus self-reported tiredness;
// "the same answer many times in a row" is NOT used on its own, because
// healthy people truly answer "No" to many questions):
//
// 1. Speed: a page answered at under 2 seconds per question suggests the
//    questions were not read (a common rule of thumb in survey research,
//    e.g. Huang et al. 2012). Only for patients answering by link; on site
//    the clinician may be typing in answers from paper.
// 2. Contradictions: answers that cannot both be true.
// 3. Possible inconsistencies: answers that rarely go together.
// 4. Tiredness: the patient's own rating, asked during the questionnaire.

import { PAGES, PHQ9_ITEMS, GAD7_ITEMS, TIREDNESS_BREAK_AT, findItem } from './questionnaire.js';

export const SECONDS_PER_QUESTION_MIN = 2;
const MIN_QUESTIONS_FOR_SPEED = 3; // too few questions on a page to judge speed

export const KIND = {
  SPEED: 'Fast answering',
  CONTRADICTION: 'Contradiction',
  POSSIBLE: 'Possible inconsistency',
  TIRED: 'Tiredness',
};

const sum = (items, a) => items.reduce((t, i) => t + (a[i.id] ?? 0), 0);
const short = (id) => findItem(id)?.text.slice(0, 70) ?? id;

export function contradictionChecks(a, skipConflicts = []) {
  const flags = [];
  // Answered a follow-up "Yes" although the earlier answer was "No".
  for (const { parent, child } of skipConflicts) {
    flags.push({ kind: KIND.CONTRADICTION, text: `Answered "No" to "${short(parent)}…" but "Yes" to the follow-up "${short(child)}…".` });
  }
  if (a.auditc1 === 0 && (a.auditc2 > 0 || a.auditc3 > 0)) {
    flags.push({ kind: KIND.CONTRADICTION, text: 'Says they never drink alcohol, but reports drinks on a typical day or six or more drinks on one occasion.' });
  }
  if (sum(PHQ9_ITEMS, a) === 0 && a.phqDifficulty >= 2) {
    flags.push({ kind: KIND.CONTRADICTION, text: 'No PHQ-9 problems reported, but says problems made life very or extremely difficult.' });
  }
  if (sum(GAD7_ITEMS, a) === 0 && a.gadDifficulty >= 2) {
    flags.push({ kind: KIND.CONTRADICTION, text: 'No GAD-7 problems reported, but says problems made life very or extremely difficult.' });
  }
  if (a.pdd1 === 1 && a.phq1 === 0 && a.phq2 === 0) {
    flags.push({ kind: KIND.POSSIBLE, text: 'Reports low mood on most days for 2+ years, but no low mood or loss of interest at all in the last 2 weeks.' });
  }
  if (a.gadA === 1 && a.gadB === 1 && sum(GAD7_ITEMS, a) === 0) {
    flags.push({ kind: KIND.POSSIBLE, text: 'Reports 6 months of hard-to-control worry, but no anxiety symptoms at all in the last 2 weeks.' });
  }
  return flags;
}

// meta: { pages: { [part]: { shown, submitted, answered } }, tiredness: [{ part, value, at }], contradictions: [...] }
// mode: 'link' or 'onsite'
export function responseQuality(answers, meta = {}, mode = 'link') {
  const flags = [];
  const pages = PAGES.map((page) => {
    const t = meta.pages?.[page.part];
    // `== null` (not `!t.shown`): a time of 0 is a real value, not a missing one.
    if (t?.shown == null || t?.submitted == null || !t.answered) return { part: page.part, seconds: null, perQuestion: null };
    const seconds = Math.max(0, Math.round((t.submitted - t.shown) / 1000));
    return { part: page.part, seconds, answered: t.answered, perQuestion: Math.round((seconds / t.answered) * 10) / 10 };
  });

  if (mode === 'link') {
    const fast = pages.filter((p) => p.perQuestion !== null && p.answered >= MIN_QUESTIONS_FOR_SPEED && p.perQuestion < SECONDS_PER_QUESTION_MIN);
    if (fast.length) {
      flags.push({
        kind: KIND.SPEED,
        text: `Part${fast.length > 1 ? 's' : ''} ${fast.map((p) => p.part).join(', ')} answered at under ${SECONDS_PER_QUESTION_MIN} seconds per question (${fast.map((p) => `${p.perQuestion} s`).join(', ')}).`,
      });
    }
  }

  flags.push(...contradictionChecks(answers, meta.contradictions));

  const tiredness = (meta.tiredness ?? []).map((t) => ({ part: t.part, value: t.value }));
  for (const t of tiredness.filter((x) => x.value >= TIREDNESS_BREAK_AT)) {
    // Did they take a break? The next page was shown 10+ minutes later.
    const next = meta.pages?.[t.part + 1];
    const tAt = (meta.tiredness ?? []).find((x) => x.part === t.part)?.at;
    const tookBreak = next?.shown && tAt && next.shown - tAt > 10 * 60 * 1000;
    flags.push({ kind: KIND.TIRED, text: `Rated tiredness ${t.value}/10 after part ${t.part}${tookBreak ? ' and took a break' : ' and continued without a break'}.` });
  }

  const timed = pages.filter((p) => p.seconds !== null);
  const totalSeconds = timed.reduce((s, p) => s + p.seconds, 0);
  return {
    mode,
    flags,
    pages,
    tiredness,
    totalMinutes: timed.length ? Math.round(totalSeconds / 6) / 10 : null,
    summary: flags.length
      ? `${flags.length} ${flags.length === 1 ? 'sign' : 'signs'} to check in the interview.`
      : 'No signs of tired or careless answering.',
  };
}
