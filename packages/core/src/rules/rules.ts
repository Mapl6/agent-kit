import fs from "node:fs/promises";
import path from "node:path";
import { AGENT_KIT_DIR } from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import { writeFileAtomic } from "../storage/atomic-write.js";
import { listField, parseFrontmatter } from "./frontmatter.js";

export const RULES_DIR = `${AGENT_KIT_DIR}/rules`;
const RULE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_RULE_BYTES = 64 * 1024;

/**
 * A rule: a persistent project expectation, written by the developer in
 * `.agent-kit/rules/<id>.md`. Without `paths` it applies everywhere; with
 * `paths` only to matching files.
 */
export type Rule = {
  id: string;
  description: string;
  /** Glob patterns; empty means the rule always applies. */
  paths: string[];
  body: string;
  /** Repo-relative source file. */
  source: string;
};

export type RuleProblem = { source: string; message: string };

/** Glob patterns must be plain relative globs: no `..`, no absolute paths, no newlines. */
function validGlob(glob: string): boolean {
  return (
    glob.length > 0 &&
    glob.length <= 200 &&
    !glob.startsWith("/") &&
    !glob.split("/").includes("..") &&
    /^[\w@./*?{}[\],!+ -]+$/.test(glob)
  );
}

export async function loadRules(root: string): Promise<{ rules: Rule[]; problems: RuleProblem[] }> {
  const dir = path.join(root, RULES_DIR);
  const rules: Rule[] = [];
  const problems: RuleProblem[] = [];
  let entries;
  try {
    if (!(await fs.lstat(dir)).isDirectory()) {
      return {
        rules,
        problems: [{ source: RULES_DIR, message: "must be a real directory, not a symlink" }],
      };
    }
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return { rules, problems };
  }

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const source = `${RULES_DIR}/${entry.name}`;
    if (!entry.name.endsWith(".md")) continue;
    if (!entry.isFile()) {
      problems.push({ source, message: "not a regular file (symlinks are not read)" });
      continue;
    }
    const id = entry.name.slice(0, -3);
    if (!RULE_ID.test(id) || id.length > 64) {
      problems.push({
        source,
        message: "file name must be lowercase-hyphenated, e.g. api-design.md",
      });
      continue;
    }
    const stat = await fs.lstat(path.join(dir, entry.name));
    if (stat.size > MAX_RULE_BYTES) {
      problems.push({ source, message: "larger than 64 KiB; rules should be short" });
      continue;
    }
    const parsed = parseFrontmatter(await fs.readFile(path.join(dir, entry.name), "utf8"));
    if (parsed.error || !parsed.data) {
      problems.push({ source, message: parsed.error ?? "missing frontmatter with a description" });
      continue;
    }
    const description = typeof parsed.data.description === "string" ? parsed.data.description : "";
    if (!description) {
      problems.push({ source, message: "frontmatter needs a description" });
      continue;
    }
    const paths = listField(parsed.data.paths);
    const badGlob = paths.find((g) => !validGlob(g));
    if (badGlob !== undefined) {
      problems.push({ source, message: `unsupported path pattern: ${badGlob.slice(0, 60)}` });
      continue;
    }
    if (!parsed.body.trim()) {
      problems.push({ source, message: "rule body is empty" });
      continue;
    }
    rules.push({ id, description, paths, body: parsed.body.trim(), source });
  }
  return { rules, problems };
}

/** Create `.agent-kit/rules/<id>.md` from a template. Never overwrites. */
export async function createRule(
  root: string,
  input: { id: string; description?: string; paths?: string[] },
): Promise<string> {
  if (!RULE_ID.test(input.id) || input.id.length > 64) {
    throw new AppError({
      code: "UNSUPPORTED_OPERATION",
      message: `Invalid rule id "${input.id}".`,
      suggestedAction: "Use lowercase letters, numbers and hyphens, e.g. api-design.",
    });
  }
  const paths = input.paths ?? [];
  const bad = paths.find((g) => !validGlob(g));
  if (bad !== undefined) {
    throw new AppError({
      code: "UNSUPPORTED_OPERATION",
      message: `Unsupported path pattern: ${bad}`,
    });
  }
  const rel = `${RULES_DIR}/${input.id}.md`;
  const abs = path.join(root, rel);
  if (await fs.lstat(abs).catch(() => null)) {
    throw new AppError({
      code: "ALREADY_INITIALIZED",
      message: `${rel} already exists.`,
      suggestedAction: "Edit it directly, then run `agent-kit sync`.",
    });
  }
  const description = (input.description ?? `${input.id.replace(/-/g, " ")} conventions`).replace(
    /\n/g,
    " ",
  );
  const front = [
    "---",
    `description: ${description}`,
    ...(paths.length ? ["paths:", ...paths.map((p) => `  - "${p}"`)] : []),
    "---",
  ];
  const body = [
    "",
    `# ${description}`,
    "",
    "- Write each expectation as one short, checkable line.",
    "- Say what to do, not just what to avoid.",
    "",
  ];
  await writeFileAtomic(abs, [...front, ...body].join("\n"));
  return rel;
}
