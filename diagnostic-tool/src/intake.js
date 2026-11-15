// Reads the clinician intake form (MoCA scores, observed signs, height and
// weight, notes).
//
// Pure function, shared by the server and the browser demo, like diagnosis.js.

import { parseMoca } from './moca.js';
import { parseBody } from './body.js';

// Returns { intake } or { errors }.
export function parseIntake(body, now = new Date().toISOString().slice(0, 16).replace('T', ' ')) {
  const { moca, errors } = parseMoca(body);
  const measured = parseBody(body);
  if (errors.length || measured.errors) return { errors: [...errors, ...(measured.errors ?? [])] };
  const yes = (name) => (body[name] === 'yes' ? 'yes' : 'no');
  return {
    intake: {
      moca,
      delirium: {
        acute: yes('del_acute'),
        inattention: yes('del_inattention'),
        disorganized: yes('del_disorganized'),
        consciousness: yes('del_consciousness'),
      },
      catatonia: yes('cat_signs'),
      body: measured.body,
      notes: String(body.notes ?? '').slice(0, 5000),
      updated_at: now,
    },
  };
}
