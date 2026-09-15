# Agent kit

Tool-agnostic kit for Cursor, Claude Code, Copilot, Aider, and Cline.
Skills, memory, and an improvement loop — Markdown only.

## Refresh

```bash
npx @mapl6/agent-kit scan
npx @mapl6/agent-kit doctor
npx @mapl6/agent-kit add-skill my-flow
```

## Layout

- **`AGENTS.md`** — root operating procedure + first-time bootstrap prompt
- **`/agent/bootstrap-prompt.md`** — copy-paste into your agent to fill the kit from the real project
- **`/agent/skills/<name>/SKILL.md`** — playbooks (use on every matching task)
- **`/agent/memory/`** — hot facts, user prefs, session log
- **`improvement.md` / `handoff.md`** — learn and transfer
- **`docs/file-roles.md`** — which file does what

Scan writes `<!-- agent-kit:generated:* -->` blocks. Your prose around them is kept.
