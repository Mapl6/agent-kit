# Development progress & features

Status legend: Done · Next · Later · Vision

North star: a **local-first** enhancement layer that understands a repo, stores reviewable data, and feeds any coding agent — without becoming a locked-in agent runtime or requiring an LLM to work.

```text
Phase 1 (Done)     → reliable index + report
Phase 1.5 (Next)   → scaffold lean AGENTS kit
Phase 2 (Near)     → skills / doctor / broader stacks
Phase 3 (Platform) → memory, trust, adapters, graph
Phase 4 (Vision)   → optional LLM + maintenance loops
```

---

## Phase 1 — Foundation (current) — Done

Local-first index + CLI. Publish name: `@mapl6/agent-kit`.

| Area | Status | Notes |
|---|---|---|
| npm workspaces monorepo | Done | `packages/core` + `packages/cli` |
| Typed core + Commander CLI | Done | Thin CLI → use cases |
| `init` / `index` / `status` / `report` | Done | |
| `.agent-kit/` config + snapshot | Done | Atomic writes |
| Root / symlink / secret safety | Done | No lifecycle script execution |
| Technology detection + evidence | Done | PM, runtime, framework, tooling |
| Incremental indexing | Done | Hash + delta |
| Markdown + JSON + onboarding prompt | Done | `.agent-kit/reports/` |
| ErrorCode + exit codes 0–5 | Done | Documented in README |
| Unit / fixture / pack-install smoke | Done | 10 tests + tarball check |
| Lean templates (single copy) | Done | `packages/cli/templates` only; not wired to CLI yet |

**Not in Phase 1:** scaffold into a target repo, Memory engine, LLM calls, SQLite.

---

## Phase 1.5 — Scaffold export — Next

Product moment: one command drops a lean agent kit into a repo, filled from the index.

| Feature | Status | Why |
|---|---|---|
| `agent-kit scaffold` (or `init --scaffold`) | Next | Copy lean templates into project |
| Safe merge into existing `AGENTS.md` | Next | Append/markers; no blind overwrite |
| Fill tokens from latest snapshot | Next | `{{PROJECT_NAME}}`, `{{STACK}}`, commands |
| Vendor pointers (Cursor / Claude / Copilot) | Next | Already in templates |
| `doctor` health check | Next | Missing kit files + index freshness |
| Index as source of truth | Next | Scaffold reads snapshot; no ad-hoc re-detect |

---

## Phase 2 — Agent usefulness — Later (near)

| Feature | Status | Why |
|---|---|---|
| `add-skill <name>` | Later | Scaffold one skill stub |
| Ignore / config UX (`ignoreGlobs` CLI) | Later | Power users |
| Richer detectors (Python, Go, monorepos) | Later | Broader than JS/TS |
| CI report artifact | Later | `--stdout` already partial |
| Config/snapshot schema migrations | Later | When schema > v1 |

---

## Phase 3 — Platform capabilities — Later

Build only after 1.5 is solid. Define **ports first**, swap implementations later.

### 3.1 Storage migration (JSON → SQLite)

| Item | Detail |
|---|---|
| Goal | Same application layer; swap `Json*Repository` for SQLite |
| Why | Large repos outgrow single snapshot JSON |
| Keep | Atomic writes, local-only, reviewable exports |
| CLI | Transparent; maybe `agent-kit storage migrate` |

### 3.2 Memory engine + approval loop

| Item | Detail |
|---|---|
| Goal | Durable memories beyond session-log Markdown |
| Flow | Propose → human approve/reject → store → retrieve for agents |
| Types | Fact, preference, gotcha, decision |
| Guardrail | Nothing auto-promotes to MEMORY without confirmation |
| Export | Still readable Markdown/JSON for agents that only read files |

### 3.3 Agent adapter SDK

| Item | Detail |
|---|---|
| Goal | Standard contracts so Cursor / Claude / Copilot / others plug in |
| Surface | `getContext()`, `getSkills()`, `getRules()`, `getMemory()` |
| Why | Stop hand-rolling vendor files for every tool |
| Package | e.g. `@mapl6/agent-kit-adapters` (future) |

### 3.4 Permission & trust system

| Item | Detail |
|---|---|
| Goal | Trust levels for skills and operations |
| Examples | Allow `setup-env`, deny `deploy` without ask |
| Ties to | `permissions.md` today → structured policy later |
| Audit | Local log of denied/allowed actions (no cloud) |

### 3.5 Knowledge graph

| Item | Detail |
|---|---|
| Goal | Links: files ↔ decisions ↔ rules ↔ skills ↔ tasks |
| Why | “Why does this folder exist?” / “which skill owns checkout?” |
| Input | Index snapshot + memory + docs |
| Output | Queryable local graph + optional Markdown view |

### 3.6 Optional LLM provider

| Item | Detail |
|---|---|
| Goal | Suggest architecture summaries, skill drafts, memory candidates |
| Rule | **Core never depends on a model**; LLM is an optional plugin |
| Default | Offline; user opts in; no auto-upload of secrets/index |
| UX | `agent-kit suggest …` with explicit confirm before writes |

---

## Phase 4 — Vision (long horizon)

Not scheduled. Direction only.

| Feature | Idea |
|---|---|
| Maintenance loop | Periodic re-index + drift report (“stack changed, kit stale”) |
| Team sync via git | Share approved memories/rules — still no SaaS required |
| Local skill bundles | Install from git/URL with trust prompts |
| Multi-root monorepos | One kit spanning `apps/*` + `packages/*` |
| Watch mode | Re-index on change for long agent sessions |
| Eval harness | Fixture repos + score detection/scaffold quality in CI |
| Policy packs | Security/compliance rule sets teams can pin |

---

## Non-goals (stay clear)

- Not a full autonomous coding agent
- Not a hosted cloud brain by default
- Not executing project lifecycle scripts to detect stack
- Not logging/reporting secret file contents
- Not coupling core to one LLM vendor

---

## Suggested build order

1. Scaffold + token fill from snapshot  
2. Doctor  
3. `init --scaffold` UX  
4. `add-skill`  
5. Broader detectors  
6. Memory (ports + local store + approve flow)  
7. SQLite storage backend  
8. Adapter SDK  
9. Permissions/trust  
10. Knowledge graph  
11. Optional LLM suggest  

---

## How to track locally

```bash
npm test
npm run build
npx agent-kit --help
```

When a row moves Done → update this file in the same PR.
