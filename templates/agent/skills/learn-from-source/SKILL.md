---
name: learn-from-source
description: Turn a path, URL, or session into a new skill.
version: 0.1.0
tags: [meta, skills, learn]
---

# Learn from source

Hermes-inspired `/learn` as a **Markdown procedure** (no runtime slash command).

## When to Use

- User says "learn this", "make a skill from this", or "remember this workflow"
- You finished a multi-step task worth repeating
- Source is a directory, doc URL, or the current session's procedure
- Don't use for one-line facts (put those in `MEMORY.md` or `known-issues.md`)

## Prerequisites

- Read `/agent/skills/AGENTS.md` and `/agent/improvement.md`
- Prefer `npx @mapl6/agent-kit add-skill <name>` to scaffold

## Procedure

1. **Name the capability** — lowercase-hyphen, description <=60 chars
2. **Gather source** — path, URL summary, or session steps (what worked)
3. **Decide tier** — everyday → bundled under `agent/skills/`; niche → still ok here, keep short
4. **Author `SKILL.md`** — When to Use → Procedure → Pitfalls → Verification; lessons not logs
5. **Split bulk** — long excerpts go in `references/*.md`
6. **Index** — ensure `AGENTS.md` skill table has a row
7. **Verify** — dry-run the procedure mentally against a second example
8. **Log** — one session-log line pointing at the new skill

## Pitfalls

- Copy-pasting an entire article into SKILL.md
- Creating a router skill that only points at other skills
- Encoding one-off incident details (ticket IDs, dates) as procedure

## Verification

- [ ] Another agent could follow the skill without the original chat
- [ ] Description <=60 chars
- [ ] Listed in `AGENTS.md`
