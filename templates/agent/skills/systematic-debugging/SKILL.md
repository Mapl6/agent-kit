---
name: systematic-debugging
description: Reproduce, isolate, fix, and regress frontend bugs.
version: 0.1.0
tags: [frontend, debug, process]
---

# Systematic debugging

## When to Use

- Bug is not in `/agent/skills/debug-common-issues/SKILL.md`
- Intermittent UI, state, or network failures
- User asks to "just fix it" without a clear root cause

## Procedure

1. **Reproduce** — exact steps, browser, route, and expected vs actual
2. **Capture evidence** — console errors, network failing calls, DOM/state snapshot
3. **Isolate** — bisect recent changes; disable suspects one at a time
4. **Form one hypothesis** — test it; don't shotgun-change files
5. **Fix the root cause** — smallest change that addresses the hypothesis
6. **Regress** — add a test or checklist step that would have caught it
7. **Log** — short session-log entry; promote to debug-common-issues if recurring

## Pitfalls

- Changing styling and data fetching in the same "fix"
- Ignoring hydration vs client-only errors
- Declaring fixed without reproducing the original steps

## Verification

- [ ] Original reproduction steps pass
- [ ] Related paths still work
- [ ] Regression coverage added when practical
