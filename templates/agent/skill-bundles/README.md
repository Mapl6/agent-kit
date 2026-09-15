# Skill bundles

YAML aliases that group skills for a common job. Not a runtime — agents read the
bundle file, then load each listed `SKILL.md` when needed.

Example: `frontend-release.yaml` → debugging → dogfood → a11y → deploy.

Add your own bundles under this folder when a multi-skill workflow repeats.
