# Improvement loop

This kit gets better over time when agents and humans promote durable lessons out
of chat history into skills, rules, and context.

## Where to write what

| Kind of learning | Write to | Who loads it |
|---|---|---|
| One-off session notes, dead ends, follow-ups | `/agent/memory/session-log.md` | Next sessions (skim) |
| Short durable project fact (keep budget) | `/agent/memory/MEMORY.md` | Every session |
| User preference / communication | `/agent/memory/USER.md` | Every session |
| Durable project fact / gotcha (longer) | `/agent/context/known-issues.md` or `glossary.md` / `conventions.md` | Every task |
| Permanent product/tech decision | `/agent/docs/decisions.md` | When architecture matters |
| Repeatable workflow (2+ times, "remember this", "learn this") | New/patched skill via `learn-from-source` / `skill-authoring` | When task matches |
| Always/never constraint | `/agent/rules/*.md` | Every task |
| Skill hygiene (dedupe / archive) | `/agent/skills/CURATOR.md` | Periodic |

## Rules for agents

1. **Every answer** must already reflect loaded skills + rules (AGENTS.md §2). If you notice a miss, fix the reply before finishing.
2. After a non-trivial task, append a short session-log entry
3. If you discovered a **repeatable** procedure, create or patch a skill (see `/agent/skills/skill-authoring/SKILL.md`)
4. If you discovered a **constraint**, patch the relevant rule — and remove wording it replaces
5. Prefer appending files during the session; assume the next chat reloads updated kit files — that is how answers keep getting better
6. Never put secrets in memory, skills, or context
7. Use `/agent/handoff.md` when transferring work to a new chat

## Promote from memory (humans + agents)

Periodically skim `/agent/memory/session-log.md` and:

- [ ] Move lasting gotchas → `/agent/context/known-issues.md`
- [ ] Move decisions → `/agent/docs/decisions.md`
- [ ] Turn repeated playbooks → `/agent/skills/<name>/SKILL.md`
- [ ] Archive old entries → `session-log-archive.md` (keep the live log short)

## CLI helpers

```bash
npx @mapl6/agent-kit scan             # re-read the project; refresh generated kit sections
npx @mapl6/agent-kit enhance          # add any new kit files you don't have yet
npx @mapl6/agent-kit add-skill <name> # scaffold a new SKILL.md stub
npx @mapl6/agent-kit doctor           # health check + scan summary
```

## Skip saving (noise)

- Facts already in `AGENTS.md` / skills / SOUL
- Trivial or web-searchable trivia
- Secrets, tokens, private URLs with credentials
