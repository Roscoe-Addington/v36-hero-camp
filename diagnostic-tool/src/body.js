// Height, weight and BMI, entered by the clinician (clinician intake), and
// the medical warning signs that go with eating problems.
//
// BMI = weight (kg) / height (m)². The BMI limits below are for adults. For
// patients under 18, BMI must be compared with BMI for age (in Sweden
// ISO-BMI); the warnings say so. Clinical content: must be reviewed by a
// clinician (ALG-8 in docs/VALIDATION-PLAN.md).

export const HEIGHT_RANGE = { min: 100, max: 250 }; // cm
export const WEIGHT_RANGE = { min: 20, max: 300 }; // kg

export function bmi(heightCm, weightKg) {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

// Reads the optional height and weight fields. Both or neither.
// Returns { body } (null when left empty) or { errors }.
export function parseBody(form) {
  const raw = (name) => String(form[name] ?? '').trim().replace(',', '.');
  const h = raw('height_cm');
  const w = raw('weight_kg');
  if (!h && !w) return { body: null };
  const errors = [];
  const height = Number(h);
  const weight = Number(w);
  if (!h || !w) errors.push('Enter both height and weight, or neither.');
  else {
    if (!Number.isFinite(height) || height < HEIGHT_RANGE.min || height > HEIGHT_RANGE.max) errors.push('Height must be between 100 and 250 cm.');
    if (!Number.isFinite(weight) || weight < WEIGHT_RANGE.min || weight > WEIGHT_RANGE.max) errors.push('Weight must be between 20 and 300 kg.');
  }
  if (errors.length) return { errors };
  return { body: { height_cm: height, weight_kg: weight, bmi: bmi(height, weight) } };
}

const YES = 1;

// Medical warning signs from the BMI and the eating questions. Each has a
// finding and an action (plain text, or { text, vars } with numbers in it).
// Urgent ones are shown at the top of the assessment.
export function medicalWarnings({ answers: a = {}, body, patient }) {
  const out = [];
  const under18 = Number(patient?.age) < 18;
  const value = body?.bmi;
  const CHECK = 'Check physical health: pulse, blood pressure, temperature, blood tests including electrolytes, and an ECG.';
  const URGENT = 'Arrange an urgent medical assessment the same day (pulse, blood pressure, temperature, electrolytes, ECG). Severe malnutrition can be life-threatening.';
  if (value !== undefined && value !== null) {
    const vars = { bmi: value };
    if (under18 && value < 18.5) {
      out.push({ finding: { text: 'BMI {bmi} (under 18: compare with BMI for age, ISO-BMI)', vars }, action: value < 15 ? URGENT : CHECK, urgent: value < 15 });
    } else if (value < 15) {
      out.push({ finding: { text: 'BMI {bmi}: very low weight', vars }, action: URGENT, urgent: true });
    } else if (value < 17.5) {
      out.push({ finding: { text: 'BMI {bmi}: low weight', vars }, action: CHECK, urgent: false });
    } else if (value < 18.5) {
      out.push({ finding: { text: 'BMI {bmi}: underweight', vars }, action: 'Follow the weight, and check physical health if it is falling.', urgent: false });
    }
  }
  if (a.scoff1 === YES || a.ed_comp === YES) {
    out.push({
      finding: 'Self-induced vomiting or other compensatory behaviour reported',
      action: 'Check potassium and other electrolytes, and an ECG: purging can cause dangerous heart rhythms even at a normal weight.',
      urgent: false,
    });
  }
  if (a.scoff3 === YES && !body) {
    out.push({ finding: 'Rapid weight loss reported (more than 6 kg in 3 months)', action: 'Measure height and weight, and check physical health.', urgent: false });
  }
  return out;
}
