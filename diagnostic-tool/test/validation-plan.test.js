// Keeps docs/VALIDATION-PLAN.md in step with the questionnaire: adding a
// question without deciding its source, or without a row in the plan, fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALL_FIELDS } from '../src/questionnaire.js';
import { ITEM_SOURCES, needsValidation } from '../src/item-sources.js';

const plan = readFileSync(new URL('../docs/VALIDATION-PLAN.md', import.meta.url), 'utf8');
const ids = ALL_FIELDS.map((f) => f.id);

test('every questionnaire item has a source (validated, adapted or own)', () => {
  assert.deepEqual(ids.filter((id) => !ITEM_SOURCES[id]), [], 'add these to src/item-sources.js');
  assert.deepEqual(Object.keys(ITEM_SOURCES).filter((id) => !ids.includes(id)), [], 'remove these from src/item-sources.js');
  for (const [id, s] of Object.entries(ITEM_SOURCES)) {
    assert.ok(['validated', 'adapted', 'own'].includes(s.status), id);
    if (s.status !== 'own') assert.ok(s.instrument, `${id}: name the instrument`);
  }
});

test('every adapted or own item has a row in the validation plan', () => {
  const missing = ids.filter(needsValidation).filter((id) => !plan.includes(`| \`${id}\` |`));
  assert.deepEqual(missing, [], 'add rows for these items to section 3 of docs/VALIDATION-PLAN.md');
});

test('validated items are not listed as needing validation', () => {
  const listed = ids.filter((id) => !needsValidation(id)).filter((id) => plan.includes(`| \`${id}\` |`));
  assert.deepEqual(listed, [], 'these are validated: remove their rows or change their source');
});

test('the summary counts match the item sources', () => {
  const count = (status) => ids.filter((id) => ITEM_SOURCES[id].status === status).length;
  assert.match(plan, new RegExp(`\\| Validated instruments, original wording \\| ${count('validated')} \\|`));
  assert.match(plan, new RegExp(`\\| Adapted from a validated instrument \\| ${count('adapted')} \\|`));
  assert.match(plan, new RegExp(`\\| Written for this app \\| ${count('own')} \\|`));
  assert.match(plan, new RegExp(`has \\*\\*${ids.length} questions\\*\\*`));
});
