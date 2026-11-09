// Age from a Swedish personal number (personnummer).
//
// The digits before the dash are the date of birth: 19480405-XXXX is
// 5 April 1948. Also accepted:
//   - without the dash: 194804051234
//   - the short form YYMMDD-XXXX (the century is the one that makes the
//     person under 100); YYMMDD+XXXX means 100 years or older
//   - coordination numbers (samordningsnummer): the day plus 60
// The last four characters are not used, so "XXXX" works too.
//
// Used by the server (to check and fill in the age) and in the browser (to
// fill in the age box as the clinician types).

export function birthDate(personalNumber) {
  const m = String(personalNumber ?? '').trim().match(/^(\d{8}|\d{6})([-+]?)(.*)$/);
  if (!m) return null;
  const [, digits, sign] = m;
  const rest = digits.slice(-4); // MMDD
  const month = Number(rest.slice(0, 2));
  let day = Number(rest.slice(2, 4));
  if (day > 60) day -= 60; // coordination number
  let year;
  if (digits.length === 8) {
    year = Number(digits.slice(0, 4));
  } else {
    // Short form: pick the century that puts the birth date in the past,
    // and go back another century for "+".
    const today = new Date();
    year = Math.floor(today.getFullYear() / 100) * 100 + Number(digits.slice(0, 2));
    if (new Date(year, month - 1, day) > today) year -= 100;
    if (sign === '+') year -= 100;
  }
  // A real date? (rules out e.g. 19480231)
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { year, month, day };
}

// Age in whole years on `today`, or null when the personal number does not
// start with a valid date of birth (or the date is in the future).
export function ageFromPersonalNumber(personalNumber, today = new Date()) {
  const born = birthDate(personalNumber);
  if (!born) return null;
  const month = today.getMonth() + 1;
  const day = today.getDate();
  let age = today.getFullYear() - born.year;
  if (month < born.month || (month === born.month && day < born.day)) age -= 1;
  return age >= 0 ? age : null;
}

// On the patient form: fill in the age box while the personal number is typed.
// The form marks the fields with data-personal-number and data-age.
export function enableAgeFromPersonalNumber(root) {
  const number = root.querySelector('[data-personal-number]');
  const age = root.querySelector('[data-age]');
  const hint = root.querySelector('[data-age-hint]');
  if (!number || !age) return;
  let filled = null; // the age this script filled in, if any
  const update = () => {
    const years = ageFromPersonalNumber(number.value);
    if (years === null) {
      // No date any more: remove an age we filled in, keep one that was typed.
      if (filled !== null && age.value === filled) age.value = '';
      filled = null;
      if (hint) hint.hidden = true;
      return;
    }
    filled = String(years);
    age.value = filled;
    if (hint) hint.hidden = false;
  };
  number.addEventListener('input', update);
  update();
}

// Runs by itself on the real pages; the browser demo calls it on its own.
if (typeof document !== 'undefined' && !globalThis.__noAutoSkip) enableAgeFromPersonalNumber(document);
