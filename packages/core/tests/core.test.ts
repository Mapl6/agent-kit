import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AppError,
  ExitCode,
  JsonConfigRepository,
  JsonSnapshotRepository,
  classifyFile,
  discoverFiles,
  formatCliError,
  getProjectStatus,
  indexProject,
  initProject,
  isSecretPath,
  toExitCode,
} from "../src/index.js";

const tmpDirs: string[] = [];

function makeTempProject(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-kit-"));
  tmpDirs.push(dir);
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body, "utf8");
  }
  return dir;
}

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("errors and exit codes", () => {
  it("maps ErrorCodes to stable exit codes", () => {
    expect(new AppError({ code: "PROJECT_NOT_FOUND", message: "x" }).exitCode).toBe(
      ExitCode.INVALID_INPUT,
    );
    expect(new AppError({ code: "PERMISSION_DENIED", message: "x" }).exitCode).toBe(
      ExitCode.PERMISSION,
    );
    expect(new AppError({ code: "STORAGE_WRITE_FAILED", message: "x" }).exitCode).toBe(
      ExitCode.STORAGE,
    );
    expect(new AppError({ code: "INDEX_FAILED", message: "x" }).exitCode).toBe(ExitCode.INDEX);
    expect(toExitCode(new Error("boom"))).toBe(ExitCode.GENERAL);
  });

  it("formats errors for CLI scripts", () => {
    const text = formatCliError(
      new AppError({
        code: "PROJECT_NOT_FOUND",
        message: "The specified project root does not exist.",
        suggestedAction: "Check the path and run the command again.",
      }),
    );
    expect(text).toContain("Error: PROJECT_NOT_FOUND");
    expect(text).toContain("Suggested action:");
  });
});

describe("security discovery", () => {
  it("classifies secrets and skips hashing them", async () => {
    expect(isSecretPath(".env")).toBe(true);
    expect(isSecretPath("secrets/token.pem")).toBe(true);
    expect(classifyFile(".env.local")).toBe("secret");

    const root = makeTempProject({
      "package.json": JSON.stringify({ name: "demo", dependencies: { react: "19.0.0" } }),
      ".env": "SECRET=do-not-log",
      "src/app.ts": "export const x = 1;\n",
    });

    const found = await discoverFiles({
      projectRoot: root,
      ignoreGlobs: [],
      maxFileBytes: 1_048_576,
    });
    const env = found.find((f) => f.relativePath === ".env");
    expect(env?.kind).toBe("secret");
    expect(env?.skipContent).toBe(true);
    expect(env?.skippedReason).toBe("secret");
  });

  it("does not follow symlinks", async () => {
    const root = makeTempProject({
      "package.json": JSON.stringify({ name: "sym" }),
      "real.txt": "hello",
    });
    const link = path.join(root, "link.txt");
    fs.symlinkSync(path.join(root, "real.txt"), link);

    const found = await discoverFiles({
      projectRoot: root,
      ignoreGlobs: [],
      maxFileBytes: 1_048_576,
    });
    const linked = found.find((f) => f.relativePath === "link.txt");
    expect(linked?.skippedReason).toBe("symlink");
  });
});

describe("init / index / status", () => {
  const deps = () => ({
    configs: new JsonConfigRepository(),
    snapshots: new JsonSnapshotRepository(),
  });

  it("initializes, indexes, and is idempotent on second index", async () => {
    const root = makeTempProject({
      "package.json": JSON.stringify({
        name: "vite-app",
        dependencies: { vite: "6.0.0", react: "19.0.0" },
        devDependencies: { vitest: "3.0.0" },
      }),
      "vite.config.ts": "export default {};\n",
      "src/main.tsx": "console.log('hi');\n",
    });

    const d = deps();
    const init = await initProject({ path: root }, d);
    expect(fs.existsSync(path.join(root, ".agent-kit", "config.json"))).toBe(true);
    expect(init.index?.snapshot.technologies.some((t) => t.id === "vite-react")).toBe(true);

    const first = await indexProject({ path: root }, d);
    const second = await indexProject({ path: root }, d);
    expect(second.changed).toBe(false);
    expect(second.snapshot.contentHash).toBe(first.snapshot.contentHash);

    const status = await getProjectStatus({ path: root }, d);
    expect(status.initialized).toBe(true);
    expect(status.fileCount).toBeGreaterThan(0);
  });

  it("rejects double init without --force", async () => {
    const root = makeTempProject({
      "package.json": JSON.stringify({ name: "plain" }),
    });
    const d = deps();
    await initProject({ path: root, skipIndex: true }, d);
    await expect(initProject({ path: root, skipIndex: true }, d)).rejects.toMatchObject({
      code: "ALREADY_INITIALIZED",
    });
  });

  it("fails clearly when project path is missing", async () => {
    const d = deps();
    await expect(initProject({ path: path.join(os.tmpdir(), "no-such-agent-kit-dir") }, d)).rejects.toMatchObject(
      {
        code: "PROJECT_NOT_FOUND",
      },
    );
  });
});
