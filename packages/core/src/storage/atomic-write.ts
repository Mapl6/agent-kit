import fs from "node:fs/promises";
import path from "node:path";
import { AppError } from "../errors/AppError.js";

/**
 * Write file atomically: temp file in same directory, then rename.
 */
export async function writeFileAtomic(filePath: string, contents: string): Promise<void> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tmp = path.join(dir, `.${base}.${process.pid}.${Date.now()}.tmp`);

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(tmp, contents, { encoding: "utf8", mode: 0o644 });
    await fs.rename(tmp, filePath);
  } catch (cause) {
    try {
      await fs.unlink(tmp);
    } catch {
      // ignore cleanup failure
    }
    if (isPermissionError(cause)) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: `Permission denied while writing ${safePath(filePath)}.`,
        suggestedAction: "Check directory permissions and try again.",
        cause,
      });
    }
    throw new AppError({
      code: "STORAGE_WRITE_FAILED",
      message: `Failed to write ${safePath(filePath)}.`,
      suggestedAction: "Ensure the disk is writable and the path is valid.",
      cause,
    });
  }
}

function isPermissionError(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code?: string }).code === "EACCES"
  );
}

/** Avoid logging full home paths with secrets; keep basename + parent. */
function safePath(filePath: string): string {
  const parts = filePath.split(path.sep).filter(Boolean);
  return parts.slice(-3).join("/");
}
