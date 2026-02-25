/**
 * Doc-updater orchestrator using GitHub Copilot SDK.
 *
 * Usage:
 *   tsx src/index.ts --config <name> [--focus <area>] [--dry-run] [--model <model>]
 *
 * Examples:
 *   tsx src/index.ts --config tcgc --focus user-docs
 *   tsx src/index.ts --config tcgc --focus all --model claude-opus-4.6
 *   tsx src/index.ts --config tcgc --dry-run
 */

import { resolve } from "node:path";
import { listConfigs, loadConfig, type DocUpdateConfig } from "./config.js";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  config: string;
  focus: string;
  dryRun: boolean;
  model: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {
    config: "",
    focus: "all",
    dryRun: false,
    model: "claude-opus-4.6",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--config":
        parsed.config = args[++i];
        break;
      case "--focus":
        parsed.focus = args[++i];
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--model":
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

async function printUsage(): Promise<void> {
  const available = await listConfigs();
  console.log(`
Usage: tsx src/index.ts --config <name> [options]

Options:
  --config <name>   Config name to use (required)
  --focus <area>    Focus area within the config (default: "all")
  --dry-run         Print the prompt without running the agent
  --model <model>   Model to use (default: "claude-opus-4.6")
  --help            Show this help message

Available configs: ${available.join(", ")}
`);
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildTaskPrompt(config: DocUpdateConfig, focus: string): string {
  const focusDescription = config.focusAreas[focus];
  if (!focusDescription) {
    const available = Object.keys(config.focusAreas).join(", ");
    throw new Error(
      `Unknown focus area "${focus}" for config "${config.name}". Available: ${available}`,
    );
  }

  const date = new Date().toISOString().split("T")[0];

  return `## Documentation Update Task

**Package:** ${config.displayName}
**Date:** ${date}
**Focus Area:** ${focus} — ${focusDescription}

Use the @${config.skillName} skill and follow its instructions carefully.`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs();
  const config = await loadConfig(args.config);

  // Resolve repo root (4 levels up from eng/scripts/doc-updater/src/)
  const repoRoot = resolve(import.meta.dirname ?? ".", "../../../..");
  const taskPrompt = buildTaskPrompt(config, args.focus);

  if (args.dryRun) {
    console.log("=== DRY RUN ===\n");
    console.log("--- Task Prompt ---");
    console.log(taskPrompt);
    console.log("\n--- Config ---");
    console.log(`Model: ${args.model}`);
    console.log(`Config: ${config.name} (${config.displayName})`);
    console.log(`Focus: ${args.focus}`);
    return;
  }

  // ---------------------------------------------------------------------------
  // Logging helpers
  // ---------------------------------------------------------------------------

  function timestamp(): string {
    return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  }

  function log(message: string): void {
    console.log(`[${timestamp()}] ${message}`);
  }

  // ---------------------------------------------------------------------------
  // Run the agent session
  // ---------------------------------------------------------------------------

  log(`Starting doc update for ${config.displayName} (focus: ${args.focus}, model: ${args.model})`);

  // Ensure the Copilot CLI agent starts in the repo root so it can
  // access all packages, docs, and run commands correctly.
  process.chdir(repoRoot);

  const { CopilotClient, approveAll } = await import("@github/copilot-sdk");
  const client = new CopilotClient();

  try {
    const session = await client.createSession({
      model: args.model,
      streaming: true,
      onPermissionRequest: approveAll,
    });

    // --- Log errors and assistant thinking steps ---

    session.on("session.error", (event) => {
      log(`ERROR [${event.data.errorType}]: ${event.data.message}`);
    });

    session.on("assistant.turn_start", () => {
      log("Agent thinking...");
    });

    session.on("tool.execution_start", (event) => {
      log(`Running tool: ${event.data.toolName}`);
    });

    // 90-minute timeout for the agent session
    const TIMEOUT_MS = 90 * 60 * 1000;
    log("Sending task prompt...");
    const response = await session.sendAndWait({ prompt: taskPrompt }, TIMEOUT_MS);

    if (response?.data.content) {
      console.log("\n=== Agent Summary ===");
      console.log(response.data.content);
    }

    await session.destroy();
  } finally {
    await client.stop();
  }

  log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
