export const SNAPSHOT_SCHEMA_VERSION = 1 as const;
export const CONFIG_SCHEMA_VERSION = 1 as const;
export const AGENT_KIT_DIR = ".agent-kit";
export const DEFAULT_MAX_FILE_BYTES = 1_048_576; // 1 MiB metadata read cap

export type Confidence = "high" | "medium" | "low";

export type Evidence = {
  kind: string;
  path?: string;
  detail?: string;
};

export type DetectionCategory =
  | "language"
  | "runtime"
  | "packageManager"
  | "workspace"
  | "framework"
  | "testing"
  | "tooling"
  | "vcs"
  | "ci"
  | "agentConfig";

/**
 * Where a detection came from. `detected` = read directly from a file or
 * manifest; `inferred` = a reasonable guess with no direct evidence.
 */
export type DetectionSource = {
  type: "detected" | "inferred";
  detector: string;
};

export type Detection = {
  id: string;
  label: string;
  category: DetectionCategory;
  confidence: Confidence;
  source: DetectionSource;
  evidence: Evidence[];
  /** Repo-relative directory the detection applies to ("." for the root). */
  location: string;
};

/** @deprecated Use `Detection`. Kept so existing snapshots and callers still type-check. */
export type TechnologySignal = Detection;

export type FileKind =
  "source" | "config" | "lockfile" | "document" | "asset" | "secret" | "ignored" | "other";

export type IndexedFile = {
  path: string;
  kind: FileKind;
  sizeBytes: number;
  mtimeMs: number;
  contentHash: string | null;
  skippedReason?: string;
};

export type ProjectConfig = {
  schemaVersion: typeof CONFIG_SCHEMA_VERSION;
  projectRoot: string;
  createdAt: string;
  updatedAt: string;
  ignoreGlobs: string[];
  maxFileBytes: number;
  followSymlinks: false;
};

export type ProjectSnapshot = {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  projectRoot: string;
  createdAt: string;
  updatedAt: string;
  contentHash: string;
  files: IndexedFile[];
  technologies: TechnologySignal[];
  stats: {
    fileCount: number;
    indexedCount: number;
    skippedCount: number;
    totalBytes: number;
  };
};

export type IndexResult = {
  snapshot: ProjectSnapshot;
  created: boolean;
  changed: boolean;
  added: number;
  removed: number;
  updated: number;
};

export type ProjectStatus = {
  initialized: boolean;
  projectRoot: string;
  configPath: string | null;
  snapshotPath: string | null;
  lastIndexedAt: string | null;
  fileCount: number;
  technologies: TechnologySignal[];
};

export type ReportFormat = "markdown" | "json";

export type ProjectReport = {
  format: ReportFormat;
  body: string;
  onboardingPrompt: string;
};
