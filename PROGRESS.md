# Roadmap & progress

Product definition, architecture and contracts: [docs/spec/](./docs/spec/).
Decisions: [docs/decisions/](./docs/decisions/). Migration notes: [docs/plan/](./docs/plan/).

Phases ship in order. Each one is tested and leaves the CLI usable before the next starts.

| #   | Phase                   | Status   | Ships                                                                                              |
| --- | ----------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| 0   | Product foundation      | **Done** | `docs/spec/*`, ADR-001, ADR-002                                                                    |
| 1   | Repository scanner      | **Done** | `agent-kit scan`, `scan --json`                                                                    |
| 2   | Project intelligence    | **Done** | architecture/directory classification, tooling & test model, `.agent-kit/project.json`             |
| 3   | Agent adapter framework | Next     | adapter interface + registry; generic, Cursor, Claude, Codex, Copilot (verified capabilities only) |
| 4   | Rules + skills          | Later    | rules & skills engines, path-aware config, conflict detection                                      |
| 5   | Context engine          | Later    | task classification, relevant files/rules/skills, context budget                                   |
| 6   | Verification            | Later    | profiles, typecheck/lint/test/build checks, `verify --ci`                                          |
| 7   | Safety                  | Later    | command policy, secret detection, hooks, approval flow                                             |
| 8   | Memory + handoff        | Later    | decisions, lessons, known issues, `handoff`, `learn`                                               |
| 9   | Doctor + sync           | Later    | `doctor`, `status`, `sync`, `diff`, rollback                                                       |
| 10  | Learning engine         | Later    | pattern / repeated-error detection → suggestions (human-approved)                                  |
| 11  | Packs                   | Later    | local versioned packs (registry after)                                                             |
| 12  | Real-world validation   | Later    | ≥10 real repos measured                                                                            |
| 13  | v1.0                    | Later    | release gate in the spec                                                                           |

## Phase 1 checklist

- [x] Pluggable `Detector` contract and single safe `ScanContext` file gate
- [x] Languages (by source files), Node.js, npm/pnpm/yarn/bun (+ conflict warning)
- [x] npm/yarn/pnpm workspaces with per-package detection
- [x] Frameworks: React, Next.js, Vite, Vue, Nuxt, Angular, Svelte(Kit), Astro, Remix, Express, NestJS
- [x] Testing: Vitest, Jest, Playwright, Cypress · Tooling: ESLint, Prettier, Biome, Storybook, Husky, lint-staged, commitlint
- [x] Git, GitHub Actions, GitLab CI, CircleCI
- [x] AI agent config presence (AGENTS/CLAUDE/GEMINI.md, .cursor, .cursorrules, Copilot, .claude, .agents, .codex, MCP)
- [x] Fact vs inference on every detection, with evidence
- [x] Fixtures, golden tests, symlink/secret/prompt-injection tests
- [x] Validated on 5 local real repos (Next.js apps, a component library, an unscaffolded project). Fixed a case where a nested, undeclared project was invisible (now a warning)
- [ ] Validate on public OSS repos (large pnpm/turbo monorepo, Python service, legacy JS)
- [x] Removed deprecated `report` command, unused templates and reports module (3.0.0)

## Phase 2 checklist

- [x] Project model (`ProjectModel` v1) written to `.agent-kit/project.json` by `init` / `index`; previewed read-only by `scan --model`
- [x] Commands per package from scripts, with inferred fallbacks (typecheck, test, e2e, lint) and the npm placeholder test ignored
- [x] Directory roles from names plus file-pattern evidence; architecture signals (App Router, feature modules, UI/service/state layers, monorepo)
- [x] Testing model (patterns, colocated vs separate) and git conventions (hooks, commitlint, CI, PR template, CODEOWNERS); `.git/` never read
- [x] `--dry-run` on `init` and `index`; `project.json` rewritten only when content changes
- [x] Validated on 3 local Next.js repos; fixed Playwright output dirs being scanned and an e2e command inferred from the bare `playwright` library
- [ ] Tool _roles_ (e.g. Vite as a library's build tool vs the app framework). Revisit when adapters need it
- [ ] Validate on public OSS repos (large monorepo, Python service, legacy JS)

## Non-goals

Not a coding agent. Not a cloud service. No LLM required. Never executes project
scripts to detect anything. Never prints secret contents. Not tied to one AI provider.
