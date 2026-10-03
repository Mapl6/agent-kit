import type { Confidence, Detection, DetectionSource, Evidence } from "../domain/types.js";

export const PROJECT_MODEL_SCHEMA_VERSION = 1 as const;

export type CommandTask =
  "install" | "dev" | "build" | "start" | "test" | "e2e" | "lint" | "typecheck" | "format";

/** A command an agent can run. Agent Kit never runs these itself. */
export type ProjectCommand = {
  task: CommandTask;
  command: string;
  /** Repo-relative directory to run it from. */
  cwd: string;
  confidence: Confidence;
  source: DetectionSource;
  evidence: Evidence[];
};

export type PackageInfo = {
  location: string;
  name: string | null;
  commands: ProjectCommand[];
};

export type DirectoryRole =
  | "source-root"
  | "routes"
  | "application"
  | "ui-components"
  | "feature-modules"
  | "hooks"
  | "shared-utilities"
  | "services-api"
  | "state"
  | "types"
  | "styles"
  | "middleware"
  | "server"
  | "controllers"
  | "models"
  | "database"
  | "tests"
  | "e2e-tests"
  | "test-fixtures"
  | "static-assets"
  | "config"
  | "scripts-tooling"
  | "docs"
  | "workspace-packages";

export type DirectoryInfo = {
  /** Repo-relative directory path. */
  path: string;
  role: DirectoryRole;
  confidence: Confidence;
  source: DetectionSource;
  evidence: Evidence[];
  files: number;
};

export type ArchitectureSignal = {
  id: string;
  label: string;
  location: string;
  confidence: Confidence;
  source: DetectionSource;
  evidence: Evidence[];
};

export type TestingModel = {
  runners: Array<{ id: string; label: string; location: string }>;
  testFiles: number;
  patterns: Array<{ pattern: string; count: number }>;
  /** Where tests live relative to source. "none" when there are no test files. */
  placement: "colocated" | "separate" | "mixed" | "none";
  directories: string[];
};

export type GitModel = {
  present: boolean;
  ignoreFile: boolean;
  hooks: string[];
  commitConvention: string | null;
  ci: string[];
  pullRequestTemplate: string | null;
  codeowners: string | null;
};

/**
 * The project model: Agent Kit's canonical, provider-neutral description of a
 * repository, written to `.agent-kit/project.json`. Contains no absolute paths
 * and no timestamps, so it is stable and safe to commit.
 */
export type ProjectModel = {
  $comment: string;
  schemaVersion: typeof PROJECT_MODEL_SCHEMA_VERSION;
  project: {
    name: string | null;
    languages: string[];
    packageManager: string | null;
    frameworks: string[];
    monorepo: boolean;
  };
  packages: PackageInfo[];
  structure: {
    directories: DirectoryInfo[];
    unclassified: string[];
  };
  architecture: ArchitectureSignal[];
  testing: TestingModel;
  git: GitModel;
  detections: Detection[];
  warnings: string[];
};
