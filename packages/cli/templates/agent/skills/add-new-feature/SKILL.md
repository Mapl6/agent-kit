---
name: add-new-feature
description: Ship a feature with tests and docs updates.
version: 0.1.0
tags: [feature, workflow]
---

# Add a new feature

## When to Use

- Adding user-facing behavior (page, component flow, API integration)
- Not for pure visual tweaks or one-line copy changes

## Prerequisites

- Read `/agent/docs/architecture.md`
- Check `/agent/memory/session-log.md` for related recent work

## Procedure

1. Locate where the feature belongs (route, feature folder, shared module)
2. Add or update the entry point (route/page/handler)
3. Reuse existing components and patterns from the repo
4. Wire data through the existing client/data layer
5. Add tests (unit and/or component) for happy path + one edge case
6. Update `/agent/docs/architecture.md` if the public surface changed
7. Run `/agent/checklist.md` before opening a PR

## Pitfalls

- Duplicating shared UI or utilities that already exist
- Bypassing project conventions in `/agent/context/conventions.md`
- Shipping without tests

## Verification

- [ ] Happy path works locally
- [ ] Tests and lint pass (`{{TEST_CMD}}`, `{{LINT_CMD}}`)
- [ ] Checklist complete
