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

export type TechnologySignal = {
  id: string;
  label: string;
  category: "packageManager" | "runtime" | "framework" | "language" | "tooling" | "other";
  confidence: Confidence;
  evidence: Evidence[];
};

export type FileKind =
  | "source"
  | "config"
  | "lockfile"
  | "document"
  | "asset"
  | "secret"
  | "ignored"
  | "other";

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
