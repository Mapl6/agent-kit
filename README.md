# Agent Kit

**Make any codebase easier for AI coding agents to understand, work in, verify and maintain.**

Agent Kit is a local-first project intelligence layer that sits between your repository and the coding agent you already use (Cursor, Claude Code, Codex, Copilot, …). It is not another agent.

It starts by **understanding the repository**, then builds a **project model**: the commands to install, build, test, lint and typecheck; what each directory is for; architecture patterns; testing conventions; and git conventions. Every inference carries a confidence level and evidence.

`agent-kit scan` reports languages, package managers, workspaces, frameworks, test runners, tooling, CI and existing AI-agent configuration, with evidence for every finding and a clear line between what was _detected_ and what was _inferred_. It's read-only, runs offline, and never executes project code.

Roadmap and status: [PROGRESS.md](./PROGRESS.md) · Specs: [docs/spec/](./docs/spec/)

[![npm](https://img.shields.io/npm/v/@mapl6/agent-kit.svg)](https://www.npmjs.com/package/@mapl6/agent-kit)
[![license](https://img.shields.io/npm/l/@mapl6/agent-kit.svg)](./LICENSE)

```bash
npx @mapl6/agent-kit          # same as: npx @mapl6/agent-kit scan
```

```text
Agent Kit scan: /work/shop
412 files (content skipped: 1 secret)

Languages
  ✓ TypeScript               high    tsconfig.json; 188 .ts/.tsx/.mts/.cts files

Package manager
  ✓ pnpm                     high    packageManager pnpm@9.15.0; pnpm-lock.yaml

Frameworks
  ✓ Next.js                  high    dep next; next.config.ts  [apps/web]
  ✓ React                    high    dep react  [apps/web]

AI agent configuration
  ✓ AGENTS.md                high    AGENTS.md (2.1 KB)
  ✓ .cursor/                 high    .cursor/ (3 files)
...
✓ detected from files   ~ inferred (no direct evidence)   Nothing was written.
```

Requires Node.js **18+**.

## Commands

| Command                                                          | Writes        | Description                                                                                                                                                                                              |
| ---------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent-kit scan [--path .] [--json \| --model]`                  | nothing       | **Default.** Detections plus the project model: commands, directory roles, architecture, testing, git conventions. `--json` prints the [ScanResult](./docs/spec/schemas.md), `--model` the ProjectModel. |
| `agent-kit init [--path .] [--skip-index] [--force] [--dry-run]` | `.agent-kit/` | Create config, index snapshot and `project.json`. `--dry-run` lists what would change.                                                                                                                   |
| `agent-kit index [--path .] [--dry-run]`                         | `.agent-kit/` | Refresh the snapshot and `project.json` (rewritten only if changed).                                                                                                                                     |
| `agent-kit status [--path .]`                                    | nothing       | Show init/index state.                                                                                                                                                                                   |

More commands (`doctor`, `verify`, `sync`, `handoff`, …) arrive phase by phase. See the [CLI spec](./docs/spec/cli.md).

## Safety

- Read-only by default. A bare `agent-kit` never modifies your repo.
- No project scripts, no subprocesses, no network.
- Symlinks aren't followed or read, and a symlinked project root is rejected.
- Secret files (`.env*`, keys, `.npmrc`, `secrets/`) are counted but never read, hashed or printed.
- Repository files are treated as data. Instructions inside READMEs or `AGENTS.md` are never acted on; agent config files are reported by path and size only.

Details: [docs/spec/security.md](./docs/spec/security.md).

## Exit codes

| Code | Meaning                        |
| ---- | ------------------------------ |
| 0    | Success                        |
| 1    | Unexpected error               |
| 2    | Invalid input or project state |
| 3    | Permission denied              |
| 4    | Storage write failure          |
| 5    | Index or scan failure          |

## Development

| Package         | npm name                | Role                                 |
| --------------- | ----------------------- | ------------------------------------ |
| `packages/core` | `@mapl6/agent-kit-core` | Scanner, discovery, indexer, storage |
| `packages/cli`  | `@mapl6/agent-kit`      | Published CLI (`agent-kit`)          |

```bash
npm install
npm test                    # build + all tests
UPDATE_GOLDEN=1 npm test    # refresh golden scan snapshots after an intended change
npm run typecheck && npm run lint
node packages/cli/dist/index.js --path fixtures/monorepo
```

Core and CLI are released together at the same version. Publish `@mapl6/agent-kit-core` first, then `@mapl6/agent-kit`.
