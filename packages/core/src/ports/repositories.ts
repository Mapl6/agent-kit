import type { ProjectConfig } from "../domain/types.js";
import type { ProjectSnapshot } from "../domain/types.js";
import type { ProjectModel } from "../intelligence/types.js";

export interface ConfigRepository {
  exists(projectRoot: string): Promise<boolean>;
  read(projectRoot: string): Promise<ProjectConfig>;
  write(config: ProjectConfig): Promise<void>;
}

export interface SnapshotRepository {
  exists(projectRoot: string): Promise<boolean>;
  read(projectRoot: string): Promise<ProjectSnapshot | null>;
  write(snapshot: ProjectSnapshot): Promise<void>;
}

export interface ProjectModelRepository {
  /** Raw file contents, or null if absent. Used to tell create / update / unchanged apart. */
  readRaw(projectRoot: string): Promise<string | null>;
  write(projectRoot: string, model: ProjectModel): Promise<void>;
}
