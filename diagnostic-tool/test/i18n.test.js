import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_FIELDS, SCREENING_SECTIONS, FREQUENCY_OPTIONS, DIFFICULTY_OPTIONS, YES_NO_OPTIONS } from '../src/questionnaire.js';
import { missingSwedish, STRINGS } from '../src/i18n.js';

test('every question, answer option and section has Swedish text', () => {
  const ids = ALL_FIELDS.map((f) => f.id).filter((id) => !id.endsWith('Difficulty'));
  const labels = [...FREQUENCY_OPTIONS, ...DIFFICULTY_OPTIONS, ...YES_NO_OPTIONS, ...SCREENING_SECTIONS.flatMap((s) => s.items.flatMap((i) => i.options))]
    .map((o) => o.label);
  const missing = missingSwedish(ids, [...new Set(labels)], SCREENING_SECTIONS.map((s) => s.title));
  assert.deepEqual(missing, { items: [], options: [], sections: [] });
});

test('English and Swedish page texts have the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.sv).sort(), Object.keys(STRINGS.en).sort());
  assert.equal(STRINGS.sv.consent.length, STRINGS.en.consent.length);
});
