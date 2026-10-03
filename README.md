# Agent Kit

**Make any codebase easier for AI coding agents to understand.**

[![npm](https://img.shields.io/npm/v/@mapl6/agent-kit.svg)](https://www.npmjs.com/package/@mapl6/agent-kit)
[![CI](https://github.com/Mapl6/agent-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/Mapl6/agent-kit/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@mapl6/agent-kit.svg)](https://github.com/Mapl6/agent-kit/blob/main/LICENSE)

Coding agents (Cursor, Claude Code, Codex, Copilot, …) start every session
knowing nothing about your repository. They guess the package manager, run the
wrong test command, put files in the wrong place and ignore conventions you
already have.

Agent Kit is a **local-first project intelligence layer** that sits between your
repository and whichever agent you use. It is not another agent. It works out
what your project is, how it's organised and how to build, test and check it,
then records that as a reviewable, provider-neutral model.

```bash
npx @mapl6/agent-kit
```

Read-only. Offline. Never executes your code. Done in milliseconds.

## What you get

```text
$ npx @mapl6/agent-kit
Agent Kit scan: ~/code/shop
28 files

Languages
  ✓ TypeScript  high    tsconfig.json; 19 .ts/.tsx/.mts/.cts files

Package manager
  ✓ Yarn        high    yarn.lock

Frameworks
  ✓ React       high    dep react
  ✓ Vite        high    dep vite

Testing
  ✓ Vitest      high    dep vitest

Tooling
  ✓ Prettier    high    dep prettier
  ✓ Husky       high    dep husky; .husky/

Not detected: Workspaces, CI/CD, AI agent configuration

Commands
  ✓ install    yarn install
  ✓ dev        yarn run dev
  ✓ build      yarn run build
  ~ test       yarn vitest run
  ✓ typecheck  yarn run typecheck

Structure
  ~ src/components/  ui-components       high
  ~ src/features/    feature-modules     high
  ~ src/hooks/       hooks               high
  ~ src/services/    services-api        medium

Architecture
  ~ Shared UI layer           high
  ~ Feature-oriented modules  high

Test files
  4 test files, colocated; *.test.tsx (3), *.test.ts (1)

✓ detected from files   ~ inferred (no direct evidence)   Nothing was written.
```

Every line has **evidence** and a **confidence** level, and says whether it was
**detected** from a file (`✓`) or **inferred** (`~`). Agent Kit never presents a
guess as a fact.

## What it understands

| Area             | Covered                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Languages        | TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, C#, PHP, Ruby, Swift (by source files)                                         |
| Package managers | npm, pnpm, Yarn, Bun, with a warning when lockfiles disagree                                                                           |
| Monorepos        | npm / Yarn / pnpm workspaces, each package analysed separately                                                                         |
| Frameworks       | React, Next.js, Vite, Vue, Nuxt, Angular, Svelte, SvelteKit, Astro, Remix, Express, NestJS                                             |
| Testing          | Vitest, Jest, Playwright, Cypress; test file patterns; colocated vs separate tests                                                     |
| Tooling          | ESLint, Prettier, Biome, Storybook, Husky, lint-staged, commitlint                                                                     |
| Commands         | install, dev, build, start, test, e2e, lint, typecheck, format, per package                                                            |
| Structure        | the role of each directory (routes, components, features, hooks, services, state, tests, …) and architecture patterns                  |
| Repository       | Git, GitHub Actions, GitLab CI, CircleCI, git hooks, PR template, CODEOWNERS                                                           |
| AI agent config  | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/`, `.cursorrules`, Copilot instructions, `.claude/`, `.agents/`, `.codex/`, MCP config |

## Commands

| Command                        | Writes        | What it does                                                                                                     |
| ------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `agent-kit` / `agent-kit scan` | nothing       | Analyse the repository and print detections plus the project model.                                              |
| `agent-kit scan --json`        | nothing       | Raw detections as JSON ([`ScanResult`](https://github.com/Mapl6/agent-kit/blob/main/docs/spec/schemas.md)).      |
| `agent-kit scan --model`       | nothing       | The project model as JSON ([`ProjectModel`](https://github.com/Mapl6/agent-kit/blob/main/docs/spec/schemas.md)). |
| `agent-kit init [--dry-run]`   | `.agent-kit/` | Save config, an index snapshot and `.agent-kit/project.json`.                                                    |
| `agent-kit index [--dry-run]`  | `.agent-kit/` | Refresh them. `project.json` is only rewritten when it changes.                                                  |
| `agent-kit status`             | nothing       | Show what has been initialised and indexed.                                                                      |

Every command takes `--path <dir>` (default: current directory). Commands that
write support `--dry-run` and list each file as create / update / unchanged.

`.agent-kit/project.json` is deterministic (no timestamps, no absolute paths),
so you can commit it and review changes in pull requests.

## Safety

- **Read-only by default.** Running `agent-kit` with no arguments never modifies your repository.
- **Never executes project code.** No install scripts, no subprocesses (not even `git`), no network.
- **Secrets stay secret.** `.env*`, private keys, `.npmrc` and `secrets/` are counted but never read, hashed or printed. `.git/` is never read.
- **No symlink escapes.** Symlinks are not followed, and a symlinked project root is rejected.
- **Repository content is data.** Instructions inside READMEs or `AGENTS.md` are never acted on. Agent config files are reported by path and size only.

Details: [security model](https://github.com/Mapl6/agent-kit/blob/main/docs/spec/security.md).

## Use it from code

```ts
import { analyzeProject } from "@mapl6/agent-kit-core";

const { scan, model } = await analyzeProject({ path: "." });
const test = model.packages[0]?.commands.find((c) => c.task === "test");
console.log(test?.command); // "yarn vitest run"
```

## Roadmap

Understanding the repository (phases 0–2) is done. Next, Agent Kit uses the
model to **generate native configuration for each agent** (Claude Code, Cursor,
Codex, Copilot, plus a generic `AGENTS.md`), then adds rules and skills, a
context budget, verification (`agent-kit verify`), safety policies, and memory
and handoff between sessions.

See the full [roadmap](https://github.com/Mapl6/agent-kit/blob/main/ROADMAP.md).

## Exit codes

| Code | Meaning                        |
| ---- | ------------------------------ |
| 0    | Success                        |
| 1    | Unexpected error               |
| 2    | Invalid input or project state |
| 3    | Permission denied              |
| 4    | Storage write failure          |
| 5    | Index or scan failure          |

## Contributing

Requires Node.js 20+.

```bash
git clone https://github.com/Mapl6/agent-kit.git && cd agent-kit
npm install
npm run check               # build + typecheck + lint + tests
UPDATE_GOLDEN=1 npm test    # refresh golden snapshots after an intended change
node packages/cli/dist/index.js --path fixtures/monorepo
```

| Package         | npm                                                                            | Role                                |
| --------------- | ------------------------------------------------------------------------------ | ----------------------------------- |
| `packages/cli`  | [`@mapl6/agent-kit`](https://www.npmjs.com/package/@mapl6/agent-kit)           | The `agent-kit` CLI                 |
| `packages/core` | [`@mapl6/agent-kit-core`](https://www.npmjs.com/package/@mapl6/agent-kit-core) | Discovery, detectors, project model |

Architecture and decisions: [docs/spec](https://github.com/Mapl6/agent-kit/tree/main/docs/spec), [docs/decisions](https://github.com/Mapl6/agent-kit/tree/main/docs/decisions). Release history: [CHANGELOG](https://github.com/Mapl6/agent-kit/blob/main/CHANGELOG.md). How releases are cut and published: [RELEASING](https://github.com/Mapl6/agent-kit/blob/main/RELEASING.md).

## License

MIT
