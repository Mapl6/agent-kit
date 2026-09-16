# Bootstrap prompt (copy into a new agent chat)

Read root `AGENTS.md` first (Agent Kit section).

Your job: COMPLETE this project's agent kit from the EXISTING codebase. Do not
write app features yet. Replace [bracketed placeholders] with real facts.

Do this in order:

1. Scan package.json, lockfiles, README, app/src layout, and configs.
2. Update `/agent/docs/architecture.md` (paths, routing, layers).
3. Update `/agent/context/conventions.md` and `known-issues.md` from real patterns.
4. Patch `/agent/rules/*` to match this repo.
5. Fill `/agent/commands.md` with exact scripts from package.json (do not invent).
6. Seed `/agent/memory/MEMORY.md` with short durable facts. Leave `USER.md` for the human.
7. Fix skill stubs under `/agent/skills/*/SKILL.md` only where steps are wrong for this stack.
8. Append `/agent/memory/session-log.md` with what you changed.
9. Summarize: files touched + what the human should still fill by hand.

Rules: no secrets in kit files; prefer editing under `/agent/`.
