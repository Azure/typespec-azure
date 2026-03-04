/**
 * Doc-updater orchestrator using GitHub Copilot SDK.
 *
 * Two-phase pipeline:
 *   Phase 1 — Knowledge Build: Analyze package source code → produce structured knowledge base
 *   Phase 2 — Doc Update: Use knowledge base → update documentation
 *
 * Usage:
 *   tsx src/index.ts --config <name> [--focus <area>] [--phase <phase>] [--full-rebuild] [--dry-run] [--model <model>]
 *
 * Examples:
 *   tsx src/index.ts --config tcgc                             # Run both phases
 *   tsx src/index.ts --config tcgc --phase knowledge           # Only build knowledge
 *   tsx src/index.ts --config tcgc --phase doc-update          # Only update docs (requires existing knowledge)
 *   tsx src/index.ts --config tcgc --full-rebuild              # Force full knowledge rebuild
 *   tsx src/index.ts --config tcgc --focus user-docs           # Focus doc-update on user docs
 *   tsx src/index.ts --config tcgc --dry-run                   # Print prompts without running
 */

import { CopilotClient, approveAll } from "@github/copilot-sdk";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfig, type DocUpdateConfig } from "./config.js";
import {
  getCurrentCommit,
  getGitDiff,
  getKnowledgeRelativePath,
  readKnowledge,
  readMeta,
  writeMeta,
} from "./knowledge.js";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

type Phase = "all" | "knowledge" | "doc-update";

interface CliArgs {
  config: string;
  focus: string;
  dryRun: boolean;
  model: string;
  phase: Phase;
  fullRebuild: boolean;
}

