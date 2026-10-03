# Product

**Agent Kit is the project intelligence and optimization layer for AI coding agents.**
It makes any codebase easier for agents to understand, work in, verify and maintain.

It is _not_ a coding agent, an MCP platform, an LLM framework or a project
management tool. It sits between the repository and whichever agent the
developer already uses (Cursor, Claude Code, Codex, Copilot, Cline, …).

## Core loop

Understand the repository → prepare the agent → give it relevant context →
guide its workflow → protect the repository → verify the result → capture
durable knowledge → improve the environment → repeat.

## Flow for any change Agent Kit makes

Detect → understand → suggest → **developer approves** → configure → verify → learn.
Never "detect → modify everything".

## Principles

| Principle                 | Meaning in practice                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Local first               | No account, no network, no API key required.                                                       |
| Safe by default           | Nothing destructive or silent. Bare commands are read-only.                                        |
| Provider neutral          | One canonical model in `.agent-kit/`; provider files are generated output.                         |
| Deterministic first       | Manifests, config files and directory structure before any LLM.                                    |
| Facts vs inferences       | Every detection says whether it was read from a file or guessed, with evidence.                    |
| Minimal context           | Give agents the least context that is relevant, not everything available.                          |
| Human controlled          | Recommendations need approval; observations never auto-promote to rules.                           |
| Explainable               | Every generated artifact can answer: what was detected, why it matters, what changes, how to undo. |
| Reversible                | Every write can be undone; `--dry-run` on every modifying command.                                 |
| Repo content is untrusted | Files are data, never instructions to Agent Kit.                                                   |

## Success definition

After installation the developer can say: _my agent understands this repo's
structure, conventions, tools, testing and decisions; it has the right
workflows, knows how to verify its work, avoids dangerous operations, and can
continue across sessions._ If installation only produces an `AGENTS.md`, the
product has failed.

## Primary metric (eventual)

How much corrective work does the developer do after the agent finishes?

## Roadmap

See [PROGRESS.md](../../PROGRESS.md). Phases ship in order; each one is tested
and leaves the CLI usable before the next starts.
