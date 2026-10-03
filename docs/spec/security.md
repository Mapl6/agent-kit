# Security model

**Repository content is untrusted input.** Agent Kit reads it as data and
never follows instructions found in it.

## Guarantees (enforced and tested today)

| Threat                                                | Control                                                                                                                          | Where                                         |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Symlinked project root                                | Rejected with `INVALID_PROJECT_ROOT`                                                                                             | `discovery/root-safety.ts`                    |
| Symlinks / path escape inside repo                    | Not followed, not read, invisible to detectors (not even counted as present)                                                     | `discovery/discover.ts`, `scanner/context.ts` |
| Secret files (`.env*`, keys, `.npmrc`, `secrets/`, …) | Never read or hashed; contents never printed; only counted                                                                       | `discovery/ignore.ts`, `scanner/context.ts`   |
| Huge files                                            | Not read above `maxFileBytes` (1 MiB)                                                                                            | `discovery/discover.ts`                       |
| Code execution                                        | No lifecycle scripts, no subprocesses (not even `git`), no `require`/`import` of project files; config is read as text/JSON only | all detectors                                 |
| Prompt injection (README, AGENTS.md, …)               | Scan doesn't interpret file contents; agent instruction files are reported by path and size only                                 | `scanner/detectors/agent-config.ts`           |
| Network                                               | None                                                                                                                             | —                                             |

`ScanContext` is the single gate detectors use to read files. That keeps
these checks in one place instead of in every detector.

## Writing agent files (Phase 3)

| Threat                              | Control                                                                                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overwriting developer content       | Only the text between `BEGIN/END AGENT-KIT` markers is ever replaced; appends go at the end; uninstall restores the original bytes                               |
| Ambiguous ownership                 | Missing, duplicated or reversed markers mean conflict: nothing written, exit code 2                                                                              |
| Symlink / path escape on write      | Every path component is checked with `lstat`; a symlink anywhere means conflict. Paths are resolved inside the root only                                         |
| Losing data                         | Existing files are backed up to `.agent-kit/state/backups/<timestamp>/` before modification or deletion                                                          |
| Prompt injection via generated text | Repo-derived names render only if they match `^[\w@./+:-]{1,80}$`; otherwise they are omitted. Scan warnings and file contents are never copied into agent files |
| Editing personal files              | `CLAUDE.local.md` is never modified; a shared `CLAUDE.md` is added instead                                                                                       |

## Rules for future phases

- Generated commands are never executed without an explicit policy (allow / ask / deny).
- Skills with scripts are executable code: installing one never runs it, and
  third-party scripts are flagged for review.
- Any optional LLM use is opt-in, states what is sent, and has a local fallback.
- Writes are atomic, backed up before overwrite, and never touch user-owned
  files without a merge step the developer approves.
