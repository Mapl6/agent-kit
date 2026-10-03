# CLI

## Rules

- A bare `agent-kit` runs `scan`, which is read-only.
- Commands that write must say so in `--help`, and must gain `--dry-run`
  before they generate anything beyond Agent Kit's own `.agent-kit/` state.
- No interactive prompts in any command run so far. When prompts arrive, every
  prompt has a flag equivalent and `--ci` disables prompting.
- Machine output is `--json` on stdout; human notes and deprecations go to stderr.
- Output has no colour codes, so it is safe to pipe.

## Commands

| Command                                     | Writes                                    | Status                                         |
| ------------------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| `scan [--path .] [--json]`                  | nothing                                   | **default**, Phase 1                           |
| `init [--path .] [--skip-index] [--force]`  | `.agent-kit/config.json`, `snapshot.json` | existing; will grow into setup in later phases |
| `index [--path .]`                          | `.agent-kit/snapshot.json`                | existing                                       |
| `status [--path .]`                         | nothing                                   | existing; becomes readiness view in Phase 9    |
| `report [--path .] [--format …] [--stdout]` | `.agent-kit/reports/*`                    | **deprecated** → `scan`                        |

Planned (not implemented): `doctor`, `enhance`, `sync`, `diff`, `verify`,
`handoff`, `learn`, `agents`, `skills`, `rules`, `uninstall`, `onboard`, `explain`.

## Exit codes

| Code | Meaning                        |
| ---- | ------------------------------ |
| 0    | Success                        |
| 1    | Unexpected error               |
| 2    | Invalid input or project state |
| 3    | Permission denied              |
| 4    | Storage write failure          |
| 5    | Index or scan failure          |

Errors print `Error: <CODE>`, a message, and a suggested action.
