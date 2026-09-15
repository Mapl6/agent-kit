# Definition of Done

Before considering any task complete, verify:

- [ ] Code follows `/agent/rules/coding-style.md`
- [ ] No secrets or sensitive data introduced (`/agent/rules/security.md`)
- [ ] Interactive UI got an a11y pass when relevant (`/agent/skills/accessibility-pass/SKILL.md`)
- [ ] Tests added/updated and passing (`{{TEST_CMD}}`)
- [ ] Lint passes (`{{LINT_CMD}}`)
- [ ] Production build still works if release-related (`{{BUILD_CMD}}`)
- [ ] Docs updated if behavior/UI contracts changed (`/agent/docs/`)
- [ ] No unrelated changes bundled into this task
- [ ] Commit message follows `/agent/rules/git-workflow.md`
- [ ] PR description follows `/agent/examples/good-pr-example.md`
- [ ] Session log updated for non-trivial work; promote lessons per `/agent/improvement.md`
