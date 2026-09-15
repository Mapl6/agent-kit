# Security Rules

- Never commit secrets, API keys, or credentials — use `.env` (see `.env.example`)
- Never log sensitive user data (PII, tokens, passwords)
- No `eval()`, no dynamic code execution from user input
- All external input must be validated/sanitized before use
- Dependencies: don't add new ones without checking for known CVEs
- Auth checks required on every new endpoint/route
- Never disable existing security middleware, linting, or CI checks to "make it pass"

> If an agent hits a wall because of a security rule, it should ask a human rather
> than work around the rule.
