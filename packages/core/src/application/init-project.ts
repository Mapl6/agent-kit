import {
  CONFIG_SCHEMA_VERSION,
  DEFAULT_MAX_FILE_BYTES,
  type ProjectConfig,
} from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import { resolveProjectRoot } from "../discovery/root-safety.js";
import type { ConfigRepository, SnapshotRepository } from "../ports/repositories.js";
import { buildProjectIndex } from "../indexer/orchestrate.js";
import type { IndexResult } from "../domain/types.js";

export type InitOptions = {
  path: string;
  skipIndex?: boolean;
  force?: boolean;
};

export type InitDeps = {
  configs: ConfigRepository;
  snapshots: SnapshotRepository;
  now?: () => Date;
};

export type InitResult = {
  projectRoot: string;
  config: ProjectConfig;
  index?: IndexResult;
};

export async function initProject(options: InitOptions, deps: InitDeps): Promise<InitResult> {
  const projectRoot = await resolveProjectRoot(options.path);
  const exists = await deps.configs.exists(projectRoot);

  if (exists && !options.force) {
    throw new AppError({
      code: "ALREADY_INITIALIZED",
      message: "This project already has an agent-kit config.",
      suggestedAction: "Use `agent-kit index` to refresh, or pass --force to re-init config.",
    });
  }

  const now = (deps.now ?? (() => new Date))().toISOString();
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

  await deps.configs.write(config);

  if (options.skipIndex) {
    return { projectRoot, config };
  }

  const index = await buildProjectIndex(config, {
    snapshots: deps.snapshots,
    now: deps.now,
  });

  return { projectRoot, config, index };
}
