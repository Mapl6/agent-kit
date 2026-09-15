# Skill curator (lite)

Hermes has an automated curator. This kit uses a **manual / agent-assisted** policy
so skills stay sharp without a daemon.

## Rules
- Prefer **patch** over duplicate skills
- Skills are **lessons not logs** — no PR archaeology in `SKILL.md`
- Mark superseded skills in a table below, then move the folder to `agent/skills/_archive/`
- Never delete history without archiving (agents may still link old paths)
- Pin evergreen skills (setup-env, skill-authoring) — do not archive them

## Hygiene checklist (monthly or when the index feels noisy)
- [ ] Skill index in `AGENTS.md` matches folders under `agent/skills/`
- [ ] Descriptions still <=60 characters and accurate
- [ ] Duplicates merged; losers archived
- [ ] `references/` used for long content
- [ ] Session-log lessons promoted per `/agent/improvement.md`

## Supersedes ledger

| Skill | Status | Superseded by | Notes |
|---|---|---|---|
| | active / archived | | |

## Archive location
`agent/skills/_archive/<name>/` — keep `SKILL.md` intact for archaeology.
