# Conventions

Beyond code style — naming and structural patterns for this frontend.

## File/folder naming
- Feature folders: `[e.g. /features/<feature-name>/{components,hooks,api}.ts]`
- Routes: `[e.g. app/<segment>/page.tsx]`
- Tests: `[e.g. Component.test.tsx next to source]`

## Environment naming
- Local / preview / production — [exact names used in CI]
- **Public (browser-safe):** prefix `[e.g. NEXT_PUBLIC_ / VITE_]` — see `.env.example`
- **Server-only:** never import into client components

## Design tokens
- Where tokens live: `[path]`
- How to add a token: `[steps]`

## Feature flags
- Where they live, how to add one, naming pattern: `[describe]`

## Versioning
- [SemVer / calendar] — bump location: `[package.json / CHANGELOG]`
