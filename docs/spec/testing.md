# Testing

```bash
npm test                    # build + vitest
UPDATE_GOLDEN=1 npm test    # rewrite golden scan snapshots after an intended change
```

## Fixtures (`fixtures/`)

| Fixture          | Covers                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nextjs`         | Next.js + React together, pnpm, Playwright, ESLint, Prettier, GitHub Actions                                                                      |
| `monorepo`       | pnpm workspaces, `!` negation, per-package detection (Vite/React/Vitest, Express/Jest, peer deps)                                                 |
| `ai-configured`  | Every agent config surface, nested `AGENTS.md`, prompt-injection text in README/AGENTS.md                                                         |
| `react-features` | Feature modules, `use*` hooks, UI/service/state dirs, colocated tests, husky/commitlint/PR template/CODEOWNERS, npm placeholder test script, yarn |
| `vite-react`     | Vite + React + Vitest + TS                                                                                                                        |
| `plain-node`     | `package.json` only → npm _inferred_                                                                                                              |
| `with-secrets`   | `.env` never read or printed                                                                                                                      |
| `unknown`        | Python-only repo: no JS detections                                                                                                                |

Fixtures are read-only inputs. Tests that write (`init`, `index`) copy a fixture
to a temp dir first. The golden test checks that a scan leaves the fixture tree unchanged.

## Golden tests

`packages/core/tests/golden/<fixture>.scan.json` holds the exact `scan --json`
output with `root` normalised. `<fixture>.model.json` holds the exact project
model, which must contain no absolute paths. A missing golden fails the test; regenerate
deliberately with `UPDATE_GOLDEN=1` and review the diff.

## Security tests

Built at runtime in temp dirs: symlinked `package.json` and directory pointing
outside the root, symlinked root, conflicting lockfiles, unparsable
`package.json`.

## Real-repo validation

2026-10-03: five local repos (two Next.js apps, a Next/Storybook component
library, an unscaffolded TS folder, a project nested one level down). No false
detections. One gap was fixed: when the root has no `package.json`, nested
projects are now named in a warning. Still to do: public OSS repos (large
monorepo, Python, legacy JS).
