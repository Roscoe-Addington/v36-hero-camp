// The administration pages in Swedish, and creating an administrator account.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adminPage, assignPage } from '../src/views-admin.js';
import { englishLeft } from './helpers.js';

test('the administration pages show only Swedish in Swedish mode', () => {
  const clinician = { id: 3, name: 'Ada Admin', role: 'admin', language: 'sv' };
  const clinicians = [{ id: 1, name: 'Dr Ek', email: 'ek@clinic.example', role: 'clinician', patient_count: 1 }, { id: 3, name: 'Ada Admin', email: 'ada@clinic.example', role: 'admin', patient_count: 0 }];
  const patient = { id: 7, first_name: 'Sten', last_name: 'Holm', personal_number: '19740101-1234', clinician_id: 1 };
  const hits = [
    ...englishLeft(adminPage({ clinician, patients: [{ ...patient, age: 52, clinician_name: 'Dr Ek', assigned_since: '2026-11-15T10:00:00Z' }], total: 900, clinicians })),
    ...englishLeft(adminPage({ clinician, query: 'zz', patients: [], clinicians })),
    ...englishLeft(assignPage({ clinician, patient, owner: { name: 'Dr Ek' }, clinicians, saved: true, errors: ['Choose a clinician.'],
      history: [{ clinician_name: 'Dr Ek', started_at: '2026-01-01T00:00:00Z', ended_at: null, assigned_by_name: 'Ada Admin', reason: 'Ny tilldelning' }] })),
  ];
  assert.deepEqual(hits, []);
});

test('create-clinician --admin gives an account the administrator role', () => {
  const dir = mkdtempSync(join(tmpdir(), 'continuum-'));
  try {
    const run = (...args) => spawnSync(process.execPath, ['--no-warnings', 'scripts/create-clinician.js', ...args], {
      env: { ...process.env, DB_PATH: join(dir, 'test.db'), CLINICIAN_PASSWORD: 'a long enough password' }, encoding: 'utf8',
    });
    assert.match(run('Dr Ek', 'ek@clinic.example').stdout, /saved as clinician/);
    assert.match(run('Dr Ek', 'ek@clinic.example', '--admin').stdout, /saved as administrator/);
    assert.match(run('Dr Ek', 'ek@clinic.example').stdout, /saved as administrator/, 'the role is kept without a flag');
    assert.match(run('Dr Ek', 'ek@clinic.example', '--not-admin').stdout, /saved as clinician/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
