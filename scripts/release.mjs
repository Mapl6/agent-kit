// Release helpers. Core and CLI are always released together at one version.
//
//   node scripts/release.mjs version 3.1.0   bump root, core, cli, cli's core dependency and the lockfile
//   node scripts/release.mjs check v3.1.0    verify a tag matches every package version
//   node scripts/release.mjs notes 3.1.0     print that version's CHANGELOG section
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  root: path.join(root, "package.json"),
  core: path.join(root, "packages/core/package.json"),
  cli: path.join(root, "packages/cli/package.json"),
};
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

function fail(message) {
  console.error(`release: ${message}`);
  process.exit(1);
}

const [command, arg] = process.argv.slice(2);

if (command === "version") {
  if (!arg || !SEMVER.test(arg)) fail("usage: release.mjs version <x.y.z>");
  for (const file of Object.values(files)) {
    const pkg = read(file);
    pkg.version = arg;
    if (pkg.dependencies?.["@mapl6/agent-kit-core"])
      pkg.dependencies["@mapl6/agent-kit-core"] = arg;
    write(file, pkg);
  }
  // Keep package-lock.json in sync, or `npm ci` in the release workflow fails.
  execSync("npm install --package-lock-only --ignore-scripts", { cwd: root, stdio: "inherit" });
  console.log(
    `Set version ${arg}. Next: add a "## ${arg}" section to CHANGELOG.md, commit, merge to main, then tag v${arg}.`,
  );
} else if (command === "check") {
  const version = (arg ?? "").replace(/^v/, "");
  if (!SEMVER.test(version)) fail(`tag "${arg}" is not v<semver>`);
  const problems = [];
  for (const [name, file] of Object.entries(files)) {
    const v = read(file).version;
    if (v !== version) problems.push(`${name} package.json is ${v}`);
  }
  const dep = read(files.cli).dependencies?.["@mapl6/agent-kit-core"];
  if (dep !== version) problems.push(`cli depends on @mapl6/agent-kit-core ${dep}`);
  if (!fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8").includes(`## ${version}`)) {
    problems.push(`CHANGELOG.md has no "## ${version}" section`);
  }
  if (problems.length) fail(`tag v${version} does not match:\n  - ${problems.join("\n  - ")}`);
  console.log(`Release v${version} is consistent.`);
} else if (command === "notes") {
  const version = (arg ?? "").replace(/^v/, "");
  const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
  const start = changelog.search(new RegExp(`^## ${version.replace(/\./g, "\\.")}\\b.*$`, "m"));
  if (start === -1) fail(`no CHANGELOG section for ${version}`);
  const body = changelog.slice(start).split("\n").slice(1);
  const end = body.findIndex((line) => line.startsWith("## "));
  console.log((end === -1 ? body : body.slice(0, end)).join("\n").trim());
} else {
  fail("usage: release.mjs <version|check|notes> <arg>");
}
