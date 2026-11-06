// Confirming and removing diagnoses.
//
// This is a "pure" function: it gets the current state and returns the new
// state (or an error), without touching the database. The server saves the
// result; the browser demo uses the very same function. That way the rules
// cannot drift apart between the two.

import { findDisorder } from './disorders.js';
import { evaluateDisorder, STATUS } from './criteria.js';
import { conflictsFor, LEVEL } from './conflicts.js';

const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// c: { checklists, diagnoses: { items, finalNote }, patient }
// request: { disorderId, action: 'confirm' | 'remove', note, override }
// Returns { diagnoses } on success or { error } if the request is refused.
export function applyDiagnosis(c, request, now = new Date().toISOString().slice(0, 16).replace('T', ' ')) {
  const disorder = findDisorder(String(request.disorderId ?? ''));
  if (!disorder) return { error: 'Unknown disorder.' };
  const others = c.diagnoses.items.filter((d) => d.disorderId !== disorder.id);

  if (request.action === 'remove') return { diagnoses: { ...c.diagnoses, items: others } };
  if (request.action !== 'confirm') return { error: 'Unknown action.' };

  const checklist = c.checklists[disorder.id];
  if (!checklist) return { error: `Assess ${disorder.name} with the checklist before confirming it.` };

  const ev = evaluateDisorder(disorder, checklist, c.patient);
  const note = clean(request.note, 1000);
  if (ev.status !== STATUS.MET && !note) {
    return { error: `The criteria for ${disorder.name} are not met (${ev.status.toLowerCase()}). Write a note explaining why you confirm it.` };
  }

  // Diagnoses that DSM-5-TR does not allow together need a written reason.
  const conflicts = conflictsFor(disorder.id, others.map((d) => d.disorderId)).filter((r) => r.level === LEVEL.CONFLICT);
  const override = clean(request.override, 1000);
  if (conflicts.length && !override) {
    const withNames = conflicts.map((r) => findDisorder(r.ids.find((id) => id !== disorder.id)).name).join(', ');
    return {
      error: `${disorder.name} cannot normally be given together with ${withNames}: ${conflicts.map((r) => r.message).join(' ')} Remove the other diagnosis, or write a reason for giving both.`,
    };
  }

  const item = {
    disorderId: disorder.id,
    name: disorder.name,
    code: ev.code,
    criteriaStatus: ev.status,
    note,
    confirmed_at: now,
  };
  if (conflicts.length) item.conflictOverride = override;
  return { diagnoses: { ...c.diagnoses, items: [...others, item] } };
}
