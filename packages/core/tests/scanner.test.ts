import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  parsePnpmWorkspacePatterns,
  renderScanText,
  scanProject,
  type ScanResult,
} from "../src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(here, "../../../fixtures");
const goldenDir = path.join(here, "golden");
const UPDATE = process.env.UPDATE_GOLDEN === "1";

const tmpDirs: string[] = [];
function makeTempProject(files: Record<string, string>): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agent-kit-scan-")));
  tmpDirs.push(dir);
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body, "utf8");
  }
  return dir;
}
afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

function listTree(dir: string): string[] {
  return (fs.readdirSync(dir, { recursive: true }) as string[]).map(String).sort();
}

const ids = (r: ScanResult) => r.detections.map((d) => `${d.location}:${d.id}`);

describe("scan golden output", () => {
  const names = [
    "nextjs",
    "monorepo",
    "ai-configured",
    "vite-react",
    "plain-node",
    "with-secrets",
    "unknown",
    "react-features",
  ];

  for (const name of names) {
    it(`matches golden for ${name}`, async () => {
      const root = path.join(fixtures, name);
      const before = listTree(root);
      const result = await scanProject({ path: root });
      expect(listTree(root)).toEqual(before); // scan is read-only

      const json = JSON.stringify({ ...result, root: "<root>" }, null, 2) + "\n";
      const goldenPath = path.join(goldenDir, `${name}.scan.json`);
      if (UPDATE) {
        fs.mkdirSync(goldenDir, { recursive: true });
        fs.writeFileSync(goldenPath, json);
      }
      expect(fs.existsSync(goldenPath), `missing ${goldenPath}; run UPDATE_GOLDEN=1 npm test`).toBe(
        true,
      );
      expect(json).toBe(fs.readFileSync(goldenPath, "utf8"));
    });
  }
});

describe("scan detection", () => {
  it("detects Next.js stack with independent framework entries", async () => {
    const r = await scanProject({ path: path.join(fixtures, "nextjs") });
    expect(ids(r)).toEqual(
      expect.arrayContaining([
        ".:typescript",
        ".:pnpm",
        ".:nextjs",
        ".:react",
        ".:playwright",
        ".:eslint",
        ".:prettier",
        ".:github-actions",
      ]),
    );
    expect(r.workspaces).toEqual([]);
  });

  it("resolves pnpm workspaces, honours negations, and scans each member", async () => {
    const r = await scanProject({ path: path.join(fixtures, "monorepo") });
    expect(r.workspaces).toEqual(["apps/api", "apps/web", "packages/ui"]);
    expect(ids(r)).toEqual(
      expect.arrayContaining([
        "apps/web:vite",
        "apps/web:react",
        "apps/web:vitest",
        "apps/api:express",
        "apps/api:jest",
        "packages/ui:react",
        ".:prettier",
      ]),
    );
    expect(ids(r)).not.toContain("packages/private-tools:vue");
    expect(r.detections.find((d) => d.id === "pnpm")?.evidence.map((e) => e.kind)).toEqual([
      "package-key",
      "lockfile",
    ]);
  });

  it("reports AI agent config presence without reading its content", async () => {
    const r = await scanProject({ path: path.join(fixtures, "ai-configured") });
    const agentIds = r.detections.filter((d) => d.category === "agentConfig").map((d) => d.id);
    expect([...agentIds].sort()).toEqual([
      "agents-dir",
      "agents-md",
      "claude-dir",
      "claude-md",
      "copilot-instructions",
      "cursor-dir",
      "cursorrules",
      "mcp-config",
    ]);
    expect(r.detections.find((d) => d.id === "agents-md")?.evidence.map((e) => e.path)).toEqual([
      "AGENTS.md",
      "src/AGENTS.md",
    ]);
  });

  it("marks npm without a lockfile as inferred, low confidence", async () => {
    const r = await scanProject({ path: path.join(fixtures, "plain-node") });
    const pm = r.detections.find((d) => d.category === "packageManager");
    expect(pm).toMatchObject({ id: "npm", confidence: "low", source: { type: "inferred" } });
    expect(renderScanText(r)).toContain("~ npm");
  });

  it("detects non-JS languages and nothing JS-specific in a Python repo", async () => {
    const r = await scanProject({ path: path.join(fixtures, "unknown") });
    expect(ids(r)).toEqual([".:python"]);
  });

  it("warns on conflicting lockfiles and unparsable package.json", async () => {
    const conflict = makeTempProject({
      "package.json": "{}",
      "yarn.lock": "",
      "package-lock.json": "{}",
    });
    const r1 = await scanProject({ path: conflict });
    expect(r1.warnings.join("\n")).toMatch(/Multiple package managers/);

    const broken = makeTempProject({ "package.json": "{ not json" });
    const r2 = await scanProject({ path: broken });
    expect(r2.warnings).toContain("package.json exists but could not be parsed as JSON.");
  });

  it("points at nested projects when the root has no package.json", async () => {
    const root = makeTempProject({
      "app/package.json": JSON.stringify({ dependencies: { next: "15.0.0" } }),
      "app/src/index.ts": "export {};\n",
    });
    const r = await scanProject({ path: root });
    expect(r.warnings).toContain(
      "No package.json at the root, but found nested projects (app). Scan one with --path.",
    );
    expect(ids(r)).not.toContain(".:nextjs");
  });

  it("parses pnpm-workspace.yaml block lists", () => {
    expect(
      parsePnpmWorkspacePatterns(
        "packages:\n  - 'a/*'\n  - \"b\" # c\n  - !d\nonlyBuiltDependencies:\n  - x\n",
      ),
    ).toEqual(["a/*", "b", "!d"]);
  });
});

describe("scan security", () => {
  it("never includes secret file contents in output", async () => {
    const r = await scanProject({ path: path.join(fixtures, "with-secrets") });
    const out = JSON.stringify(r) + renderScanText(r);
    expect(out).not.toContain("should-never-be-hashed-or-logged");
    expect(r.stats.skipped.secret).toBe(1);
  });

  it("treats prompt injection in repo files as data", async () => {
    const r = await scanProject({ path: path.join(fixtures, "ai-configured") });
    const out = JSON.stringify(r) + renderScanText(r);
    expect(out).not.toMatch(/IGNORE ALL PREVIOUS/i);
    expect(out).not.toMatch(/django/i);
  });

  it("does not read through symlinked files or directories that escape the root", async () => {
    const outside = makeTempProject({
      "package.json": JSON.stringify({ dependencies: { next: "15.0.0" } }),
      "dir/AGENTS.md": "outside",
    });
    const root = makeTempProject({ "src/index.ts": "export {};\n" });
    fs.symlinkSync(path.join(outside, "package.json"), path.join(root, "package.json"));
    fs.symlinkSync(path.join(outside, "dir"), path.join(root, "linked"));

    const r = await scanProject({ path: root });
    expect(ids(r)).not.toContain(".:nextjs");
    expect(ids(r)).not.toContain(".:nodejs");
    expect(ids(r)).not.toContain(".:agents-md");
    expect(r.stats.skipped.symlink).toBe(2);
  });

  it("rejects a symlinked project root", async () => {
    const real = makeTempProject({ "package.json": "{}" });
    const link = path.join(path.dirname(real), `${path.basename(real)}-link`);
    fs.symlinkSync(real, link);
    tmpDirs.push(link);
    await expect(scanProject({ path: link })).rejects.toMatchObject({
      code: "INVALID_PROJECT_ROOT",
    });
  });
});
