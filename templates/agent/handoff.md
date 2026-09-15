# Chat handoff

Copy this block into a new chat (or fill it at the end of a session) so the next
agent can continue without re-discovering context.

```markdown
## Handoff — YYYY-MM-DD

### Goal
[What we're trying to finish]

### Done so far
- [bullet]
- [bullet]

### Decisions made
- [decision + why]

### Open files / key paths
- `path/to/file` — [why it matters]

### Blockers / unknowns
- [item]

### Next steps (ordered)
1. [concrete next action]
2. [concrete next action]

### Refs
- Session log: `/agent/memory/session-log.md` entry [date/title]
- PR / commit: [link or hash]
- Related skill: `/agent/skills/[name]/SKILL.md`
```

## Tips

- Keep it short — a few lines per section, not a transcript
- Point at kit files (`skills/`, `docs/`, `known-issues`) instead of pasting them
- After handoff succeeds, append a session-log entry with Outcome: partial + next steps
