import fs from "node:fs/promises";
import path from "node:path";
import { AppError } from "../errors/AppError.js";

/**
 * Resolve and validate a project root. Does not follow a final symlink escape:
 * the resolved real path must stay within (or equal) the intended root intent.
 */
export async function resolveProjectRoot(inputPath: string): Promise<string> {
  const absolute = path.resolve(inputPath);

  let stat;
  try {
    stat = await fs.lstat(absolute);
  } catch (cause) {
    throw new AppError({
      code: "PROJECT_NOT_FOUND",
      message: "The specified project root does not exist.",
      suggestedAction: "Check the path and run the command again.",
      cause,
    });
  }

  if (stat.isSymbolicLink()) {
    throw new AppError({
      code: "INVALID_PROJECT_ROOT",
      message: "Project root must not be a symbolic link.",
      suggestedAction: "Pass a real directory path, not a symlink.",
    });
  }

  if (!stat.isDirectory()) {
    throw new AppError({
      code: "INVALID_PROJECT_ROOT",
      message: "Project root must be a directory.",
      suggestedAction: "Pass a directory path with --path.",
    });
  }

  // Ensure we can read the directory
  try {
    await fs.access(absolute, fs.constants.R_OK);
  } catch (cause) {
    throw new AppError({
      code: "PERMISSION_DENIED",
      message: "Cannot read the project root directory.",
      suggestedAction: "Check directory permissions and try again.",
      cause,
    });
  }

  return absolute;
}

/**
 * Ensure a candidate file path stays under projectRoot (no symlink escape).
 * Returns false if the path is a symlink or resolves outside the root.
 */
export async function isSafeUnderRoot(
  projectRoot: string,
  absolutePath: string,
): Promise<{ safe: boolean; reason?: string }> {
  const rootReal = await fs.realpath(projectRoot).catch(() => projectRoot);
  let lstat;
  try {
    lstat = await fs.lstat(absolutePath);
  } catch {
    return { safe: false, reason: "missing" };
  }

  if (lstat.isSymbolicLink()) {
    return { safe: false, reason: "symlink" };
  }

  if (!absolutePath.startsWith(rootReal + path.sep) && absolutePath !== rootReal) {
    // Compare via realpath parent chain for non-symlink files
    try {
      const real = await fs.realpath(absolutePath);
      if (!real.startsWith(rootReal + path.sep) && real !== rootReal) {
        return { safe: false, reason: "outside-root" };
      }
    } catch {
      return { safe: false, reason: "unreadable" };
    }
  }

  return { safe: true };
}
