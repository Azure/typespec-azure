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

  /** Turn a tool call into a human-readable one-liner like VS Code's agent panel. */
  function describeToolCall(toolName: string, args: unknown): string | undefined {
    const a = (args ?? {}) as Record<string, unknown>;
    const path = (a.file ?? a.filePath ?? a.path ?? a.pattern ?? "") as string;
    switch (toolName) {
      case "view":
      case "read_file":
      case "read_agent":
        return path ? `Read ${path}` : undefined;
      case "edit":
      case "edit_file":
      case "write":
      case "create":
        return path ? `Edited ${path}` : undefined;
      case "grep":
        return `Searched for "${a.regex ?? a.pattern ?? a.query ?? ""}"`;
      case "glob":
        return `Listed files matching ${path}`;
      case "bash":
      case "shell":
      case "task": {
        const cmd = ((a.command ?? a.cmd ?? "") as string).slice(0, 120);
        return cmd ? `Running: ${cmd}` : undefined;
      }
      default:
        return undefined;
    }
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
      skillDirectories: [resolve(repoRoot, ".github/skills")],
    });

    // --- Stream assistant text and reasoning output ---

    let deltaBuffer = "";
    let reasoningBuffer = "";

    session.on("assistant.message_delta", (event) => {
      deltaBuffer += event.data.deltaContent;
      const lines = deltaBuffer.split("\n");
      while (lines.length > 1) {
        const line = lines.shift()!;
        if (line.trim()) log(line);
      }
      deltaBuffer = lines[0];
    });

    session.on("assistant.message", () => {
      if (deltaBuffer?.trim()) {
        log(deltaBuffer);
      }
      deltaBuffer = "";
    });

    session.on("assistant.reasoning_delta", (event) => {
      reasoningBuffer += event.data.deltaContent;
      const lines = reasoningBuffer.split("\n");
      while (lines.length > 1) {
        const line = lines.shift()!;
        if (line.trim()) log(`Reasoning: ${line}`);
      }
      reasoningBuffer = lines[0];
    });

    session.on("assistant.reasoning", () => {
      if (reasoningBuffer?.trim()) {
        log(`Reasoning: ${reasoningBuffer}`);
      }
      reasoningBuffer = "";
    });

    session.on("tool.execution_start", (event) => {
      const desc = describeToolCall(event.data.toolName, event.data.arguments);
      if (desc) {
        log(desc);
      }
    });

    session.on("session.error", (event) => {
      log(`ERROR [${event.data.errorType}]: ${event.data.message}`);
    });

    session.on("skill.invoked", (event) => {
      log(`Using skill: ${event.data.name} (${event.data.path})`);
    });

    session.on("subagent.started", (event) => {
      log(`Subagent started: ${event.data.agentDisplayName}`);
    });

    session.on("subagent.completed", (event) => {
      log(`Subagent completed: ${event.data.agentDisplayName}`);
    });

    session.on("subagent.failed", (event) => {
      log(`Subagent failed: ${event.data.agentDisplayName} — ${event.data.error}`);
    });

    // 90-minute timeout for the agent session
    const TIMEOUT_MS = 90 * 60 * 1000;
    log("Sending task prompt...");
    const response = await session.sendAndWait({ prompt: taskPrompt }, TIMEOUT_MS);

    if (response?.data.content) {
      log("=== Agent Summary ===");
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
