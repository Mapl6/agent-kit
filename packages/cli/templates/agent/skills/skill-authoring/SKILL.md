---
name: skill-authoring
description: Create or patch in-repo SKILL.md playbooks correctly.
version: 0.1.0
tags: [meta, skills, authoring]
---

# Skill authoring

## When to Use

- User asks to add or improve a skill
- A workflow repeated 2+ times and belongs in the kit
- User says "remember this" / "make this a skill"
- Don't use for one-off notes (use `/agent/memory/session-log.md`)

## Prerequisites

- Read `/agent/skills/AGENTS.md` (hardlines)
- Read `/agent/improvement.md` (memory vs skill vs rule)

## Procedure

1. Decide: **new skill** vs **patch existing**. Prefer patch if overlap > ~50%.
2. Name it: lowercase hyphens (`add-ui-page`, not `AddUIPage`).
3. Scaffold with CLI when possible:
   ```bash
   npx @mapl6/agent-kit add-skill <name>
   ```
   Or create `agent/skills/<name>/SKILL.md` by hand.
4. Fill frontmatter: `name`, `description` (≤60 chars, ends with `.`), `version`, `tags`.
5. Write body in order: When to Use → Prerequisites → Procedure → Pitfalls → Verification.
6. Put long examples in `references/`, not in `SKILL.md`.
7. Add a one-line index entry to root `AGENTS.md` skill table if missing.
8. Delete obsolete wording when updating a skill (don't leave conflicting steps).

## Pitfalls

- Writing a "router" skill that only points at other skills
- Putting PR history or incident narrative into the skill body
- Descriptions longer than 60 characters
- Duplicating an existing skill under a new name

## Verification

- [ ] Frontmatter parses; description ≤60 chars
- [ ] Sections follow the standard order
- [ ] Skill is listed in `AGENTS.md` skill index
- [ ] Procedure is executable without reading session logs
