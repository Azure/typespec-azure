/**
 * CLI argument parsing for the doc-updater.
 */

export type Phase = "all" | "knowledge" | "doc-update";

export interface CliArgs {
  config: string;
  focus: string;
  dryRun: boolean;
  model: string;
  phase: Phase;
  fullRebuild: boolean;
}

export function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {
    config: "",
    focus: "all",
    dryRun: false,
    model: "claude-opus-4.6",
    phase: "all",
    fullRebuild: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--config":
        if (i + 1 >= args.length || args[i + 1].startsWith("--")) {
          console.error("Error: --config requires a value");
          printUsage();
          process.exit(1);
        }
        parsed.config = args[++i];
        break;
      case "--focus":
        if (i + 1 >= args.length || args[i + 1].startsWith("--")) {
          console.error("Error: --focus requires a value");
          printUsage();
          process.exit(1);
        }
        parsed.focus = args[++i];
        break;
      case "--phase":
        if (i + 1 >= args.length || args[i + 1].startsWith("--")) {
          console.error("Error: --phase requires a value");
          printUsage();
          process.exit(1);
        }
        parsed.phase = args[++i] as Phase;
        if (!["all", "knowledge", "doc-update"].includes(parsed.phase)) {
          console.error("Error: --phase must be one of: all, knowledge, doc-update");
          printUsage();
          process.exit(1);
        }
        break;
      case "--full-rebuild":
        parsed.fullRebuild = true;
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--model":
        if (i + 1 >= args.length || args[i + 1].startsWith("--")) {
          console.error("Error: --model requires a value");
          printUsage();
          process.exit(1);
        }
        parsed.model = args[++i];
        break;
      case "--help":
        printUsage();
        process.exit(0);
      default:
        console.error(`Unknown argument: ${args[i]}`);
        printUsage();
        process.exit(1);
    }
  }

  if (!parsed.config) {
    console.error("Error: --config is required");
    printUsage();
    process.exit(1);
  }

  return parsed;
}

function printUsage(): void {
  console.log(`
Usage: tsx src/index.ts --config <name> [options]

Options:
  --config <name>     Config name to use (required)
  --focus <area>      Focus area for doc-update phase (default: "all")
  --phase <phase>     Phase to run: all, knowledge, doc-update (default: "all")
  --full-rebuild      Force full knowledge rebuild (ignore incremental cache)
  --dry-run           Print the prompts without running the agent
  --model <model>     Model to use (default: "claude-opus-4.6")
  --help              Show this help message

Phases:
  all          Run knowledge build, then doc update (default)
  knowledge    Only analyze source code and build/update knowledge base
  doc-update   Only update docs using existing knowledge base
`);
}
