# Client data layer

How the frontend talks to APIs and caches data. Prefer this over inventing new
fetch wrappers. (Replaces a backend-centric API bible for most UI work.)

## Client entrypoints
| Concern | Path / module | Notes |
|---|---|---|
| HTTP client | `[e.g. lib/api/client.ts]` | Auth headers, base URL |
| Feature API | `[e.g. features/<name>/api.ts]` | Typed calls for one feature |
| Hooks / queries | `[e.g. useXQuery]` | Cache keys, invalidation |

## Auth
- How tokens/cookies are attached: `[describe]`
- Where unauthenticated users redirect: `[path]`

## Error handling
- Shape of API errors: `[type or example]`
- User-facing toast/banner pattern: `[component]`

## Example shapes
### `GET [resource]`
```json
{ "example": "response shape" }
```

### `POST [resource]`
```json
{ "example": "request body" }
```

> If you maintain OpenAPI, link it here and generate types instead of hand-syncing.
