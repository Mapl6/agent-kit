# AGENTS.md — {{PROJECT_NAME}}

Entry point for any AI coding agent (Claude Code, Cursor, Copilot, Aider, Cline,
etc.). Keep this file short — table of contents, not the full manual. Detail lives
under `/agent/`. See `/agent/docs/file-roles.md` for which file does what.

This kit is **frontend-first** and **self-improving**: when workflows repeat, agents
create or patch skills/rules (see `/agent/improvement.md`). After install, run
`npx @mapl6/agent-kit scan` (also runs automatically on `init`) to read the repo
and refresh generated sections.

## Quick rules
- Stack: {{STACK}}
- No secrets committed — use `.env` (see `.env.example`)
- Prefer existing components and design tokens over one-off UI
- New interactive UI gets an accessibility pass (`/agent/skills/accessibility-pass/SKILL.md`)
- Follow existing folder structure; don't invent top-level dirs without asking
- All non-trivial features need a matching test
- If `AGENTS.override.md` or `SOUL.md` exist locally, honor them for this developer

## Where to look
| Need | Go to |
|---|---|
| Coding style, security, git, testing | `/agent/rules/` |
| Step-by-step playbooks (`SKILL.md`) | `/agent/skills/` |
| Architecture, UI, client data, file roles | `/agent/docs/` |
| Glossary, conventions, known issues | `/agent/context/` |
| Hot facts / user prefs | `/agent/memory/MEMORY.md`, `USER.md` |
| Session activity log | `/agent/memory/session-log.md` |
| Improve skills/rules over time | `/agent/improvement.md` |
| Transfer work to a new chat | `/agent/handoff.md` |
| Skill hygiene / archive | `/agent/skills/CURATOR.md` |
| Multi-skill jobs | `/agent/skill-bundles/` |
| Exact commands | `/agent/commands.md` |
| Autonomy / definition of done | `/agent/permissions.md`, `checklist.md` |

## Skill index
Load the full `SKILL.md` only when the task matches (progressive disclosure).

| Skill | Description |
|---|---|
| `setup-env` | Clone, install, env, and start the frontend locally. |
| `add-new-feature` | Ship a frontend feature with tests and docs updates. |
| `add-ui-page` | Add a route or page with components and navigation. |
| `accessibility-pass` | Keyboard, semantics, and contrast check for UI changes. |
| `dogfood-ui` | Exploratory browser QA with evidence and a bug report. |
| `systematic-debugging` | Reproduce, isolate, fix, and regress frontend bugs. |
| `debug-common-issues` | Lookup table of recurring local and CI frontend gotchas. |
| `deploy` | Verify, merge, and deploy frontend with safe rollback. |
| `skill-authoring` | Create or patch in-repo SKILL.md playbooks correctly. |
| `learn-from-source` | Turn a path, URL, or session into a new skill. |

Authoring standards: `/agent/skills/AGENTS.md`

## Setup
See `/agent/skills/setup-env/SKILL.md`. Refresh kit from the repo anytime:

```bash
npx @mapl6/agent-kit scan
npx @mapl6/agent-kit doctor
```

## First thing to read for any task
1. `/agent/memory/MEMORY.md` — curated hot facts (from scan + lessons)
2. `/agent/docs/ui-architecture.md` — UI/routing/component shape
3. `/agent/docs/architecture.md` — system overview
4. `/agent/memory/session-log.md` — recent related work
5. Matching skill under `/agent/skills/<name>/SKILL.md`

## Improvement loop
- After non-trivial work → append `/agent/memory/session-log.md`
- Durable short facts → `/agent/memory/MEMORY.md` (keep under budget)
- Repeatable workflow / "learn this" → `learn-from-source` or `skill-authoring`
- Always/never constraint → patch `/agent/rules/`
- New chat mid-task → `/agent/handoff.md`
- Details: `/agent/improvement.md`

## After finishing any non-trivial task
1. Run `/agent/checklist.md`
2. Append a session-log entry
3. Promote durable lessons per `/agent/improvement.md`
