# Session Log

An append-only log of significant AI agent activity on this repo. Keep entries
short — one entry per session/task, not a full transcript. Prune or archive
entries older than [e.g. 90 days] into `session-log-archive.md` so this file
stays fast to read.

## Format
```
## YYYY-MM-DD — [short task title]
- Agent: [tool used, e.g. Claude Code]
- Task: [one line]
- Outcome: [done / partial / abandoned]
- Notes: [anything future agents should know — dead ends, gotchas, follow-ups]
- Ref: [PR link / commit hash]
```

---

## 2026-09-05 — Example entry
- Agent: Claude Code
- Task: Refactor auth middleware to use new token format
- Outcome: Done
- Notes: Tried updating in-place first, caused circular import — rewrote as a
  separate module instead. See ADR-003 for the reasoning.
- Ref: PR #123

> Delete the example entry above once you start logging real sessions.
