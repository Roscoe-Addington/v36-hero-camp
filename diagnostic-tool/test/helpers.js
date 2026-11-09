// A complete set of answers where everything is "Not at all" / "No" / "Never",
// with the overrides a test cares about applied on top.
import { ALL_FIELDS } from '../src/questionnaire.js';

export function answers(overrides = {}) {
  const base = Object.fromEntries(ALL_FIELDS.map((field) => [field.id, 0]));
  return { ...base, ...overrides };
}

// A personal number (YYYYMMDD-0000) for someone who is `age` years old
// today: born `age` years and 30 days ago, so the age stays right whatever
// day the tests run.
export function pnForAge(age, today = new Date()) {
  const d = new Date(today.getFullYear() - age, today.getMonth(), today.getDate() - 30);
  const two = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-0000`;
}
