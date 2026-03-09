/**
 * Doc-updater orchestrator using GitHub Copilot SDK.
 *
 * Two-phase pipeline:
 *   Phase 1 — Knowledge Build: Analyze source code → build/update knowledge base (system-driven)
 *   Phase 2 — Doc Update: Use knowledge base → update documentation (per-package prompt)
 *
 * Knowledge build uses a system prompt derived from the doc-update prompt.
 * Incremental updates are batched into multiple sessions to manage context size.
 *
 * Usage:
 *   tsx src/index.ts --config <name> [--focus <area>] [--phase <phase>] [--full-rebuild] [--dry-run] [--model <model>]
 */

import { CopilotClient, approveAll, type MCPServerConfig } from "@github/copilot-sdk";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfig, type DocUpdateConfig } from "./config.js";
import {
  chunkArray,
  getCurrentCommit,
  getHumanFeedback,
  getKnowledgeRelativePath,
  listCommitsSince,
  readKnowledge,
  readMeta,
  writeMeta,
  type HumanFeedback,
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

// ---------------------------------------------------------------------------
// MCP server configuration
// ---------------------------------------------------------------------------

/**
 * Build the GitHub MCP server configuration for the knowledge-build phase.
 *
 * This gives the agent access to git/GitHub tools so it can interactively
 * explore commit history, diffs, and file contents instead of having the
 * full diff injected into the prompt.
 */
function buildGitHubMcpConfig(): Record<string, MCPServerConfig> {
  const token = process.env.COPILOT_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? "";
  return {
    github: {
      type: "http",
      url: "https://api.githubcopilot.com/mcp/",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      tools: ["get_file_contents", "list_commits", "get_commit"],
    },
  };
}

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

/** Maximum number of commits to include in a single incremental knowledge update session. */
const COMMITS_PER_BATCH = 10;

/**
 * Build the system prompt for a full knowledge build.
 *
 * This is system-driven — the user only maintains the doc-update prompt.
 * The prompt is intentionally open-ended: it gives the LLM the doc-update
 * instructions and lets it decide what information is worth caching.
 */
function buildFullKnowledgePrompt(config: DocUpdateConfig, docUpdatePrompt: string): string {
  const paths = config.sourceCodePaths.map((p) => `- \`${p}\``).join("\n");
  const knowledgePath = getKnowledgeRelativePath(config.name);

  return `You are building a **knowledge base** for **${config.displayName}**.

${config.description}

## Source Code Locations

${paths}

## Output

Write the knowledge base to: \`${knowledgePath}\`

## Context

A separate documentation update agent will use this knowledge base as its only reference when updating documentation. That agent will read what you write here first to reduce the efforts of reading full source code.

Below are the instructions the doc-update agent will follow. Read them carefully to understand what information it will need:

<doc-update-instructions>
${docUpdatePrompt}
</doc-update-instructions>

## Instructions

Analyze the source code and existing documentation. Then write a knowledge base that contains everything the doc-update agent would need to carry out those instructions effectively.

You decide the structure and what to include. Think about what the doc-update agent will need to look up, cross-reference, or verify — and make sure that information is in the knowledge base so it doesn't have to read source code itself.`;
}

/**
 * Build the system prompt for an incremental knowledge update session.
 *
 * Each session processes a batch of commits to keep context manageable.
 * Focuses on how code changes affect the documentation landscape.
 */
function buildIncrementalKnowledgePrompt(
  config: DocUpdateConfig,
  commitHashes: string[],
  existingKnowledge: string,
  docUpdatePrompt: string,
): string {
  const paths = config.sourceCodePaths.map((p) => `- \`${p}\``).join("\n");
  const knowledgePath = getKnowledgeRelativePath(config.name);
  const commits = commitHashes.map((h) => `- \`${h}\``).join("\n");

  return `You are performing an incremental update to the knowledge base for **${config.displayName}**.

${config.description}

## Source Code Locations

${paths}

## Doc-Update Instructions

The doc-update agent that consumes this knowledge base follows these instructions. Use them to judge whether a commit affects information the knowledge base should capture:

<doc-update-instructions>
${docUpdatePrompt}
</doc-update-instructions>

## Commits to Analyze

The following commits (oldest first) need to be reviewed:

${commits}

**Repository:** \`Azure/typespec-azure\`

Use GitHub MCP tools to inspect each commit. Determine whether the changes affect anything the knowledge base should capture. Skip commits that are irrelevant (pure refactors, CI, formatting, dependency bumps).

## Output

Write the updated knowledge base to: \`${knowledgePath}\`

**Important:** Preserve sections not affected by these commits. Only update what the commits actually change.

## Current Knowledge Base

${existingKnowledge}`;
}

/**
 * Build the system prompt for a feedback-driven knowledge update.
 *
 * When humans modify a doc-updater PR before merging, their changes
 * represent corrections or improvements the knowledge base should learn from.
 */
function buildFeedbackPrompt(
  config: DocUpdateConfig,
  feedback: HumanFeedback,
  existingKnowledge: string,
  docUpdatePrompt: string,
): string {
  const knowledgePath = getKnowledgeRelativePath(config.name);

  let feedbackSection = `## Human Feedback from PR #${feedback.prNumber}\n\n`;

  if (feedback.commits.length > 0) {
    feedbackSection += `### Commits added by reviewers\n\n`;
    for (const c of feedback.commits) {
      feedbackSection += `- \`${c.sha}\` — ${c.message}\n`;
    }
    feedbackSection += `\nUse GitHub MCP tools to inspect these commits and understand what the reviewers changed and why.\n\n`;
  }

  if (feedback.reviewComments.length > 0) {
    feedbackSection += `### Review comments\n\n`;
    for (const comment of feedback.reviewComments) {
      feedbackSection += `> ${comment}\n\n`;
    }
  }

  return `You are updating the knowledge base for **${config.displayName}** based on human feedback.

${config.description}

A previous automated doc-update PR was reviewed and modified by humans before being merged. Their changes indicate corrections, preferences, or additional context that the knowledge base should capture so future updates don't repeat the same mistakes.

The doc-update agent that produced the PR followed these instructions. Use them to understand the agent's intent and judge what kind of correction each human change represents:

<doc-update-instructions>
${docUpdatePrompt}
</doc-update-instructions>

${feedbackSection}

## Instructions

Review the human changes and comments. Update the knowledge base to reflect what you learn:
- If humans corrected a factual error, fix the corresponding knowledge
- If humans added context or clarification, incorporate that information
- If humans changed formatting or conventions, update the conventions section
- If humans rejected a change, note what should NOT be done

## Output

Write the updated knowledge base to: \`${knowledgePath}\`

Preserve sections not affected by the feedback. Only update what the human corrections inform.

## Current Knowledge Base

${existingKnowledge}`;
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
  /** Optional MCP servers to attach to this session */
  mcpServers?: Record<string, MCPServerConfig>;
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
    ...(opts.mcpServers ? { mcpServers: opts.mcpServers } : {}),
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
      // Check for human feedback on last doc-update PR
      try {
        const meta = args.fullRebuild ? null : await readMeta(config.name);
        if (meta?.lastPrNumber) {
          const feedback = getHumanFeedback(meta.lastPrNumber);
          if (feedback) {
            const existingKnowledge = (await readKnowledge(config.name)) ?? "(none)";
            const docUpdatePrompt = await loadPromptFile(config.name, "doc-update");
            const prompt = buildFeedbackPrompt(
              config,
              feedback,
              existingKnowledge,
              docUpdatePrompt,
            );
            console.log("--- Feedback Prompt ---");
            console.log(prompt);
            console.log();
          } else {
            console.log("--- Feedback ---");
            console.log(`(no human feedback detected on PR #${meta.lastPrNumber})`);
            console.log();
          }
        }
      } catch (e) {
        console.log(`Feedback check error: ${e}`);
        console.log();
      }

      try {
        const meta = args.fullRebuild ? null : await readMeta(config.name);
        if (!meta || args.fullRebuild) {
          const docUpdatePrompt = await loadPromptFile(config.name, "doc-update");
          const prompt = buildFullKnowledgePrompt(config, docUpdatePrompt);
          console.log("--- Knowledge Build Prompt (Full) ---");
          console.log(prompt);
          console.log();
        } else {
          const commits = listCommitsSince(config.sourceCodePaths, meta.lastCommit);
          if (commits.length === 0) {
            console.log("--- Knowledge Build ---");
            console.log("(skipped — no source changes detected)");
            console.log();
          } else {
            const batches = chunkArray(commits, COMMITS_PER_BATCH);
            console.log(
              `--- Knowledge Build (Incremental: ${commits.length} commits in ${batches.length} batch(es)) ---`,
            );
            const existingKnowledge = (await readKnowledge(config.name)) ?? "(none)";
            const docUpdatePrompt = await loadPromptFile(config.name, "doc-update");
            const prompt = buildIncrementalKnowledgePrompt(
              config,
              batches[0],
              existingKnowledge,
              docUpdatePrompt,
            );
            console.log(prompt);
            if (batches.length > 1) {
              console.log(`\n... (${batches.length - 1} more batch(es) would follow)`);
            }
            console.log();
          }
        }
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
    // Phase 0: Feedback Loop — learn from human corrections on the last PR
    if (args.phase === "all" || args.phase === "knowledge") {
      const meta = await readMeta(config.name);
      if (meta?.lastPrNumber && !args.fullRebuild) {
        log(`Checking for human feedback on PR #${meta.lastPrNumber}...`);
        const feedback = getHumanFeedback(meta.lastPrNumber);

        if (feedback) {
          const feedbackSummary = [
            feedback.commits.length > 0 ? `${feedback.commits.length} human commit(s)` : "",
            feedback.reviewComments.length > 0
              ? `${feedback.reviewComments.length} review comment(s)`
              : "",
          ]
            .filter(Boolean)
            .join(", ");
          log(`Human feedback detected: ${feedbackSummary}. Running feedback session...`);

          const existingKnowledge = await readKnowledge(config.name);
          if (existingKnowledge) {
            const docUpdatePrompt = await loadPromptFile(config.name, "doc-update");
            const prompt = buildFeedbackPrompt(
              config,
              feedback,
              existingKnowledge,
              docUpdatePrompt,
            );
            await runAgentSession(client, prompt, {
              model: args.model,
              repoRoot,
              phaseName: "Feedback",
              mcpServers: buildGitHubMcpConfig(),
            });
            log("Feedback session complete.");
          }
        } else {
          log(`No human feedback detected on PR #${meta.lastPrNumber}.`);
        }
      }
    }

    // Phase 1: Knowledge Build (system-driven pre-step)
    if (args.phase === "all" || args.phase === "knowledge") {
      log(
        `Starting knowledge build for ${config.displayName} ` +
          `(full-rebuild: ${args.fullRebuild})`,
      );

      const meta = args.fullRebuild ? null : await readMeta(config.name);
      const needsFullBuild = !meta || args.fullRebuild;

      if (needsFullBuild) {
        // Full build — single session, derives knowledge structure from doc-update prompt
        const docUpdatePrompt = await loadPromptFile(config.name, "doc-update");
        const prompt = buildFullKnowledgePrompt(config, docUpdatePrompt);

        await runAgentSession(client, prompt, {
          model: args.model,
          repoRoot,
          phaseName: "Knowledge Build",
          mcpServers: buildGitHubMcpConfig(),
        });

        await writeMeta(config.name, {
          lastCommit: getCurrentCommit(),
          lastUpdated: new Date().toISOString(),
          analyzedPaths: config.sourceCodePaths,
        });

        log("Knowledge build (full) complete.");
      } else {
        // Incremental — batch commits into multiple short sessions
        const commits = listCommitsSince(config.sourceCodePaths, meta.lastCommit);

        if (commits.length === 0) {
          log("No source changes detected — skipping knowledge build.");
        } else {
          const batches = chunkArray(commits, COMMITS_PER_BATCH);
          log(
            `Found ${commits.length} commit(s) since last build. ` +
              `Processing in ${batches.length} batch(es).`,
          );

          const docUpdatePrompt = await loadPromptFile(config.name, "doc-update");

          for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            log(`Processing batch ${i + 1}/${batches.length} (${batch.length} commits)...`);

            const existingKnowledge = await readKnowledge(config.name);
            if (!existingKnowledge) {
              throw new Error(
                `Knowledge base not found for incremental update of "${config.name}". ` +
                  `Run with --full-rebuild first.`,
              );
            }

            const prompt = buildIncrementalKnowledgePrompt(
              config,
              batch,
              existingKnowledge,
              docUpdatePrompt,
            );
            await runAgentSession(client, prompt, {
              model: args.model,
              repoRoot,
              phaseName: `Knowledge Update [${i + 1}/${batches.length}]`,
              mcpServers: buildGitHubMcpConfig(),
            });

            // Record progress after each batch so we can resume on failure
            const lastCommitInBatch = batch[batch.length - 1];
            await writeMeta(config.name, {
              lastCommit: lastCommitInBatch,
              lastUpdated: new Date().toISOString(),
              analyzedPaths: config.sourceCodePaths,
            });

            log(`Batch ${i + 1}/${batches.length} complete.`);
          }

          log("Knowledge build (incremental) complete.");
        }
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
