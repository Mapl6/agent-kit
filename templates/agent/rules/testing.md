# Testing Rules

- Every new feature needs at least one test covering the happy path + one edge case
- Every bug fix needs a regression test that fails without the fix
- Prefer co-located tests: `Foo.tsx` → `Foo.test.tsx` (or project convention)
- Component tests: assert user-visible behavior, not implementation details
- E2E: cover critical paths only (auth, primary purchase/create flow) — keep them stable
- Run the full suite before opening a PR: `{{TEST_CMD}}`
- Don't skip or comment out failing tests to make CI green — fix or flag in the PR
- Minimum coverage target: [e.g. 80%] — check with `[coverage command]`
- After UI interaction changes, consider `/agent/skills/accessibility-pass/SKILL.md` and/or `dogfood-ui`
