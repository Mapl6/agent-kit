import { createRequire } from "node:module";
import { Command } from "commander";
import {
  ExitCode,
  JsonConfigRepository,
  JsonProjectModelRepository,
  JsonSnapshotRepository,
  analyzeProject,
  formatCliError,
  getProjectStatus,
  indexProject,
  initProject,
  listAgents,
  renderAnalysisText,
  serializeProjectModel,
  syncProject,
  toExitCode,
  uninstallProject,
  type PlannedWrite,
} from "@mapl6/agent-kit-core";

const { version: VERSION } = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

function createDeps() {
  return {
    configs: new JsonConfigRepository(),
    snapshots: new JsonSnapshotRepository(),
    models: new JsonProjectModelRepository(),
  };
}

async function run(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.error(formatCliError(error));
    process.exitCode = toExitCode(error);
  }
}

const VERBS: Record<PlannedWrite["action"], [string, string]> = {
  create: ["create", "would create"],
  update: ["update", "would update"],
  unchanged: ["unchanged", "unchanged"],
  remove: ["remove block", "would remove block"],
  delete: ["delete", "would delete"],
  skip: ["skip", "skip"],
  conflict: ["CONFLICT", "CONFLICT"],
};

function printWrites(writes: PlannedWrite[], dryRun: boolean): void {
  console.log(dryRun ? "Dry run. Would write:" : "Files:");
  if (writes.length === 0) console.log("  (nothing to do)");
  for (const w of writes) {
    const verb = VERBS[w.action][dryRun ? 1 : 0];
    console.log(`  ${verb.padEnd(19)} ${w.path}${w.reason ? `  (${w.reason})` : ""}`);
  }
  if (dryRun) console.log("No changes made.");
}

function finish(result: { warnings?: string[]; conflicts: number }): void {
  for (const w of result.warnings ?? []) console.log(`⚠ ${w}`);
  if (result.conflicts > 0) {
    console.error(
      `${result.conflicts} file(s) left untouched because of a conflict. Fix them (see reason) and re-run.`,
    );
    process.exitCode = ExitCode.INVALID_INPUT;
  }
}

