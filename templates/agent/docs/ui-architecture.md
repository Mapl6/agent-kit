# UI architecture

Frontend structure for agents building pages and components.

## Routing
- Style: [App Router / Pages Router / React Router / other]
- Route files live in: `[path]`
- Layouts / nested routes: `[how]`

## Components
| Layer | Path | Rule |
|---|---|---|
| Primitives | `[e.g. components/ui]` | No feature business logic |
| Composed | `[e.g. components/]` | Reusable across features |
| Feature | `[e.g. features/<name>]` | Feature-specific UI + hooks |

## State
- Server/async state: `[React Query / SWR / RSC / other]`
- Local UI state: `[useState / Zustand / other]`
- URL state: `[search params conventions]`

## Styling
- Approach: `[Tailwind / CSS modules / styled-components / other]`
- Tokens / theme: `[path or DESIGN.md]`
- Dark mode: `[yes/no + how]`

## Patterns to prefer
- [e.g. compound components, colocated tests, storybook]
- Mobile-first layouts unless stated otherwise

## Patterns to avoid
- [e.g. prop-drilling across 4+ levels — lift or use context]
- Inline one-off colors when tokens exist
