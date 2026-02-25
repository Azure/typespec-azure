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

### Instructions

Read the skill file at \`${config.skillPath}\` and follow its instructions carefully.

### Source Code Paths (read-only reference)

${config.sourceCodePaths.map((p) => `- \`${p}\``).join("\n")}

Focus on: **${focus}** — ${focusDescription}`;
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
    console.log(`Skill: ${config.skillPath}`);
    console.log(`Config: ${config.name} (${config.displayName})`);
    console.log(`Focus: ${args.focus}`);
    return;
  }

  // ---------------------------------------------------------------------------
  // Logging helpers
  // ---------------------------------------------------------------------------

  const isCI = !!process.env.CI;

  function timestamp(): string {
    return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  }

  /** Logged line — uses console.log so each line is flushed immediately in CI. */
  function log(prefix: string, message: string): void {
    console.log(`[${timestamp()}] ${prefix} ${message}`);
  }

  /** GitHub Actions collapsible group. Falls back to a plain header outside CI. */
  function startGroup(title: string): void {
    if (isCI) {
      console.log(`::group::${title}`);
    } else {
      console.log(`\n── ${title} ──`);
    }
  }

  function endGroup(): void {
    if (isCI) {
      console.log("::endgroup::");
    }
  }

  // ---------------------------------------------------------------------------
  // Run the agent session
  // ---------------------------------------------------------------------------

  log("⏳", `Starting doc update for ${config.displayName} (focus: ${args.focus})`);
  log("📄", `Skill: ${config.skillPath}`);
  log("🤖", `Model: ${args.model}`);

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

    // Track in-flight tool calls for duration logging
    const toolTimers = new Map<string, { name: string; startMs: number }>();

    // --- Session lifecycle events ---

    session.on("session.start", (event) => {
      log(
        "🟢",
        `Session started (id: ${event.data.sessionId}, model: ${event.data.selectedModel ?? "default"})`,
      );
    });

    session.on("session.error", (event) => {
      log("❌", `Session error [${event.data.errorType}]: ${event.data.message}`);
    });

    session.on("session.warning", (event) => {
      log("⚠️", `Warning [${event.data.warningType}]: ${event.data.message}`);
    });

    session.on("session.info", (event) => {
      log("ℹ️", `${event.data.message}`);
    });

    // --- Assistant output ---

    let deltaBuffer = "";

    session.on("assistant.message_delta", (event) => {
      deltaBuffer += event.data.deltaContent;
      // Flush complete lines so CI sees incremental progress
      const lines = deltaBuffer.split("\n");
      while (lines.length > 1) {
        console.log(lines.shift());
      }
      deltaBuffer = lines[0];
    });

    session.on("assistant.message", () => {
      // Flush any remaining partial line from the delta buffer
      if (deltaBuffer) {
        console.log(deltaBuffer);
        deltaBuffer = "";
      }
    });

    // --- Tool execution events ---

    session.on("tool.execution_start", (event) => {
      const name = event.data.toolName;
      toolTimers.set(event.data.toolCallId, { name, startMs: Date.now() });
      startGroup(`🔧 ${name}`);
    });

    session.on("tool.execution_complete", (event) => {
      const timer = toolTimers.get(event.data.toolCallId);
      const durationSec = timer ? ((Date.now() - timer.startMs) / 1000).toFixed(1) : "?";
      const toolName = timer?.name ?? event.data.toolCallId;
      toolTimers.delete(event.data.toolCallId);

      if (event.data.success) {
        log("✅", `${toolName} completed (${durationSec}s)`);
      } else {
        const errMsg = event.data.error?.message ?? "unknown error";
        log("❌", `${toolName} failed (${durationSec}s): ${errMsg}`);
      }
      endGroup();
    });

    // --- Context management events ---

    session.on("session.compaction_start", () => {
      log("🗜️", "Context compaction started...");
    });

    session.on("session.compaction_complete", (event) => {
      if (event.data.success) {
        const saved = event.data.tokensRemoved ?? 0;
        log("🗜️", `Context compaction complete (${saved} tokens freed)`);
      } else {
        log("⚠️", `Context compaction failed: ${event.data.error ?? "unknown"}`);
      }
    });

    // 90-minute timeout for the agent session
    const TIMEOUT_MS = 90 * 60 * 1000;
    log("📨", "Sending task prompt to Copilot agent...\n");
    const response = await session.sendAndWait({ prompt: taskPrompt }, TIMEOUT_MS);

    if (response?.data.content) {
      console.log("\n\n=== Agent Summary ===");
      console.log(response.data.content);
    }

    await session.destroy();
  } finally {
    await client.stop();
  }

  log("🏁", "Doc update session complete.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
