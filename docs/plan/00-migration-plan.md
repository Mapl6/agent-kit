# Migration plan: v2 index tool → Agent Kit spec

Status: accepted, Phase 0 done, Phase 1 implemented · 2026-10-03

This plan moves the current repository toward the Agent Kit product spec
(project intelligence and optimization layer for AI coding agents). It follows
the spec's implementation rules: inspect first, reuse what is sound, build one
phase at a time, and start with `agent-kit scan`, not `init`.

---

## 1. Current state (inventory)

~1.9k lines of TypeScript, npm workspaces, 10 passing tests, clean typecheck/lint.

| Area                                                    | Location                                        | Verdict                                                                                                                                                                                                                                                |
| ------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root resolution, symlink/escape safety                  | `core/src/discovery/root-safety.ts`             | **Reuse** as-is. Already matches §59 (symlink, path traversal).                                                                                                                                                                                        |
| File walk (no symlink follow, depth cap, ignore dirs)   | `core/src/discovery/discover.ts`, `ignore.ts`   | **Reuse**. Becomes the scanner's file-inventory stage.                                                                                                                                                                                                 |
| Secret path detection, never hash secret contents       | `ignore.ts`, `orchestrate.ts`                   | **Reuse**, extend list later (Phase 7).                                                                                                                                                                                                                |
| File classification                                     | `core/src/discovery/classify.ts`                | **Reuse**.                                                                                                                                                                                                                                             |
| `Confidence` + `Evidence` types                         | `core/src/domain/types.ts`                      | **Reuse, extend** with fact-vs-inference `source` (§8, §51).                                                                                                                                                                                           |
| Technology detection                                    | `core/src/detection/technology.ts`              | **Rewrite** into pluggable `Detector`s (§47). It's one 200-line function with an if/else chain, frameworks are mutually exclusive (Next.js hides React), it reads only the root `package.json`, and it can't be extended without editing the function. |
| Atomic JSON storage, repositories/ports                 | `core/src/storage/*`, `ports/`                  | **Reuse**.                                                                                                                                                                                                                                             |
| AppError, error codes, exit codes 0–5                   | `core/src/errors/*`                             | **Reuse**.                                                                                                                                                                                                                                             |
| Incremental hash index (`snapshot.json`)                | `core/src/indexer/*`                            | **Keep as internal cache**. It isn't the project model; move it under `.agent-kit/state/` when the new layout lands.                                                                                                                                   |
| Markdown/JSON report + onboarding prompt                | `core/src/reports/*`                            | **Replace** with scan output renderers (text + `--json`). The onboarding prompt goes away until Phase 3/4.                                                                                                                                             |
| CLI (`init`/`index`/`status`/`report`)                  | `cli/src/program.ts`                            | **Reshape**: add `scan`; see §3 for the rest.                                                                                                                                                                                                          |
| Templates (AGENTS.md, CLAUDE.md, skills, rules, memory) | `cli/templates/`                                | **Park**. Not wired to the CLI and not shipped behaviour. Mine them later as input to Phases 3–4 adapters/skills; don't wire them now.                                                                                                                 |
| Fixtures                                                | `fixtures/{plain-node,vite-react,with-secrets}` | **Reuse, expand** (§56).                                                                                                                                                                                                                               |

### Defects / spec conflicts found

1. **Uncommitted change makes `init` the default command** (`npx @mapl6/agent-kit`
   writes `.agent-kit/`). This conflicts with §81 (start with scan) and the
   non-destructive principle: a bare invocation should never write. Recommendation:
   drop that change. If a default command is wanted, make it `scan`.
2. `init` writes files with no `--dry-run` (§40).
3. Detection misses everything in spec Phase 1 except npm/pnpm/yarn/bun, TS/JS,
   React/Next/Vite, ESLint, Vitest/Jest. Missing: Git, Prettier, Playwright,
   GitHub Actions, AI-agent config files, workspaces/monorepos.
4. `cli` pins `@mapl6/agent-kit-core` at exact `2.0.0` while cli is bumped to
   `2.0.1`. That's fine today, but versions must move together. Lockstep versioning is
   recommended.
5. Root `package.json` lacks `"type": "module"` (ESLint prints a reparse warning).

---

## 2. Package layout decision

The spec (§46) lists ~14 packages. **Recommendation: don't split yet.** Keep
`core` + `cli`, and add module boundaries _inside_ core that mirror the target
packages:

```
packages/core/src/
  scanner/        # Phase 1 — Detector interface, registry, built-in detectors, ScanResult
  intelligence/   # Phase 2 — project model, architecture inference (empty until then)
  discovery/      # existing: walk, ignore, classify, root safety
  storage/        # existing
  errors/         # existing
  domain/         # shared types
```

Extract a folder into its own package only when a second consumer needs it
(e.g., adapters in Phase 3). That avoids 14 package.json/tsconfig/publish units
before any of them has an independent reason to exist (§80.11 asks the same of dependencies).

---

## 3. Phase 0 — foundation docs (no feature code)

Short, decision-focused documents in `docs/spec/`:

