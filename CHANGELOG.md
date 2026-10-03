# Changelog

`@mapl6/agent-kit` and `@mapl6/agent-kit-core` are released together with the same version.

## 3.1.0 — 2026-10-03

Roadmap phase 3: Agent Kit now sets up your coding agents.

### Added

- `agent-kit init` writes the project context (stack, commands, checks to run before finishing, conventions, structure) into a managed block in `AGENTS.md`, and connects each agent to it:
  - **Codex and Cursor** read `AGENTS.md` natively.
  - **Claude Code:** `@AGENTS.md` is added to an existing `CLAUDE.md`. Files that already import it are skipped.
  - **GitHub Copilot:** the context is copied into `.github/copilot-instructions.md`.
- Agents are chosen from what's already in the repo. Override with `--agents <list>`, or use `--no-agents` to write only `.agent-kit/`.
- `agent-kit sync`: re-index and regenerate agent files. `--agents` changes the set, and blocks of removed agents are taken out.
- `agent-kit agents`: enabled agents, how each loads the context, capabilities, and the provider docs they were checked against.
- `agent-kit uninstall`: removes every Agent Kit block (files restored byte for byte), deletes files it created, then `.agent-kit/`. Use `--keep-data` to keep `.agent-kit/`.
- Safety: Agent Kit edits only between `BEGIN/END AGENT-KIT` markers; backs up files to `.agent-kit/state/backups/`; refuses symlinks and malformed markers (reported as CONFLICT, exit code 2); keeps repo-controlled names that don't look like identifiers out of agent instructions.
- `.agent-kit/.gitignore` keeps the local snapshot and backups out of git.
- Warns when `AGENTS.md` exceeds Codex's 32 KiB read limit.

### Changed

- `init` now writes agent files by default (see `--no-agents`).
- `index` and `sync` use the resolved `--path`, not the `projectRoot` stored in `config.json`, so a committed `.agent-kit/` works on other machines.

## 3.0.0 — 2026-10-03

Agent Kit is now a project intelligence layer for AI coding agents. This
release completes roadmap phases 0–2: understanding the repository.

### Added

- `agent-kit scan`, the new **default command**. It's read-only: it writes nothing and runs no project code.
  - Detects languages, Node.js, package managers (with a lockfile-conflict warning), npm/Yarn/pnpm workspaces per package, frameworks, test runners, tooling, Git, CI, and AI-agent config files.
  - Every detection carries evidence, a confidence level, and whether it was detected or inferred.
  - `--json` prints the `ScanResult`. `--model` prints the `ProjectModel`.
  - Warns when the root has no `package.json` but nested projects exist.
- **Project model** (`.agent-kit/project.json`): commands per package, directory roles, architecture patterns, testing conventions and git conventions. It's deterministic and contains no absolute paths, so it's safe to commit.
- `--dry-run` for `init` and `index`, which list each file as create / update / unchanged.
- `status` shows whether the project model exists.
- Programmatic API: `scanProject`, `analyzeProject`, `buildProjectModel`.

### Changed

- **Breaking:** `agent-kit` with no command now runs `scan`. Previously it printed help.
- **Breaking:** requires Node.js 20 or newer.
- **Breaking:** snapshot `technologies` entries are now `Detection` objects, with Vite and React as separate entries instead of `vite-react`.
- `index` also writes `.agent-kit/project.json`, but only when its content changes.
- Playwright output directories (`test-results/`, `playwright-report/`) are skipped.
- Files skipped as symlinks no longer count as evidence for any detection.

### Removed

- **Breaking:** the `report` command, its Markdown/JSON reports and the onboarding prompt. Use `scan`, `scan --json` or `scan --model`.
- **Breaking (core API):** `detectTechnologies`, `detectPackageManager`, `readJsonFile`, `generateReport` and the `TechnologySignal` type. Use `scanProject` / `analyzeProject` and `Detection`.
- Unused Markdown templates are no longer shipped in the package.

## 2.0.1 and earlier

Initial index / report CLI. See git history.
