// Runs the retention rules now (the server also does this once a day):
// deletes short-lived data and lists patient records that are due for review.
//
// Usage: npm run retention

import { db } from '../src/db.js';
import { cleanup, recordsDue, policy } from '../src/retention.js';

const p = policy();
console.log('Retention policy:', p);
console.log('Deleted now:', cleanup(new Date(), p));

for (const owner of db.prepare('SELECT id, name, email FROM clinicians').all()) {
  const due = recordsDue(owner.id, new Date(), p);
  if (due.length) console.log(`${owner.name} <${owner.email}>: ${due.length} record(s) past the retention period, to review at /clinician/retention`);
}
