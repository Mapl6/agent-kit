# AI Agent Kit (frontend-first)

Tool-agnostic kit for Claude Code, Cursor, Copilot, Aider, Cline, etc.
Hermes-inspired `SKILL.md` folders + improvement loop — **Markdown + CLI only**.

## Install / refresh

```bash
npx create-agent-kit          # init + scan project
npx create-agent-kit scan     # re-detect stack; update generated sections
npx create-agent-kit doctor
npx create-agent-kit add-skill my-flow
```

## Layout
- **`AGENTS.md`** — TOC + skill index
- **`/agent/skills/<name>/SKILL.md`** — playbooks
- **`/agent/memory/`** — `MEMORY.md` (hot facts), `USER.md`, `session-log.md`
- **`improvement.md` / `handoff.md`** — learn & transfer
- **`docs/file-roles.md`** — which file does what

Scan writes `<!-- agent-kit:generated:* -->` blocks you can re-run safely.
