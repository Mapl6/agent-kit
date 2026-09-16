# Git Workflow Rules

- Branch naming: `feature/<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`
- Commit messages: Conventional Commits format
  - `feat: add user login endpoint`
  - `fix: correct off-by-one in pagination`
  - `docs: update API reference`
- One logical change per commit
- Never force-push to `main`/`develop`
- Open a PR for every change — no direct commits to protected branches
- PR description must state: what changed, why, how it was tested
