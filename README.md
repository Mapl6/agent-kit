# Agent Kit

**Local-first project index and reports for Cursor, Claude Code, Copilot, and other agents.**

`@mapl6/agent-kit` scans a repository safely, stores a reviewable snapshot under `.agent-kit/`, and exports Markdown/JSON plus a copy-paste onboarding prompt. It does **not** call external LLM APIs and does **not** execute project lifecycle scripts while indexing.

Development status and upcoming features: [PROGRESS.md](./PROGRESS.md).

[![npm](https://img.shields.io/npm/v/@mapl6/agent-kit.svg)](https://www.npmjs.com/package/@mapl6/agent-kit)
[![license](https://img.shields.io/npm/l/@mapl6/agent-kit.svg)](./LICENSE)

```bash
npx @mapl6/agent-kit init
```

## Installation

```bash
# one-shot
npx @mapl6/agent-kit init

# or install locally
npm install -D @mapl6/agent-kit
npx agent-kit init
```

Requires Node.js **18+**.

## CLI usage

| Command | Description |
|---|---|
| `agent-kit init [--path .] [--skip-index] [--force]` | Create `.agent-kit/config.json` and (unless skipped) first index |
| `agent-kit index [--path .]` | Build or refresh `snapshot.json` (incremental) |
| `agent-kit status [--path .]` | Show init/index state |
| `agent-kit report [--path .] [--format both\|markdown\|json]` | Write reports under `.agent-kit/reports/` |

Examples:

```bash
npx @mapl6/agent-kit init
npx @mapl6/agent-kit index
npx @mapl6/agent-kit status
npx @mapl6/agent-kit report --format markdown
```

## What gets written

```text
.agent-kit/
  config.json
  snapshot.json
  reports/
    latest.md
    latest.json
    onboarding-prompt.md
```

Snapshots are metadata-first (paths, kinds, hashes, technology signals with evidence). Secret files (e.g. `.env`) and symlinks are never content-hashed or logged as contents.

## Exit codes

Stable codes for scripting:

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Unexpected / general error |
| 2 | Invalid input or project state |
| 3 | Permission denied |
| 4 | Storage write failure |
| 5 | Index failure |

Errors print as:

```text
Error: PROJECT_NOT_FOUND
The specified project root does not exist.
Suggested action:
  Check the path and run the command again.
```

## Safety guarantees (Phase 1)

- Project root validation (must be a real directory, not a symlink)
- Symlinks skipped during discovery
- Secret path patterns ignored for content hashing
- Max file size for hashed content
- `package.json` is read as JSON only (no install / no lifecycle scripts)
- No automatic network/API uploads

## Monorepo layout

| Package | npm name | Role |
|---|---|---|
| `packages/cli` | `@mapl6/agent-kit` | Published CLI (`agent-kit`) |
| `packages/core` | `@mapl6/agent-kit-core` | Domain, storage, indexer, reports |

```bash
npm install
npm run build
npm test
npm run typecheck
```

## Publishing note

Workspace development may use linked package versions. Before a public release, publish `@mapl6/agent-kit-core` then `@mapl6/agent-kit`, and verify with:

```bash
npm pack -w @mapl6/agent-kit-core
npm pack -w @mapl6/agent-kit
mkdir /tmp/agent-kit-install && cd /tmp/agent-kit-install
npm init -y
npm install /path/to/mapl6-agent-kit-core-*.tgz /path/to/mapl6-agent-kit-*.tgz
npx agent-kit init
npx agent-kit index
npx agent-kit init   # should not wipe data; expect ALREADY_INITIALIZED
```

## Version 2 notes

v2 is a ground-up modular core + Commander CLI. A **lean** Markdown kit for a later scaffold/export phase lives only under `packages/cli/templates` (single copy — no root `templates/` duplicate). Phase 1 default path is `init` / `index` / `status` / `report`.
