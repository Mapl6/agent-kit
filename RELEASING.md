# Releasing

`@mapl6/agent-kit-core` and `@mapl6/agent-kit` are always released together at
the same version. Publishing is done by GitHub Actions
([`release.yml`](./.github/workflows/release.yml)) using
[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers): no npm
token lives in GitHub, and every release carries signed provenance.

## Cutting a release

```bash
git checkout main && git pull
git checkout -b release-3.1.0
npm run release:version -- 3.1.0     # bumps root, core, cli, cli's core dep, lockfile
# add a "## 3.1.0 — YYYY-MM-DD" section to CHANGELOG.md
npm run release:check                # full check + pack dry-run
git commit -am "Release 3.1.0" && git push -u origin release-3.1.0
gh pr create --fill                  # merge once CI is green
git checkout main && git pull
git tag v3.1.0 && git push origin v3.1.0
```

Pushing the tag runs the Release workflow, which:

1. refuses tags that aren't on `main`;
2. checks the tag against all three `package.json` versions, the CLI's core dependency and `CHANGELOG.md`;
3. runs `npm run check`;
4. publishes core, then the CLI, skipping any version already on npm (so a failed run can be re-run);
5. creates a GitHub Release with that version's CHANGELOG section.

## One-time setup (npm Trusted Publishing)

For **each** of `@mapl6/agent-kit-core` and `@mapl6/agent-kit`, on npmjs.com:
package page → **Settings** → **Trusted Publisher** → **GitHub Actions**:

| Field                | Value           |
| -------------------- | --------------- |
| Organization or user | `Mapl6`         |
| Repository           | `agent-kit`     |
| Workflow filename    | `release.yml`   |
| Environment          | _(leave empty)_ |

Then, under **Publishing access**, choose **"Require two-factor authentication
and disallow tokens"**. Trusted publishing keeps working, and leaked tokens
become useless.
