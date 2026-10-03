// Copies the shared README and LICENSE into a workspace package before `npm pack`,
// so the npm page has docs. Copies are gitignored; the root files are the source.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = process.argv[2];
if (pkg !== "cli" && pkg !== "core") throw new Error(`Unknown package: ${pkg}`);
const target = path.join(root, "packages", pkg);

const readme =
  pkg === "cli"
    ? fs.readFileSync(path.join(root, "README.md"), "utf8")
    : fs.readFileSync(path.join(root, "scripts/core-readme.md"), "utf8");
fs.writeFileSync(path.join(target, "README.md"), readme);
fs.copyFileSync(path.join(root, "LICENSE"), path.join(target, "LICENSE"));
