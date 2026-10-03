# ADR-002: `scan` is read-only and the default command

Status: Accepted · 2026-10-03

## Decision

`agent-kit scan` writes nothing, not even `.agent-kit/`, and runs when no
command is given. `init` is opt-in. `report` is deprecated in favour of `scan`.

## Reason

- The spec's first milestone is understanding the repo (`scan`), not configuring it.
- `npx @mapl6/agent-kit` in someone's repo should never modify it uninvited.
- A side-effect-free scan is safe in CI and in untrusted repos, and makes
  golden testing straightforward.

## Alternatives

- `init` as default: rejected. It writes on a bare invocation.
- No default (print help): workable, but a read-only scan is more useful as a
  first touch.

## Consequences

The text output ends with "Nothing was written." Any future default behaviour
must stay read-only.
