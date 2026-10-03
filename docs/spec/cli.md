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

| Command                                                                      | Writes                                     | Notes                                                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `scan [--path .] [--json \| --model]`                                        | nothing                                    | **Default.** Detections + project model. `--json`: ScanResult. `--model`: ProjectModel.                          |
| `init [--agents <list>] [--no-agents] [--skip-index] [--force] [--dry-run]`  | `.agent-kit/`, agent files                 | Indexes, writes the model, and sets up agents (default: AGENTS.md + agents detected in the repo).                |
| `sync [--agents <list>] [--dry-run]`                                         | `.agent-kit/`, agent files                 | Re-index and regenerate agent files. `--agents` replaces the enabled set; disabled adapters' blocks are removed. |
| `agents [--json]`                                                            | nothing                                    | Each adapter: enabled, mode (native / import / translated), capabilities, doc sources.                           |
| `rules [--json]` / `rules new <id> [--paths <globs>] [--description <text>]` | `.agent-kit/rules/` (new only)             | List rules and where each is installed; scaffold a rule. Invalid rules exit 2.                                   |
| `skills [--json]` / `skills new <name>` / `skills approve <name>`            | `.agent-kit/`                              | List skills with review status; scaffold; approve a skill's executable files at their current content.           |
| `conflicts [--json] [--ci]`                                                  | nothing                                    | Instructions that contradict the repo or each other. `--ci` exits 2 when any are found.                          |
| `index [--dry-run]`                                                          | `.agent-kit/snapshot.json`, `project.json` | Model only; doesn't touch agent files.                                                                           |
| `status`                                                                     | nothing                                    | Becomes the readiness view in Phase 9.                                                                           |
| `uninstall [--keep-data] [--dry-run]`                                        | removes                                    | Strips every Agent Kit block (files restored byte-for-byte), deletes files it created, then `.agent-kit/`.       |

Every command takes `--path <dir>`. Writing commands list each file as
create / update / unchanged / remove block / delete / skip / CONFLICT, with a
reason. Agent names: `agents-md` (always on), `claude-code` (alias `claude`),
`cursor`, `codex`, `copilot`.

A CONFLICT (malformed markers, symlink, non-file, file over 1 MiB) means that
file was left untouched. The command still applies everything else and exits
with code 2.

Planned (not implemented): `doctor`, `enhance`, `diff`, `verify`, `handoff`,
`learn`, `onboard`, `explain`.

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
