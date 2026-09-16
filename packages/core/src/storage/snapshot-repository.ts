import fs from "node:fs/promises";
import { assertValidSnapshot } from "../domain/validation.js";
import type { ProjectSnapshot } from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import type { SnapshotRepository } from "../ports/repositories.js";
import { writeFileAtomic } from "./atomic-write.js";
import { snapshotPath } from "./paths.js";

export class JsonSnapshotRepository implements SnapshotRepository {
  async exists(projectRoot: string): Promise<boolean> {
    try {
      await fs.access(snapshotPath(projectRoot));
      return true;
    } catch {
      return false;
    }
  }

  async read(projectRoot: string): Promise<ProjectSnapshot | null> {
    const file = snapshotPath(projectRoot);
    try {
      const raw = await fs.readFile(file, "utf8");
      return assertValidSnapshot(JSON.parse(raw));
    } catch (cause) {
      if (
        typeof cause === "object" &&
        cause !== null &&
        "code" in cause &&
        (cause as { code?: string }).code === "ENOENT"
      ) {
        return null;
      }
      if (AppError.isAppError(cause)) throw cause;
      throw new AppError({
        code: "INDEX_FAILED",
        message: "Could not read existing snapshot.",
        suggestedAction: "Delete .agent-kit/snapshot.json and run `agent-kit index`.",
        cause,
      });
    }
  }

  async write(snapshot: ProjectSnapshot): Promise<void> {
    const validated = assertValidSnapshot(snapshot);
    await writeFileAtomic(
      snapshotPath(validated.projectRoot),
      `${JSON.stringify(validated, null, 2)}\n`,
    );
  }
}
