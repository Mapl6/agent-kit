# Which file does what

Hermes-inspired map so agents do not dump everything into one file.

| File | Role | Who writes | Hot every session? |
|---|---|---|---|
| `AGENTS.md` | Project TOC + quick rules + skill index | Humans + kit | Yes |
| `AGENTS.override.md` | Personal overrides (gitignored) | You | If present |
| `SOUL.md` | Persona / voice (gitignored) | You | If present |
| `/agent/rules/*` | Always/never constraints | Humans + agents | Yes (relevant) |
| `/agent/skills/*/SKILL.md` | Repeatable procedures | Humans + agents | On demand |
| `/agent/docs/*` | Architecture & domain description | Humans (+ scan blocks) | On demand |
| `/agent/context/*` | Glossary, conventions, known issues | Humans + agents | On demand |
| `/agent/memory/MEMORY.md` | Short curated project facts | Scan + agents | Yes |
| `/agent/memory/USER.md` | Short user preferences | You | Yes |
| `/agent/memory/session-log.md` | Narrative session history | Agents | Skim recent |
| `/agent/improvement.md` | When to promote learnings | Policy | When learning |
| `/agent/handoff.md` | Chat → chat transfer | Agents | Mid-task switch |
| `/agent/skills/CURATOR.md` | Skill hygiene / archive policy | Humans | Periodic |
| `.agent-kit.json` | Kit version + last scan metadata | CLI | Tooling |

## Progressive disclosure

1. Read `AGENTS.md` skill **index** (name + short description only)
2. Open the matching `SKILL.md` when the task matches
3. Open `references/` only for deep detail

Never paste the entire skill catalog into a chat prompt.
