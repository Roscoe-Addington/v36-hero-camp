// Exposes the app's real modules to the demo page (built by demo/build.js).
import * as views from '../src/views.js';
import * as workflow from '../src/views-workflow.js';
import { scoreAll } from '../src/scoring.js';
import { runDifferential } from '../src/differential.js';
import { parseAnswers, parsePartialAnswers, PAGES, parsePage, applySkips, firstOpenPage, isShown, TIREDNESS_BREAK_AT } from '../src/questionnaire.js';
import { responseQuality } from '../src/response-quality.js';
import { enableSkipLogic } from '../public/skip.js';
import { ageFromPersonalNumber, enableAgeFromPersonalNumber } from '../public/personal-number.js';
import { buildSuggestions } from '../src/suggestions.js';
import { defaultLowEducation } from '../src/moca.js';
import { findDisorder, criterionIds } from '../src/disorders.js';
import { RATINGS } from '../src/criteria.js';
import { readyEmail, isUrgent } from '../src/email.js';
import { applyDiagnosis } from '../src/diagnosis.js';
import { parseIntake } from '../src/intake.js';
import { parseInterview, parseRisk, parseInformant, finalizeBlocker } from '../src/clinical-forms.js';
import { parseFollowupAnswers, scoreFollowup } from '../src/followup.js';
import { ACTIONS } from '../src/audit-actions.js';
import { lang, STRINGS } from '../src/i18n.js';
import { translator } from '../src/i18n-clinician.js';
import appCss from '../public/style.css';
window.Demo = {
  views, workflow, scoreAll, runDifferential, parseAnswers, parsePartialAnswers, buildSuggestions, defaultLowEducation,
  findDisorder, criterionIds, RATINGS, readyEmail, isUrgent, applyDiagnosis, parseIntake,
  parseInterview, parseRisk, parseInformant, finalizeBlocker, parseFollowupAnswers, scoreFollowup, ACTIONS, lang, STRINGS, appCss,
  PAGES, parsePage, applySkips, firstOpenPage, isShown, TIREDNESS_BREAK_AT, responseQuality, enableSkipLogic, translator, ageFromPersonalNumber, enableAgeFromPersonalNumber,
};
