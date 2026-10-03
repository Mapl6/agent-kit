# Architecture

## Packages

| Package         | npm                     | Role                                            |
| --------------- | ----------------------- | ----------------------------------------------- |
| `packages/core` | `@mapl6/agent-kit-core` | All logic. No CLI, no console output.           |
| `packages/cli`  | `@mapl6/agent-kit`      | Commander CLI: parses args, calls core, prints. |

Target subsystems (scanner, intelligence, context, rules, skills, verification,
security, memory, adapters) live as **folders inside core** until one needs an
independent consumer. See [ADR-001](../decisions/ADR-001-single-core-package.md).

## Core modules today

```
core/src/
  discovery/   walk the tree: no symlink following, root-escape checks, secret paths, ignore rules
  scanner/     Detector contract, ScanContext, built-in detectors, scanProject(), text renderer
  indexer/     incremental content-hash snapshot (cache used by init/index)
  storage/     atomic JSON writes, .agent-kit paths, repositories
  domain/      shared types (Detection, Evidence, Confidence, config, snapshot)
  errors/      AppError, ErrorCode, exit codes
  intelligence/ project model: commands, directory roles, architecture, testing, git (Phase 2)
  adapters/    agent adapters, shared context renderer, managed-block markers, safe installer (Phase 3)
  rules/       rules and skills: loading, validation, frontmatter reader, conflict detection (Phase 4)
  application/ use cases behind scan / init / index / status
```

## Scan pipeline

```
resolveProjectRoot      reject missing / non-directory / symlinked roots
      ↓
discoverFiles           metadata only; marks secrets, symlinks, oversized files
      ↓
createScanContext       the only file access detectors get (see security.md)
      ↓
resolveWorkspaces       package.json "workspaces" + pnpm-workspace.yaml
      ↓
detectors               repo-scoped once at "."; package-scoped at "." and each workspace
      ↓
ScanResult              sorted, deterministic, JSON-serialisable
```

### Detector contract

```ts
interface Detector {
  id: string;
  category: DetectionCategory;
  scope: "repo" | "package";
  detect(ctx: ScanContext): Promise<DetectorOutput[]>;
}
```

Detectors are pure functions of `ScanContext`. They never call `fs`, spawn
processes or use the network. Add one by writing it and listing it in
`scanner/registry.ts`; frameworks/testing/tooling are rows in
`scanner/detectors/table.ts`.

## Project model (Phase 2)

```
ScanResult (facts) + discovered files
      ↓
intelligence/commands   package.json scripts → install/dev/build/test/e2e/lint/typecheck/format;
                        tool present but no script → inferred fallback (e.g. `pnpm exec tsc --noEmit`)
intelligence/structure  top-level and src/ directories → roles (name + file-pattern evidence);
                        architecture signals (App Router, feature modules, UI/service/state layers, monorepo)
intelligence/testing    test file patterns and placement (colocated / separate / mixed)
intelligence/git        hooks, commit convention, CI, PR template, CODEOWNERS (never reads .git/)
      ↓
ProjectModel            .agent-kit/project.json, deterministic, no absolute paths
```

The scanner never imports intelligence. `application/analyze-project.ts`
composes them. See [ADR-003](../decisions/ADR-003-project-model-is-generated.md).

## Agent adapters (Phase 3)

```
ProjectModel
      ↓
adapters/context    renderProjectContext(): one concise Markdown context
      ↓
adapters/registry   AgentAdapter per agent: mode, capabilities (with doc links), detect(), targets()
      ↓
adapters/installer  plan: probe each target without following symlinks, then
                    create / replace block / append block / skip / conflict;
                    removals for adapters no longer enabled
      ↓
apply               backups → atomic writes → install manifest → re-index
```

Adapters are pure: they return _targets_ (path + block body). Only the
installer touches the filesystem, so every safety rule lives in one place.
See [ADR-004](../decisions/ADR-004-agents-md-is-the-canonical-output.md).

## Precedence (for later phases)

Developer decision > project rule > generated recommendation > automatic
inference. Conflicts between sources are surfaced, never silently resolved.

## Planned `.agent-kit/` layout

Today `.agent-kit/` holds `config.json`, `snapshot.json` and `project.json`. The
target layout (manifest, project model, rules, skills, memory, state, …) is
introduced phase by phase, with a migration for existing config at that time.
See [schemas.md](./schemas.md).
