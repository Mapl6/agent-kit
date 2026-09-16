import fs from "node:fs/promises";
import path from "node:path";
import type { FileKind, IndexedFile } from "../domain/types.js";
import { classifyFile } from "./classify.js";
import {
  isIgnoredDirName,
  isSecretPath,
  matchesIgnoreGlobs,
} from "./ignore.js";
import { isSafeUnderRoot } from "./root-safety.js";

export type DiscoverOptions = {
  projectRoot: string;
  ignoreGlobs: string[];
  maxFileBytes: number;
  /** Max directory depth from root (inclusive of depth 0). */
  maxDepth?: number;
};

export type DiscoveredEntry = {
  relativePath: string;
  absolutePath: string;
  kind: FileKind;
  sizeBytes: number;
  mtimeMs: number;
  skipContent: boolean;
  skippedReason?: string;
};

/**
 * Walk project tree without following symlinks and without executing any project code.
 */
export async function discoverFiles(options: DiscoverOptions): Promise<DiscoveredEntry[]> {
  const maxDepth = options.maxDepth ?? 12;
  const results: DiscoveredEntry[] = [];

  async function walk(dirAbsolute: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    let entries;
    try {
      entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === "." || entry.name === "..") continue;
      const absolutePath = path.join(dirAbsolute, entry.name);
      const relativePath = path.relative(options.projectRoot, absolutePath).replace(/\\/g, "/");

      if (entry.isSymbolicLink()) {
        results.push({
          relativePath,
          absolutePath,
          kind: "ignored",
          sizeBytes: 0,
          mtimeMs: 0,
          skipContent: true,
          skippedReason: "symlink",
        });
        continue;
      }

      if (entry.isDirectory()) {
        if (isIgnoredDirName(entry.name)) continue;
        if (matchesIgnoreGlobs(relativePath, options.ignoreGlobs)) continue;
        if (matchesIgnoreGlobs(relativePath + "/**", options.ignoreGlobs)) continue;
        await walk(absolutePath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;

      const safety = await isSafeUnderRoot(options.projectRoot, absolutePath);
      if (!safety.safe) {
        results.push({
          relativePath,
          absolutePath,
          kind: "ignored",
          sizeBytes: 0,
          mtimeMs: 0,
          skipContent: true,
          skippedReason: safety.reason ?? "unsafe",
        });
        continue;
      }

      if (matchesIgnoreGlobs(relativePath, options.ignoreGlobs)) {
        results.push({
          relativePath,
          absolutePath,
          kind: "ignored",
          sizeBytes: 0,
          mtimeMs: 0,
          skipContent: true,
          skippedReason: "ignore-glob",
        });
        continue;
      }

      let st;
      try {
        st = await fs.lstat(absolutePath);
      } catch {
        continue;
      }

      const kind = classifyFile(relativePath);
      const tooLarge = st.size > options.maxFileBytes;
      const secret = kind === "secret" || isSecretPath(relativePath);

      results.push({
        relativePath,
        absolutePath,
        kind: secret ? "secret" : kind,
        sizeBytes: st.size,
        mtimeMs: st.mtimeMs,
        skipContent: secret || tooLarge,
        skippedReason: secret ? "secret" : tooLarge ? "max-file-bytes" : undefined,
      });
    }
  }

  await walk(options.projectRoot, 0);
  results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return results;
}

export function toIndexedFile(
  entry: DiscoveredEntry,
  contentHash: string | null,
): IndexedFile {
  const file: IndexedFile = {
    path: entry.relativePath,
    kind: entry.kind,
    sizeBytes: entry.sizeBytes,
    mtimeMs: entry.mtimeMs,
    contentHash,
  };
  if (entry.skippedReason) file.skippedReason = entry.skippedReason;
  return file;
}
