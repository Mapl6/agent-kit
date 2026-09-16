import type { ProjectStatus } from "../domain/types.js";
import { resolveProjectRoot } from "../discovery/root-safety.js";
import type { ConfigRepository, SnapshotRepository } from "../ports/repositories.js";
import { configPath, snapshotPath } from "../storage/paths.js";

export type StatusOptions = {
  path: string;
};

export type StatusDeps = {
  configs: ConfigRepository;
  snapshots: SnapshotRepository;
};

export async function getProjectStatus(
  options: StatusOptions,
  deps: StatusDeps,
): Promise<ProjectStatus> {
  const projectRoot = await resolveProjectRoot(options.path);
  const initialized = await deps.configs.exists(projectRoot);

  if (!initialized) {
    return {
      initialized: false,
      projectRoot,
      configPath: null,
      snapshotPath: null,
      lastIndexedAt: null,
      fileCount: 0,
      technologies: [],
    };
  }

  const snapshot = await deps.snapshots.read(projectRoot);
  return {
    initialized: true,
    projectRoot,
    configPath: configPath(projectRoot),
    snapshotPath: snapshot ? snapshotPath(projectRoot) : null,
    lastIndexedAt: snapshot?.updatedAt ?? null,
    fileCount: snapshot?.stats.fileCount ?? 0,
    technologies: snapshot?.technologies ?? [],
  };
}
