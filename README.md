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
records that as a reviewable, provider-neutral model, and hands it to every
agent you use through `AGENTS.md`.

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

## Set up your agents

```bash
npx @mapl6/agent-kit init --dry-run   # see exactly what would change
npx @mapl6/agent-kit init             # do it
```

`init` writes the project context (stack, commands, the checks to run before
finishing, conventions, structure) into a managed block in **`AGENTS.md`**, then
connects each agent to it the way that agent's docs say works best:

| Agent          | How it gets the context                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex, Cursor  | Read `AGENTS.md` natively. Nothing else is written.                                                                                                  |
| Claude Code    | If you have a `CLAUDE.md`, Agent Kit adds `@AGENTS.md` to it (Claude skips `AGENTS.md` when a `CLAUDE.md` exists). Skipped if you already import it. |
| GitHub Copilot | The context is copied into `.github/copilot-instructions.md`, the one file every Copilot surface reads.                                              |

Agents are picked from what's already in your repo (`CLAUDE.md`, `.cursor/`,
Copilot instructions, …). Choose explicitly with `--agents claude,copilot`, or
see the details with `agent-kit agents`.

```markdown
# My team's notes ← yours, never touched

<!-- BEGIN AGENT-KIT: generated, edits inside this block are overwritten by "agent-kit sync" -->

## Project context

…
<!-- END AGENT-KIT -->
```

Agent Kit only edits inside its block. It backs files up before changing them,
refuses symlinks and broken markers, and `agent-kit uninstall` restores every
file byte for byte. Run `agent-kit sync` after your tooling changes.

## Rules, skills and conflicts

Write project rules and reusable workflows once, in `.agent-kit/`. Agent Kit
translates them into each agent's own format on `sync`:

```bash
npx @mapl6/agent-kit rules new api-calls --description "API calls go through services"
npx @mapl6/agent-kit rules new testing --paths "src/**/*.test.{ts,tsx}"
npx @mapl6/agent-kit skills new release-notes
npx @mapl6/agent-kit sync
```

| You write                                               | Agents get                                                                                                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A rule without `paths`                                  | Included in the `AGENTS.md` context, so every agent loads it                                                                                                                 |
| A rule with `paths`                                     | `.claude/rules/agent-kit/`, `.cursor/rules/agent-kit/*.mdc`, `.github/instructions/agent-kit/`, each loaded only for matching files (plus an index in `AGENTS.md` for Codex) |
| A skill ([Agent Skills](https://agentskills.io) format) | `.agents/skills/` (Codex, Cursor, Copilot) and `.claude/skills/` (Claude Code)                                                                                               |

**Skills with scripts are treated as code.** They aren't installed until you
review them and run `agent-kit skills approve <name>`. Any later edit withdraws
the approval, and Agent Kit never runs them.

**Conflicting instructions are surfaced, never silently resolved:**

```text
$ npx @mapl6/agent-kit conflicts
⚠ Instructions disagree with the test runner this repo uses (vitest).
    AGENTS.md:3  jest: Run tests with Jest: `npx jest`.
```

`agent-kit conflicts --ci` exits with code 2 when it finds any, so you can
enforce it in CI.

## Commands

| Command                             | Writes                     | What it does                                                                                                                                                                      |
| ----------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent-kit` / `agent-kit scan`      | nothing                    | Analyse the repository and print detections plus the project model.                                                                                                               |
| `agent-kit scan --json` / `--model` | nothing                    | [`ScanResult`](https://github.com/Mapl6/agent-kit/blob/main/docs/spec/schemas.md) or [`ProjectModel`](https://github.com/Mapl6/agent-kit/blob/main/docs/spec/schemas.md) as JSON. |
| `agent-kit init`                    | `.agent-kit/`, agent files | Index, write `.agent-kit/project.json`, set up agents. `--agents <list>`, `--no-agents`.                                                                                          |
| `agent-kit sync`                    | `.agent-kit/`, agent files | Re-index and regenerate agent files. `--agents <list>` changes which agents are set up.                                                                                           |
| `agent-kit agents`                  | nothing                    | Which agents are enabled, how each loads the context, and the docs behind it.                                                                                                     |
| `agent-kit index`                   | `.agent-kit/`              | Refresh the model only.                                                                                                                                                           |
| `agent-kit status`                  | nothing                    | Show what has been initialised and indexed.                                                                                                                                       |
| `agent-kit uninstall`               | removes                    | Remove every Agent Kit block, delete files it created, then `.agent-kit/`. `--keep-data` keeps `.agent-kit/`.                                                                     |

Every command takes `--path <dir>` (default: current directory). Every command
that writes supports `--dry-run` and lists each file it touches with the action
and the reason.

`.agent-kit/project.json` is deterministic (no timestamps, no absolute paths),
so you can commit it and review changes in pull requests.

## Safety

- **Read-only by default.** Running `agent-kit` with no arguments never modifies your repository.
- **Your files stay yours.** Agent Kit edits only its own marked block, backs up before changing anything, never writes through symlinks, and uninstalls cleanly.
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

Understanding the repository (phases 0–2), setting up your agents (phase 3) and
rules, skills and conflict detection (phase 4) are done. Next: a context budget, verification (`agent-kit verify`), safety
policies, and memory and handoff between sessions.

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
