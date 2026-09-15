<!-- agent-kit:start -->
# Agent Kit — {{PROJECT_NAME}}

You are an AI coding agent in this repo. **Do not write code until you finish §1.**
Follow this file in order. Detail lives under `/agent/` — read those files; do not guess.

<!-- agent-kit:generated:scan:start -->
- Project: {{PROJECT_NAME}}
- Stack: {{STACK}}
- Last scan: not yet — run `npx @mapl6/agent-kit scan` after stack changes
<!-- agent-kit:generated:scan:end -->

## 1. Read these files first (every task, in this order)

Open each file and actually read it. Skip a path only if it does not exist, and say so.

1. `/agent/permissions.md` — what you may do without asking, and what is forbidden
2. `/agent/memory/MEMORY.md` — short project facts (stack, ports, gotchas)
3. `/agent/memory/USER.md` — this developer's preferences
4. `/agent/docs/architecture.md` — how the system is shaped
5. `/agent/docs/ui-architecture.md` — routing, pages, components
6. `/agent/docs/file-roles.md` — which kit file does what
7. `/agent/context/conventions.md` — how this repo is written
8. `/agent/context/known-issues.md` — landmines
9. `/agent/rules/coding-style.md`
10. `/agent/rules/security.md`
11. `/agent/rules/testing.md`
12. `/agent/rules/git-workflow.md`
13. `/agent/commands.md` — exact install / dev / test / lint / build commands
14. `/agent/memory/session-log.md` — last few entries only
15. The matching skill in §3 (read the **whole** `SKILL.md`, not just the index row)
16. `AGENTS.override.md` and `SOUL.md` if they exist (they win for this developer)

Do not invent a second instruction system. If you need more detail, it is already under `/agent/`.

## 2. Then do the work, one step at a time

1. Restate the user goal in one sentence.
2. Follow the matching skill's **Procedure** in order. Do not skip steps.
3. Run commands from `/agent/commands.md` only — do not invent script names.
4. Reuse existing components, design tokens, and folders. Ask before creating a new top-level directory.
5. Never commit secrets. Use `.env` (see `.env.example`).
6. New interactive UI → after it exists, follow `/agent/skills/accessibility-pass/SKILL.md`.
7. Every non-trivial change needs a matching test.
8. If you are stuck, follow `/agent/skills/systematic-debugging/SKILL.md` (or `/agent/skills/debug-common-issues/SKILL.md` for known local/CI gotchas).

## 3. Which skill to load

Pick **one** row, then read that `SKILL.md` fully before acting.

| Skill | When to read it |
|---|---|
| `setup-env` | Clone, install, env, start the app locally. |
| `add-new-feature` | Ship a feature with tests and docs. |
| `add-ui-page` | Add a route or page with components and navigation. |
| `accessibility-pass` | Keyboard, semantics, and contrast for UI you just changed. |
| `dogfood-ui` | Exploratory browser QA with evidence. |
| `systematic-debugging` | Reproduce, isolate, fix, and regress a bug. |
| `debug-common-issues` | Recurring local / CI frontend gotchas. |
| `deploy` | Verify, merge, and deploy with rollback. |
| `skill-authoring` | Create or patch a `SKILL.md`. |
| `learn-from-source` | Turn a path, URL, or session into a new skill. |

Skill files live at `/agent/skills/<name>/SKILL.md`. Authoring rules: `/agent/skills/AGENTS.md`.

If nothing matches: still follow §2, then §4.

## 4. When you are done (in this order)

1. `/agent/checklist.md` — tick every box that applies
2. Append `/agent/memory/session-log.md` for non-trivial work
3. Promote lasting facts with `/agent/improvement.md` (MEMORY, a rule, or a new skill)
4. If the chat is ending mid-task, fill `/agent/handoff.md`

## 5. Hard rules

- Stack: {{STACK}}
- Prefer existing UI patterns over one-off components
- Do not disable tests, lint, or security checks to make a build pass
- Do not deploy to production without explicit human approval (`/agent/permissions.md`)
- Refresh this kit after stack changes: `npx @mapl6/agent-kit scan`

<!-- agent-kit:end -->
