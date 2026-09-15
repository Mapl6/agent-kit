---
name: add-ui-page
description: Add a route or page with components and navigation.
version: 0.1.0
tags: [frontend, routing, pages, ui]
---

# Add a UI page

## When to Use

- Adding a new route/page/screen
- Wiring navigation to a new view
- Not for tiny copy edits on an existing page

## Prerequisites

- Read `/agent/docs/ui-architecture.md` for routing and folder conventions
- Know whether the app uses App Router, Pages Router, or Vite routes

## Procedure

1. Create the route file in `[e.g. app/<route>/page.tsx or src/pages/<route>.tsx]`
2. Build page UI from existing primitives in `[components path]` — avoid one-off styling
3. Add feature-specific components under `[features/<name>/]` if non-trivial
4. Wire navigation (links, sidebar, breadcrumbs) so the page is reachable
5. Handle loading / empty / error states intentionally
6. Add a smoke test or Storybook entry if the project uses them
7. Run lint/tests: `{{LINT_CMD}}`, `{{TEST_CMD}}`

## Pitfalls

- Hardcoding colors/spacing outside the design tokens
- Forgetting mobile layout or overflow
- Client components that should be server (or the reverse) in RSC apps

## Verification

- [ ] Route loads via direct URL and in-app navigation
- [ ] Empty/error states render
- [ ] Lint/tests pass
