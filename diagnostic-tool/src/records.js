// Patient records: search by personal number, and the record entries the
// clinician writes (clinical notes and treatment reports).
//
// Entries are never changed or deleted once saved, like a health record:
// to correct one, write a new entry that says what was wrong.

// The digits of a personal number, compared on the last 10 (YYMMDDNNNN), so
// 19480405-1234, 194804051234 and 480405-1234 find the same person.
// A number without enough digits (e.g. a reserve number) is compared as typed.
export function personalNumberKey(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : String(value ?? '').trim().toUpperCase();
}

export const ENTRY_KINDS = { note: 'Clinical note', treatment: 'Treatment report' };

// Checks a new entry. Returns { entry } or { errors }.
export function parseEntry(body) {
  const kind = Object.hasOwn(ENTRY_KINDS, body.kind) ? body.kind : null;
  const title = String(body.title ?? '').trim().slice(0, 200);
  const text = String(body.text ?? '').trim().slice(0, 20000);
  const errors = [];
  if (!kind) errors.push('Choose the type of entry.');
  if (!title) errors.push('Write a heading for the entry.');
  if (!text) errors.push('Write the text of the entry.');
  return errors.length ? { errors } : { entry: { kind, title, text } };
}
