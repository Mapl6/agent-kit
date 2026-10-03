import {
  CONFIG_SCHEMA_VERSION,
  DEFAULT_MAX_FILE_BYTES,
  type IndexResult,
  type PlannedWrite,
  type ProjectConfig,
} from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import { resolveProjectRoot } from "../discovery/root-safety.js";
import type {
  ConfigRepository,
  ProjectModelRepository,
  SnapshotRepository,
} from "../ports/repositories.js";
import { buildProjectIndex } from "../indexer/orchestrate.js";

export type InitOptions = {
  path: string;
  skipIndex?: boolean;
  force?: boolean;
  dryRun?: boolean;
};

export type InitDeps = {
  configs: ConfigRepository;
  snapshots: SnapshotRepository;
  models: ProjectModelRepository;
  now?: () => Date;
};

export type InitResult = {
  projectRoot: string;
  config: ProjectConfig;
  index?: IndexResult;
  /** Every file written, or that would be written with dryRun. */
  writes: PlannedWrite[];
  dryRun: boolean;
};

export async function initProject(options: InitOptions, deps: InitDeps): Promise<InitResult> {
  const projectRoot = await resolveProjectRoot(options.path);
  const exists = await deps.configs.exists(projectRoot);
  const dryRun = Boolean(options.dryRun);

  if (exists && !options.force) {
    throw new AppError({
      code: "ALREADY_INITIALIZED",
      message: "This project already has an agent-kit config.",
      suggestedAction: "Use `agent-kit index` to refresh, or pass --force to re-init config.",
    });
  }

  const now = (deps.now ?? (() => new Date()))().toISOString();
  const previous = exists ? await deps.configs.read(projectRoot).catch(() => null) : null;

  const config: ProjectConfig = {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    projectRoot,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    ignoreGlobs: previous?.ignoreGlobs ?? [],
    maxFileBytes: previous?.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
    followSymlinks: false,
  };

  const writes: PlannedWrite[] = [
    { path: ".agent-kit/config.json", action: exists ? "update" : "create" },
  ];
  if (!dryRun) await deps.configs.write(config);

  if (options.skipIndex) {
    return { projectRoot, config, writes, dryRun };
  }

  const index = await buildProjectIndex(config, {
    snapshots: deps.snapshots,
    models: deps.models,
    now: deps.now,
    dryRun,
  });

  return { projectRoot, config, index, writes: [...writes, ...index.writes], dryRun };
}
