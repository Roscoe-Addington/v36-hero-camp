// The browser demo (demo/template.html): steps in the order of the
// assessment, and every text of the demo page in both English and Swedish.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../demo/template.html', import.meta.url), 'utf8');

test('the demo steps follow the assessment order', () => {
  const steps = page.slice(page.indexOf('const STEPS = ['), page.indexOf('];', page.indexOf('const STEPS = ['))).match(/id: '([^']+)'/g).map((m) => m.slice(5, -1));
  assert.deepEqual(steps, ['login', 'new-patient', 'patient', 'interview', 'screening', 'risk', 'checklist', 'final', 'email', 'followup', 'audit', 'retention']);
});

test('every demo text exists in English and Swedish', () => {
  const start = page.indexOf('const UI = {') + 'const UI = '.length;
  const end = page.indexOf('const LANGUAGE_NAMES');
  const UI = new Function(`return ${page.slice(start, end).trim().replace(/;$/, '')}`)();
  const keys = (o, prefix = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`])).sort();
  assert.deepEqual(keys(UI.sv), keys(UI.en));
  for (const key of keys(UI.en)) {
    const get = (lang) => key.split('.').reduce((o, k) => o[k], UI[lang]);
    if (key !== 'title' && typeof get('en') === 'string' && get('en').length > 12) assert.notEqual(get('sv'), get('en'), `${key} is translated`);
  }
  assert.ok(page.includes('<title>Continuum – demo</title>'));
});
