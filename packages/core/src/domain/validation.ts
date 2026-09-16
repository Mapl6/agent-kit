import { AppError } from "../errors/AppError.js";
import {
  CONFIG_SCHEMA_VERSION,
  type ProjectConfig,
  type ProjectSnapshot,
  SNAPSHOT_SCHEMA_VERSION,
} from "./types.js";

export function assertValidConfig(value: unknown): ProjectConfig {
  if (!value || typeof value !== "object") {
    throw new AppError({
      code: "CONFIG_INVALID",
      message: "Project config is missing or not an object.",
      suggestedAction: "Run `agent-kit init` to recreate config.",
    });
  }
  const cfg = value as Partial<ProjectConfig>;
  if (cfg.schemaVersion !== CONFIG_SCHEMA_VERSION) {
    throw new AppError({
      code: "CONFIG_INVALID",
      message: `Unsupported config schema version: ${String(cfg.schemaVersion)}.`,
      suggestedAction: "Upgrade agent-kit or re-run init after backup.",
    });
  }
  if (typeof cfg.projectRoot !== "string" || !cfg.projectRoot) {
    throw new AppError({
      code: "CONFIG_INVALID",
      message: "Config is missing a valid projectRoot.",
      suggestedAction: "Fix .agent-kit/config.json or re-run init.",
    });
  }
  return cfg as ProjectConfig;
}

export function assertValidSnapshot(value: unknown): ProjectSnapshot {
  if (!value || typeof value !== "object") {
    throw new AppError({
      code: "INDEX_FAILED",
      message: "Snapshot is missing or not an object.",
      suggestedAction: "Run `agent-kit index` to rebuild the snapshot.",
    });
  }
  const snap = value as Partial<ProjectSnapshot>;
  if (snap.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    throw new AppError({
      code: "INDEX_FAILED",
      message: `Unsupported snapshot schema version: ${String(snap.schemaVersion)}.`,
      suggestedAction: "Run `agent-kit index` to rebuild with the current schema.",
    });
  }
  if (!Array.isArray(snap.files) || !Array.isArray(snap.technologies)) {
    throw new AppError({
      code: "INDEX_FAILED",
      message: "Snapshot is missing files or technologies arrays.",
      suggestedAction: "Run `agent-kit index` to rebuild the snapshot.",
    });
  }
  return snap as ProjectSnapshot;
}
