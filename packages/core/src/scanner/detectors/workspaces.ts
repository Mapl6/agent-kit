import path from "node:path";
import type { Evidence } from "../../domain/types.js";
import { simpleGlobMatch } from "../../discovery/ignore.js";
import { readPackageJson } from "../package-json.js";
import type { Detector, ScanContext } from "../types.js";

export type WorkspaceInfo = {
  /** Member package directories, repo-relative, sorted. */
  members: string[];
  evidence: Evidence[];
};

/**
 * Minimal reader for the `packages:` list in pnpm-workspace.yaml. Handles the
 * block-list form pnpm documents; anything else yields no patterns (and a warning).
 */
export function parsePnpmWorkspacePatterns(yaml: string): string[] {
  const patterns: string[] = [];
  let inPackages = false;
  for (const line of yaml.split(/\r?\n/)) {
    if (/^packages\s*:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    if (/^\S/.test(line)) break;
    const match = /^\s*-\s*(['"]?)([^'"#]+?)\1\s*(#.*)?$/.exec(line);
    if (match?.[2]) patterns.push(match[2].trim());
  }
  return patterns;
}

function normalizePattern(pattern: string): string {
  return pattern.replace(/^\.\//, "").replace(/\/+$/, "");
}

export async function resolveWorkspaces(ctx: ScanContext): Promise<WorkspaceInfo> {
  const patterns: string[] = [];
  const evidence: Evidence[] = [];

  const pkg = await readPackageJson(ctx);
  const pkgPatterns = Array.isArray(pkg?.workspaces) ? pkg.workspaces : pkg?.workspaces?.packages;
  if (Array.isArray(pkgPatterns) && pkgPatterns.length > 0) {
    patterns.push(...pkgPatterns.filter((p): p is string => typeof p === "string"));
    evidence.push({
      kind: "package-key",
      path: "package.json",
      detail: `workspaces: ${pkgPatterns.join(", ")}`,
    });
  }

  const pnpmYaml = await ctx.readText("pnpm-workspace.yaml");
  if (pnpmYaml !== null) {
    const pnpmPatterns = parsePnpmWorkspacePatterns(pnpmYaml);
    if (pnpmPatterns.length === 0) {
      ctx.warn("pnpm-workspace.yaml found but no `packages:` list could be read.");
    } else {
      patterns.push(...pnpmPatterns);
      evidence.push({
        kind: "file",
        path: "pnpm-workspace.yaml",
        detail: `packages: ${pnpmPatterns.join(", ")}`,
      });
    }
  }

  if (patterns.length === 0) return { members: [], evidence };

  const include = patterns.filter((p) => !p.startsWith("!")).map(normalizePattern);
  const exclude = patterns
    .filter((p) => p.startsWith("!"))
    .map((p) => normalizePattern(p.slice(1)));

  const members = ctx.files
    .filter(
      (f) =>
        path.posix.basename(f.relativePath) === "package.json" && f.relativePath !== "package.json",
    )
    .map((f) => path.posix.dirname(f.relativePath))
    .filter(
      (dir) =>
        include.some((p) => simpleGlobMatch(dir, p)) &&
        !exclude.some((p) => simpleGlobMatch(dir, p)),
    )
    .sort();

  if (members.length === 0) {
    ctx.warn(`Workspace patterns (${include.join(", ")}) matched no package directories.`);
  }
  return { members, evidence };
}

export const workspaceDetector: Detector = {
  id: "workspaces",
  category: "workspace",
  scope: "repo",
  async detect(ctx) {
    const { members, evidence } = await resolveWorkspaces(ctx);
    if (evidence.length === 0) return [];
    return [
      {
        id: "workspaces",
        label: `Workspaces (${members.length} package${members.length === 1 ? "" : "s"})`,
        confidence: "high",
        evidence: [...evidence, ...members.map((m) => ({ kind: "workspace", path: m }))],
      },
    ];
  },
};
