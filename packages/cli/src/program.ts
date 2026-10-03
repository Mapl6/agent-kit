import { Command } from "commander";
import {
  AppError,
  ExitCode,
  JsonConfigRepository,
  JsonSnapshotRepository,
  formatCliError,
  generateReport,
  getProjectStatus,
  indexProject,
  initProject,
  renderScanText,
  scanProject,
  toExitCode,
} from "@mapl6/agent-kit-core";

const VERSION = "2.1.0";

function createDeps() {
  return {
    configs: new JsonConfigRepository(),
    snapshots: new JsonSnapshotRepository(),
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

export function createProgram(): Command {
  const program = new Command();
  const deps = createDeps();

  program.name("agent-kit").description("Local-first agent enhancement framework").version(VERSION);

  program
    .command("scan", { isDefault: true })
    .description("Analyze the repository (read-only, default command)")
    .option("--path <path>", "Project path", ".")
    .option("--json", "Print the scan result as JSON", false)
    .action(async (options: { path: string; json?: boolean }) => {
      await run(async () => {
        const started = Date.now();
        const result = await scanProject({ path: options.path });
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        console.log(renderScanText(result));
        console.log(`Scanned in ${Date.now() - started} ms.`);
      });
    });

  program
    .command("init")
    .description("Initialize agent-kit in a project (writes .agent-kit/)")
    .option("--path <path>", "Project path", ".")
    .option("--skip-index", "Skip initial indexing", false)
    .option("--force", "Re-write config if already initialized", false)
    .action(async (options: { path: string; skipIndex?: boolean; force?: boolean }) => {
      await run(async () => {
        const result = await initProject(
          {
            path: options.path,
            skipIndex: Boolean(options.skipIndex),
            force: Boolean(options.force),
          },
          deps,
        );
        console.log(`Initialized agent-kit at ${result.projectRoot}`);
        console.log(`  config: .agent-kit/config.json`);
        if (result.index) {
          console.log(
            `  index: ${result.index.snapshot.stats.fileCount} files` +
              ` (${result.index.added} added, ${result.index.updated} updated, ${result.index.removed} removed)`,
          );
        } else {
          console.log("  index: skipped");
        }
      });
    });

  program
    .command("index")
    .description("Build or refresh the project snapshot")
    .option("--path <path>", "Project path", ".")
    .action(async (options: { path: string }) => {
      await run(async () => {
        const result = await indexProject({ path: options.path }, deps);
        const { snapshot, created, changed, added, removed, updated } = result;
        console.log(
          created ? "Created snapshot." : changed ? "Updated snapshot." : "Snapshot unchanged.",
        );
        console.log(
          `  files=${snapshot.stats.fileCount} hashed=${snapshot.stats.indexedCount} skipped=${snapshot.stats.skippedCount}`,
        );
        console.log(`  delta: +${added} ~${updated} -${removed}`);
        console.log(`  tech: ${snapshot.technologies.map((t) => t.label).join(", ") || "none"}`);
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
          console.log("  Run `agent-kit init`");
          process.exitCode = ExitCode.INVALID_INPUT;
          return;
        }
        console.log(`Initialized: ${status.projectRoot}`);
        console.log(`  last index: ${status.lastIndexedAt ?? "never"}`);
        console.log(`  files: ${status.fileCount}`);
        console.log(`  tech: ${status.technologies.map((t) => t.label).join(", ") || "none"}`);
      });
    });

  program
    .command("report")
    .description("[deprecated: use `scan`] Write Markdown/JSON report and onboarding prompt")
    .option("--path <path>", "Project path", ".")
    .option("--format <format>", "markdown | json | both", "both")
    .option("--stdout", "Print report to stdout instead of only writing files", false)
    .action(async (options: { path: string; format: string; stdout?: boolean }) => {
      await run(async () => {
        console.error(
          "Note: `report` is deprecated and will be removed in a future version. Use `agent-kit scan` or `agent-kit scan --json`.",
        );
        const format = options.format;
        if (format !== "markdown" && format !== "json" && format !== "both") {
          throw new AppError({
            code: "UNSUPPORTED_OPERATION",
            message: `Unsupported report format: ${format}`,
            suggestedAction: "Use --format markdown, json, or both.",
          });
        }
        const result = await generateReport({ path: options.path, format, write: true }, deps);
        console.log("Wrote:");
        for (const p of result.writtenPaths) console.log(`  ${p}`);
        if (options.stdout) {
          for (const report of result.reports) {
            console.log(`\n----- ${report.format} -----\n`);
            console.log(report.body);
          }
        }
      });
    });

  return program;
}
