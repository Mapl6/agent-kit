# ADR-005: Rules and skills live in .agent-kit/ and are translated per agent

Status: Accepted · 2026-10-03

## Decision

Developers write **rules** in `.agent-kit/rules/<id>.md` and **skills** in
`.agent-kit/skills/<name>/` (Agent Skills format). Agent Kit never edits these
files. On `init` and `sync` it translates them for each enabled agent:

| Source               | AGENTS.md block                       | Claude Code                                       | Cursor                                                             | Copilot                                                           | Codex                    |
| -------------------- | ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------ |
| Rule without `paths` | inlined under "Rules"                 | via `@AGENTS.md` import or native read            | native read                                                        | copied block                                                      | native read              |
| Rule with `paths`    | one-line index pointing at the source | `.claude/rules/agent-kit/<id>.md` (`paths:` list) | `.cursor/rules/agent-kit/<id>.mdc` (`globs`, `alwaysApply: false`) | `.github/instructions/agent-kit/<id>.instructions.md` (`applyTo`) | index only               |
| Skill                | none                                  | `.claude/skills/<name>/`                          | `.agents/skills/<name>/`                                           | `.agents/skills/<name>/`                                          | `.agents/skills/<name>/` |

Formats and locations were checked against provider docs on 2026-10-03 (links
in `agent-kit agents`).

## Reason

- **One source, many formats.** Each agent has its own path-rule syntax. The
  developer writes a rule once with standard globs. Cursor and Copilot take
  comma-separated globs, so `{a,b}` brace groups are expanded for them. Claude
  Code gets the original patterns, since it supports braces.
- **Global rules belong in the shared context.** Every agent already loads it.
  Copying them into per-agent "always" rules would only duplicate them.
- **`.agents/skills/` is the shared skills location.** Codex, Cursor and
  Copilot all read it. Claude Code reads only `.claude/skills/`, so the Claude
  adapter adds a copy. Cursor and Copilot also read `.claude/skills/`, so with
  Claude enabled they may list a skill twice. The copies are identical, and
  this can't be avoided without symlinks, which Agent Kit refuses to create.
- **Generated files live in an `agent-kit/` subfolder** (all three providers
  read subfolders), so they're visibly separate from files you write by hand.

## Safety

- **Skills with executable files are code.** A skill containing `scripts/` or
  executable file types isn't installed until `agent-kit skills approve <name>`.
  Approval is tied to a hash of every file, so any edit withdraws it. Copies
  are written without the executable bit, and Agent Kit never runs them.
- **Ownership by content hash.** Generated files are recorded in the install
  manifest with the hash Agent Kit wrote. A file edited by hand, or an existing
  file Agent Kit didn't create, is a conflict and is never overwritten.
- **Uninstall never deletes developer work.** It removes generated files and
  blocks, plus Agent Kit's own data in `.agent-kit/`. `rules/` and `skills/` are
  kept.
- **Conflict detection reads instruction files as data.** Matches are shown in
  the terminal for a human to resolve. They're never written into agent files,
  and Agent Kit never resolves them itself.

## Conflict detection (heuristic)

Exclusive tool choices are package manager, unit test runner, e2e tool, linter
and formatter. A finding is either a **contradicts-repo** conflict (an
instruction recommends a different tool than the one detected, or rules the
detected one out) or a **sources-disagree** conflict (no detection, and
different files recommend different tools). Package managers count only in
command form ("pnpm install", "use yarn"), because the bare word "npm" also
means the registry. Negations ("don't use Jest") count as ruling a tool out.
Agent Kit's own blocks and generated files are excluded.
