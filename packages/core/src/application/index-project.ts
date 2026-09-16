import type { IndexResult } from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import { resolveProjectRoot } from "../discovery/root-safety.js";
import type { ConfigRepository, SnapshotRepository } from "../ports/repositories.js";
import { buildProjectIndex } from "../indexer/orchestrate.js";

export type IndexOptions = {
  path: string;
};

export type IndexDeps = {
  configs: ConfigRepository;
  snapshots: SnapshotRepository;
  now?: () => Date;
};

export async function indexProject(options: IndexOptions, deps: IndexDeps): Promise<IndexResult> {
  const projectRoot = await resolveProjectRoot(options.path);
  const hasConfig = await deps.configs.exists(projectRoot);
  if (!hasConfig) {
    throw new AppError({
      code: "CONFIG_INVALID",
      message: "Project is not initialized (missing .agent-kit/config.json).",
      suggestedAction: "Run `agent-kit init` first.",
    });
  }

  const config = await deps.configs.read(projectRoot);
  return buildProjectIndex(config, { snapshots: deps.snapshots, now: deps.now });
}
