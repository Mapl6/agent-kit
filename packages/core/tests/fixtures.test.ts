import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  JsonConfigRepository,
  JsonSnapshotRepository,
  initProject,
  isSecretPath,
} from "@mapl6/agent-kit-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(here, "../../../fixtures");

describe("fixture projects", () => {
  const deps = {
    configs: new JsonConfigRepository(),
    snapshots: new JsonSnapshotRepository(),
  };

  it("detects vite-react fixture technologies", async () => {
    const root = path.join(fixtures, "vite-react");
    const result = await initProject({ path: root, force: true }, deps);
    const ids = result.index?.snapshot.technologies.map((t) => t.id) ?? [];
    expect(ids).toContain("vite-react");
    expect(ids).toContain("vitest");
    expect(ids).toContain("typescript");
  });

  it("indexes with-secrets fixture without hashing .env", async () => {
    expect(isSecretPath(".env")).toBe(true);
    const root = path.join(fixtures, "with-secrets");
    const result = await initProject({ path: root, force: true }, deps);
    const env = result.index?.snapshot.files.find((f) => f.path === ".env");
    expect(env?.kind).toBe("secret");
    expect(env?.contentHash).toBeNull();
    expect(env?.skippedReason).toBe("secret");
  });
});
