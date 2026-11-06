// Evaluates a disorder's diagnostic rule against the clinician's ratings.
//
// The clinician rates each criterion as "present", "absent" or "unclear"
// (or leaves it unrated). Because some answers can be unknown, the rule is
// evaluated with THREE possible results:
//   true  -> the rule is satisfied
//   false -> the rule cannot be satisfied, whatever the unknown items turn out to be
//   null  -> not decided yet: depends on criteria that are unrated or unclear
//
// Rules are small objects, combined like building blocks:
//   'mdd_b'                          one criterion must be present
//   { all: [rule, rule, ...] }       every part must be true
//   { any: [rule, rule, ...] }       at least one part must be true
//   { not: rule }                    the part must be false
//   { count: ['a', 'b', ...], min: 3 }  at least 3 of these criteria present
//   { age: { min: 18 } }             uses the patient's recorded age

export const RATINGS = ['present', 'absent', 'unclear'];

export const STATUS = {
  MET: 'Criteria met',
  NOT_MET: 'Criteria not met',
  INCOMPLETE: 'Incomplete',
};

export function evaluateRule(rule, ratings, patient) {
  if (typeof rule === 'string') {
    if (ratings[rule] === 'present') return true;
    if (ratings[rule] === 'absent') return false;
    return null; // unrated or unclear
  }
  if (rule.all) {
    const parts = rule.all.map((r) => evaluateRule(r, ratings, patient));
    if (parts.includes(false)) return false;
    if (parts.every((p) => p === true)) return true;
    return null;
  }
  if (rule.any) {
    const parts = rule.any.map((r) => evaluateRule(r, ratings, patient));
    if (parts.includes(true)) return true;
    if (parts.every((p) => p === false)) return false;
    return null;
  }
  if (rule.not) {
    const part = evaluateRule(rule.not, ratings, patient);
    return part === null ? null : !part;
  }
  if (rule.count) {
    const present = rule.count.filter((id) => ratings[id] === 'present').length;
    const unknown = rule.count.filter((id) => ratings[id] !== 'present' && ratings[id] !== 'absent').length;
    if (present >= rule.min) return true;
    if (present + unknown < rule.min) return false; // even if every unknown were present
    return null;
  }
  if (rule.age) {
    const age = Number(patient?.age);
    if (!Number.isFinite(age)) return null;
    if (rule.age.min !== undefined && age < rule.age.min) return false;
    if (rule.age.max !== undefined && age > rule.age.max) return false;
    return true;
  }
  throw new Error(`Unknown rule: ${JSON.stringify(rule)}`);
}

// Collects the count rules inside a rule, to explain them in the report
// ("4 of 9 present, at least 5 needed").
function countRules(rule, out = []) {
  if (!rule || typeof rule === 'string') return out;
  if (rule.count) out.push(rule);
  for (const child of [...(rule.all ?? []), ...(rule.any ?? []), ...(rule.not ? [rule.not] : [])]) countRules(child, out);
  return out;
}

export function evaluateDisorder(disorder, checklist, patient) {
  const ratings = checklist?.ratings ?? {};
  const result = evaluateRule(disorder.rule, ratings, patient);
  const status = result === true ? STATUS.MET : result === false ? STATUS.NOT_MET : STATUS.INCOMPLETE;

  const allItems = disorder.groups.flatMap((g) => g.items);
  const labelOf = (id) => allItems.find((i) => i.id === id)?.label ?? id;

  const counts = countRules(disorder.rule).map((rule) => ({
    present: rule.count.filter((id) => ratings[id] === 'present').length,
    of: rule.count.length,
    min: rule.min,
    firstItem: labelOf(rule.count[0]),
  }));

  return {
    status,
    present: allItems.filter((i) => ratings[i.id] === 'present').map((i) => i.label),
    absent: allItems.filter((i) => ratings[i.id] === 'absent').map((i) => i.label),
    unclear: allItems.filter((i) => ratings[i.id] === 'unclear').map((i) => i.label),
    unrated: allItems.filter((i) => !RATINGS.includes(ratings[i.id])).map((i) => i.label),
    counts,
    code: disorder.code(checklist?.specifiers ?? {}),
  };
}
