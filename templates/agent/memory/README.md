# Memory — How to Use This Folder

Three layers (Hermes-inspired, Markdown-only):

| File | Type | Budget | Update |
|---|---|---|---|
| `MEMORY.md` | Curated project facts | ~2200 chars | Scan + rare agent edits |
| `USER.md` | User preferences | ~1375 chars | Human |
| `session-log.md` | Narrative activity log | Grow then archive | Every session |

Entries in `MEMORY.md` / `USER.md` are separated by a line with only `---`.

| Other kit areas | Type |
|---|---|
| `/agent/context/` | Static facts (glossary, known issues) |
| `/agent/docs/decisions.md` | Permanent ADRs |
| `/agent/skills/` | Procedures |

## Rules for agents
- Append to `session-log.md`; don't rewrite history
- Keep `MEMORY.md` short — consolidate instead of endless append
- Never put secrets in memory files
- Promote durable lessons via `/agent/improvement.md`
- Mid-task chat switches: `/agent/handoff.md`

## Rules for humans
- Periodically promote session-log → MEMORY / known-issues / skills / rules
- Archive old session-log entries quarterly
- Prefer gitignored `SOUL.md` for personal voice
