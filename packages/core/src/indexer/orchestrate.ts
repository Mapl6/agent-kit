import type {
  IndexResult,
  IndexedFile,
  ProjectConfig,
  ProjectSnapshot,
  TechnologySignal,
} from "../domain/types.js";
import { SNAPSHOT_SCHEMA_VERSION } from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import { discoverFiles, toIndexedFile } from "../discovery/discover.js";
import { detectTechnologies } from "../detection/technology.js";
import type { SnapshotRepository } from "../ports/repositories.js";
import { hashFileContents, hashSnapshotPayload } from "./hash.js";

export type IndexerDeps = {
  snapshots: SnapshotRepository;
  now?: () => Date;
};

export async function buildProjectIndex(
  config: ProjectConfig,
  deps: IndexerDeps,
): Promise<IndexResult> {
  const now = (deps.now ?? (() => new Date))().toISOString();

  try {
    const discovered = await discoverFiles({
      projectRoot: config.projectRoot,
      ignoreGlobs: config.ignoreGlobs,
      maxFileBytes: config.maxFileBytes,
    });

    const files: IndexedFile[] = [];
    for (const entry of discovered) {
      let contentHash: string | null = null;
      if (!entry.skipContent && entry.kind !== "ignored" && entry.kind !== "secret") {
        try {
          contentHash = await hashFileContents(entry.absolutePath);
        } catch {
          contentHash = null;
          entry.skippedReason = entry.skippedReason ?? "unreadable";
          entry.skipContent = true;
        }
      }
      files.push(toIndexedFile(entry, contentHash));
    }

    const technologies: TechnologySignal[] = await detectTechnologies(config.projectRoot);

    const contentHash = hashSnapshotPayload(
      files.map((f) => `${f.path}:${f.contentHash ?? f.skippedReason ?? ""}:${f.mtimeMs}`),
    );

    const indexedCount = files.filter((f) => f.contentHash !== null).length;
    const skippedCount = files.length - indexedCount;
    const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);

    const previous = await deps.snapshots.read(config.projectRoot);
    const created = previous === null;

    const snapshot: ProjectSnapshot = {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      projectRoot: config.projectRoot,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      contentHash,
      files,
      technologies,
      stats: {
        fileCount: files.length,
        indexedCount,
        skippedCount,
        totalBytes,
      },
    };

    const { added, removed, updated } = diffSnapshots(previous, snapshot);
    const changed = created || added > 0 || removed > 0 || updated > 0 || previous?.contentHash !== snapshot.contentHash;

    if (changed) {
      await deps.snapshots.write(snapshot);
    }

    return { snapshot, created, changed, added, removed, updated };
  } catch (cause) {
    if (AppError.isAppError(cause)) throw cause;
    throw new AppError({
      code: "INDEX_FAILED",
      message: "Indexing failed unexpectedly.",
      suggestedAction: "Check permissions and ignore rules, then re-run `agent-kit index`.",
      cause,
    });
  }
}

function diffSnapshots(
  previous: ProjectSnapshot | null,
  next: ProjectSnapshot,
): { added: number; removed: number; updated: number } {
  if (!previous) {
    return { added: next.files.length, removed: 0, updated: 0 };
  }
  const prevMap = new Map(previous.files.map((f) => [f.path, f]));
  const nextMap = new Map(next.files.map((f) => [f.path, f]));

  let added = 0;
  let updated = 0;
  let removed = 0;

  for (const [p, file] of nextMap) {
    const old = prevMap.get(p);
    if (!old) added += 1;
    else if (old.contentHash !== file.contentHash || old.mtimeMs !== file.mtimeMs) updated += 1;
  }
  for (const p of prevMap.keys()) {
    if (!nextMap.has(p)) removed += 1;
  }

  return { added, removed, updated };
}
