import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  JsonConfigRepository,
  JsonProjectModelRepository,
  JsonSnapshotRepository,
  analyzeProject,
  indexProject,
  initProject,
  renderAnalysisText,
  serializeProjectModel,
  type ProjectModel,
} from "../src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(here, "../../../fixtures");
const goldenDir = path.join(here, "golden");
const UPDATE = process.env.UPDATE_GOLDEN === "1";

const tmpDirs: string[] = [];
function makeTempProject(files: Record<string, string>): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agent-kit-model-")));
  tmpDirs.push(dir);
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body, "utf8");
  }
  return dir;
}
function copyFixture(name: string): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `agent-kit-${name}-`)));
  tmpDirs.push(dir);
  fs.cpSync(path.join(fixtures, name), dir, { recursive: true });
  return dir;
}
afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

const model = async (name: string): Promise<ProjectModel> =>
  (await analyzeProject({ path: path.join(fixtures, name) })).model;
const commands = (m: ProjectModel, location = ".") =>
  Object.fromEntries(
    (m.packages.find((p) => p.location === location)?.commands ?? []).map((c) => [
      c.task,
      `${c.source.type}:${c.command}`,
    ]),
  );
const roles = (m: ProjectModel) =>
  Object.fromEntries(m.structure.directories.map((d) => [d.path, d.role]));

describe("project model golden output", () => {
  const names = [
    "nextjs",
    "monorepo",
    "ai-configured",
    "react-features",
    "vite-react",
    "plain-node",
    "with-secrets",
    "unknown",
  ];
  for (const name of names) {
    it(`matches golden for ${name}`, async () => {
      const m = await model(name);
      const json = serializeProjectModel(m);
      expect(json).not.toContain(fixtures); // no absolute paths in a committable file
      const goldenPath = path.join(goldenDir, `${name}.model.json`);
      if (UPDATE) fs.writeFileSync(goldenPath, json);
      expect(fs.existsSync(goldenPath), `missing ${goldenPath}; run UPDATE_GOLDEN=1 npm test`).toBe(
        true,
      );
      expect(json).toBe(fs.readFileSync(goldenPath, "utf8"));
    });
  }
});

describe("commands", () => {
  it("prefers scripts, skips the npm placeholder test, and marks fallbacks inferred", async () => {
    const m = await model("react-features");
    expect(commands(m)).toEqual({
      install: "detected:yarn install",
      dev: "detected:yarn run dev",
      build: "detected:yarn run build",
      test: "inferred:yarn vitest run",
      typecheck: "detected:yarn run typecheck",
      format: "detected:yarn run format",
    });
  });

  it("uses the repo package manager inside each workspace", async () => {
    const m = await model("monorepo");
    expect(commands(m, "apps/web")).toEqual({ test: "inferred:pnpm exec vitest run" });
    expect(commands(m, "apps/api")).toEqual({ test: "inferred:pnpm exec jest" });
    expect(m.packages.find((p) => p.location === "apps/web")?.commands[0]?.cwd).toBe("apps/web");
  });

  it("has no commands for a repo without package.json", async () => {
    const m = await model("unknown");
    expect(m.packages).toEqual([{ location: ".", name: null, commands: [] }]);
    expect(m.project.name).toBe("unknown");
  });
});

describe("structure and architecture", () => {
  it("classifies directories with content-backed confidence", async () => {
    const m = await model("react-features");
    expect(roles(m)).toMatchObject({
      "src/components": "ui-components",
      "src/features": "feature-modules",
      "src/hooks": "hooks",
      "src/services": "services-api",
      "src/store": "state",
      public: "static-assets",
    });
    const hooks = m.structure.directories.find((d) => d.path === "src/hooks");
    expect(hooks).toMatchObject({ confidence: "high", source: { type: "inferred" } });
    expect(m.architecture.map((a) => a.id)).toEqual(
      expect.arrayContaining([
        "feature-modules",
        "shared-ui-layer",
        "service-layer",
        "state-layer",
      ]),
    );
  });

  it("recognises the Next.js App Router", async () => {
    const m = await model("nextjs");
    expect(roles(m)).toEqual({ app: "routes" });
    expect(m.architecture.map((a) => a.id)).toEqual(["nextjs-app-router"]);
  });

  it("marks workspace parents and reports the monorepo as detected", async () => {
    const m = await model("monorepo");
    expect(roles(m)).toMatchObject({ apps: "workspace-packages", packages: "workspace-packages" });
    expect(m.architecture[0]).toMatchObject({ id: "monorepo", source: { type: "detected" } });
  });
});

