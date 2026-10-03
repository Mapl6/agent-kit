# Changelog

`@mapl6/agent-kit` and `@mapl6/agent-kit-core` are released together with the same version.

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
