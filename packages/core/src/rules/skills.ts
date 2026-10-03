import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { AGENT_KIT_DIR } from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import { writeFileAtomic } from "../storage/atomic-write.js";
import { parseFrontmatter } from "./frontmatter.js";

export const SKILLS_DIR = `${AGENT_KIT_DIR}/skills`;
/** agentskills.io: 1–64 chars, lowercase alphanumerics and single hyphens, no edge hyphens. */
const SKILL_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_FILE_BYTES = 1_048_576;
const MAX_FILES = 200;
const SCRIPT_EXT = /\.(sh|bash|zsh|py|js|mjs|cjs|ts|rb|pl|ps1|bat|cmd|exe)$/i;

export type SkillFile = { rel: string; content: Buffer };

export type Skill = {
  name: string;
  description: string;
  /** Repo-relative skill directory. */
  dir: string;
  files: SkillFile[];
  /** Contains code an agent could run (scripts/ or executable file types). */
  hasScripts: boolean;
  scripts: string[];
  /** sha256 over every file path and content; approval is tied to it. */
  hash: string;
};

export type SkillProblem = { source: string; message: string };

async function collectFiles(
  dirAbs: string,
  prefix = "",
): Promise<{ files: SkillFile[]; problems: string[] }> {
  const files: SkillFile[] = [];
  const problems: string[] = [];
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = path.join(dirAbs, entry.name);
    if (entry.isSymbolicLink()) {
      problems.push(`${rel} is a symlink (not allowed in skills)`);
    } else if (entry.isDirectory()) {
      const sub = await collectFiles(abs, rel);
      files.push(...sub.files);
      problems.push(...sub.problems);
    } else if (entry.isFile()) {
      const stat = await fs.lstat(abs);
      if (stat.size > MAX_FILE_BYTES) problems.push(`${rel} is larger than 1 MiB`);
      else files.push({ rel, content: await fs.readFile(abs) });
    }
  }
  return { files, problems };
}

export function hashSkillFiles(files: readonly SkillFile[]): string {
  const h = createHash("sha256");
  for (const f of [...files].sort((a, b) => a.rel.localeCompare(b.rel))) {
    h.update(f.rel).update("\0").update(f.content).update("\0");
  }
  return h.digest("hex");
}

/** Read and validate every skill in `.agent-kit/skills/<name>/`. Never runs anything. */
export async function loadSkills(
  root: string,
): Promise<{ skills: Skill[]; problems: SkillProblem[] }> {
  const base = path.join(root, SKILLS_DIR);
  const skills: Skill[] = [];
  const problems: SkillProblem[] = [];
  let entries;
  try {
    if (!(await fs.lstat(base)).isDirectory()) {
      return {
        skills,
        problems: [{ source: SKILLS_DIR, message: "must be a real directory, not a symlink" }],
      };
    }
    entries = await fs.readdir(base, { withFileTypes: true });
  } catch {
    return { skills, problems };
  }

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const dir = `${SKILLS_DIR}/${entry.name}`;
    if (entry.name.startsWith(".")) continue;
    if (!entry.isDirectory()) {
      problems.push({ source: dir, message: "skills must be directories (symlinks are not read)" });
      continue;
    }
    const fail = (message: string) => problems.push({ source: dir, message });
    if (!SKILL_NAME.test(entry.name) || entry.name.length > 64) {
      fail("directory name must be lowercase-hyphenated, 1–64 characters");
      continue;
    }
    const { files, problems: fileProblems } = await collectFiles(path.join(base, entry.name));
    if (fileProblems.length) {
      fileProblems.forEach(fail);
      continue;
    }
    if (files.length > MAX_FILES) {
      fail(`more than ${MAX_FILES} files`);
      continue;
    }
    const skillMd = files.find((f) => f.rel === "SKILL.md");
    if (!skillMd) {
      fail("missing SKILL.md");
      continue;
    }
    const parsed = parseFrontmatter(skillMd.content.toString("utf8"));
    if (parsed.error || !parsed.data) {
      fail(parsed.error ?? "SKILL.md needs frontmatter with name and description");
      continue;
    }
    const name = typeof parsed.data.name === "string" ? parsed.data.name : "";
    const description = typeof parsed.data.description === "string" ? parsed.data.description : "";
    if (name !== entry.name) {
      fail(`frontmatter name "${name.slice(0, 64)}" must match the directory name`);
      continue;
    }
    if (description.length < 1 || description.length > 1024) {
      fail("description must be 1–1024 characters");
      continue;
    }
    const scripts = files
      .map((f) => f.rel)
      .filter((rel) => rel.startsWith("scripts/") || SCRIPT_EXT.test(rel));
    skills.push({
      name,
      description,
      dir,
      files,
      hasScripts: scripts.length > 0,
      scripts,
      hash: hashSkillFiles(files),
    });
  }
  return { skills, problems };
}

/** Skills that may be copied to agents: no scripts, or scripts approved at this exact content. */
export function isSkillDistributable(
  skill: Skill,
  approved: Record<string, string> | undefined,
): boolean {
  return !skill.hasScripts || approved?.[skill.name] === skill.hash;
}

/** Create `.agent-kit/skills/<name>/SKILL.md` from a template. Never overwrites. */
export async function createSkill(
  root: string,
  input: { name: string; description?: string },
): Promise<string> {
  if (!SKILL_NAME.test(input.name) || input.name.length > 64) {
    throw new AppError({
      code: "UNSUPPORTED_OPERATION",
      message: `Invalid skill name "${input.name}".`,
      suggestedAction: "Use lowercase letters, numbers and single hyphens, e.g. release-notes.",
    });
  }
  const rel = `${SKILLS_DIR}/${input.name}/SKILL.md`;
  if (await fs.lstat(path.join(root, SKILLS_DIR, input.name)).catch(() => null)) {
    throw new AppError({
      code: "ALREADY_INITIALIZED",
      message: `${SKILLS_DIR}/${input.name} already exists.`,
      suggestedAction: "Edit it directly, then run `agent-kit sync`.",
    });
  }
  const description = (
    input.description ?? `Describe what ${input.name} does and when an agent should use it.`
  ).replace(/\n/g, " ");
  const text = [
    "---",
    `name: ${input.name}`,
    `description: ${description}`,
    "---",
    "",
    `# ${input.name}`,
    "",
    "## When to use",
    "",
    "- Describe the situations where this workflow applies.",
    "",
    "## Steps",
    "",
    "1. First step.",
    "2. Second step.",
    "",
  ].join("\n");
  await writeFileAtomic(path.join(root, rel), text);
  return rel;
}
