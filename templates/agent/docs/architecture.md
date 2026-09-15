# Architecture

## High-level overview
[1–2 paragraphs: e.g. "Vite + React SPA with a BFF" or "Next.js App Router
frontend talking to external APIs, deployed on…"]

## Folder map
```
/src or /app     ← routes, pages, layouts
/components      ← shared UI primitives
/features        ← feature folders (components, hooks, api)
/lib or /utils   ← shared helpers
/agent           ← this AI instruction kit
```

## Key components
- **[App shell / layout]** — [where it lives]
- **[Routing]** — [App Router / Pages / React Router — path]
- **[Data fetching]** — [React Query / server loaders / fetch wrappers]
- **[Design system]** — [tokens, component library path]

## Data flow
[Briefly: user action → UI → client data layer → API → UI state. Link a diagram if you have one.]

## External dependencies
- [CDN / analytics / auth provider] — [purpose]
- [API / CMS] — [purpose]

## Related docs
- UI details: `/agent/docs/ui-architecture.md`
- Client/API shapes: `/agent/docs/client-data.md`
- Decisions: `/agent/docs/decisions.md`
