import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { AGENT_KIT_DIR, type PlannedWrite } from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import type { ProjectModel } from "../intelligence/types.js";
import type { Rule } from "../rules/rules.js";
import type { Skill } from "../rules/skills.js";
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
import type { AdapterTarget, AgentId, BlockTarget, FileProbe, FileTarget } from "./types.js";

const MAX_BYTES = 1_048_576;
/** Codex stops reading AGENTS.md content past this many bytes. */
export const CODEX_MAX_BYTES = 32 * 1024;

export const INSTALL_MANIFEST = `${AGENT_KIT_DIR}/state/install.json`;

export type ManifestEntry = {
  adapter: AgentId;
  /** block: a managed section in a shared file. file: a whole file Agent Kit generated. Absent (3.1.0 manifests) = block. */
  kind?: "block" | "file";
  /** Agent Kit created the file, so uninstall may delete it. */
  created: boolean;
  /** Text inserted before an appended block; removed again on strip. */
  separator: string;
  /** For kind "file": sha256 of the content Agent Kit last wrote. */
  hash?: string;
};

export type InstallManifest = {
  schemaVersion: 1;
  /** Files Agent Kit writes to, by repo-relative path. */
  files: Record<string, ManifestEntry>;
};

export type FileChange = PlannedWrite & {
  adapter?: AgentId;
  /** New file content; null means delete. Undefined for no-ops. */
  next?: string | Buffer | null;
};

export type InstallPlan = {
  changes: FileChange[];
  manifest: InstallManifest;
  warnings: string[];
};

const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

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
  | { kind: "missing" }
  | { kind: "file"; text: string; raw: Buffer }
  | { kind: "unsafe"; reason: string };

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
    if (st.isSymbolicLink()) {
      return { kind: "unsafe", reason: `${path.relative(root, current)} is a symlink` };
    }
    if (i < parts.length - 1 && !st.isDirectory()) {
      return { kind: "unsafe", reason: "parent is not a directory" };
    }
    if (i === parts.length - 1) {
      if (!st.isFile()) return { kind: "unsafe", reason: "not a regular file" };
      if (st.size > MAX_BYTES) return { kind: "unsafe", reason: "larger than 1 MiB" };
    }
  }
  const raw = await fs.readFile(abs);
  return { kind: "file", raw, text: raw.toString("utf8") };
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

type Planned = { change: FileChange; entry?: ManifestEntry };

function planBlock(
  target: BlockTarget,
  p: Probe,
  prior: ManifestEntry | undefined,
): Planned | null {
  const base = { path: target.path, adapter: target.adapter };
  if (p.kind === "unsafe")
    return { change: { ...base, action: "conflict", reason: p.reason }, entry: prior };
  if (p.kind === "missing") {
    if (!target.createIfMissing) return null;
    return {
      change: { ...base, action: "create", next: renderBlock(target.body) },
      entry: { adapter: target.adapter, kind: "block", created: true, separator: "" },
    };
  }
  const loc = locateBlock(p.text);
  if (loc.kind === "malformed")
    return { change: { ...base, action: "conflict", reason: loc.reason }, entry: prior };
  const skip = target.skipWhen?.(outsideBlock(p.text));
  if (skip && loc.kind === "none") return { change: { ...base, action: "skip", reason: skip } };

  if (loc.kind === "block") {
    const next = replaceBlock(p.text, loc.start, loc.end, target.body);
    const entry = {
      ...(prior ?? { created: false, separator: "" }),
      adapter: target.adapter,
      kind: "block" as const,
    };
    return {
      change:
        next === p.text ? { ...base, action: "unchanged" } : { ...base, action: "update", next },
      entry,
    };
  }
  const { text, separator } = appendBlock(p.text, target.body);
  return {
    change: { ...base, action: "update", next: text, reason: "block appended" },
    entry: { adapter: target.adapter, kind: "block", created: false, separator },
  };
}

function planFile(target: FileTarget, p: Probe, prior: ManifestEntry | undefined): Planned {
  const base = { path: target.path, adapter: target.adapter };
  const entry: ManifestEntry = {
    adapter: target.adapter,
    kind: "file",
    created: prior?.created ?? true,
    separator: "",
    hash: sha256(target.content),
  };
  if (p.kind === "unsafe")
    return { change: { ...base, action: "conflict", reason: p.reason }, entry: prior };
  if (p.kind === "missing")
    return { change: { ...base, action: "create", next: target.content }, entry };
  if (prior?.kind !== "file") {
    return {
      change: { ...base, action: "conflict", reason: "exists and wasn't created by Agent Kit" },
    };
  }
  if (sha256(p.raw) !== prior.hash) {
    return {
      change: {
        ...base,
        action: "conflict",
        reason: "edited by hand; change the source in .agent-kit/ instead",
      },
      entry: prior,
    };
  }
  return {
    change: p.raw.equals(target.content)
      ? { ...base, action: "unchanged" }
      : { ...base, action: "update", next: target.content },
    entry,
  };
}

/**
 * Work out every file change needed so the enabled agents match the model,
 * rules and skills. Pure planning: reads files, writes nothing.
 */
