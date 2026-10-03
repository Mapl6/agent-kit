import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  JsonConfigRepository,
  JsonSnapshotRepository,
  initProject,
  isSecretPath,
} from "@mapl6/agent-kit-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(here, "../../../fixtures");

const tmpDirs: string[] = [];
/** init writes .agent-kit/, so run it against a copy rather than the committed fixture. */
function copyFixture(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `agent-kit-${name}-`));
  tmpDirs.push(dir);
  fs.cpSync(path.join(fixtures, name), dir, { recursive: true });
  return dir;
}
afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

describe("fixture projects", () => {
  const deps = {
    configs: new JsonConfigRepository(),
    snapshots: new JsonSnapshotRepository(),
  };

  it("detects vite-react fixture technologies", async () => {
    const result = await initProject({ path: copyFixture("vite-react") }, deps);
    const ids = result.index?.snapshot.technologies.map((t) => t.id) ?? [];
    expect(ids).toEqual(expect.arrayContaining(["vite", "react", "vitest", "typescript"]));
  });

  it("indexes with-secrets fixture without hashing .env", async () => {
    expect(isSecretPath(".env")).toBe(true);
    const result = await initProject({ path: copyFixture("with-secrets") }, deps);
    const env = result.index?.snapshot.files.find((f) => f.path === ".env");
    expect(env?.kind).toBe("secret");
    expect(env?.contentHash).toBeNull();
    expect(env?.skippedReason).toBe("secret");
  });
});
