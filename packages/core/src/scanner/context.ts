import fs from "node:fs/promises";
import type { DiscoveredEntry } from "../discovery/discover.js";
import type { ScanContext } from "./types.js";

/**
 * Build a context scoped to `dir`. Entry paths are rewritten to be relative to
 * `dir`, so package-scoped detectors are written the same way for the root and
 * for workspace members.
 */
export function createScanContext(options: {
  dir: string;
  entries: readonly DiscoveredEntry[];
  rootEntries: ReadonlySet<string>;
  warnings: string[];
}): ScanContext {
  const prefix = options.dir === "." ? "" : `${options.dir}/`;
  // Symlinks and out-of-root entries ("ignored") are invisible to detectors:
  // they must not count as evidence even by name. Secrets stay visible as
  // present but are never readable.
  const files = options.entries
    .filter((e) => e.kind !== "ignored")
    .filter((e) => prefix === "" || e.relativePath.startsWith(prefix))
    .map((e) => ({ ...e, relativePath: e.relativePath.slice(prefix.length) }));
  const byPath = new Map(files.map((f) => [f.relativePath, f]));

  async function readText(relativePath: string): Promise<string | null> {
    const entry = byPath.get(relativePath);
    // Only files the walker vetted: not secret, not a symlink, under the size cap.
    if (!entry || entry.skipContent || entry.kind === "secret" || entry.kind === "ignored") {
      return null;
    }
    try {
      const raw = await fs.readFile(entry.absolutePath, "utf8");
      return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    } catch {
      return null;
    }
  }

  return {
    dir: options.dir,
    files,
    rootEntries: options.rootEntries,
    exists: (p) => byPath.has(p),
    hasDir: (d) => {
      const dirPrefix = d.endsWith("/") ? d : `${d}/`;
      return files.some((f) => f.relativePath.startsWith(dirPrefix));
    },
    get: (p) => byPath.get(p),
    readText,
    async readJson<T>(relativePath: string): Promise<T | null> {
      const raw = await readText(relativePath);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    warn: (message) => {
      if (!options.warnings.includes(message)) options.warnings.push(message);
    },
  };
}
