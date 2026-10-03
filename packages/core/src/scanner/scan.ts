import fs from "node:fs/promises";
import type { Detection, DetectionCategory } from "../domain/types.js";
import { DEFAULT_MAX_FILE_BYTES } from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import { discoverFiles, type DiscoveredEntry } from "../discovery/discover.js";
import { resolveProjectRoot } from "../discovery/root-safety.js";
import { createScanContext } from "./context.js";
import { resolveWorkspaces } from "./detectors/workspaces.js";
import { BUILT_IN_DETECTORS } from "./registry.js";
import { SCAN_SCHEMA_VERSION, type Detector, type ScanResult } from "./types.js";

export const CATEGORY_ORDER: readonly DetectionCategory[] = [
  "language",
  "runtime",
  "packageManager",
  "workspace",
  "framework",
  "testing",
  "tooling",
  "vcs",
  "ci",
  "agentConfig",
];

export type ScanOptions = {
  path: string;
  ignoreGlobs?: string[];
  maxFileBytes?: number;
  detectors?: readonly Detector[];
};

/** Read-only repository scan. Writes nothing and executes no project code. */
export async function scanProject(options: ScanOptions): Promise<ScanResult> {
  return (await discoverAndScan(options)).scan;
}

/** Shared by scan and analyze: one tree walk, wrapped in a stable error. */
export async function discoverAndScan(
  options: ScanOptions,
): Promise<{ scan: ScanResult; entries: DiscoveredEntry[] }> {
  const root = await resolveProjectRoot(options.path);
  try {
    const entries = await discoverFiles({
      projectRoot: root,
      ignoreGlobs: options.ignoreGlobs ?? [],
      maxFileBytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
    });
    return { scan: await scanEntries(root, entries, options.detectors), entries };
  } catch (cause) {
    if (AppError.isAppError(cause)) throw cause;
    throw new AppError({
      code: "SCAN_FAILED",
      message: "Scanning failed unexpectedly.",
      suggestedAction: "Check directory permissions and re-run `agent-kit scan`.",
      cause,
    });
  }
}

/** Run detectors over an already-discovered file list (shared with the indexer). */
export async function scanEntries(
  root: string,
  entries: readonly DiscoveredEntry[],
  detectors: readonly Detector[] = BUILT_IN_DETECTORS,
): Promise<ScanResult> {
  const warnings: string[] = [];
  const rootEntries = new Set(await fs.readdir(root).catch(() => [] as string[]));
  const rootCtx = createScanContext({ dir: ".", entries, rootEntries, warnings });
  const { members } = await resolveWorkspaces(rootCtx);

  const detections: Detection[] = [];
  for (const detector of detectors) {
    const locations = detector.scope === "repo" ? ["."] : [".", ...members];
    for (const location of locations) {
      const ctx =
        location === "."
          ? rootCtx
          : createScanContext({ dir: location, entries, rootEntries, warnings });
      for (const output of await detector.detect(ctx)) {
        detections.push({
          id: output.id,
          label: output.label,
          category: detector.category,
          confidence: output.confidence,
          source: { type: output.sourceType ?? "detected", detector: detector.id },
          evidence: output.evidence,
          location,
        });
      }
    }
  }

  detections.sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      (a.location === "." ? -1 : 0) - (b.location === "." ? -1 : 0) ||
      a.location.localeCompare(b.location),
  );

  // A project one or two folders down (not a declared workspace) is otherwise
  // invisible to package-scoped detectors; point the user at it.
  if (!rootCtx.exists("package.json")) {
    const nested = rootCtx.files
      .map((f) => f.relativePath)
      .filter((p) => p.endsWith("/package.json") && p.split("/").length <= 3)
      .map((p) => p.slice(0, -"/package.json".length))
      .sort();
    if (nested.length > 0) {
      const shown = nested.slice(0, 3).join(", ") + (nested.length > 3 ? ", …" : "");
      warnings.push(
        `No package.json at the root, but found nested projects (${shown}). Scan one with --path.`,
      );
    }
  }

  const skipped: Record<string, number> = {};
  for (const e of entries) {
    if (e.skippedReason) skipped[e.skippedReason] = (skipped[e.skippedReason] ?? 0) + 1;
  }

  return {
    schemaVersion: SCAN_SCHEMA_VERSION,
    root,
    stats: { files: entries.length, skipped },
    workspaces: members,
    detections,
    warnings,
  };
}
