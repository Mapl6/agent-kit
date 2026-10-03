import fs from "node:fs/promises";
import path from "node:path";
import { AGENT_KIT_DIR, type PlannedWrite } from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import type { ProjectModel } from "../intelligence/types.js";
import { writeFileAtomic } from "../storage/atomic-write.js";
import { renderProjectContext } from "./context.js";
import {
  appendBlock,
  locateBlock,
  outsideBlock,
  renderBlock,
  replaceBlock,
  stripBlock,
} from "./markers.js";
import { getAdapter } from "./registry.js";
import type { AdapterTarget, AgentId, FileProbe } from "./types.js";

const MAX_BYTES = 1_048_576;
/** Codex stops reading AGENTS.md content past this many bytes. */
export const CODEX_MAX_BYTES = 32 * 1024;

export const INSTALL_MANIFEST = `${AGENT_KIT_DIR}/state/install.json`;

export type InstallManifest = {
  schemaVersion: 1;
  /** Files holding an Agent Kit block, by repo-relative path. */
  files: Record<string, { adapter: AgentId; created: boolean; separator: string }>;
};

export type FileChange = PlannedWrite & {
  adapter?: AgentId;
  /** New file content; null means delete. Undefined for no-ops. */
  next?: string | null;
  separator?: string;
  created?: boolean;
};

export type InstallPlan = {
  changes: FileChange[];
  manifest: InstallManifest;
  warnings: string[];
};

function resolveInside(root: string, rel: string): string {
  const abs = path.resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new AppError({
      code: "UNSUPPORTED_OPERATION",
      message: `Refusing path outside the project: ${rel}`,
    });
  }
  return abs;
}

type Probe =
  { kind: "missing" } | { kind: "file"; text: string } | { kind: "unsafe"; reason: string };

/** Never follow a symlink: not the file itself, nor any directory on the way to it. */
async function probe(root: string, rel: string): Promise<Probe> {
  const abs = resolveInside(root, rel);
  const parts = path.relative(root, abs).split(path.sep);
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]!);
    let st;
    try {
      st = await fs.lstat(current);
    } catch {
      return { kind: "missing" };
    }
    if (st.isSymbolicLink())
      return { kind: "unsafe", reason: `${path.relative(root, current)} is a symlink` };
    if (i < parts.length - 1 && !st.isDirectory())
      return { kind: "unsafe", reason: "parent is not a directory" };
    if (i === parts.length - 1) {
      if (!st.isFile()) return { kind: "unsafe", reason: "not a regular file" };
      if (st.size > MAX_BYTES) return { kind: "unsafe", reason: "larger than 1 MiB" };
    }
  }
  return { kind: "file", text: await fs.readFile(abs, "utf8") };
}

export function createFileProbe(root: string): FileProbe {
  return {
    async isFile(rel) {
      return (await probe(root, rel)).kind === "file";
    },
    async read(rel) {
      const p = await probe(root, rel);
      return p.kind === "file" ? p.text : null;
    },
  };
}

export async function readInstallManifest(root: string): Promise<InstallManifest> {
  const p = await probe(root, INSTALL_MANIFEST);
  if (p.kind === "file") {
    try {
      const parsed = JSON.parse(p.text) as InstallManifest;
      if (parsed.schemaVersion === 1 && parsed.files && typeof parsed.files === "object")
        return parsed;
    } catch {
      // fall through: an unreadable manifest is treated as empty
    }
  }
  return { schemaVersion: 1, files: {} };
}

/**
 * Work out every file change needed so the enabled agents match the model.
 * Pure planning: reads files, writes nothing.
 */
