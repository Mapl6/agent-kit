---
name: dogfood-ui
description: Exploratory browser QA with evidence and a bug report.
version: 0.1.0
tags: [frontend, qa, browser, dogfood]
---

# Dogfood UI

## When to Use

- User asks to QA, dogfood, or exploratory-test the UI
- Before a release, smoke-test primary flows
- After a large UI change that needs human-like clicking

## Prerequisites

- Browser tools available in the agent environment (navigate, snapshot, click, type, console)
- Target URL + scope from the user (or local `{{DEV_CMD}}` URL)

## Procedure

1. **Plan** — list routes/flows: home, nav, auth, primary feature, empty/error states
2. **Explore** each item:
   - Navigate → snapshot/structure → check console → interact with primary controls
   - Note visual, functional, and a11y issues with steps to reproduce
3. **Evidence** — screenshot or console quote per issue when tools allow
4. **Report** — write a short `report.md` (or PR comment) with severity + repro steps
5. **Triage** — fix P0/P1 if asked; otherwise file issues / known-issues entries

## Pitfalls

- Only reading the code without opening the UI
- Reporting taste preferences as bugs without severity
- Skipping console errors after navigation

## Verification

- [ ] Scope list marked covered / blocked
- [ ] Each bug has repro steps
- [ ] Console checked on critical flows
