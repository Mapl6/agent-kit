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

| Command                                                | Writes                                                    | Notes                                                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `scan [--path .] [--json \| --model]`                  | nothing                                                   | **Default.** Text: detections + project model. `--json`: ScanResult. `--model`: ProjectModel (what `index` would write). |
| `init [--path .] [--skip-index] [--force] [--dry-run]` | `.agent-kit/config.json`, `snapshot.json`, `project.json` | Lists each file as create / update / unchanged.                                                                          |
| `index [--path .] [--dry-run]`                         | `.agent-kit/snapshot.json`, `project.json`                | `project.json` is rewritten only when its content changes.                                                               |
| `status [--path .]`                                    | nothing                                                   | Becomes the readiness view in Phase 9.                                                                                   |

`report` was removed in 3.0.0. Use `scan`.

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
