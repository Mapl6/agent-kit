import fs from "node:fs/promises";
import { assertValidConfig } from "../domain/validation.js";
import type { ProjectConfig } from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import type { ConfigRepository } from "../ports/repositories.js";
import { writeFileAtomic } from "./atomic-write.js";
import { configPath } from "./paths.js";

export class JsonConfigRepository implements ConfigRepository {
  async exists(projectRoot: string): Promise<boolean> {
    try {
      await fs.access(configPath(projectRoot));
      return true;
    } catch {
      return false;
    }
  }

  async read(projectRoot: string): Promise<ProjectConfig> {
    const file = configPath(projectRoot);
    try {
      const raw = await fs.readFile(file, "utf8");
      return assertValidConfig(JSON.parse(raw));
    } catch (cause) {
      if (AppError.isAppError(cause)) throw cause;
      throw new AppError({
        code: "CONFIG_INVALID",
        message: "Could not read project config.",
        suggestedAction: "Check .agent-kit/config.json or run `agent-kit init`.",
        cause,
      });
    }
  }

  async write(config: ProjectConfig): Promise<void> {
    const validated = assertValidConfig(config);
    await writeFileAtomic(configPath(validated.projectRoot), `${JSON.stringify(validated, null, 2)}\n`);
  }
}
