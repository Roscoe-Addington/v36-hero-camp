// A complete set of answers where everything is "Not at all" / "No" / "Never",
// with the overrides a test cares about applied on top.
import { ALL_FIELDS } from '../src/questionnaire.js';

export function answers(overrides = {}) {
  const base = Object.fromEntries(ALL_FIELDS.map((field) => [field.id, 0]));
  return { ...base, ...overrides };
}
