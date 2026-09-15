---
name: debug-common-issues
description: Lookup table of recurring local and CI frontend gotchas.
version: 0.1.0
tags: [frontend, debug, faq]
---

# Debug common issues

## When to Use

- Symptom matches a known local/CI gotcha
- Before long exploratory debugging — check here first
- After solving a non-obvious issue — add a row

## Procedure

1. Match the symptom in the table below
2. Apply the fix
3. If not listed, use `/agent/skills/systematic-debugging/SKILL.md`
4. When fixed, append a new row (lesson, not a full incident log)

| Symptom | Cause | Fix |
|---|---|---|
| Port already in use | Another dev server running | `[kill command or change PORT]` |
| Env undefined in browser | Server-only var used on client | Use public prefix (see conventions) |
| Hydration mismatch | Server/client render differ | Align initial UI; guard browser-only APIs |
| Flaky E2E | Timing / network race | `[wait strategy or known-flaky note]` |

## Pitfalls

- "Fixing" intentional tech debt listed in `/agent/context/known-issues.md`
- Adding novel essays instead of one-line cause/fix rows

## Verification

- [ ] Symptom gone after the documented fix
- [ ] New gotchas added to this table when worth it
