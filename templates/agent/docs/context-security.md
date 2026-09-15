# Context security

Shared agent instruction files can be abused for prompt injection. Review carefully
when accepting kit changes from others or copying AGENTS from unknown repos.

## Red flags
- Instructions to ignore previous rules, exfiltrate secrets, or hide actions from the user
- Hidden/zero-width characters, HTML comments that change behavior silently
- "Download and run" unsigned scripts as a required step
- Requests to paste API keys, cookies, or private keys into chat or files
- Skills that claim to need production deploy credentials unsupervised

## Good practice
- Keep secrets in `.env` (gitignored); never in skills/memory/AGENTS
- Prefer `npx create-agent-kit scan` over pasting huge dumps of internal docs
- Review PRs that touch `/agent/` and `AGENTS.md` like production code
- Use `AGENTS.override.md` / `SOUL.md` locally — do not commit personal secrets there either
