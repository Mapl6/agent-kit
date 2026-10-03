import type { Confidence, Detection, DetectionCategory, Evidence } from "../domain/types.js";
import type { DiscoveredEntry } from "../discovery/discover.js";

export const SCAN_SCHEMA_VERSION = 1 as const;

/**
 * Read-only view of the repository handed to detectors. Paths are relative to
 * `dir`. Detectors must not touch the filesystem any other way: this is where
 * the secret / symlink / size guarantees are enforced.
 */
export type ScanContext = {
  /** Repo-relative directory this context is scoped to ("." for the root). */
  dir: string;
  /** Files under `dir`, paths relative to `dir`. */
  files: readonly DiscoveredEntry[];
  /** Names present directly in the repository root, including ignored ones such as `.git`. */
  rootEntries: ReadonlySet<string>;
  exists(relativePath: string): boolean;
  /** True if any file lives under `relativeDir/`. */
  hasDir(relativeDir: string): boolean;
  get(relativePath: string): DiscoveredEntry | undefined;
  /** Returns null for missing, secret, symlinked, oversized or unparsable files. */
  readJson<T>(relativePath: string): Promise<T | null>;
  readText(relativePath: string): Promise<string | null>;
  warn(message: string): void;
};

export type DetectorScope = "repo" | "package";

export type DetectorOutput = {
  id: string;
  label: string;
  confidence: Confidence;
  sourceType?: "detected" | "inferred";
  evidence: Evidence[];
};

export interface Detector {
  id: string;
  category: DetectionCategory;
  /** `repo` runs once at the root; `package` runs at the root and in every workspace. */
  scope: DetectorScope;
  detect(ctx: ScanContext): Promise<DetectorOutput[]>;
}

export type ScanStats = {
  files: number;
  skipped: Record<string, number>;
};

export type ScanResult = {
  schemaVersion: typeof SCAN_SCHEMA_VERSION;
  root: string;
  stats: ScanStats;
  /** Workspace package directories, repo-relative. Empty when not a monorepo. */
  workspaces: string[];
  detections: Detection[];
  warnings: string[];
};