| Doc               | Content                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `product.md`      | Condensed spec: positioning, principles, non-goals. Replaces the vision parts of `ROADMAP.md`.              |
| `architecture.md` | Module boundaries above, data flow (scan → model → adapters), precedence rules (§53).                       |
| `cli.md`          | Command list, which commands write, `--json`/`--ci`/`--dry-run` contract, exit codes.                       |
| `schemas.md`      | `ScanResult` v1, `.agent-kit/` layout, config v2 + migration from v1.                                       |
| `security.md`     | Repo content is untrusted, no execution of project scripts, secret handling, symlink rules.                 |
| `testing.md`      | Fixture matrix + golden snapshot approach.                                                                  |
| `decisions/`      | ADRs, starting with ADR-001 "single core package with internal boundaries" and ADR-002 "scan is read-only". |

The adapter contract and capability matrix are deferred to Phase 3. Writing them now
would mean asserting provider capabilities we haven't verified (§55, §80.19).

---

## 4. Phase 1 — `agent-kit scan`

### Contract

- **Read-only.** Writes nothing, not even `.agent-kit/`. Works on uninitialised repos.
- `agent-kit scan [--path .] [--json]`. Human output lists detected items
  grouped by category with confidence; `--json` emits `ScanResult` v1.
- Exit 0 on success. Same error/exit-code model as today.
- Never executes project code or lifecycle scripts; never prints secret contents.

### Core types

```ts
interface Detector {
  id: string;
  category: DetectionCategory;
  detect(ctx: ScanContext): Promise<Detection[]>;
}

type Detection = {
  id: string; // "nextjs", "pnpm", "github-actions", "claude-code-config"
  label: string;
  category: DetectionCategory;
  confidence: Confidence;
  source: { type: "detected"; detector: string } | { type: "inferred"; detector: string };
  evidence: Evidence[];
  location?: string; // workspace path for monorepos; "." for root
};

type ScanContext = {
  root: string;
  files: DiscoveredEntry[]; // from existing discoverFiles()
  readJson<T>(rel: string): Promise<T | null>; // safe, size-capped, never secrets
  readText(rel: string): Promise<string | null>;
  exists(rel: string): boolean; // answered from the file list, no extra fs calls
};
```

`ScanContext` is the only way detectors touch disk. That keeps the
root/symlink/secret/size guarantees in one place, and lets tests use in-memory contexts.

### Detectors (spec Phase 1 list)

| Group                     | Detectors                                                                                                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime/language          | Node.js, TypeScript, JavaScript                                                                                                                                                    |
| Package manager           | npm, pnpm, yarn, bun (lockfile + `packageManager` field)                                                                                                                           |
| Frameworks                | React, Next.js, Vite. Independent, **not** mutually exclusive                                                                                                                      |
| Tooling                   | ESLint, Prettier, Vitest, Jest, Playwright                                                                                                                                         |
| Repo infra                | Git (presence of `.git`, no git subprocess in v1), GitHub Actions (workflow files)                                                                                                 |
| Workspaces                | npm/pnpm/yarn workspaces. Run package-level detectors per workspace and tag them with `location`                                                                                   |
| AI config (presence only) | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.cursor/`, `.github/copilot-instructions.md`, `.github/instructions/`, `.claude/`, `.agents/`, `.codex/`, MCP config files |

AI-config detection reports **that files exist and their size**, not their
meaning. Their content is untrusted (§60) and interpreting it belongs to later phases.

### CLI changes

- Add `scan`.
- `index` stays as-is (it's the cache writer `init` uses).
- `report` gets deprecated in favour of `scan` (keep it working one minor version with a notice).
- `init` stays opt-in and non-default. `--dry-run` comes when init gains real
  generation (Phase 3+); today it only writes config + cache.

### Tests

- Unit test per detector against in-memory `ScanContext`.
- New fixtures: `nextjs`, `monorepo` (pnpm workspaces), `ai-configured`
  (AGENTS.md + .cursor + .claude + a README containing a prompt-injection string),
  `unknown` (no package.json), `symlink-escape`.
- Golden test: `scan --json` per fixture compared with a committed expected
  file (timestamps/abs paths normalised).
- Security tests: symlink pointing outside root is never read; `.env` content
  never appears in output; injection text in README doesn't change output.
- Perf sanity: scan of this repo completes in < 1 s.

### Done when

`scan` and `scan --json` produce correct, golden-tested output for every fixture
and for 3 real local repos, CI is green, and README documents the command.

---

## 5. Explicitly not now

`init` generation, adapters, rules/skills engines, context engine, verification,
hooks, memory, learning, packs, LLM usage, non-JS language detectors (Python
etc. come after the JS set is trustworthy, as spec Phase 1 lists only JS/TS).

## 6. Resolved questions

1. "init is default" change dropped; `scan` is the read-only default ([ADR-002](../decisions/ADR-002-scan-is-default-and-read-only.md)).
2. Single core package accepted ([ADR-001](../decisions/ADR-001-single-core-package.md)).
3. `ROADMAP.md` kept as a short phase roadmap; product/architecture detail moved to `docs/spec/`.

## 7. Deviations from this plan during implementation

- `scan` doesn't read `.agent-kit/config.json` ignore globs yet; it uses defaults. Wiring them in is trivial once config v2 lands.
- No `symlink-escape` fixture on disk; symlink cases are built at test time (git and npm pack handle committed symlinks inconsistently).
- 3.0.0 cleanup: `report`, the reports module and the unused `cli/templates/` were removed instead of parked. They're recoverable from git history (commit `da94aa1` and earlier) if Phase 3–4 needs them.
- Languages are detected by counting source files (any language), not inferred from `package.json`. A repo with only `package.json` reports Node.js but no language, which is accurate.
