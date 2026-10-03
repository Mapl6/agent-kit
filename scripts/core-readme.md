# @mapl6/agent-kit-core

Core library behind [Agent Kit](https://github.com/Mapl6/agent-kit), the project intelligence layer for AI coding agents.

Most people want the CLI instead: [`@mapl6/agent-kit`](https://www.npmjs.com/package/@mapl6/agent-kit).

```ts
import { analyzeProject } from "@mapl6/agent-kit-core";

const { scan, model } = await analyzeProject({ path: "." });
console.log(model.packages[0]?.commands); // install / build / test / lint / typecheck …
```

- `scanProject({ path })` returns a `ScanResult`: detections with evidence and detected/inferred source.
- `analyzeProject({ path })` returns `{ scan, model }`, the `ProjectModel` that is written to `.agent-kit/project.json`.

Read-only, offline, and never executes project code. Schemas: [docs/spec/schemas.md](https://github.com/Mapl6/agent-kit/blob/main/docs/spec/schemas.md). MIT licensed.
