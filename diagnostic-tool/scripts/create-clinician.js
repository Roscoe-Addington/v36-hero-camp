// Creates a clinician account (or resets its password if the email exists).
//
// Usage:
//   npm run create-clinician -- "Dr. Anna Svensson" anna@clinic.example
// You will then be asked to type a password.

import { createInterface } from 'node:readline/promises';
import { db } from '../src/db.js';
import { hashPassword } from '../src/auth.js';

const [name, emailArg] = process.argv.slice(2);
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

console.log(`Clinician ${name} <${email}> saved. Results will be emailed to this address.`);
