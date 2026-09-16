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
  toExitCode,
} from "@mapl6/agent-kit-core";

const VERSION = "2.0.0";

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

  program
    .name("agent-kit")
    .description("Local-first agent enhancement framework")
    .version(VERSION);

  program
    .command("init")
    .description("Initialize agent-kit in a project")
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
        console.log(created ? "Created snapshot." : changed ? "Updated snapshot." : "Snapshot unchanged.");
        console.log(
          `  files=${snapshot.stats.fileCount} hashed=${snapshot.stats.indexedCount} skipped=${snapshot.stats.skippedCount}`,
        );
        console.log(`  delta: +${added} ~${updated} -${removed}`);
        console.log(
          `  tech: ${snapshot.technologies.map((t) => t.label).join(", ") || "none"}`,
        );
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
        console.log(
          `  tech: ${status.technologies.map((t) => t.label).join(", ") || "none"}`,
        );
      });
    });

  program
    .command("report")
    .description("Generate Markdown/JSON report and onboarding prompt")
    .option("--path <path>", "Project path", ".")
    .option("--format <format>", "markdown | json | both", "both")
    .option("--stdout", "Print report to stdout instead of only writing files", false)
    .action(
      async (options: { path: string; format: string; stdout?: boolean }) => {
        await run(async () => {
          const format = options.format;
          if (format !== "markdown" && format !== "json" && format !== "both") {
            throw new AppError({
              code: "UNSUPPORTED_OPERATION",
              message: `Unsupported report format: ${format}`,
              suggestedAction: "Use --format markdown, json, or both.",
            });
          }
          const result = await generateReport(
            { path: options.path, format, write: true },
            deps,
          );
          console.log("Wrote:");
          for (const p of result.writtenPaths) console.log(`  ${p}`);
          if (options.stdout) {
            for (const report of result.reports) {
              console.log(`\n----- ${report.format} -----\n`);
              console.log(report.body);
            }
          }
        });
      },
    );

  return program;
}
