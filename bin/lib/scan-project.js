"use strict";

const fs = require("fs");
const path = require("path");

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "out",
  "coverage",
  ".turbo",
  ".vercel",
  "hermess-agent",
  ".cache",
  "storybook-static",
]);

function exists(root, rel) {
  return fs.existsSync(path.join(root, rel));
}

function readJson(filePath) {
  try {
    let raw = fs.readFileSync(filePath, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function listTopDirs(root) {
  try {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !IGNORE_DIRS.has(d.name) && !d.name.startsWith("."))
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

function findFirst(root, names) {
  for (const name of names) {
    if (exists(root, name)) return name;
  }
  return null;
}

function detectPackageManager(root) {
  if (exists(root, "bun.lockb") || exists(root, "bun.lock")) return "bun";
  if (exists(root, "pnpm-lock.yaml")) return "pnpm";
  if (exists(root, "yarn.lock")) return "yarn";
  if (exists(root, "package-lock.json")) return "npm";
  return "npm";
}

function runCmd(pm, script) {
  if (pm === "npm") return `npm run ${script}`;
  if (pm === "yarn") return `yarn ${script}`;
  if (pm === "bun") return `bun run ${script}`;
  return `${pm} ${script}`;
}

function installCmd(pm) {
  if (pm === "npm") return "npm install";
  if (pm === "yarn") return "yarn";
  if (pm === "bun") return "bun install";
  return `${pm} install`;
}

function hasAnyDep(deps, names) {
  return names.some((n) => deps[n]);
}

function walkShallow(root, maxDepth = 3) {
  const files = [];
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else files.push(path.relative(root, full).replace(/\\/g, "/"));
    }
  }
  walk(root, 0);
  return files;
}

/**
 * Deep scan of a frontend (or JS) project. Returns structured detection + token values.
 */
function scanProject(root) {
  const pkg = readJson(path.join(root, "package.json")) || {};
  const scripts = pkg.scripts || {};
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const pm = detectPackageManager(root);
  const topDirs = listTopDirs(root);
  const files = walkShallow(root, 3);

  const isNext = Boolean(deps.next) || Boolean(findFirst(root, ["next.config.js", "next.config.mjs", "next.config.ts"]));
  const isVite = Boolean(deps.vite) || Boolean(findFirst(root, ["vite.config.js", "vite.config.ts", "vite.config.mjs"]));
  const isRemix = Boolean(deps["@remix-run/react"] || deps["@remix-run/node"]);
  const isAstro = Boolean(deps.astro);
  const hasReact = Boolean(deps.react);
  const hasVue = Boolean(deps.vue);
  const hasSvelte = Boolean(deps.svelte) || Boolean(deps["@sveltejs/kit"]);
  const hasTs =
    exists(root, "tsconfig.json") ||
    Boolean(deps.typescript) ||
    files.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

  let framework = "frontend";
  let preset = "frontend";
  if (isNext) {
    framework = "Next.js";
    preset = "next";
  } else if (isRemix) {
    framework = "Remix";
    preset = "remix";
  } else if (isAstro) {
    framework = "Astro";
    preset = "astro";
  } else if (isVite && hasReact) {
    framework = "Vite + React";
    preset = "vite-react";
  } else if (isVite && hasVue) {
    framework = "Vite + Vue";
    preset = "vite-vue";
  } else if (hasSvelte) {
    framework = "Svelte";
    preset = "svelte";
  } else if (hasReact) {
    framework = "React";
    preset = "react";
  } else if (hasVue) {
    framework = "Vue";
    preset = "vue";
  }

  const appRouter = exists(root, "app") || exists(root, "src/app");
  const pagesRouter = exists(root, "pages") || exists(root, "src/pages");
  let routing = "unknown";
  if (isNext && appRouter) routing = "Next.js App Router";
  else if (isNext && pagesRouter) routing = "Next.js Pages Router";
  else if (pagesRouter) routing = "file-based pages/";
  else if (deps["react-router-dom"] || deps["react-router"]) routing = "React Router";
  else if (isVite) routing = "Vite SPA (client router or single page)";

  const componentsDir = ["src/components", "components", "app/components", "src/ui", "ui"].find((p) =>
    exists(root, p)
  );
  const featuresDir = ["src/features", "features", "src/modules", "modules"].find((p) => exists(root, p));
  const libDir = ["src/lib", "lib", "src/utils", "utils"].find((p) => exists(root, p));
  const stylesHint = deps.tailwindcss
    ? "Tailwind CSS"
    : deps["styled-components"]
      ? "styled-components"
      : deps["@emotion/react"]
        ? "Emotion"
        : exists(root, "src/styles") || exists(root, "styles")
          ? "CSS / CSS modules"
          : "unknown";

  const testRunner = deps.vitest
    ? "Vitest"
    : deps.jest || deps["@jest/core"]
      ? "Jest"
      : scripts.test
        ? "custom (see package.json test script)"
        : "none detected";
  const e2e = deps.playwright || deps["@playwright/test"]
    ? "Playwright"
    : deps.cypress
      ? "Cypress"
      : exists(root, "playwright.config.ts") || exists(root, "playwright.config.js")
        ? "Playwright"
        : "none detected";

  const linter = exists(root, "biome.json") || exists(root, "biome.jsonc") || deps["@biomejs/biome"]
    ? "Biome"
    : deps.eslint || findFirst(root, ["eslint.config.js", "eslint.config.mjs", "eslint.config.ts", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json"])
      ? "ESLint"
      : "none detected";

  const formatter = deps.prettier || findFirst(root, [".prettierrc", ".prettierrc.js", ".prettierrc.cjs", "prettier.config.js"])
    ? "Prettier"
    : linter === "Biome"
      ? "Biome"
      : "none detected";

  const envPrefix = isNext || deps.next ? "NEXT_PUBLIC_" : isVite || deps.vite ? "VITE_" : "PUBLIC_";

  const monorepo =
    exists(root, "pnpm-workspace.yaml") ||
    exists(root, "turbo.json") ||
    exists(root, "nx.json") ||
    (exists(root, "packages") && exists(root, "apps"));

  const script = (name, fallback) => (scripts[name] ? runCmd(pm, name) : fallback);

  const tokens = {
    PROJECT_NAME: pkg.name || path.basename(root),
    STACK: `${framework}${hasTs ? " / TypeScript" : " / JavaScript"}`,
    INSTALL_CMD: installCmd(pm),
    DEV_CMD: script("dev", script("start", `${runCmd(pm, "dev")}`)),
    TEST_CMD: script("test", `${runCmd(pm, "test")}`),
    LINT_CMD: script("lint", `${runCmd(pm, "lint")}`),
    BUILD_CMD: script("build", `${runCmd(pm, "build")}`),
    TYPECHECK_CMD: script("typecheck", scripts["type-check"] ? runCmd(pm, "type-check") : hasTs ? `npx tsc --noEmit` : "[no typecheck]"),
    FORMAT_CMD: script("format", formatter === "Prettier" ? `${pm === "npm" ? "npx" : pm} prettier --write .` : "[format command]"),
    E2E_CMD: script("test:e2e", script("e2e", e2e !== "none detected" ? `[${e2e} command]` : "[e2e command]")),
  };

  const folderTree = topDirs.map((d) => `/${d}`).join("\n");

  return {
    tokens,
    meta: {
      version: null, // filled by caller
      preset,
      packageManager: pm,
      framework,
      typescript: hasTs,
      routing,
      styling: stylesHint,
      testRunner,
      e2e,
      linter,
      formatter,
      envPrefix,
      monorepo,
      paths: {
        components: componentsDir || null,
        features: featuresDir || null,
        lib: libDir || null,
        appRouter,
        pagesRouter,
      },
      topDirs,
      scripts: Object.keys(scripts),
      scannedAt: new Date().toISOString().slice(0, 10),
    },
    folderTree,
    signals: {
      hasPlaywright: e2e === "Playwright",
      hasCypress: e2e === "Cypress",
      hasStorybook: Boolean(deps.storybook || deps["@storybook/react"]),
      hasTailwind: Boolean(deps.tailwindcss),
      monorepo,
    },
  };
}

function fillAllTokens(root, tokens, extraFiles = []) {
  const defaults = [
    "AGENTS.md",
    path.join("agent", "commands.md"),
    path.join("agent", "checklist.md"),
    path.join("agent", "skills", "setup-env", "SKILL.md"),
    path.join("agent", "skills", "add-new-feature", "SKILL.md"),
    path.join("agent", "skills", "deploy", "SKILL.md"),
    path.join("agent", "skills", "add-ui-page", "SKILL.md"),
    path.join("agent", "skills", "dogfood-ui", "SKILL.md"),
    path.join("agent", "rules", "testing.md"),
  ];
  const files = [...new Set([...defaults, ...extraFiles])];
  for (const rel of files) {
    const filePath = path.join(root, rel);
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, "utf8");
    let changed = false;
    for (const [key, value] of Object.entries(tokens)) {
      const token = `{{${key}}}`;
      if (content.includes(token)) {
        content = content.split(token).join(value || `[${key.toLowerCase()}]`);
        changed = true;
      }
    }
    if (changed) fs.writeFileSync(filePath, content, "utf8");
  }
}

function upsertGeneratedBlock(content, blockId, body) {
  const start = `<!-- agent-kit:generated:${blockId}:start -->`;
  const end = `<!-- agent-kit:generated:${blockId}:end -->`;
  const block = `${start}\n${body.trim()}\n${end}`;
  const re = new RegExp(
    `${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
  );
  if (re.test(content)) return content.replace(re, block);
  return `${content.trimEnd()}\n\n${block}\n`;
}

function writeFile(root, rel, content) {
  const filePath = path.join(root, rel);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function patchOrCreate(root, rel, updater) {
  const filePath = path.join(root, rel);
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const next = updater(prev);
  if (next !== prev) {
    writeFile(root, rel, next);
    return true;
  }
  return false;
}

/**
 * Apply scan results into kit markdown files (safe generated blocks + token fill).
 */
function applyScanToKit(root, scan, kitVersion) {
  const updated = [];
  const { tokens, meta, folderTree, signals } = scan;
  meta.version = kitVersion;

  fillAllTokens(root, tokens);
  updated.push("tokens filled in AGENTS.md / commands / checklist / skills / rules");

  // .agent-kit.json
  writeFile(
    root,
    ".agent-kit.json",
    `${JSON.stringify({ version: kitVersion, preset: meta.preset, detected: meta }, null, 2)}\n`
  );
  updated.push(".agent-kit.json");

  // commands.md — regenerate command table block
  const cmdBody = `| Task | Command |
|---|---|
| Install dependencies | \`${tokens.INSTALL_CMD}\` |
| Run dev server | \`${tokens.DEV_CMD}\` |
| Run all tests | \`${tokens.TEST_CMD}\` |
| Lint | \`${tokens.LINT_CMD}\` |
| Format | \`${tokens.FORMAT_CMD}\` |
| Typecheck | \`${tokens.TYPECHECK_CMD}\` |
| Build | \`${tokens.BUILD_CMD}\` |
| E2E | \`${tokens.E2E_CMD}\` |

Detected: package manager **${meta.packageManager}**, framework **${meta.framework}**, tests **${meta.testRunner}**, e2e **${meta.e2e}**.`;

  if (
    patchOrCreate(root, path.join("agent", "commands.md"), (prev) => {
      const base =
        prev ||
        `# Commands\n\nExact commands — agents should use these verbatim instead of guessing.\n`;
      return upsertGeneratedBlock(base, "commands", cmdBody);
    })
  ) {
    updated.push("agent/commands.md");
  }

  // architecture.md
  const archBody = `## Auto-detected overview
- **Project:** ${tokens.PROJECT_NAME}
- **Stack:** ${tokens.STACK}
- **Package manager:** ${meta.packageManager}
- **Monorepo:** ${meta.monorepo ? "yes" : "no"}
- **Routing:** ${meta.routing}
- **Styling:** ${meta.styling}

## Folder map (top-level)
\`\`\`
${folderTree || "(no top-level dirs detected)"}
\`\`\`

## Detected paths
- Components: \`${meta.paths.components || "[not found — fill in]"}\`
- Features: \`${meta.paths.features || "[not found — fill in]"}\`
- Lib/utils: \`${meta.paths.lib || "[not found — fill in]"}\`

> Edit prose above/below this block freely. Re-run \`npx @mapl6/agent-kit scan\` to refresh the generated section only.`;

  if (
    patchOrCreate(root, path.join("agent", "docs", "architecture.md"), (prev) => {
      const base = prev || `# Architecture\n\n`;
      return upsertGeneratedBlock(base, "architecture", archBody);
    })
  ) {
    updated.push("agent/docs/architecture.md");
  }

  // ui-architecture.md
  const uiBody = `## Auto-detected UI shape
- **Routing:** ${meta.routing}
- **App Router present:** ${meta.paths.appRouter ? "yes" : "no"}
- **Pages Router present:** ${meta.paths.pagesRouter ? "yes" : "no"}
- **Components dir:** \`${meta.paths.components || "[set path]"}\`
- **Features dir:** \`${meta.paths.features || "[set path]"}\`
- **Styling:** ${meta.styling}
- **Public env prefix:** \`${meta.envPrefix}\`

## Suggested layers
| Layer | Path | Rule |
|---|---|---|
| Primitives | \`${meta.paths.components || "components/"}\` | No feature business logic |
| Feature | \`${meta.paths.features || "features/<name>"}\` | Feature-specific UI + hooks |
| Shared lib | \`${meta.paths.lib || "lib/"}\` | Helpers, clients |`;

  if (
    patchOrCreate(root, path.join("agent", "docs", "ui-architecture.md"), (prev) => {
      const base = prev || `# UI architecture\n\n`;
      return upsertGeneratedBlock(base, "ui-architecture", uiBody);
    })
  ) {
    updated.push("agent/docs/ui-architecture.md");
  }

  // conventions.md
  const convBody = `## Auto-detected conventions
- Package manager: **${meta.packageManager}** (respect the lockfile)
- Env public prefix: \`${meta.envPrefix}*\` — never put secrets in public vars
- Linter: ${meta.linter}
- Formatter: ${meta.formatter}
- TypeScript: ${meta.typescript ? "yes" : "no / not detected"}
${meta.monorepo ? "- Monorepo detected — prefer package-local scripts; add nested `AGENTS.md` under apps/packages when useful\n" : ""}`;

  if (
    patchOrCreate(root, path.join("agent", "context", "conventions.md"), (prev) => {
      const base = prev || `# Conventions\n\n`;
      return upsertGeneratedBlock(base, "conventions", convBody);
    })
  ) {
    updated.push("agent/context/conventions.md");
  }

  // testing.md rules
  const testBody = `## Auto-detected test stack
- Unit/integration: **${meta.testRunner}** — \`${tokens.TEST_CMD}\`
- E2E: **${meta.e2e}** — \`${tokens.E2E_CMD}\`
- Prefer user-visible assertions in component tests
${signals.hasPlaywright || signals.hasCypress ? "- For exploratory UI QA use `/agent/skills/dogfood-ui/SKILL.md`\n" : ""}`;

  if (
    patchOrCreate(root, path.join("agent", "rules", "testing.md"), (prev) => {
      const base = prev || `# Testing Rules\n\n`;
      return upsertGeneratedBlock(base, "testing", testBody);
    })
  ) {
    updated.push("agent/rules/testing.md");
  }

  // coding-style.md
  const styleBody = `## Auto-detected language
- **${meta.typescript ? "TypeScript" : "JavaScript"}** project (${tokens.STACK})
- Linter: ${meta.linter}; formatter: ${meta.formatter}
- Prefer existing components in \`${meta.paths.components || "components/"}\` over new primitives`;

  if (
    patchOrCreate(root, path.join("agent", "rules", "coding-style.md"), (prev) => {
      const base = prev || `# Coding Style Rules\n\n`;
      return upsertGeneratedBlock(base, "coding-style", styleBody);
    })
  ) {
    updated.push("agent/rules/coding-style.md");
  }

  // MEMORY.md — curated hot facts
  const memoryEntries = [
    `Stack: ${tokens.STACK}; package manager: ${meta.packageManager}`,
    `Dev: ${tokens.DEV_CMD}; Test: ${tokens.TEST_CMD}; Lint: ${tokens.LINT_CMD}; Build: ${tokens.BUILD_CMD}`,
    `Routing: ${meta.routing}; components: ${meta.paths.components || "unknown"}; styling: ${meta.styling}`,
    `Public env prefix: ${meta.envPrefix}; scanned ${meta.scannedAt}`,
  ].join("\n---\n");

  if (
    patchOrCreate(root, path.join("agent", "memory", "MEMORY.md"), (prev) => {
      const header =
        prev && prev.includes("# MEMORY")
          ? prev.split("<!-- agent-kit:generated:memory:start -->")[0]
          : `# MEMORY.md\n\nCurated cross-session facts (keep short). Entries separated by \`§\`.\nSoft budget ~2200 characters. See README in this folder.\n\n`;
      return upsertGeneratedBlock(header, "memory", memoryEntries);
    })
  ) {
    updated.push("agent/memory/MEMORY.md");
  }

  // session-log entry
  const logPath = path.join(root, "agent", "memory", "session-log.md");
  const logEntry = `
## ${meta.scannedAt} — Agent kit project scan
- Agent: agent-kit scan
- Task: Auto-detect stack and refresh kit generated sections
- Outcome: Done
- Notes: preset=${meta.preset}; pm=${meta.packageManager}; framework=${meta.framework}; routing=${meta.routing}
- Ref: .agent-kit.json
`;
  if (fs.existsSync(logPath)) {
    let log = fs.readFileSync(logPath, "utf8");
    if (!log.includes("Agent kit project scan") || !log.includes(meta.scannedAt)) {
      // allow one entry per day title; still append if different day content
      if (!log.includes(`## ${meta.scannedAt} — Agent kit project scan`)) {
        fs.writeFileSync(logPath, `${log.trimEnd()}\n${logEntry}\n`, "utf8");
        updated.push("agent/memory/session-log.md");
      }
    }
  }

  // AGENTS.md scan facts (keeps any user-written content outside the kit block)
  patchOrCreate(root, "AGENTS.md", (prev) => {
    if (!prev) return prev;
    let next = prev;
    if (next.includes("{{STACK}}")) next = next.replace(/\{\{STACK\}\}/g, tokens.STACK);
    if (next.includes("{{PROJECT_NAME}}")) {
      next = next.replace(/\{\{PROJECT_NAME\}\}/g, tokens.PROJECT_NAME);
    }
    const scanBody = `- Project: ${tokens.PROJECT_NAME}
- Stack: ${tokens.STACK}
- Last scan: ${meta.scannedAt} (preset \`${meta.preset}\`) — re-run \`npx @mapl6/agent-kit scan\` after stack changes`;
    next = upsertGeneratedBlock(next, "scan", scanBody);
    if (!next.includes("`learn-from-source`") && next.includes("| Skill |")) {
      next = next.replace(
        "| `skill-authoring` | Create or patch a `SKILL.md`. |",
        "| `skill-authoring` | Create or patch a `SKILL.md`. |\n| `learn-from-source` | Turn a path, URL, or session into a new skill. |"
      );
    }
    if (next !== prev) updated.push("AGENTS.md");
    return next;
  });

  // Ensure .gitignore has override
  const gi = path.join(root, ".gitignore");
  const ignoreLines = ["AGENTS.override.md", "SOUL.md"];
  if (fs.existsSync(gi)) {
    let g = fs.readFileSync(gi, "utf8");
    let changed = false;
    for (const line of ignoreLines) {
      if (!g.split(/\r?\n/).includes(line)) {
        g = `${g.trimEnd()}\n${line}\n`;
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(gi, g, "utf8");
      updated.push(".gitignore (AGENTS.override.md, SOUL.md)");
    }
  } else {
    writeFile(root, ".gitignore", `${ignoreLines.join("\n")}\n`);
    updated.push(".gitignore");
  }

  return { updated, meta, tokens };
}

module.exports = {
  scanProject,
  applyScanToKit,
  fillAllTokens,
  detectPackageManager,
};
