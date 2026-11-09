// Age from a Swedish personal number (public/personal-number.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthDate, ageFromPersonalNumber } from '../public/personal-number.js';

const on = (iso) => new Date(`${iso}T12:00:00`);

test('the date of birth is the digits before the dash', () => {
  assert.deepEqual(birthDate('19480405-xxxx'), { year: 1948, month: 4, day: 5 });
  assert.deepEqual(birthDate('194804051234'), { year: 1948, month: 4, day: 5 }, 'without a dash');
  assert.deepEqual(birthDate(' 19480465-1234 '), { year: 1948, month: 4, day: 5 }, 'coordination number: day + 60');
});

test('age in whole years, counting the birthday', () => {
  assert.equal(ageFromPersonalNumber('19480405-xxxx', on('2026-11-09')), 78);
  assert.equal(ageFromPersonalNumber('19480405-xxxx', on('2026-04-04')), 77, 'the day before the birthday');
  assert.equal(ageFromPersonalNumber('19480405-xxxx', on('2026-04-05')), 78, 'on the birthday');
  assert.equal(ageFromPersonalNumber('20000229-1234', on('2026-02-28')), 25, 'leap-day birthday not yet reached');
  assert.equal(ageFromPersonalNumber('20000229-1234', on('2026-03-01')), 26);
});

test('short form YYMMDD: the century that makes the person under 100; "+" means 100 or older', () => {
  const thisYear = new Date().getFullYear();
  assert.equal(birthDate('480405-1234').year, 1948);
  assert.equal(birthDate('480405+1234').year, 1848);
  assert.equal(birthDate(`${String(thisYear - 2000 - 1).padStart(2, '0')}0101-1234`).year, thisYear - 1);
});

test('no age when there is no valid date of birth', () => {
  for (const value of ['', 'x', 'R-12345', '19480231-1234', '19481305-1234', '1948040-1234', null, undefined]) {
    assert.equal(ageFromPersonalNumber(value), null, String(value));
  }
  assert.equal(ageFromPersonalNumber('29990101-1234'), null, 'born in the future');
});
