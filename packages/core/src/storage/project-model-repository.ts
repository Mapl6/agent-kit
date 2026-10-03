import fs from "node:fs/promises";
import type { ProjectModel } from "../intelligence/types.js";
import type { ProjectModelRepository } from "../ports/repositories.js";
import { writeFileAtomic } from "./atomic-write.js";
import { projectModelPath } from "./paths.js";

export function serializeProjectModel(model: ProjectModel): string {
  return `${JSON.stringify(model, null, 2)}\n`;
}

export class JsonProjectModelRepository implements ProjectModelRepository {
  async readRaw(projectRoot: string): Promise<string | null> {
    try {
      return await fs.readFile(projectModelPath(projectRoot), "utf8");
    } catch {
      return null;
    }
  }

  async write(projectRoot: string, model: ProjectModel): Promise<void> {
    await writeFileAtomic(projectModelPath(projectRoot), serializeProjectModel(model));
  }
}
