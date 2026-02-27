---
name: ui-copy-review
description: Reviews and standardizes UI text and button terminology
---

# UI Copy Review

## Purpose

Standardize UI text so terminology, tone, and wording stay consistent across the application.

## Process

1. Find user-visible text in:
   - `docs/index.html`
   - `docs/assets/js/` (dynamic button/alert labels)
2. Identify inconsistencies:
   - for example `CSV` vs `(CSV)`
   - mixed-language labels
   - different terms for the same concept
3. Apply small copy fixes without changing functionality.
4. Ensure cache-busting links stay updated if script/css references are changed.
5. Validate:
   - `node tests/run-tests.mjs`
   - `npm run test:e2e`

## Constraints

- No new features.
- No changes to tax calculation logic.
- Keep text clear, concise, and user-focused.
