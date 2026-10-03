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
  renderAnalysisText,
  serializeProjectModel,
  toExitCode,
  type PlannedWrite,
} from "@mapl6/agent-kit-core";

const VERSION = "3.0.0";

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

function printWrites(writes: PlannedWrite[], dryRun: boolean): void {
  console.log(dryRun ? "Dry run. Would write:" : "Files:");
  for (const w of writes) {
    const verb = w.action === "unchanged" ? "unchanged" : dryRun ? `would ${w.action}` : w.action;
    console.log(`  ${verb.padEnd(14)} ${w.path}`);
  }
  if (dryRun) console.log("No changes made.");
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
    .description("Initialize agent-kit in a project (writes .agent-kit/)")
    .option("--path <path>", "Project path", ".")
    .option("--skip-index", "Skip initial indexing", false)
    .option("--force", "Re-write config if already initialized", false)
    .option("--dry-run", "Show what would be written without writing", false)
    .action(
      async (options: { path: string; skipIndex?: boolean; force?: boolean; dryRun?: boolean }) => {
        await run(async () => {
          const result = await initProject(
            {
              path: options.path,
              skipIndex: Boolean(options.skipIndex),
              force: Boolean(options.force),
              dryRun: Boolean(options.dryRun),
            },
            deps,
          );
          console.log(
            `${result.dryRun ? "Would initialize" : "Initialized"} agent-kit at ${result.projectRoot}`,
          );
          printWrites(result.writes, result.dryRun);
        });
      },
    );

  program
    .command("index")
    .description("Refresh .agent-kit/snapshot.json and .agent-kit/project.json")
    .option("--path <path>", "Project path", ".")
    .option("--dry-run", "Show what would be written without writing", false)
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

  return program;
}
