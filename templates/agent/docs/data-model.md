# Domain / client models

Lightweight model notes for UI work. Full backend schema may live elsewhere —
link it if so: `[link to backend docs or Prisma schema]`.

## Types the UI cares about
### [e.g. User]
| Field | Type | UI notes |
|---|---|---|
| id | string | |
| [field] | [type] | [display / validation] |

### [Entity]
| Field | Type | UI notes |
|---|---|---|

## Relationships (UI-relevant)
- [Entity A] lists many [Entity B] on `[route]`
- [Entity B] detail loads `[related]`

## Forms & validation
- Library: `[zod / yup / other]`
- Shared schemas live in: `[path]`
