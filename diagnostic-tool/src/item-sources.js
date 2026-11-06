// Where each questionnaire item comes from, for the validation plan
// (docs/VALIDATION-PLAN.md).
//
//   validated  the original item of a validated instrument (English)
//   adapted    based on a validated instrument but reworded or used alone,
//              so the original validation does not automatically carry over
//   own        written for this app: not validated
//
// A test checks that every item in questionnaire.js is listed here, and that
// every "adapted" or "own" item has a row in the validation plan. So when you
// add a question, you must also decide here where it comes from, and add it
// to the plan.

const range = (prefix, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`);
const each = (ids, source) => Object.fromEntries(ids.map((id) => [id, source]));

const PHQ9 = { status: 'validated', instrument: 'PHQ-9 (Kroenke et al., 2001)' };
const GAD7 = { status: 'validated', instrument: 'GAD-7 (Spitzer et al., 2006)' };
const AUDITC = { status: 'validated', instrument: 'AUDIT-C (Bush et al., 1998)' };
const PCPTSD5 = { status: 'validated', instrument: 'PC-PTSD-5 (Prins et al., 2016)' };
const OWN = { status: 'own' };

export const ITEM_SOURCES = {
  ...each([...range('phq', 1, 9), 'phqDifficulty'], PHQ9),
  ...each([...range('gad', 1, 7), 'gadDifficulty'], GAD7),
  ...each(['gadA', 'gadB', ...range('gadC', 1, 6)], OWN),
  ...each(['bp1', 'bp2', 'bp3', 'pdd1', 'cyclo1', 'psy1', 'psy2', 'psy3'], OWN),
  ...each(range('auditc', 1, 3), AUDITC),
  drug1: { status: 'adapted', instrument: 'Single-question drug screen (Smith et al., 2010), reworded' },
  ...each(['caf1', 'med1', 'medcond', 'medonset', 'stress1', 'grief1', 'grief2', 'pmdd1'], OWN),
  ...each(['panic1', 'panic2', 'soc1', 'soc2', 'ocd1', 'ocd2', 'ill1', 'phobia1', 'agora1', 'sep1', 'bdd1', 'hoard1', 'trich1', 'skin1', 'mutism1'], OWN),
  ...each(['ptsd0', ...range('ptsd', 1, 5)], PCPTSD5),
  ptsd_recent: OWN,
  ...each(range('pd', 1, 8), { status: 'adapted', instrument: 'SAPAS (Moran et al., 2003), reworded for self-report' }),
  ...each(range('pd', 9, 19), OWN),
  ...each(['cog1', 'cog2', ...range('neuro', 1, 6)], OWN),
};

export function needsValidation(id) {
  return ITEM_SOURCES[id]?.status !== 'validated';
}
