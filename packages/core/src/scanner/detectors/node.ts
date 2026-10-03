import type { Evidence } from "../../domain/types.js";
import { readPackageJson } from "../package-json.js";
import type { Detector, DetectorOutput } from "../types.js";

export const nodeRuntimeDetector: Detector = {
  id: "node-runtime",
  category: "runtime",
  scope: "repo",
  async detect(ctx) {
    const pkg = await readPackageJson(ctx);
    const evidence: Evidence[] = [];
    if (ctx.exists("package.json")) evidence.push({ kind: "file", path: "package.json" });
    if (pkg?.engines?.node) {
      evidence.push({
        kind: "package-key",
        path: "package.json",
        detail: `engines.node ${pkg.engines.node}`,
      });
    }
    for (const file of [".nvmrc", ".node-version"]) {
      if (ctx.exists(file)) evidence.push({ kind: "file", path: file });
    }
    if (evidence.length === 0) return [];
    return [{ id: "nodejs", label: "Node.js", confidence: "high", evidence }];
  },
};

const LOCKFILES: Array<{ file: string; id: string; label: string }> = [
  { file: "pnpm-lock.yaml", id: "pnpm", label: "pnpm" },
  { file: "yarn.lock", id: "yarn", label: "Yarn" },
  { file: "package-lock.json", id: "npm", label: "npm" },
  { file: "npm-shrinkwrap.json", id: "npm", label: "npm" },
  { file: "bun.lock", id: "bun", label: "Bun" },
  { file: "bun.lockb", id: "bun", label: "Bun" },
];

const LABELS: Record<string, string> = { pnpm: "pnpm", yarn: "Yarn", npm: "npm", bun: "Bun" };

/**
 * Package manager from the `packageManager` field and root lockfiles. With
 * only a package.json, npm is *inferred* (low): nothing actually says so.
 */
export const packageManagerDetector: Detector = {
  id: "package-manager",
  category: "packageManager",
  scope: "repo",
  async detect(ctx) {
    const pkg = await readPackageJson(ctx);
    const found = new Map<string, DetectorOutput>();
    const add = (id: string, evidence: Evidence) => {
      const existing = found.get(id);
      if (existing) existing.evidence.push(evidence);
      else found.set(id, { id, label: LABELS[id] ?? id, confidence: "high", evidence: [evidence] });
    };

    const declared =
      typeof pkg?.packageManager === "string" ? pkg.packageManager.split("@")[0] : undefined;
    if (declared && LABELS[declared]) {
      add(declared, {
        kind: "package-key",
        path: "package.json",
        detail: `packageManager ${pkg?.packageManager}`,
      });
    }
    for (const lock of LOCKFILES) {
      if (ctx.exists(lock.file)) add(lock.id, { kind: "lockfile", path: lock.file });
    }

    if (found.size > 1) {
      ctx.warn(
        `Multiple package managers signalled (${[...found.keys()].join(", ")}). Agents may pick the wrong one; keep a single lockfile.`,
      );
    }
    if (found.size === 0 && pkg) {
      return [
        {
          id: "npm",
          label: "npm",
          confidence: "low",
          sourceType: "inferred",
          evidence: [
            {
              kind: "heuristic",
              path: "package.json",
              detail: "package.json without lockfile or packageManager field",
            },
          ],
        },
      ];
    }
    return [...found.values()];
  },
};