export function createProgram(): Command {
  const program = new Command();
  const deps = createDeps();

  program
    .name("agent-kit")
    .description("Project intelligence layer for AI coding agents")
    .version(VERSION);

  program
    .command("scan", { isDefault: true })
    .description("Analyze the repository (read-only, default command)")
    .option("--path <path>", "Project path", ".")
    .option("--json", "Print the raw scan result (detections) as JSON", false)
    .option(
      "--model",
      "Print the project model as JSON (what `index` writes to project.json)",
      false,
    )
    .action(async (options: { path: string; json?: boolean; model?: boolean }) => {
      await run(async () => {
        const started = Date.now();
        const { scan, model } = await analyzeProject({ path: options.path });
        if (options.model) {
          process.stdout.write(serializeProjectModel(model));
          return;
        }
        if (options.json) {
          console.log(JSON.stringify(scan, null, 2));
          return;
        }
        console.log(renderAnalysisText(scan, model));
        console.log(`Scanned in ${Date.now() - started} ms.`);
      });
    });

  program
    .command("init")
    .description("Set up Agent Kit: .agent-kit/ plus agent instruction files")
    .option("--path <path>", "Project path", ".")
    .option(
      "--agents <list>",
      "Agents to set up, comma-separated (agents-md, claude-code, cursor, codex, copilot). Default: detected",
    )
    .option("--no-agents", "Don't write any agent instruction files (only .agent-kit/)")
    .option("--skip-index", "Only write config; no index, model or agent files", false)
    .option("--force", "Re-initialize an existing setup", false)
    .option("--dry-run", "Show what would change without writing", false)
    .action(
      async (options: {
        path: string;
        agents?: string | boolean;
        skipIndex?: boolean;
        force?: boolean;
        dryRun?: boolean;
      }) => {
        await run(async () => {
          const result = await initProject(
            {
              path: options.path,
              agents:
                options.agents === false
                  ? false
                  : options.agents === true
                    ? undefined
                    : options.agents,
              skipIndex: Boolean(options.skipIndex),
              force: Boolean(options.force),
              dryRun: Boolean(options.dryRun),
            },
            deps,
          );
          console.log(
            `${result.dryRun ? "Would initialize" : "Initialized"} Agent Kit at ${result.projectRoot}`,
          );
          if (result.agents.length) console.log(`Agents: ${result.agents.join(", ")}`);
          printWrites(result.writes, result.dryRun);
          finish(result);
          if (!result.dryRun && result.conflicts === 0) {
            console.log(
              "\nNext: review the generated files, commit them, and run `agent-kit sync` after tooling changes.",
            );
          }
        });
      },
    );

  program
    .command("sync")
    .description("Re-index and regenerate agent files from the current repository")
    .option("--path <path>", "Project path", ".")
    .option("--agents <list>", "Replace the enabled agents (comma-separated)")
    .option("--dry-run", "Show what would change without writing", false)
    .action(async (options: { path: string; agents?: string; dryRun?: boolean }) => {
      await run(async () => {
        const result = await syncProject(
          { path: options.path, agents: options.agents, dryRun: Boolean(options.dryRun) },
          deps,
        );
        console.log(`Agents: ${result.agents.join(", ")}`);
        printWrites(result.writes, result.dryRun);
        finish(result);
      });
    });

  program
    .command("agents")
    .description("Show supported agents, which are enabled, and how each loads the project context")
    .option("--path <path>", "Project path", ".")
    .option("--json", "Print as JSON", false)
    .action(async (options: { path: string; json?: boolean }) => {
      await run(async () => {
        const result = await listAgents({ path: options.path }, deps);
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        const yes = (v: string) => ({ yes: "✓", partial: "~", no: "✗", unverified: "?" })[v] ?? v;
        console.log(
          `Agents for ${result.projectRoot}${result.configured ? "" : " (not set up yet: showing defaults)"}\n`,
        );
        console.log(
          "  Agent                 Enabled  Mode        AGENTS.md  Nested  Imports  Path rules",
        );
        for (const a of result.agents) {
          const c = a.capabilities;
          console.log(
            `  ${a.label.padEnd(21)} ${(a.enabled ? "yes" : "no").padEnd(8)} ${a.mode.padEnd(11)} ` +
              `${yes(c.agentsMd).padEnd(10)} ${yes(c.nestedAgentsMd).padEnd(7)} ${yes(c.imports).padEnd(8)} ${yes(c.pathScopedRules)}`,
          );
        }
        console.log("\n  ✓ supported  ~ partial  ✗ not supported  ? not verified\n");
        for (const a of result.agents) {
          const why =
            a.enabledBy === "detected"
              ? ` Detected: ${a.detected
                  .map((e) => e.path)
                  .filter(Boolean)
                  .join(", ")}.`
              : "";
          console.log(`  ${a.label}: ${a.notes}${why}`);
          console.log(`    Docs (checked ${a.verifiedAt}): ${a.docs.join(" ")}`);
        }
        console.log("\nChange the set with `agent-kit sync --agents agents-md,claude-code,...`.");
      });
    });

  program
    .command("index")
    .description("Refresh .agent-kit/snapshot.json and .agent-kit/project.json only")
    .option("--path <path>", "Project path", ".")
    .option("--dry-run", "Show what would change without writing", false)
    .action(async (options: { path: string; dryRun?: boolean }) => {
      await run(async () => {
        const result = await indexProject(
          { path: options.path, dryRun: Boolean(options.dryRun) },
          deps,
        );
        const { snapshot, added, removed, updated } = result;
        console.log(
          `files=${snapshot.stats.fileCount} hashed=${snapshot.stats.indexedCount} skipped=${snapshot.stats.skippedCount}` +
            ` delta: +${added} ~${updated} -${removed}`,
        );
        printWrites(result.writes, Boolean(options.dryRun));
      });
    });

  program
    .command("status")
    .description("Show initialization and index status")
    .option("--path <path>", "Project path", ".")
    .action(async (options: { path: string }) => {
      await run(async () => {
        const status = await getProjectStatus({ path: options.path }, deps);
        if (!status.initialized) {
          console.log(`Not initialized: ${status.projectRoot}`);
          console.log("Suggested action:");
          console.log("  Run `agent-kit init` (or `agent-kit init --dry-run` to preview)");
          process.exitCode = ExitCode.INVALID_INPUT;
          return;
        }
        console.log(`Initialized: ${status.projectRoot}`);
        console.log(`  last index: ${status.lastIndexedAt ?? "never"}`);
        console.log(`  files: ${status.fileCount}`);
        console.log(
          `  project model: ${status.projectModelPath ? "present" : "missing (run `agent-kit index`)"}`,
        );
        console.log(`  tech: ${status.technologies.map((t) => t.label).join(", ") || "none"}`);
      });
    });

  program
    .command("uninstall")
    .description("Remove everything Agent Kit added: agent file blocks, created files, .agent-kit/")
    .option("--path <path>", "Project path", ".")
    .option("--keep-data", "Keep .agent-kit/ and only remove agent file blocks", false)
    .option("--dry-run", "Show what would change without writing", false)
    .action(async (options: { path: string; keepData?: boolean; dryRun?: boolean }) => {
      await run(async () => {
        const result = await uninstallProject({
          path: options.path,
          keepData: Boolean(options.keepData),
          dryRun: Boolean(options.dryRun),
        });
        printWrites(result.writes, result.dryRun);
        finish(result);
      });
    });

  return program;
}
