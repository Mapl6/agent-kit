# Coding Style Rules

- Language: [e.g. TypeScript 5.x, strict mode on]
- No `any` types / no untyped public APIs
- Prefer functional, composable code over deep class hierarchies
- Max function length: ~40 lines — split if longer
- File naming: kebab-case for files; PascalCase for components
- Components: one primary component per file; co-locate small helpers
- Styling: use project tokens / design system — no one-off hex/spacing when tokens exist
- No default exports (named exports only) — [adjust to your convention]
- Imports ordered: stdlib → third-party → internal → styles
- Client vs server: mark `"use client"` only when needed (RSC apps); keep browser APIs out of server components
- Comments explain *why*, not *what*

> Replace with your team's real conventions. Concrete beats vague.
