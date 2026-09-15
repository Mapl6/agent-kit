# Example: A Good PR Description

```
## What
Adds pagination to the /api/users endpoint.

## Why
The endpoint was returning all users unbounded, causing slow responses
as the table grew (see ADR-004).

## How
- Added `page` and `pageSize` query params, defaulting to 1 / 20
- Added tests for boundary conditions (page 0, page beyond range)
- Updated api-reference.md

## Testing
- `npm test` passes
- Manually verified against local DB with 500+ seeded users
```

**Why this is good:** states what/why/how/testing separately, links the relevant
ADR instead of re-explaining context, and is skimmable in under 30 seconds.
