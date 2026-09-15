---
name: deploy
description: Verify, merge, and deploy frontend with safe rollback.
version: 0.1.0
tags: [frontend, deploy, release]
---

# Deploy

## When to Use

- Releasing to staging or production
- User explicitly asks to deploy
- Never deploy production without human approval — see `/agent/permissions.md`

## Procedure

1. Ensure tests pass: `{{TEST_CMD}}`
2. Ensure lint passes: `{{LINT_CMD}}`
3. Ensure production build works: `{{BUILD_CMD}}`
4. Merge to `[main/release branch]`
5. CI/CD auto-deploys to `[staging/production]` — or run: `[deploy command]`
6. Verify: `[preview URL / health check / smoke checklist]`
7. If broken, rollback: `[rollback command/steps]`

## Pitfalls

- Deploying with failing typecheck/build locally "because CI might pass"
- Skipping staging when the change touches auth, payments, or env vars
- Agents deploying production unsupervised

## Verification

- [ ] Staging/production URL loads critical paths
- [ ] No console-breaking errors on primary flows
- [ ] Rollback path is known before you need it