export async function planAgentInstall(
  root: string,
  model: ProjectModel,
  agents: readonly AgentId[],
  explicit: readonly AgentId[] = [],
  sources: { rules?: Rule[]; skills?: Skill[] } = {},
): Promise<InstallPlan> {
  const files = createFileProbe(root);
  const rules = sources.rules ?? [];
  const skills = sources.skills ?? [];
  const context = renderProjectContext(model, rules);
  const previous = await readInstallManifest(root);
  const manifest: InstallManifest = { schemaVersion: 1, files: {} };
  const changes: FileChange[] = [];
  const warnings: string[] = [];

  const targets: AdapterTarget[] = [];
  for (const id of agents) {
    const adapter = getAdapter(id);
    targets.push(
      ...(await adapter.targets({
        model,
        context,
        files,
        explicit: explicit.includes(id),
        rules,
        skills,
      })),
    );
  }

  const wanted = new Set<string>();
  for (const target of targets) {
    if (wanted.has(target.path)) continue; // first adapter to claim a path wins
    wanted.add(target.path);
    const prior = previous.files[target.path];
    const p = await probe(root, target.path);
    const planned =
      target.kind === "block" ? planBlock(target, p, prior) : planFile(target, p, prior);
    if (!planned) continue;
    changes.push(planned.change);
    if (planned.entry) manifest.files[target.path] = planned.entry;
  }

  // Files from adapters, rules or skills that no longer apply.
  for (const [rel, entry] of Object.entries(previous.files)) {
    if (wanted.has(rel)) continue;
    const removal = await planRemoval(root, rel, entry);
    // Keep ownership of anything we couldn't remove, so a later run can retry.
    if (removal.some((c) => c.action === "conflict")) manifest.files[rel] = entry;
    changes.push(...removal);
  }

  const agentsMd = changes.find((c) => c.path === "AGENTS.md" && c.next);
  const size = agentsMd?.next
    ? Buffer.byteLength(agentsMd.next)
    : Buffer.byteLength((await files.read("AGENTS.md")) ?? "");
  if (size > CODEX_MAX_BYTES) {
    warnings.push(
      `AGENTS.md is ${Math.round(size / 1024)} KiB; Codex reads only the first 32 KiB.`,
    );
  }

  return { changes, manifest, warnings };
}

async function planRemoval(root: string, rel: string, entry: ManifestEntry): Promise<FileChange[]> {
  const p = await probe(root, rel);
  const base = { path: rel, adapter: entry.adapter };
  if (p.kind === "missing") return [];
  if (p.kind === "unsafe") return [{ ...base, action: "conflict", reason: p.reason }];

  if (entry.kind === "file") {
    if (sha256(p.raw) !== entry.hash) {
      return [
        {
          ...base,
          action: "conflict",
          reason: "edited by hand; delete it yourself if it's no longer needed",
        },
      ];
    }
    return [{ ...base, action: "delete", next: null }];
  }

  const stripped = stripBlock(p.text, entry.separator);
  if (stripped === null) {
    const loc = locateBlock(p.text);
    return loc.kind === "malformed" ? [{ ...base, action: "conflict", reason: loc.reason }] : [];
  }
  if (entry.created && stripped.trim().length === 0)
    return [{ ...base, action: "delete", next: null }];
  return [{ ...base, action: "remove", next: stripped, reason: "block removed" }];
}

/** Plan removing everything recorded in the manifest. */
export async function planAgentUninstall(root: string): Promise<FileChange[]> {
  const manifest = await readInstallManifest(root);
  const changes: FileChange[] = [];
  for (const [rel, entry] of Object.entries(manifest.files)) {
    changes.push(...(await planRemoval(root, rel, entry)));
  }
  return changes;
}

/** Remove directories left empty by a delete (never the project root itself). */
async function pruneEmptyDirs(root: string, rel: string): Promise<void> {
  const parts = rel.split("/").slice(0, -1);
  while (parts.length > 0) {
    const dir = resolveInside(root, parts.join("/"));
    const st = await fs.lstat(dir).catch(() => null);
    if (!st?.isDirectory() || (await fs.readdir(dir)).length > 0) return;
    await fs.rmdir(dir);
    parts.pop();
  }
}

const KEEP_BACKUP_SETS = 10;

/** Keep only the newest backup sets; names are ISO timestamps, so they sort by time. */
async function pruneBackups(root: string): Promise<void> {
  const dir = resolveInside(root, `${AGENT_KIT_DIR}/state/backups`);
  const st = await fs.lstat(dir).catch(() => null);
  if (!st?.isDirectory()) return;
  const sets = (await fs.readdir(dir)).sort();
  for (const old of sets.slice(0, Math.max(0, sets.length - KEEP_BACKUP_SETS))) {
    await fs.rm(path.join(dir, old), { recursive: true, force: true });
  }
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
      await writeFileAtomic(backup, before.raw);
    }
    if (change.next === null) {
      await fs.rm(abs, { force: true });
      await pruneEmptyDirs(root, change.path);
    } else {
      await writeFileAtomic(abs, change.next);
    }
  }
  await pruneBackups(root);
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
