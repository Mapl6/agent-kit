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
  application/ use cases behind init / index / status / report
  reports/     legacy Markdown/JSON report (deprecated with `report`)
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

## Precedence (for later phases)

Developer decision > project rule > generated recommendation > automatic
inference. Conflicts between sources are surfaced, never silently resolved.

## Planned `.agent-kit/` layout

Today `.agent-kit/` holds `config.json`, `snapshot.json` and `reports/`. The
target layout (manifest, project model, rules, skills, memory, state, …) is
introduced phase by phase, with a migration for existing config at that time.
See [schemas.md](./schemas.md).
