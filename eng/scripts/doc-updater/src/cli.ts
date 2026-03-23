/**
 * CLI argument parsing for the doc-updater.
 */

export interface CliArgs {
  config: string;
  dryRun: boolean;
  model: string;
  fullRebuild: boolean;
}

export function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {
    config: "",
    dryRun: false,
    model: "claude-opus-4.6",
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
  --full-rebuild      Force full knowledge rebuild (ignore incremental cache)
  --dry-run           Print the prompts without running the agent
  --model <model>     Model to use (default: "claude-opus-4.6")
  --help              Show this help message
`);
}
