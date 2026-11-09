// Quick checks that keep the pages usable on iPad and Android. The full check
// in emulated devices is `npm run check:devices` (needs Playwright).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('every table can scroll sideways on a narrow screen instead of widening the page', () => {
  for (const file of ['src/views.js', 'src/views-workflow.js']) {
    const source = read(file);
    const tables = source.match(/<table/g)?.length ?? 0;
    const wrapped = source.match(/<div class="table-scroll"><table/g)?.length ?? 0;
    assert.equal(wrapped, tables, `${file}: wrap each <table> in <div class="table-scroll">`);
  }
});

test('pages scale to the device width', async () => {
  const { loginPage } = await import('../src/views.js');
  assert.ok(String(loginPage()).includes('<meta name="viewport" content="width=device-width, initial-scale=1" />'));
});

test('stylesheet: 16px text in fields (no zoom on iPad) and 44px touch targets', () => {
  const css = read('public/style.css');
  const fieldRule = css.match(/input:not\(\[type='radio'\]\),\s*select \{[^}]*\}/)[0];
  assert.match(fieldRule, /font: inherit/, 'fields use the 16px body text');
  assert.match(fieldRule, /min-height: 2\.75rem/);
  assert.match(css.match(/\.choice \{[^}]*\}/)[0], /min-height: 2\.75rem/);
  assert.match(css.match(/button,\s*\.button \{[^}]*\}/)[0], /min-height: 2\.75rem/);
  assert.match(css, /@media \(pointer: coarse\)/);
  assert.match(css, /-webkit-text-size-adjust: 100%/);
});
