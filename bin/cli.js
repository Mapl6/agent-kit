#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { scanProject, applyScanToKit, fillAllTokens } = require("./lib/scan-project");

const PKG = require("../package.json");
const TEMPLATES_DIR = path.join(__dirname, "..", "templates");
const TARGET_DIR = process.cwd();
const KIT_VERSION = PKG.version || "1.4.0";

const SKILL_STUB = `---
name: {{NAME}}
description: Replace with a <=60-char capability statement.
version: 0.1.0
tags: [frontend]
---

# {{TITLE}}

## When to Use

- [When this skill should load]
- Don't use for: [out of scope]

## Prerequisites

- [Optional]

## Procedure

1. [Step]
2. [Step]
3. [Step]

## Pitfalls

- [Common mistake]

## Verification

- [ ] [Check]
`;

function parseArgs(argv) {
  const flags = new Set();
  const positional = [];
  for (const arg of argv) {
    if (arg.startsWith("-")) flags.add(arg);
    else positional.push(arg);
  }
  const force = flags.has("--force") || flags.has("-f");
  const yes = flags.has("--yes") || flags.has("-y");
  const help = flags.has("--help") || flags.has("-h");
  const noScan = flags.has("--no-scan");

  let command = "init";
  let rest = positional;
  if (positional[0] && !positional[0].startsWith("-")) {
    const maybe = positional[0];
    if (["init", "enhance", "add-skill", "scan", "doctor", "help"].includes(maybe)) {
      command = maybe;
      rest = positional.slice(1);
    }
  }
  return { command, rest, force, yes, help, noScan };
}

function ask(rl, question, fallback) {
  return new Promise((resolve) => {
    rl.question(`${question}${fallback ? ` (${fallback})` : ""}: `, (answer) => {
      resolve(answer.trim() || fallback || "");
    });
  });
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const KIT_START = "<!-- agent-kit:start -->";
const KIT_END = "<!-- agent-kit:end -->";
const POINTER_START = "<!-- agent-kit:pointer -->";
const POINTER_END = "<!-- agent-kit:pointer:end -->";
const POINTER_BLOCK = `${POINTER_START}
**Agent Kit is in this file.** Before you write code, go to the Agent Kit section at the **bottom** and follow it step by step.
${POINTER_END}
`;

function wrapAgentsKit(templateText) {
  const body = String(templateText || "").trim();
  if (body.includes(KIT_START) && body.includes(KIT_END)) return `${body}\n`;
  return `${KIT_START}\n${body}\n${KIT_END}\n`;
}

function hasAgentsKit(content) {
  return Boolean(content) && content.includes(KIT_START) && content.includes(KIT_END);
}

function installAgentsMd(src, dest, { force }) {
  const kit = wrapAgentsKit(fs.readFileSync(src, "utf8"));
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, kit, "utf8");
    console.log("  create AGENTS.md");
    return "create";
  }

  if (force) {
    fs.writeFileSync(dest, kit, "utf8");
    console.log("  overwrite AGENTS.md");
    return "overwrite";
  }

  const existing = fs.readFileSync(dest, "utf8");
  if (hasAgentsKit(existing)) {
    console.log("  skip   AGENTS.md (kit section already present — use --force to replace it)");
    return "skip";
  }

  let next = `${existing.trimEnd()}\n\n${kit}`;
  if (!existing.includes(POINTER_START)) {
    next = `${POINTER_BLOCK}\n${next}`;
  }
  fs.writeFileSync(dest, next, "utf8");
  console.log("  append AGENTS.md (kept your file, added Agent Kit at the end)");
  return "append";
}

function copyTemplates({ force, onlyMissing }) {
  const files = walk(TEMPLATES_DIR);
  let copied = 0;
  let skipped = 0;
  const agentsSrc = files.find((src) => path.relative(TEMPLATES_DIR, src).replace(/\\/g, "/") === "AGENTS.md");
  const rest = files.filter((src) => src !== agentsSrc);
  const ordered = agentsSrc ? [agentsSrc, ...rest] : rest;

  for (const src of ordered) {
    const rel = path.relative(TEMPLATES_DIR, src).replace(/\\/g, "/");
    const dest = path.join(TARGET_DIR, rel);

    try {
      if (rel === "AGENTS.md") {
        const exists = fs.existsSync(dest);
        if (onlyMissing && exists && hasAgentsKit(fs.readFileSync(dest, "utf8"))) {
          console.log("  skip   AGENTS.md");
          skipped++;
          continue;
        }
        const action = installAgentsMd(src, dest, { force });
        if (action === "skip") skipped++;
        else copied++;
        continue;
      }

      const exists = fs.existsSync(dest);

      if (exists && (onlyMissing || !force)) {
        console.log(`  skip   ${rel}${onlyMissing ? "" : " (already exists — use --force to overwrite)"}`);
        skipped++;
        continue;
      }

      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      console.log(`  create ${rel}`);
      copied++;
    } catch (err) {
      console.log(`  warn   ${rel} (${err.message})`);
    }
  }

  return { copied, skipped };
}

