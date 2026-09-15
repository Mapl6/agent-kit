# Bootstrap prompt — paste this into Cursor / Claude / Copilot

After `npx @mapl6/agent-kit`, open a **new agent chat** in this repo and paste
everything below the line. That fills the kit from the **real** project. Later
chats will keep improving answers using skills and rules.

---

```text
Read root AGENTS.md first (Agent Kit section).

Your job: COMPLETE this project's agent kit from the EXISTING codebase. Do not
write app features yet. Fill gaps; keep generated `<!-- agent-kit:generated:* -->`
blocks; replace [bracketed placeholders] with real facts.

Do this in order:

1. Scan package.json, lockfiles, README, app/src layout, configs (Next/Vite/ESLint/Vitest/Playwright).
2. Update /agent/docs/architecture.md and /agent/docs/ui-architecture.md (paths, routing, layers).
3. Update /agent/docs/data-model.md, client-data.md, api-reference.md if APIs/data exist.
4. Update /agent/context/conventions.md, glossary.md, known-issues.md from real patterns.
5. Patch /agent/rules/coding-style.md, testing.md, security.md, git-workflow.md to match this repo.
6. Fill /agent/commands.md with exact scripts from package.json (do not invent).
7. Seed /agent/memory/MEMORY.md with short durable facts (stack, ports, gotchas). Leave USER.md for me.
8. Fix skill stubs under /agent/skills/*/SKILL.md only where steps are wrong for this stack.
9. Append /agent/memory/session-log.md with what you changed.
10. Summarize for me: files touched + what I should still fill by hand.

Rules: no secrets in kit files; prefer editing under /agent/; do not delete my prose outside generated blocks.
```
