# Roadmap

Agent Kit grows one phase at a time. Each phase ships tested, keeps the CLI
usable, and has explicit exit criteria before the next one starts. The full
product definition is in [docs/spec/product.md](./docs/spec/product.md).

```text
Understand the repo ──► Prepare the agent ──► Guide & protect ──► Verify ──► Remember & improve
   Phases 0–2            Phases 3–5            Phases 5–7         Phase 6     Phases 8–11
```

| #   | Phase                   | Status   | Release |
| --- | ----------------------- | -------- | ------- |
| 0   | Product foundation      | **Done** | 3.0.0   |
| 1   | Repository scanner      | **Done** | 3.0.0   |
| 2   | Project intelligence    | **Done** | 3.0.0   |
| 3   | Agent adapter framework | **Done** | 3.1.0   |
| 4   | Rules + skills          | Next     |         |
| 5   | Context engine          | Planned  |         |
| 6   | Verification            | Planned  |         |
| 7   | Safety                  | Planned  |         |
| 8   | Memory + handoff        | Planned  |         |
| 9   | Doctor + sync           | Planned  |         |
| 10  | Learning engine         | Planned  |         |
| 11  | Packs                   | Planned  |         |
| 12  | Real-world validation   | Ongoing  |         |
| 13  | v1.0 of the product     | Planned  |         |

> npm versions (3.x) and product phases are separate. "v1.0" here is the product
> milestone in phase 13, gated on the criteria below, not an npm version number.

---

## Phase 0: Product foundation (done)

**Goal:** define exactly what Agent Kit is before building it.

- Product, architecture, CLI, schema, security and testing specs in [`docs/spec/`](./docs/spec/)
- Decisions in [`docs/decisions/`](./docs/decisions/): single core package (ADR-001), read-only default scan (ADR-002), generated project model (ADR-003)

## Phase 1: Repository scanner (done)

**Goal:** understand a repository safely, with evidence.

- `agent-kit scan` (default command, read-only) and `scan --json`
- Pluggable `Detector` contract, with every file read going through one safe gate (no secrets, symlinks or oversized files)
- Languages, Node.js, npm/pnpm/yarn/bun (with conflict warning), npm/yarn/pnpm workspaces per package
- Frameworks (React, Next.js, Vite, Vue, Nuxt, Angular, Svelte/SvelteKit, Astro, Remix, Express, NestJS), test runners (Vitest, Jest, Playwright, Cypress), tooling (ESLint, Prettier, Biome, Storybook, Husky, lint-staged, commitlint), Git, CI
- AI-agent config presence (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/`, `.cursorrules`, Copilot instructions, `.claude/`, `.agents/`, `.codex/`, MCP), by path and size only
- Detected vs inferred on every finding

**Exit criteria met:** golden tests on 8 fixtures; symlink, secret and prompt-injection tests; validated on 5 real repos.

## Phase 2: Project intelligence (done)

**Goal:** turn facts into a model an agent can act on.

- `ProjectModel` v1 in `.agent-kit/project.json` (deterministic, no absolute paths), previewed with `scan --model`
- Commands per package (install, dev, build, test, e2e, lint, typecheck, format) from scripts, with inferred fallbacks
- Directory roles with content-backed confidence; architecture signals (App Router, feature modules, UI/service/state layers, monorepo)
- Testing model (patterns, colocated vs separate) and git conventions
- `--dry-run` on every writing command

**Exit criteria met:** model goldens on every fixture; re-index is byte-identical; validated on 3 real repos.

**Carried forward:** tool roles (Vite as library build tool vs app framework).

## Phase 3: Agent adapter framework (done)

**Goal:** give every agent the project model through its own loading mechanism.

- `AgentAdapter` contract (mode, capabilities with doc links and check date, `detect`, `targets`) and a registry
- One shared context rendered into a managed block in `AGENTS.md`. Adapters connect agents to it:
  - **native:** Codex, Cursor
  - **import:** Claude Code (`@AGENTS.md` added to an existing `CLAUDE.md`)
  - **translated:** Copilot (`.github/copilot-instructions.md`)
- `init` sets agents up, `sync` regenerates them, `agents` explains them, `uninstall` reverses everything. All support `--dry-run`
- Safe merge: only marked blocks are edited; conflicts (bad markers, symlinks) are reported and skipped; backups; install manifest for byte-exact uninstall
- Repo-derived names are sanitised before reaching agent instructions ([ADR-004](./docs/decisions/ADR-004-agents-md-is-the-canonical-output.md))

**Exit criteria met:** golden output per fixture; user content preserved byte for byte; uninstall restores originals; dry-run on 3 real repos (two already imported `@AGENTS.md`, correctly skipped).

**Carried forward:** adapters were verified against provider docs, not by running each agent end to end; `.cursor/rules` and `.github/instructions` path rules belong to Phase 4.

## Phase 4: Rules + skills (next)

**Goal:** persistent conventions (rules) and on-demand workflows (skills).

- Rules engine: categorised and path-scoped rules in `.agent-kit/rules/`, translated per adapter
- Skills in the open `SKILL.md` structure; scripts are never executed on install
- Conflict detection across sources (e.g. "use Vitest" vs "use Jest"), surfaced and never silently resolved

**Exit criteria:** conflict tests; skills with scripts flagged for review.

## Phase 5: Context engine

**Goal:** give agents the minimum relevant context, not everything.

- Context budget per agent (always-on vs on-demand), with overload warnings
- Task classification (feature, bug, refactor, …) leading to relevant files, rules, skills and memory

**Exit criteria:** measured context sizes on fixtures; overload suggestions are explainable.

## Phase 6: Verification

**Goal:** agents prove their work.

- `agent-kit verify` with profiles (quick / standard / strict / custom) built from model commands
- Definition of Done; `--ci` mode with stable exit codes

**Exit criteria:** runs green/red correctly on fixtures; never runs a command outside policy.

## Phase 7: Safety

**Goal:** dangerous operations need a policy.

- Command policy (allow / ask / deny) for `rm -rf`, `git push --force`, destructive migrations, …
- Secret detection, opt-in and visible hooks, approval flow

## Phase 8: Memory + handoff

**Goal:** durable knowledge across sessions.

- Decisions (ADRs), lessons, known issues in `.agent-kit/memory/`
- `agent-kit handoff` and `agent-kit learn`, with human approval before anything persists

## Phase 9: Doctor + sync

**Goal:** a daily-driver experience.

- `doctor`, `status` (readiness: Ready / Needs attention / Missing), `diff`, rollback (`sync` shipped early, in 3.1.0)

## Phase 10: Learning engine

**Goal:** suggest improvements from repeated mistakes. Detect → suggest → developer approves → persist.

## Phase 11: Packs

**Goal:** versioned bundles of rules, skills, checks and detectors (`agent-kit add-pack react`). Local first; a registry comes later.

## Phase 12: Real-world validation (ongoing)

At least 10 real repositories across Next.js, React, Node, Python, monorepos,
legacy and open-source projects, measuring setup success, false detections,
context size, verification reliability and developer corrections.

**Still open from Phases 1–2:** a large public pnpm/turbo monorepo, a Python service, a legacy JS project.

## Phase 13: v1.0 of the product

Released only when: the scanner and adapters are reliable, generated config is
safe, verification is reliable, there are no destructive defaults, docs are
complete, the migration story is defined, uninstall works, and real repos are
validated.

---

## Non-goals

Not a coding agent. Not a cloud service. No LLM required. Never executes
project scripts to detect anything. Never prints secret contents. Not tied to
one AI provider.
