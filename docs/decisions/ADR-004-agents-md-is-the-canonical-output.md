# ADR-004: AGENTS.md is the canonical output; adapters connect agents to it

Status: Accepted · 2026-10-03

## Decision

Agent Kit renders one project context from the project model and writes it to
a managed block in the root `AGENTS.md`. Each agent adapter declares how its
agent reaches that context, in one of three modes:

| Mode       | Meaning                                                     | Agents (docs checked 2026-10-03)                   |
| ---------- | ----------------------------------------------------------- | -------------------------------------------------- |
| native     | The agent reads `AGENTS.md` itself; nothing else is written | Codex, Cursor                                      |
| import     | The agent's own file imports `AGENTS.md`                    | Claude Code (`@AGENTS.md` in `CLAUDE.md`)          |
| translated | The context is copied into the agent's own file             | GitHub Copilot (`.github/copilot-instructions.md`) |

## Reason

- **One source, no drift.** Codex, Cursor, Copilot and Claude Code all read
  `AGENTS.md` in at least some setups, so writing the context once avoids
  several copies falling out of sync.
- **Claude Code ignores `AGENTS.md` when a `CLAUDE.md` exists.** The documented
  way to share is a `CLAUDE.md` that imports it, so the adapter adds `@AGENTS.md`
  and skips files that already import it. Without any `CLAUDE.md`, Claude reads
  `AGENTS.md` natively and nothing is written unless the user asks.
- **Copilot is the exception.** `.github/copilot-instructions.md` works on
  every Copilot surface, but `AGENTS.md` doesn't (Visual Studio, JetBrains chat
  and GitHub.com chat lack it). Copying costs some duplicate context in VS Code
  but reaches every surface. The adapter only runs when Copilot config exists
  or is requested.
- **Cursor `.mdc` rules are not used yet.** Cursor reads `AGENTS.md`, so a
  rule would only duplicate it. `.cursor/rules` is reserved for path-scoped
  rules in Phase 4.

## Safety rules for writing

- Agent Kit edits only between `<!-- BEGIN AGENT-KIT … -->` and
  `<!-- END AGENT-KIT -->`. Text outside is never changed.
- Malformed markers, symlinks (on the file or any parent directory), non-files
  and files over 1 MiB are reported as conflicts and left untouched (exit code 2).
- Existing files are backed up to `.agent-kit/state/backups/<timestamp>/`
  before every change.
- `.agent-kit/state/install.json` records each block and whether Agent Kit
  created the file, so `uninstall` restores files byte-for-byte and deletes only
  files Agent Kit created.
- Repository-derived names (paths, workspaces) appear in generated
  instructions only if they look like identifiers. Anything else is omitted, so
  repo content can't inject prose into agent instructions.

## Consequences

- Capability claims carry their doc links and check date (`agent-kit agents`).
  They must be re-checked when providers change their loading rules.
- Adapters were checked against provider documentation, not by running each
  agent end to end. That stays an open item in the roadmap.
