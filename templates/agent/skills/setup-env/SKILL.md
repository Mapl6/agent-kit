---
name: setup-env
description: Clone, install, env, and start the frontend locally.
version: 0.1.0
tags: [frontend, setup, onboarding]
---

# Set up the environment

## When to Use

- First-time local setup
- Dev server won't start and env/deps are suspect
- Onboarding a new agent or teammate

## Procedure

1. Clone the repo and `cd` into the project root
2. Copy `.env.example` to `.env` and fill local values (never commit `.env`)
3. Install dependencies: `{{INSTALL_CMD}}`
4. Start the dev server: `{{DEV_CMD}}`
5. Verify in the browser: `[e.g. http://localhost:3000]`
6. Run a quick sanity check: `{{LINT_CMD}}` or `{{TEST_CMD}}` if setup claims green CI

## Pitfalls

- Mixing package managers (npm vs pnpm vs yarn) — use the project's lockfile
- Putting secrets in `.env.example` or committed files
- Using server-only env vars in client code (see `/agent/context/conventions.md`)

## Verification

- [ ] Dev server responds in the browser
- [ ] No missing-env crashes on home/landing route
- [ ] Install used the lockfile package manager
