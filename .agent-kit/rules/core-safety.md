---
description: Safety invariants for core library code
paths:
  - "packages/core/src/**/*.ts"
---

# Safety invariants for core library code

- Detectors read repository files only through `ScanContext` (`scanner/context.ts`). Never call `fs` from a detector.
- Agent Kit writes files only through the installer (`adapters/installer.ts`), which refuses symlinks and edits only inside `BEGIN/END AGENT-KIT` markers.
- Repository-derived names (paths, workspaces) reach agent instructions only through `safeCode()`. Never interpolate them as prose.
- Never execute project code: no subprocesses, no `import()` or `require()` of repository files.
- Output must be deterministic: no timestamps or absolute paths in `project.json`, `AGENTS.md` or other generated files.
- Every write path supports `--dry-run`, and every new behaviour gets a test, plus a golden file where output is generated.
