---
name: accessibility-pass
description: Keyboard, semantics, and contrast check for UI changes.
version: 0.1.0
tags: [frontend, a11y, accessibility]
---

# Accessibility pass

## When to Use

- After adding or changing interactive UI
- User asks for an a11y review
- Before shipping forms, modals, or navigation changes

## Procedure

1. **Semantics** — headings in order; buttons vs links correct; landmarks where needed
2. **Keyboard** — Tab order sane; Enter/Space activate controls; Esc closes overlays; focus visible
3. **Name & state** — icons have accessible names; errors announced; disabled vs busy clear
4. **Contrast** — text/icons meet project contrast bar (see design tokens / DESIGN.md if present)
5. **Motion** — respect reduced-motion when animations were added
6. Fix issues in place; note residual debt in `/agent/context/known-issues.md` if intentional

## Pitfalls

- `div` + onClick without keyboard support
- Removing focus outlines without a visible replacement
- Color-only error indication

## Verification

- [ ] Full flow completable by keyboard only
- [ ] No unlabeled icon-only controls in the changed UI
- [ ] Modals trap focus and restore it on close
