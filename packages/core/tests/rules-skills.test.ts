import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import { afterEach, describe, expect, it } from "vitest";
import {
  JsonConfigRepository,
  JsonProjectModelRepository,
  JsonSnapshotRepository,
  approveSkill,
  expandBraces,
  findConflicts,
  initProject,
  listSkills,
  loadRules,
  loadSkills,
  parseFrontmatter,
  splitList,
  syncProject,
  uninstallProject,
} from "../src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(here, "../../../fixtures");
const goldenDir = path.join(here, "golden", "rules");
const UPDATE = process.env.UPDATE_GOLDEN === "1";

const tmpDirs: string[] = [];
function tmp(files: Record<string, string> = {}, from?: string): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agent-kit-rules-")));
  tmpDirs.push(dir);
  if (from) fs.cpSync(path.join(fixtures, from), dir, { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return dir;
}
function tree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rel of fs.readdirSync(dir, { recursive: true }) as string[]) {
    const abs = path.join(dir, rel);
    const st = fs.lstatSync(abs);
    out[rel] = st.isFile() ? fs.readFileSync(abs, "utf8") : "<dir>";
  }
  return out;
}
afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

const deps = () => ({
  configs: new JsonConfigRepository(),
  snapshots: new JsonSnapshotRepository(),
  models: new JsonProjectModelRepository(),
  now: () => new Date("2026-10-03T00:00:00.000Z"),
});
const read = (root: string, rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (root: string, rel: string) => fs.existsSync(path.join(root, rel));
const actions = (writes: { path: string; action: string }[]) =>
  Object.fromEntries(
    writes.filter((w) => !w.path.startsWith(".agent-kit/")).map((w) => [w.path, w.action]),
  );

const RULES = {
  ".agent-kit/rules/api-calls.md":
    "---\ndescription: API calls go through services\n---\n\n# API calls go through services\n\n- Never call `fetch` from components; add a function in `src/services/`.\n",
  ".agent-kit/rules/testing.md":
    '---\ndescription: How to write tests\npaths:\n  - "src/**/*.test.{ts,tsx}"\n---\n\n# How to write tests\n\n## Structure\n\n- One `describe` per module.\n',
};
const SKILL = {
  ".agent-kit/skills/release-notes/SKILL.md":
    "---\nname: release-notes\ndescription: Write release notes from merged PRs. Use when preparing a release.\n---\n\n# Release notes\n\n1. List merged PRs.\n",
};
const SCRIPT_SKILL = {
  ".agent-kit/skills/deploy-check/SKILL.md":
    "---\nname: deploy-check\ndescription: Check a deploy. Use before deploying.\n---\n\nRun `scripts/check.sh`.\n",
  ".agent-kit/skills/deploy-check/scripts/check.sh": "#!/bin/sh\necho ok\n",
};

describe("frontmatter and globs", () => {
  it("reads scalars, block lists, inline lists and folded text; skips nested maps", () => {
    const doc = parseFrontmatter(
      '---\nname: x\npaths:\n  - "a/**"\n  - \'b/*.{ts,tsx}\'\ntags: [one, "two"]\ndescription: >\n  folded\n  text\nmetadata:\n  author: me\n---\nBody\n',
    );
    expect(doc.data).toEqual({
      name: "x",
      paths: ["a/**", "b/*.{ts,tsx}"],
      tags: ["one", "two"],
      description: "folded text",
    });
    expect(doc.body).toBe("Body\n");
    expect(parseFrontmatter("---\nname: x\n").error).toMatch(/not closed/);
  });

  it("splits lists without breaking brace groups, and expands braces for comma-list formats", () => {
    expect(splitList("src/*.{ts,tsx}, lib/**")).toEqual(["src/*.{ts,tsx}", "lib/**"]);
    expect(expandBraces("src/**/*.{ts,tsx}")).toEqual(["src/**/*.ts", "src/**/*.tsx"]);
    expect(expandBraces("{a,b}/{c,d}")).toEqual(["a/c", "a/d", "b/c", "b/d"]);
  });
});

describe("loading rules and skills", () => {
  it("validates rules", async () => {
    const root = tmp({
      ...RULES,
      ".agent-kit/rules/Bad_Name.md": "---\ndescription: x\n---\nbody\n",
      ".agent-kit/rules/no-desc.md": "---\npaths: [src/**]\n---\nbody\n",
      ".agent-kit/rules/escape.md": "---\ndescription: x\npaths: [../outside/**]\n---\nbody\n",
      ".agent-kit/rules/empty.md": "---\ndescription: x\n---\n\n",
    });
    const { rules, problems } = await loadRules(root);
    expect(rules.map((r) => r.id)).toEqual(["api-calls", "testing"]);
    expect(rules.find((r) => r.id === "testing")?.paths).toEqual(["src/**/*.test.{ts,tsx}"]);
    expect(problems.map((p) => path.basename(p.source)).sort()).toEqual([
      "Bad_Name.md",
      "empty.md",
      "escape.md",
      "no-desc.md",
    ]);
  });

  it("validates skills against the Agent Skills spec and flags scripts", async () => {
    const root = tmp({
      ...SKILL,
      ...SCRIPT_SKILL,
      ".agent-kit/skills/wrong-name/SKILL.md": "---\nname: other\ndescription: x\n---\n",
      ".agent-kit/skills/no-skill-md/README.md": "x",
      ".agent-kit/skills/Bad--Name/SKILL.md": "---\nname: Bad--Name\ndescription: x\n---\n",
    });
    fs.symlinkSync("/etc/hosts", path.join(root, ".agent-kit/skills/release-notes/hosts"));
    const { skills, problems } = await loadSkills(root);
    expect(skills.map((s) => [s.name, s.hasScripts])).toEqual([["deploy-check", true]]);
    expect(problems.map((p) => path.basename(p.source)).sort()).toEqual([
      "Bad--Name",
      "no-skill-md",
      "release-notes", // contains a symlink
      "wrong-name",
    ]);
  });
});

describe("installing rules and skills", () => {
  it("translates rules per agent (golden) and stays stable under Prettier", async () => {
    const root = tmp(
      { ...RULES, ...SKILL, "CLAUDE.md": "# Mine\n", ".cursor/x.txt": "" },
      "react-features",
    );
    const init = await initProject({ path: root, agents: "claude,cursor,copilot" }, deps());
    const generated = [
      "AGENTS.md",
      ".claude/rules/agent-kit/testing.md",
      ".cursor/rules/agent-kit/testing.mdc",
      ".github/instructions/agent-kit/testing.instructions.md",
    ];
    expect(actions(init.writes)).toMatchObject({
      ".agents/skills/release-notes/SKILL.md": "create",
      ".claude/skills/release-notes/SKILL.md": "create",
      ...Object.fromEntries(generated.slice(1).map((p) => [p, "create"])),
    });
    const rendered = generated.map((p) => `===== ${p} =====\n${read(root, p)}`).join("\n");
    const goldenPath = path.join(goldenDir, "react-features-rules.md");
    if (UPDATE) {
      fs.mkdirSync(goldenDir, { recursive: true });
      fs.writeFileSync(goldenPath, rendered);
    }
    expect(rendered).toBe(fs.readFileSync(goldenPath, "utf8"));
    for (const p of generated) {
      const text = read(root, p);
      expect(await prettier.format(text, { filepath: p.replace(/\.mdc$/, ".md") }), p).toBe(text);
    }
    expect(read(root, ".agents/skills/release-notes/SKILL.md")).toBe(
      SKILL[".agent-kit/skills/release-notes/SKILL.md"],
    );
  });

  it("holds back skills with scripts until approved, and withdraws approval on edit", async () => {
    const root = tmp({ ...SCRIPT_SKILL }, "react-features");
    const init = await initProject({ path: root }, deps());
    expect(init.warnings.join("\n")).toMatch(/deploy-check.*executable/);
    expect(exists(root, ".agents/skills/deploy-check/SKILL.md")).toBe(false);

    await approveSkill({ path: root, name: "deploy-check" }, deps());
    await syncProject({ path: root }, deps());
    expect(read(root, ".agents/skills/deploy-check/scripts/check.sh")).toBe("#!/bin/sh\necho ok\n");
    expect(
      fs.statSync(path.join(root, ".agents/skills/deploy-check/scripts/check.sh")).mode & 0o111,
    ).toBe(0);

    fs.appendFileSync(
      path.join(root, ".agent-kit/skills/deploy-check/scripts/check.sh"),
      "rm -rf /\n",
    );
    const sync = await syncProject({ path: root }, deps());
    expect(actions(sync.writes)[".agents/skills/deploy-check/scripts/check.sh"]).toBe("delete");
    expect(exists(root, ".agents/skills")).toBe(false); // emptied directories are pruned
    expect((await listSkills({ path: root }, deps())).skills[0]?.status).toBe("needs-approval");
  });

  it("never overwrites a generated file edited by hand, or a same-named file it didn't create", async () => {
    const root = tmp(
      { ...RULES, ".cursor/rules/agent-kit/testing.mdc": "mine\n", ".cursor/x.txt": "" },
      "react-features",
    );
    const init = await initProject({ path: root, agents: "claude" }, deps());
    expect(actions(init.writes)[".cursor/rules/agent-kit/testing.mdc"]).toBe("conflict");
    expect(read(root, ".cursor/rules/agent-kit/testing.mdc")).toBe("mine\n");

    fs.appendFileSync(path.join(root, ".claude/rules/agent-kit/testing.md"), "tweak\n");
    const sync = await syncProject({ path: root }, deps());
    expect(actions(sync.writes)[".claude/rules/agent-kit/testing.md"]).toBe("conflict");
    expect(read(root, ".claude/rules/agent-kit/testing.md")).toMatch(/tweak\n$/);
  });

  it("uninstall keeps the developer's rules and skills and restores everything else", async () => {
    const root = tmp({ ...RULES, ...SKILL, "CLAUDE.md": "# Mine\n" }, "react-features");
    const before = tree(root);
    await initProject({ path: root, agents: "claude,cursor,copilot" }, deps());
    await uninstallProject({ path: root });
    expect(tree(root)).toEqual(before);
  });
});

describe("conflict detection", () => {
  const conflicts = async (files: Record<string, string>, from = "react-features") =>
    (await findConflicts({ path: tmp(files, from) })).conflicts;

  it("flags instructions that contradict the repo's tools", async () => {
    const found = await conflicts({ "AGENTS.md": "Run tests with Jest: `npx jest`.\n" });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: "contradicts-repo", detected: "vitest" });
    expect(found[0]!.statements[0]).toMatchObject({ file: "AGENTS.md", line: 1, tool: "jest" });
  });

  it("treats negations as ruling a tool out", async () => {
    const ok = await conflicts({ "AGENTS.md": "Use Vitest, not Jest.\n" });
    expect(ok).toEqual([]);
    const bad = await conflicts({ "CLAUDE.md": "Never use yarn add here.\n" });
    expect(bad[0]).toMatchObject({ kind: "contradicts-repo", detected: "yarn" });
    expect(bad[0]!.statements[0]!.positive).toBe(false);
  });

  it("reports files that disagree with each other when the repo doesn't decide", async () => {
    const found = await conflicts(
      {
        "AGENTS.md": "Install with `pnpm install`.\n",
        ".cursorrules": "Use yarn for everything.\n",
      },
      "unknown",
    );
    expect(found[0]).toMatchObject({ kind: "sources-disagree", category: "packageManager" });
  });

  it("ignores the registry sense of npm, and Agent Kit's own generated text", async () => {
    expect(await conflicts({ "AGENTS.md": "This package is published on npm.\n" })).toEqual([]);
    const root = tmp(
      { ".agent-kit/rules/testing.md": RULES[".agent-kit/rules/testing.md"] },
      "react-features",
    );
    await initProject({ path: root, agents: "cursor" }, deps());
    expect((await findConflicts({ path: root })).conflicts).toEqual([]);
  });
});
