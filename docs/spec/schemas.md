# Schemas

## ScanResult v1 (`agent-kit scan --json`)

```ts
type ScanResult = {
  schemaVersion: 1;
  root: string; // absolute path
  stats: {
    files: number; // entries discovered (ignored dirs excluded)
    skipped: Record<string, number>; // content not read, by reason: secret | symlink | max-file-bytes | …
  };
  workspaces: string[]; // repo-relative member dirs; [] if not a monorepo
  detections: Detection[]; // sorted by category, then root first, then location
  warnings: string[]; // e.g. conflicting lockfiles, unparsable package.json
};

type Detection = {
  id: string; // stable: "nextjs", "pnpm", "agents-md", …
  label: string; // display only
  category:
    | "language"
    | "runtime"
    | "packageManager"
    | "workspace"
    | "framework"
    | "testing"
    | "tooling"
    | "vcs"
    | "ci"
    | "agentConfig";
  confidence: "high" | "medium" | "low";
  source: { type: "detected" | "inferred"; detector: string };
  evidence: { kind: string; path?: string; detail?: string }[];
  location: string; // "." or workspace dir
};
```

Output contains no timestamps, so scanning the same tree twice gives identical
JSON. Adding fields is non-breaking; renaming/removing fields or changing an
`id` bumps `schemaVersion`.

### Confidence rules

| Evidence                                                       | Confidence | Source   |
| -------------------------------------------------------------- | ---------- | -------- |
| Dependency, lockfile, `package.json` key, source files present | high       | detected |
| Tool config file without a dependency                          | medium     | detected |
| Language manifest without source files                         | medium     | detected |
| Default with no direct evidence (npm with no lockfile)         | low        | inferred |

## Config v1 (`.agent-kit/config.json`) — unchanged

`schemaVersion`, `projectRoot`, `createdAt`, `updatedAt`, `ignoreGlobs`,
`maxFileBytes`, `followSymlinks: false`.

## Snapshot v1 (`.agent-kit/snapshot.json`)

Unchanged shape. `technologies` now holds `Detection` objects from the scanner.
Old snapshots stay readable: their entries just lack `source` and `location`
until the next `index`.

## Target `.agent-kit/` layout (later phases)

```
.agent-kit/
  config.json      canonical config (v2 adds agents, context budget, verification profile, security)
  project.json     project model (Phase 2)
  rules/ skills/ context/ memory/ verification/ policies/ adapters/
  state/           snapshot cache, current task, handoff, backups
```

Each piece lands with the phase that needs it, plus a v1 → v2 config migration.
