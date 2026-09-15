# Agent Permissions

What an AI agent can do autonomously vs. what needs human approval first.

## ✅ Can do without asking
- Refactor code (without changing behavior)
- Add or improve tests
- Fix lint/formatting errors
- Update documentation to match code changes
- Add new files following existing patterns

## ⚠️ Ask first
- Database schema migrations
- Adding a new third-party dependency
- Changing CI/CD configuration
- Modifying authentication/authorization logic
- Deleting existing files or large blocks of code

## ❌ Never do
- Touch `/infra` or production configuration
- Modify `.env` or commit secrets
- Push directly to `main`/`production` branches
- Disable tests, linting, or security checks to make a build pass
- Deploy to production without explicit human sign-off