describe("testing and git", () => {
  it("detects colocated tests and their naming patterns", async () => {
    const t = (await model("react-features")).testing;
    expect(t).toMatchObject({
      testFiles: 4,
      placement: "colocated",
      patterns: [
        { pattern: "*.test.tsx", count: 3 },
        { pattern: "*.test.ts", count: 1 },
      ],
    });
  });

  it("detects separate test directories", async () => {
    const root = makeTempProject({
      "package.json": "{}",
      "src/a.ts": "",
      "tests/a.test.ts": "",
      "tests/b.test.ts": "",
    });
    const { model: m } = await analyzeProject({ path: root });
    expect(m.testing.placement).toBe("separate");
    expect(m.testing.directories).toEqual(["tests"]);
  });

  it("reports git conventions without reading .git", async () => {
    const m = await model("react-features");
    expect(m.git).toEqual({
      present: false,
      ignoreFile: true,
      hooks: ["husky"],
      commitConvention: "commitlint",
      ci: [],
      pullRequestTemplate: ".github/pull_request_template.md",
      codeowners: ".github/CODEOWNERS",
    });

    const root = makeTempProject({
      "package.json": "{}",
      ".git/config": '[remote "origin"]\n  url = https://secret-token@example.com/r.git\n',
    });
    const { scan, model: m2 } = await analyzeProject({ path: root });
    expect(m2.git.present).toBe(true);
    const out = serializeProjectModel(m2) + renderAnalysisText(scan, m2);
    expect(out).not.toContain("secret-token");
  });
});

describe("writing project.json", () => {
  const deps = () => ({
    configs: new JsonConfigRepository(),
    snapshots: new JsonSnapshotRepository(),
    models: new JsonProjectModelRepository(),
  });

  it("init --dry-run plans writes but touches nothing", async () => {
    const root = copyFixture("react-features");
    const result = await initProject({ path: root, dryRun: true }, deps());
    expect(result.writes).toEqual([
      { path: ".agent-kit/config.json", action: "create" },
      { path: ".agent-kit/snapshot.json", action: "create" },
      { path: ".agent-kit/project.json", action: "create" },
      { path: "AGENTS.md", action: "create" },
      { path: ".agent-kit/.gitignore", action: "create" },
    ]);
    expect(fs.existsSync(path.join(root, ".agent-kit"))).toBe(false);
  });

  it("init writes the model; re-index leaves it byte-identical", async () => {
    const root = copyFixture("react-features");
    const d = deps();
    await initProject({ path: root }, d);
    const file = path.join(root, ".agent-kit", "project.json");
    const first = fs.readFileSync(file, "utf8");
    expect(JSON.parse(first).$comment).toMatch(/Generated by Agent Kit/);

    const again = await indexProject({ path: root }, d);
    expect(again.writes.find((w) => w.path.endsWith("project.json"))?.action).toBe("unchanged");
    expect(fs.readFileSync(file, "utf8")).toBe(first);

    fs.writeFileSync(path.join(root, "src/hooks/useTheme.ts"), "export {};\n");
    const dry = await indexProject({ path: root, dryRun: true }, d);
    expect(dry.writes.find((w) => w.path.endsWith("project.json"))?.action).toBe("update");
    expect(fs.readFileSync(file, "utf8")).toBe(first); // dry run wrote nothing
  });
});
