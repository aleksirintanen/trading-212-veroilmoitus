# Repository Overview

This repository is a static Trading 212 tax-report calculator frontend, published via GitHub Pages.

## Project Layout

- `docs/index.html`: Main app UI structure and script links.
- `docs/assets/css/style.css`: All visual styles.
- `docs/assets/js/`: Application JavaScript modules.
- `tests/run-tests.mjs`: Smoke/unit-style test suite.
- `tests/e2e/app.spec.js`: Playwright E2E tests.

## Working Rules

- Keep changes minimal and focused.
- Preserve the current design language; do not add new themes or extra features unless requested.
- Update cache-busting query params (`?v=...`) if you change JS/CSS files referenced in `docs/index.html`.
- Do not add new dependencies unless clearly necessary.

## Validation

Run after changes:

1. `node tests/run-tests.mjs`
2. `npm run test:e2e`

If tests fail, prioritize fixing the area you just changed.

## UX/Copy

- Keep UI language clear and consistent.
- Use consistent terminology across the UI (for example CSV/PDF/ZIP labels).
- Avoid contradictory or ambiguous warning/instruction text.

## UI Change Verification

- After every UI change (HTML/CSS/visual JS behavior), verify the result with Playwright and capture at least one screenshot of the affected view before finalizing.
