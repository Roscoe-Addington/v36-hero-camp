// Prints every treatment with the badges it gets on the disorder page, for
// the review in CON-6 (docs/VALIDATION-PLAN.md): check that no treatment a
// psychologist (or anyone the psychologist sees fit) gives is marked as a physician's, and that no medicine or
// medical check is left unmarked.
//
// Usage: npm run list:badges

import { KNOWLEDGE, physicianRole, medicalCheck } from '../src/knowledge.js';

const groups = { rx: [], mixed: [], check: [], none: [] };
const seen = new Set();
for (const [id, k] of Object.entries(KNOWLEDGE)) {
  for (const t of k.treatments) {
    const key = t.what.en;
    if (seen.has(key)) continue;
    seen.add(key);
    const role = physicianRole(t);
    if (role) groups[role].push(`${key}  [${id}]`);
    if (medicalCheck(t)) groups.check.push(`${key}  [${id}]`);
    if (!role && !medicalCheck(t)) groups.none.push(`${key}  [${id}]`);
  }
}
const titles = {
  rx: 'Prescribed by a physician',
  mixed: 'The medicine part is prescribed by a physician',
  check: 'Medical check (physician or nurse), shown first',
  none: 'No badge (given by the psychologist or anyone the psychologist sees fit to perform the task)',
};
for (const [group, list] of Object.entries(groups)) {
  console.log(`\n${titles[group]} (${list.length})`);
  for (const line of list) console.log(`  - ${line}`);
}
