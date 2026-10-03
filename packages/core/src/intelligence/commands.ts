import type { Detection, Evidence } from "../domain/types.js";
import { readPackageJson } from "../scanner/package-json.js";
import type { ScanContext } from "../scanner/types.js";
import type { CommandTask, ProjectCommand } from "./types.js";

/** Script names that conventionally mean each task, most specific first. */
const SCRIPT_CANDIDATES: Array<[CommandTask, string[]]> = [
  ["dev", ["dev", "develop", "start:dev", "serve"]],
  ["build", ["build"]],
  ["start", ["start"]],
  ["test", ["test", "test:unit", "unit"]],
  ["e2e", ["test:e2e", "e2e", "playwright", "cypress"]],
  ["lint", ["lint", "eslint"]],
  ["typecheck", ["typecheck", "type-check", "check-types", "types", "tsc"]],
  ["format", ["format", "prettier", "fmt"]],
];

const RUNNERS: Record<string, { run: string; exec: string; install: string }> = {
  npm: { run: "npm run", exec: "npx", install: "npm install" },
  pnpm: { run: "pnpm run", exec: "pnpm exec", install: "pnpm install" },
  yarn: { run: "yarn run", exec: "yarn", install: "yarn install" },
  bun: { run: "bun run", exec: "bunx", install: "bun install" },
};

/** `npm init` writes this as the test script; it is not a real test command. */
function isPlaceholderTestScript(body: string): boolean {
  return /no test specified/i.test(body);
}

export async function deriveCommands(
  ctx: ScanContext,
  detections: readonly Detection[],
): Promise<ProjectCommand[]> {
  const pkg = await readPackageJson(ctx);
  if (!pkg) return [];

  const location = ctx.dir;
  const pm = detections.find((d) => d.category === "packageManager" && d.location === ".");
  const runner = RUNNERS[pm?.id ?? "npm"] ?? RUNNERS.npm!;
  const scripts =
    pkg.scripts && typeof pkg.scripts === "object" ? (pkg.scripts as Record<string, unknown>) : {};
  const at = (id: string) => detections.some((d) => d.id === id && d.location === location);
  const commands: ProjectCommand[] = [];

  if (location === "." && pm) {
    commands.push({
      task: "install",
      command: runner.install,
      cwd: ".",
      confidence: pm.confidence,
      source: { type: pm.source.type, detector: "commands" },
      evidence: pm.evidence,
    });
  }

  for (const [task, names] of SCRIPT_CANDIDATES) {
    const name = names.find((n) => {
      const body = scripts[n];
      return typeof body === "string" && !(task === "test" && isPlaceholderTestScript(body));
    });
    if (!name) continue;
    commands.push({
      task,
      command: `${runner.run} ${name}`,
      cwd: location,
      confidence: "high",
      source: { type: "detected", detector: "commands" },
      evidence: [
        { kind: "script", path: "package.json", detail: `${name}: ${String(scripts[name])}` },
      ],
    });
  }

  // Fallbacks when a tool is present but no script wraps it. Inferred: the
  // project never said this is how it wants the tool run.
  const has = (task: CommandTask) => commands.some((c) => c.task === task);
  const inferred = (task: CommandTask, command: string, evidence: Evidence[]) =>
    commands.push({
      task,
      command,
      cwd: location,
      confidence: "medium",
      source: { type: "inferred", detector: "commands" },
      evidence,
    });

  if (!has("typecheck") && ctx.exists("tsconfig.json")) {
    inferred("typecheck", `${runner.exec} tsc --noEmit`, [{ kind: "file", path: "tsconfig.json" }]);
  }
  if (!has("test") && at("vitest")) {
    inferred("test", `${runner.exec} vitest run`, [{ kind: "detection", detail: "vitest" }]);
  } else if (!has("test") && at("jest")) {
    inferred("test", `${runner.exec} jest`, [{ kind: "detection", detail: "jest" }]);
  }
  // The bare `playwright` package is often a screenshot/scraping library; only
  // infer an e2e command when the test runner itself is configured.
  const playwright = detections.find((d) => d.id === "playwright" && d.location === location);
  const playwrightRunner = playwright?.evidence.some(
    (e) => e.detail === "@playwright/test" || e.path?.startsWith("playwright.config"),
  );
  if (!has("e2e") && playwrightRunner) {
    inferred("e2e", `${runner.exec} playwright test`, [
      { kind: "detection", detail: "playwright" },
    ]);
  }
  if (!has("lint") && at("eslint")) {
    inferred("lint", `${runner.exec} eslint .`, [{ kind: "detection", detail: "eslint" }]);
  }

  const order = ["install", ...SCRIPT_CANDIDATES.map(([t]) => t)];
  return commands.sort((a, b) => order.indexOf(a.task) - order.indexOf(b.task));
}
