# Skill authoring standards

Skills are reusable procedures. Keep them short, triggerable, and free of session
logs. Inspiration: Hermes-style `SKILL.md` folders (Markdown only — no runtime).

## Layout

```text
agent/skills/<skill-name>/SKILL.md
agent/skills/<skill-name>/references/   # optional deep dives
```

## Frontmatter (required)

```yaml
---
name: my-skill-name
description: Concise capability statement, under sixty chars.
version: 0.1.0
tags: [frontend, short, tags]
---
```

### Hardlines

- `name`: lowercase, hyphens, ≤64 chars
- `description`: ≤60 characters, one sentence, ends with a period; capability not implementation
- No marketing words ("powerful", "comprehensive", "seamless")
- Body after frontmatter is non-empty

## Body section order

1. `# Title`
2. Short intro (1–3 sentences)
3. `## When to Use`
4. `## Prerequisites` (optional)
5. `## Procedure` (numbered steps)
6. `## Pitfalls`
7. `## Verification`

Target ~100–200 lines for `SKILL.md`. Put bulk content in `references/`.

## Lessons, not logs

- Skills store **reusable procedure**
- Session narrative belongs in `/agent/memory/session-log.md`
- Do not paste PR numbers, incident timelines, or one-off debugging stories into skills

## Progressive disclosure

- `AGENTS.md` / this index lists **name + short description only**
- Load the full `SKILL.md` when the task matches `When to Use`
- Load `references/*` only when the procedure needs them

## When to create or patch a skill

See `/agent/improvement.md`. Prefer patching an existing skill over adding a near-duplicate.