function titleCase(name) {
  return name
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function appendSkillIndex(skillName, description) {
  const agentsPath = path.join(TARGET_DIR, "AGENTS.md");
  if (!fs.existsSync(agentsPath)) {
    console.log("  warn   AGENTS.md missing — skip skill index update");
    return;
  }
  let content = fs.readFileSync(agentsPath, "utf8");
  const row = `| \`${skillName}\` | ${description} |`;
  if (content.includes(`\`${skillName}\``)) {
    console.log(`  skip   skill already listed in AGENTS.md`);
    return;
  }
  const marker = "## 3. Which skill to load";
  const idx = content.indexOf(marker);
  if (idx === -1) {
    content += `\n\n## 3. Which skill to load\n\n| Skill | When to read it |\n|---|---|\n${row}\n`;
    fs.writeFileSync(agentsPath, content, "utf8");
    console.log("  update AGENTS.md (added skill index)");
    return;
  }
  const tableHeader = "| Skill | When to read it |";
  const fromTable = content.indexOf(tableHeader, idx);
  if (fromTable === -1) {
    content = content.replace(
      marker,
      `${marker}\n\n| Skill | When to read it |\n|---|---|\n${row}\n`
    );
  } else {
    const lines = content.slice(fromTable).split("\n");
    let insertAt = 2;
    while (insertAt < lines.length && lines[insertAt].startsWith("|")) insertAt++;
    lines.splice(insertAt, 0, row);
    content = content.slice(0, fromTable) + lines.join("\n");
  }
  fs.writeFileSync(agentsPath, content, "utf8");
  console.log("  update AGENTS.md skill index");
}

function runScan({ reportOnly = false } = {}) {
  console.log(`\nScanning project: ${TARGET_DIR}\n`);
  const scan = scanProject(TARGET_DIR);
  console.log(`  detected  ${scan.meta.framework} (${scan.meta.preset})`);
  console.log(`  pm        ${scan.meta.packageManager}`);
  console.log(`  routing   ${scan.meta.routing}`);
  console.log(`  tests     ${scan.meta.testRunner} / e2e ${scan.meta.e2e}`);
  console.log(`  lint      ${scan.meta.linter} / format ${scan.meta.formatter}`);

  if (reportOnly) {
    console.log("\n--report only; no files written.\n");
    console.log(JSON.stringify({ tokens: scan.tokens, meta: scan.meta }, null, 2));
    return scan;
  }

  if (!fs.existsSync(path.join(TARGET_DIR, "AGENTS.md"))) {
    console.log("\nNo AGENTS.md found. Run `npx @mapl6/agent-kit init` first.\n");
    process.exit(1);
  }

  const { updated, meta } = applyScanToKit(TARGET_DIR, scan, KIT_VERSION);
  console.log("\nUpdated:");
  for (const u of updated) console.log(`  • ${u}`);
  console.log(`\nScan complete (preset: ${meta.preset}). Review generated blocks and commit.\n`);
  return scan;
}

async function promptValues(yes) {
  const scanned = scanProject(TARGET_DIR);
  const defaults = scanned.tokens;

  if (yes) {
    return { ...defaults };
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("\nA few quick questions (defaults from project scan). Press Enter to keep.\n");

  const values = {
    PROJECT_NAME: await ask(rl, "Project name", defaults.PROJECT_NAME),
    STACK: await ask(rl, "Stack", defaults.STACK),
    INSTALL_CMD: await ask(rl, "Install command", defaults.INSTALL_CMD),
    DEV_CMD: await ask(rl, "Dev server command", defaults.DEV_CMD),
    TEST_CMD: await ask(rl, "Test command", defaults.TEST_CMD),
    LINT_CMD: await ask(rl, "Lint command", defaults.LINT_CMD),
    BUILD_CMD: await ask(rl, "Build command", defaults.BUILD_CMD),
  };

  rl.close();
  return values;
}

function printHelp() {
  console.log(`
agent-kit v${KIT_VERSION} — frontend-first self-improving AGENTS.md kit

Usage:
  npx @mapl6/agent-kit [init]       Scaffold kit at repo root, then scan
                                    If AGENTS.md exists, the kit is appended
  npx @mapl6/agent-kit scan         Re-read the project; refresh kit files
  npx @mapl6/agent-kit enhance      Add any missing kit files (no overwrite)
  npx @mapl6/agent-kit add-skill <name>
                                    Scaffold agent/skills/<name>/SKILL.md
  npx @mapl6/agent-kit doctor       Check kit health + print scan summary

Flags:
  --yes, -y       Skip prompts
  --force, -f     Overwrite existing files (init / enhance)
  --no-scan       Skip automatic scan after init
  --report        With scan/doctor: print detection JSON only
  --help, -h      Show this help

scan updates generated blocks in architecture, UI docs, conventions, commands,
rules, MEMORY.md, and .agent-kit.json without wiping your hand-written prose.
`);
}

async function cmdInit({ force, yes, noScan }) {
  console.log(`\nInstalling agent kit into: ${TARGET_DIR}\n`);
  const values = await promptValues(yes);
  console.log("");
  const { copied, skipped } = copyTemplates({ force, onlyMissing: false });
  fillAllTokens(TARGET_DIR, values);

  console.log(`\nScaffold done. ${copied} file(s) created, ${skipped} skipped.`);

  if (!noScan) {
    runScan();
  } else {
    const scan = scanProject(TARGET_DIR);
    applyScanToKit(TARGET_DIR, { ...scan, tokens: { ...scan.tokens, ...values } }, KIT_VERSION);
  }

  console.log("Next steps:");
  console.log("  1. Review AGENTS.md and agent/docs (generated blocks are marked)");
  console.log("  2. Fill remaining [bracketed placeholders]");
  console.log("  3. Commit — then re-run: npx @mapl6/agent-kit scan after stack changes");
  console.log("  4. Grow skills via /agent/improvement.md or: npx @mapl6/agent-kit add-skill <name>\n");
}

async function cmdEnhance({ force }) {
  console.log(`\nEnhancing agent kit in: ${TARGET_DIR}\n`);
  if (!fs.existsSync(path.join(TARGET_DIR, "AGENTS.md")) && !force) {
    console.log("No AGENTS.md found. Run `npx @mapl6/agent-kit init` first.\n");
    process.exit(1);
  }
  const { copied, skipped } = copyTemplates({ force, onlyMissing: !force });
  console.log(`\nEnhance copy: ${copied} added, ${skipped} already present.`);
  runScan();
}

async function cmdAddSkill(name) {
  if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    console.error("\nadd-skill requires a lowercase hyphenated name, e.g. add-skill my-flow\n");
    process.exit(1);
  }
  const skillDir = path.join(TARGET_DIR, "agent", "skills", name);
  const skillFile = path.join(skillDir, "SKILL.md");
  if (fs.existsSync(skillFile)) {
    console.error(`\nSkill already exists: agent/skills/${name}/SKILL.md\n`);
    process.exit(1);
  }
  fs.mkdirSync(skillDir, { recursive: true });
  const body = SKILL_STUB.replace(/\{\{NAME\}\}/g, name).replace(
    /\{\{TITLE\}\}/g,
    titleCase(name)
  );
  fs.writeFileSync(skillFile, body, "utf8");
  console.log(`\n  create agent/skills/${name}/SKILL.md`);
  appendSkillIndex(name, "Replace with a <=60-char capability statement.");
  console.log("\nEdit the SKILL.md, then commit. See skill-authoring + learn-from-source.\n");
}

function cmdDoctor({ reportOnly }) {
  console.log(`\nDoctor — agent-kit v${KIT_VERSION}\n`);
  const required = [
    "AGENTS.md",
    path.join("agent", "improvement.md"),
    path.join("agent", "handoff.md"),
    path.join("agent", "commands.md"),
    path.join("agent", "skills", "AGENTS.md"),
  ];
  let ok = true;
  for (const rel of required) {
    const exists = fs.existsSync(path.join(TARGET_DIR, rel));
    console.log(`  ${exists ? "ok  " : "MISS"}  ${rel}`);
    if (!exists) ok = false;
  }
  const metaPath = path.join(TARGET_DIR, ".agent-kit.json");
  if (fs.existsSync(metaPath)) {
    console.log(`  ok    .agent-kit.json`);
  } else {
    console.log(`  warn  .agent-kit.json missing — run scan`);
  }
  runScan({ reportOnly });
  if (!ok) {
    console.log("Some core files missing — run: npx @mapl6/agent-kit enhance\n");
    process.exit(1);
  }
}

async function main() {
  const { command, rest, force, yes, help, noScan } = parseArgs(process.argv.slice(2));
  const reportOnly = process.argv.includes("--report");

  if (help || command === "help") {
    printHelp();
    return;
  }

  if (command === "init") {
    await cmdInit({ force, yes, noScan });
    return;
  }
  if (command === "enhance") {
    await cmdEnhance({ force });
    return;
  }
  if (command === "add-skill") {
    await cmdAddSkill(rest[0]);
    return;
  }
  if (command === "scan") {
    runScan({ reportOnly });
    return;
  }
  if (command === "doctor") {
    cmdDoctor({ reportOnly });
    return;
  }

  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error("agent-kit failed:", err.message);
  process.exit(1);
});
