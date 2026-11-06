import { test } from 'node:test';
import assert from 'node:assert/strict';
import { winAnsi } from '../src/pdf-report.js';

test('PDF text keeps Swedish letters and replaces characters the font cannot print', () => {
  assert.equal(winAnsi('Åsa Öberg – nedstämd’'), 'Åsa Öberg – nedstämd’');
  assert.equal(winAnsi('PHQ-9 ≥ 10 → MDD ✓'), 'PHQ-9 >= 10 -> MDD v');
  assert.equal(winAnsi('数'), '?');
  assert.equal(winAnsi(null), '');
});