function parseArgs(): CliArgs {
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

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

function timestamp(): string {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function log(message: string): void {
  console.log(`[${timestamp()}] ${message}`);
}

/** Turn a tool call into a human-readable one-liner. */
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
// Prompt loading and building
// ---------------------------------------------------------------------------

/** Directory containing per-package prompt files, relative to this source file. */
const PROMPTS_DIR = resolve(import.meta.dirname ?? ".", "../prompts");

/** Load a prompt file for a given config and phase. */
async function loadPromptFile(configName: string, promptName: string): Promise<string> {
  const filePath = resolve(PROMPTS_DIR, configName, `${promptName}.md`);
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    throw new Error(
      `Prompt file not found: prompts/${configName}/${promptName}.md. ` +
        `Create this file to define the ${promptName} phase for the "${configName}" config.`,
    );
  }
}

/**
 * Build the prompt for the knowledge-build phase.
 *
 * Returns the composed prompt string, or empty string if no source changes
 * have been detected (incremental mode) and a full rebuild was not requested.
 */
async function buildKnowledgePrompt(
  config: DocUpdateConfig,
  fullRebuild: boolean,
): Promise<string> {
  let prompt = await loadPromptFile(config.name, "knowledge-build");

  // Check for incremental mode
  if (!fullRebuild) {
    const meta = await readMeta(config.name);
    if (meta) {
      const diff = getGitDiff(config.sourceCodePaths, meta.lastCommit);
      if (!diff.trim()) {
        return ""; // No source changes — skip knowledge build
      }

      // Incremental: provide existing knowledge + diff
      const existingKnowledge = await readKnowledge(config.name);

      prompt += `\n\n## Incremental Update Mode\n\n`;
      prompt += `Update the existing knowledge base to reflect the source changes shown below. `;
      prompt += `Preserve sections that are unaffected by the changes.\n\n`;

      if (existingKnowledge) {
        prompt += `### Current Knowledge Base\n\n${existingKnowledge}\n\n`;
      }

      prompt += `### Source Changes (since commit \`${meta.lastCommit}\`)\n\n`;
      prompt += `\`\`\`diff\n${diff}\n\`\`\`\n`;
      return prompt;
    }
  }

  // Full build mode
  prompt += `\n\n## Full Build Mode\n\n`;
  prompt += `Analyze the complete codebase and build the knowledge base from scratch. `;
  prompt += `Write the output to \`${getKnowledgeRelativePath(config.name)}\`.\n`;
  return prompt;
}

/**
 * Build the prompt for the doc-update phase.
 *
 * Injects the knowledge base content and runtime context (focus area, date)
 * directly into the prompt so the agent has everything it needs without
 * additional tool calls.
 */
async function buildDocUpdatePrompt(config: DocUpdateConfig, focus: string): Promise<string> {
  const focusDescription = config.focusAreas[focus];
  if (!focusDescription) {
    const available = Object.keys(config.focusAreas).join(", ");
    throw new Error(
      `Unknown focus area "${focus}" for config "${config.name}". Available: ${available}`,
    );
  }

  const knowledge = await readKnowledge(config.name);
  if (!knowledge) {
    throw new Error(
      `No knowledge base found for "${config.name}". ` +
        `Run with --phase knowledge first to build it.`,
    );
  }

  let prompt = await loadPromptFile(config.name, "doc-update");
  const date = new Date().toISOString().split("T")[0];

  prompt += `\n\n## Runtime Context\n\n`;
  prompt += `**Date:** ${date}\n`;
  prompt += `**Focus Area:** ${focus} — ${focusDescription}\n`;

  prompt += `\n## Package Knowledge Base\n\n`;
  prompt += knowledge;

  return prompt;
}

// ---------------------------------------------------------------------------
// Agent session runner
// ---------------------------------------------------------------------------

interface SessionOptions {
  model: string;
  repoRoot: string;
  phaseName: string;
}

/**
 * Create a Copilot SDK session, attach event handlers, send the prompt,
 * wait for completion, and clean up.
 */
async function runAgentSession(
  client: CopilotClient,
  prompt: string,
  opts: SessionOptions,
): Promise<void> {
  log(`[${opts.phaseName}] Creating session (model: ${opts.model})...`);

  const session = await client.createSession({
    model: opts.model,
    streaming: true,
    onPermissionRequest: approveAll,
    // Keep skill access for doc-update phase (e.g., @doc-example-generator)
    skillDirectories: [resolve(opts.repoRoot, ".github/skills")],
  });

  try {
    // --- Stream assistant text and reasoning output ---

    let deltaBuffer = "";
    let reasoningBuffer = "";

    session.on("assistant.message_delta", (event) => {
      deltaBuffer += event.data.deltaContent;
      const lines = deltaBuffer.split("\n");
      while (lines.length > 1) {
        const line = lines.shift()!;
        if (line.trim()) log(`[${opts.phaseName}] ${line}`);
      }
      deltaBuffer = lines[0];
    });

    session.on("assistant.message", () => {
      if (deltaBuffer?.trim()) {
        log(`[${opts.phaseName}] ${deltaBuffer}`);
      }
      deltaBuffer = "";
    });

    session.on("assistant.reasoning_delta", (event) => {
      reasoningBuffer += event.data.deltaContent;
      const lines = reasoningBuffer.split("\n");
      while (lines.length > 1) {
        const line = lines.shift()!;
        if (line.trim()) log(`[${opts.phaseName}] Reasoning: ${line}`);
      }
      reasoningBuffer = lines[0];
    });

    session.on("assistant.reasoning", () => {
      if (reasoningBuffer?.trim()) {
        log(`[${opts.phaseName}] Reasoning: ${reasoningBuffer}`);
      }
      reasoningBuffer = "";
    });

    session.on("tool.execution_start", (event) => {
      const desc = describeToolCall(event.data.toolName, event.data.arguments);
      if (desc) {
        log(`[${opts.phaseName}] ${desc}`);
      }
    });

    session.on("session.error", (event) => {
      log(`[${opts.phaseName}] ERROR [${event.data.errorType}]: ${event.data.message}`);
    });

    session.on("skill.invoked", (event) => {
      log(`[${opts.phaseName}] Using skill: ${event.data.name} (${event.data.path})`);
    });

    session.on("subagent.started", (event) => {
      log(`[${opts.phaseName}] Subagent started: ${event.data.agentDisplayName}`);
    });

    session.on("subagent.completed", (event) => {
      log(`[${opts.phaseName}] Subagent completed: ${event.data.agentDisplayName}`);
    });

    session.on("subagent.failed", (event) => {
      log(
        `[${opts.phaseName}] Subagent failed: ${event.data.agentDisplayName} — ${event.data.error}`,
      );
    });

    // 90-minute timeout per phase
    const TIMEOUT_MS = 90 * 60 * 1000;
    log(`[${opts.phaseName}] Sending prompt...`);
    const response = await session.sendAndWait({ prompt }, TIMEOUT_MS);

    if (response?.data.content) {
      log(`[${opts.phaseName}] === Summary ===`);
      console.log(response.data.content);
    }
  } finally {
    await session.destroy();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs();
  const config = await loadConfig(args.config);

  // Resolve repo root (4 levels up from eng/scripts/doc-updater/src/)
  const repoRoot = resolve(import.meta.dirname ?? ".", "../../../..");

  // --- Dry run: print prompts and exit ---
  if (args.dryRun) {
    console.log("=== DRY RUN ===\n");
    console.log(`Config:        ${config.name} (${config.displayName})`);
    console.log(`Model:         ${args.model}`);
    console.log(`Phase:         ${args.phase}`);
    console.log(`Focus:         ${args.focus}`);
    console.log(`Full Rebuild:  ${args.fullRebuild}`);
    console.log();

    if (args.phase === "all" || args.phase === "knowledge") {
      try {
        const prompt = await buildKnowledgePrompt(config, args.fullRebuild);
        console.log("--- Knowledge Build Prompt ---");
        console.log(prompt || "(skipped — no source changes detected)");
        console.log();
      } catch (e) {
        console.log(`Knowledge prompt error: ${e}`);
        console.log();
      }
    }

    if (args.phase === "all" || args.phase === "doc-update") {
      try {
        const prompt = await buildDocUpdatePrompt(config, args.focus);
        console.log("--- Doc Update Prompt ---");
        console.log(prompt);
      } catch (e) {
        console.log(`Doc update prompt error: ${e}`);
      }
    }
    return;
  }

  // --- Run the pipeline ---

  // Ensure the Copilot CLI agent starts in the repo root so it can
  // access all packages, docs, and run commands correctly.
  process.chdir(repoRoot);

  const client = new CopilotClient();

  try {
    // Phase 1: Knowledge Build
    if (args.phase === "all" || args.phase === "knowledge") {
      log(
        `Starting knowledge build for ${config.displayName} ` +
          `(full-rebuild: ${args.fullRebuild})`,
      );

      const knowledgePrompt = await buildKnowledgePrompt(config, args.fullRebuild);

      if (knowledgePrompt) {
        await runAgentSession(client, knowledgePrompt, {
          model: args.model,
          repoRoot,
          phaseName: "Knowledge Build",
        });

        // Record the commit we just analyzed
        await writeMeta(config.name, {
          lastCommit: getCurrentCommit(),
          lastUpdated: new Date().toISOString(),
          analyzedPaths: config.sourceCodePaths,
        });

        log("Knowledge build phase complete.");
      } else {
        log("No source changes detected — skipping knowledge build.");
      }
    }

    // Phase 2: Doc Update
    if (args.phase === "all" || args.phase === "doc-update") {
      log(
        `Starting doc update for ${config.displayName} ` +
          `(focus: ${args.focus}, model: ${args.model})`,
      );

      const docPrompt = await buildDocUpdatePrompt(config, args.focus);

      await runAgentSession(client, docPrompt, {
        model: args.model,
        repoRoot,
        phaseName: "Doc Update",
      });

      log("Doc update phase complete.");
    }
  } finally {
    await client.stop();
  }

  log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