export async function planAgentInstall(
  root: string,
  model: ProjectModel,
  agents: readonly AgentId[],
  explicit: readonly AgentId[] = [],
): Promise<InstallPlan> {
  const files = createFileProbe(root);
  const context = renderProjectContext(model);
  const previous = await readInstallManifest(root);
  const manifest: InstallManifest = { schemaVersion: 1, files: {} };
  const changes: FileChange[] = [];
  const warnings: string[] = [];

  const targets: AdapterTarget[] = [];
  for (const id of agents) {
    targets.push(
      ...(await getAdapter(id).targets({ model, context, files, explicit: explicit.includes(id) })),
    );
  }

  const wanted = new Set<string>();
  for (const target of targets) {
    wanted.add(target.path);
    const prior = previous.files[target.path];
    const p = await probe(root, target.path);
    const base = { path: target.path, adapter: target.adapter };

    if (p.kind === "unsafe") {
      changes.push({ ...base, action: "conflict", reason: p.reason });
      if (prior) manifest.files[target.path] = prior;
      continue;
    }
    if (p.kind === "missing") {
      if (!target.createIfMissing) continue;
      const next = renderBlock(target.body);
      changes.push({ ...base, action: "create", next, separator: "", created: true });
      manifest.files[target.path] = { adapter: target.adapter, created: true, separator: "" };
      continue;
    }

    const loc = locateBlock(p.text);
    if (loc.kind === "malformed") {
      changes.push({ ...base, action: "conflict", reason: loc.reason });
      if (prior) manifest.files[target.path] = prior;
      continue;
    }
    const skip = target.skipWhen?.(outsideBlock(p.text));
    if (skip && loc.kind === "none") {
      changes.push({ ...base, action: "skip", reason: skip });
      continue;
    }
    const entry = prior ?? { adapter: target.adapter, created: false, separator: "" };
    if (loc.kind === "block") {
      const next = replaceBlock(p.text, loc.start, loc.end, target.body);
      changes.push(
        next === p.text ? { ...base, action: "unchanged" } : { ...base, action: "update", next },
      );
      manifest.files[target.path] = { ...entry, adapter: target.adapter };
    } else {
      const { text, separator } = appendBlock(p.text, target.body);
      changes.push({ ...base, action: "update", next: text, separator, reason: "block appended" });
      manifest.files[target.path] = { adapter: target.adapter, created: false, separator };
    }
  }

  // Blocks from adapters that are no longer enabled.
  for (const [rel, entry] of Object.entries(previous.files)) {
    if (wanted.has(rel)) continue;
    const removal = await planRemoval(root, rel, entry);
    // Keep ownership of blocks we couldn't remove, so a later run can retry.
    if (removal.some((c) => c.action === "conflict")) manifest.files[rel] = entry;
    changes.push(...removal);
  }

  const agentsMd = changes.find((c) => c.path === "AGENTS.md" && typeof c.next === "string");
  const size = Buffer.byteLength(agentsMd?.next ?? (await files.read("AGENTS.md")) ?? "");
  if (size > CODEX_MAX_BYTES) {
    warnings.push(
      `AGENTS.md is ${Math.round(size / 1024)} KiB; Codex reads only the first 32 KiB.`,
    );
  }

  return { changes, manifest, warnings };
}

async function planRemoval(
  root: string,
  rel: string,
  entry: InstallManifest["files"][string],
): Promise<FileChange[]> {
  const p = await probe(root, rel);
  const base = { path: rel, adapter: entry.adapter };
  if (p.kind === "missing") return [];
  if (p.kind === "unsafe") return [{ ...base, action: "conflict", reason: p.reason }];
  const stripped = stripBlock(p.text, entry.separator);
  if (stripped === null) {
    const loc = locateBlock(p.text);
    return loc.kind === "malformed" ? [{ ...base, action: "conflict", reason: loc.reason }] : [];
  }
  if (entry.created && stripped.trim().length === 0)
    return [{ ...base, action: "delete", next: null }];
  return [{ ...base, action: "remove", next: stripped, reason: "block removed" }];
}

/** Plan removing every Agent Kit block recorded in the manifest. */
export async function planAgentUninstall(root: string): Promise<FileChange[]> {
  const manifest = await readInstallManifest(root);
  const changes: FileChange[] = [];
  for (const [rel, entry] of Object.entries(manifest.files))
    changes.push(...(await planRemoval(root, rel, entry)));
  return changes;
}

/**
 * Apply planned changes. Existing files are backed up under
 * .agent-kit/state/backups/<timestamp>/ before they are modified or deleted.
 */
export async function applyFileChanges(
  root: string,
  changes: readonly FileChange[],
  now: Date = new Date(),
): Promise<void> {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  for (const change of changes) {
    if (change.next === undefined) continue;
    const abs = resolveInside(root, change.path);
    const before = await probe(root, change.path);
    if (before.kind === "unsafe") continue; // changed since planning; never write through it
    if (before.kind === "file") {
      const backup = resolveInside(root, `${AGENT_KIT_DIR}/state/backups/${stamp}/${change.path}`);
      await writeFileAtomic(backup, before.text);
    }
    if (change.next === null) await fs.rm(abs, { force: true });
    else await writeFileAtomic(abs, change.next);
  }
}

export async function writeInstallManifest(root: string, manifest: InstallManifest): Promise<void> {
  const sorted: InstallManifest = {
    schemaVersion: 1,
    files: Object.fromEntries(
      Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
  await writeFileAtomic(
    resolveInside(root, INSTALL_MANIFEST),
    `${JSON.stringify(sorted, null, 2)}\n`,
  );
}
