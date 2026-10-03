# ADR-001: One core package with internal module boundaries

Status: Accepted · 2026-10-03

## Decision

Keep two workspace packages, `@mapl6/agent-kit-core` and `@mapl6/agent-kit`.
The subsystems in the product spec (scanner, intelligence, context, rules,
skills, verification, security, memory, adapters) are folders inside core.

## Reason

Only scanner code exists today. Fourteen packages would mean fourteen
package.json/tsconfig/publish units with a single consumer each, and lockstep
version bumps across all of them. Folder boundaries give the same separation
for now.

## Revisit when

A module needs an independent consumer or release cadence. The likely first
case is adapters, which third parties may implement. Extract it then.

## Also decided

Core and CLI are versioned in lockstep, and the CLI depends on the exact same core version.
