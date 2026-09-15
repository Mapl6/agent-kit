# create-agent-kit

Scaffold a **frontend-first**, tool-agnostic `AGENTS.md` kit that **reads your
project** and keeps skills, rules, docs, and memory in sync. Works with Claude
Code, Cursor, GitHub Copilot, Aider, Cline, and any agent that reads Markdown.

Inspired by Hermes Agent patterns (skills, memory budgets, learn loop, curator) —
**plain Markdown + CLI**, not a Hermes runtime.

## Quick start

```bash
cd your-frontend-app
npx /path/to/create-agent-kit          # init + automatic project scan
# after publishing:
npx create-agent-kit
```

`init` copies the kit, then **scans** `package.json`, lockfiles, Next/Vite
configs, `app/`/`src/` layout, ESLint/Vitest/Playwright, etc., and updates:

- `AGENTS.md`, `agent/commands.md`, checklist/skills tokens
- `agent/docs/architecture.md` + `ui-architecture.md` (generated blocks)
- `agent/context/conventions.md`, `agent/rules/*`
- `agent/memory/MEMORY.md` + a session-log entry
- `.agent-kit.json` with full detection metadata

Re-run anytime the stack changes:

```bash
npx create-agent-kit scan
```

Generated sections use HTML comment markers so **your prose is preserved** on re-scan.

## Commands

| Command | What it does |
|---|---|
| `init` (default) | Scaffold kit, then scan the project |
| `scan` | Re-read the repo; refresh generated kit sections |
| `enhance` | Add missing kit files, then scan |
| `add-skill <name>` | Scaffold `agent/skills/<name>/SKILL.md` |
| `doctor` | Health check + scan summary |

Flags: `--yes` / `-y`, `--force` / `-f`, `--no-scan`, `--report`, `--help`

## What you get

```
AGENTS.md + vendor pointers (Claude / Cursor / Copilot)
SOUL.md.example, AGENTS.override.md.example
.agent-kit.json          ← version + last scan
agent/
  skills/<name>/SKILL.md ← Hermes-style playbooks (+ learn-from-source, CURATOR)
  skill-bundles/         ← multi-skill job aliases
  memory/                ← MEMORY.md, USER.md, session-log.md
  docs/                  ← architecture, UI, file-roles, context-security
  improvement.md         ← promote lessons over time
  handoff.md             ← chat → chat transfer
  rules/, context/, …
```

## Self-improvement

1. Work with Cursor / Claude / Copilot — they read `AGENTS.md`
2. Log sessions → promote facts to `MEMORY.md` / skills / rules (`improvement.md`)
3. "Learn this" → `/agent/skills/learn-from-source/SKILL.md` or `add-skill`
4. Periodic hygiene → `/agent/skills/CURATOR.md`
5. Stack change → `npx create-agent-kit scan`

## Making the kit even better (roadmap ideas)

Already included from Hermes (Markdown ports): skill folders, progressive
disclosure, MEMORY/USER budgets, learn-from-source, curator-lite, SOUL/override,
file-roles, context-security, skill bundles, project scan.

Still runtime-only in Hermes (not ported on purpose): memory tool, curator
daemon, MCP gateway, session_search DB, background self-improvement forks.

Nice future kit upgrades: monorepo nested `AGENTS.md` stubs per package,
`skills-audit` CLI, DESIGN.md hook, CI "kit drift" check via `scan --report`.

## Publish

```bash
npm login && npm publish
```
