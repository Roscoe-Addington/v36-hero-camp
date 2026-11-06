// Skip logic in the browser: hides follow-up questions that do not apply
// (e.g. "If so: …" after answering "No") and makes them not required.
// The server applies the same rules (questionnaire.js applySkips), so the
// questionnaire also works without JavaScript.
//
// Each follow-up question has data-show-if="parentId:1,2" (the answers that show it).

export function enableSkipLogic(root) {
  const followUps = [...root.querySelectorAll('[data-show-if]')];
  function update() {
    for (const el of followUps) {
      const [parent, values] = el.dataset.showIf.split(':');
      const chosen = root.querySelector(`input[name="${parent}"]:checked`);
      // Parent not on this page or not answered yet: leave as the server drew it.
      if (!root.querySelector(`input[name="${parent}"]`)) continue;
      const show = !chosen || values.split(',').includes(chosen.value);
      el.hidden = !show;
      for (const input of el.querySelectorAll('input')) input.required = show;
    }
  }
  root.addEventListener('change', update);
  update();
}

// Runs by itself on the real pages; the browser demo calls it on its own.
if (typeof document !== 'undefined' && !globalThis.__noAutoSkip) enableSkipLogic(document);
