---
name: add-new-feature
description: Ship a frontend feature with tests and docs updates.
version: 0.1.0
tags: [frontend, feature, workflow]
---

# Add a new feature

## When to Use

- Adding user-facing UI behavior (page, component flow, client integration)
- Not for pure visual tweaks (prefer small PR + design conventions)
- Not for one-line copy changes

## Prerequisites

- Read `/agent/docs/ui-architecture.md` and `/agent/docs/architecture.md`
- Check `/agent/memory/session-log.md` for related recent work

## Procedure

1. Locate where the feature belongs (route, feature folder, shared component)
2. Add or update the route/page under `[e.g. app/ or src/pages/]`
3. Add components/hooks under the feature folder — see `/agent/skills/add-ui-page/SKILL.md` for page-only work
4. Wire data via the existing client/data layer — see `/agent/docs/client-data.md`
5. Add tests (unit and/or component) — see `/agent/examples/good-test-example.md`
6. Update docs if the public surface changed (`/agent/docs/`)
7. Run `/agent/checklist.md` before opening a PR

## Pitfalls

- Duplicating shared UI that already exists in `[shared components path]`
- Bypassing design tokens / styling conventions
- Shipping without keyboard/a11y basics (see `/agent/skills/accessibility-pass/SKILL.md`)

## Verification

- [ ] Happy path works in the browser
- [ ] Tests and lint pass (`{{TEST_CMD}}`, `{{LINT_CMD}}`)
- [ ] Checklist complete
