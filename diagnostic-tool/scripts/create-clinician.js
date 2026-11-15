// Creates a clinician account (or resets its password if the email exists).
//
// Usage:
//   npm run create-clinician -- "Dr. Anna Svensson" anna@clinic.example
//   npm run create-clinician -- "Dr. Anna Svensson" anna@clinic.example --admin
// You will then be asked to type a password. --admin gives the account the
// highest access (read every patient file, assign patients to clinicians);
// --not-admin takes it away again. Without either, the role is unchanged
// (a new account is a clinician).

import { createInterface } from 'node:readline/promises';
import { db } from '../src/db.js';
import { hashPassword } from '../src/auth.js';

const args = process.argv.slice(2);
const role = args.includes('--admin') ? 'admin' : args.includes('--not-admin') ? 'clinician' : null;
const [name, emailArg] = args.filter((a) => !a.startsWith('--'));
if (!name || !emailArg) {
  console.error('Usage: npm run create-clinician -- "Full Name" email@example.com');
  process.exit(1);
}
const email = emailArg.trim().toLowerCase();

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = process.env.CLINICIAN_PASSWORD || (await rl.question('Password (min 12 characters): '));
rl.close();

if (password.length < 12) {
  console.error('Password must be at least 12 characters.');
  process.exit(1);
}

db.prepare(
  `INSERT INTO clinicians (name, email, password_hash) VALUES (?, ?, ?)
   ON CONFLICT(email) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash`
).run(name, email, hashPassword(password));

if (role) db.prepare('UPDATE clinicians SET role = ? WHERE email = ?').run(role, email);
const saved = db.prepare('SELECT role FROM clinicians WHERE email = ?').get(email);

console.log(`Clinician ${name} <${email}> saved as ${saved.role === 'admin' ? 'administrator' : 'clinician'}. Results will be emailed to this address.`);
