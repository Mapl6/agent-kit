<!-- agent-kit:start -->
# Agent Kit — {{PROJECT_NAME}}

## 0. First time only (human)

1. Open your coding agent in **this project root**
2. Paste the prompt from `/agent/bootstrap-prompt.md` (or the box below)
3. Review diffs under `/agent/`, then commit

```text
Read root AGENTS.md first (Agent Kit section).

Complete this project's agent kit from the EXISTING codebase. Do not write app
features yet. Replace [bracketed placeholders] with real facts.

Do this in order:
1. Scan package.json, lockfiles, README, app/src layout, and configs.
2. Update /agent/docs/architecture.md (paths, routing, layers).
3. Update /agent/context/conventions.md and known-issues.md from real patterns.
4. Patch /agent/rules/* to match this repo.
5. Fill /agent/commands.md with exact scripts from package.json (do not invent).
6. Seed /agent/memory/MEMORY.md with short durable facts. Leave USER.md for me.
7. Fix skill stubs under /agent/skills/*/SKILL.md only where steps are wrong.
8. Append /agent/memory/session-log.md with what you changed.
9. Summarize: files touched + what I should still fill by hand.

Rules: no secrets in kit files; prefer editing under /agent/.
```

After bootstrap, every later task follows §1–§5.

You are an AI coding agent in this repo. **Do not write product code until you finish §1.**

<!-- agent-kit:generated:scan:start -->
- Project: {{PROJECT_NAME}}
- Stack: {{STACK}}
- Last index: not yet — run `npx @mapl6/agent-kit index` after stack changes
<!-- agent-kit:generated:scan:end -->

## 1. Read these files first (every task, in this order)

1. `/agent/permissions.md`
2. `/agent/memory/MEMORY.md`
3. `/agent/memory/USER.md`
4. `/agent/docs/architecture.md`
5. `/agent/docs/file-roles.md`
6. `/agent/context/conventions.md`
7. `/agent/context/known-issues.md`
8. `/agent/rules/coding-style.md`
9. `/agent/rules/security.md`
10. `/agent/rules/testing.md`
11. `/agent/rules/git-workflow.md`
12. `/agent/commands.md`
13. `/agent/memory/session-log.md` (last few entries only)
14. The matching skill in §3 (full `SKILL.md`)
15. `AGENTS.override.md` if it exists (wins for this developer)

## 2. Then do the work

1. Restate the user goal in one sentence.
2. Load the matching skill from §3 and follow its Procedure.
3. Apply rules from `/agent/rules/` while planning and editing.
4. Prefer facts from MEMORY, context, and docs over guessing.
5. Run commands from `/agent/commands.md` only.
6. Reuse existing patterns; ask before new top-level directories.
7. Never commit secrets.
8. Every non-trivial change needs a matching test.
9. If stuck → `/agent/skills/systematic-debugging/SKILL.md`.
10. Before “done”: `/agent/checklist.md`, then fix gaps.

## 3. Which skill to load

| Skill | When |
|---|---|
| `setup-env` | Clone, install, env, start locally |
| `add-new-feature` | Ship a feature with tests |
| `systematic-debugging` | Reproduce, isolate, fix, regress |
| `skill-authoring` | Create or patch a `SKILL.md` |

Skills live at `/agent/skills/<name>/SKILL.md`. Authoring: `/agent/skills/AGENTS.md`.

## 4. When you are done

1. `/agent/checklist.md`
2. Append `/agent/memory/session-log.md` for non-trivial work
3. Promote lasting facts via `/agent/improvement.md`
4. Mid-task new chat → `/agent/handoff.md`

## 5. Hard rules

- Stack: {{STACK}}
- Prefer existing patterns over one-offs
- Do not disable tests, lint, or security checks to make a build pass
- Do not deploy to production without explicit human approval
- Refresh after stack changes: `npx @mapl6/agent-kit index`

<!-- agent-kit:end -->
