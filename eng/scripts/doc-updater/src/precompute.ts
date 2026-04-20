/**
 * Pre-compute deterministic context for the doc-updater agentic workflow.
 *
 * This script extracts all information the AI agent needs into a structured
 * JSON file. Critically, **no untrusted text** (review comments, commit
 * messages) enters the output — only code diffs, which are not natural
 * language instructions and thus resist prompt injection.
 *
 * Usage:
 *   npx tsx src/precompute.ts --config <name> --output <path> [--full-rebuild]
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { loadConfig } from "./config.js";
import {
  getCommitDiff,
  getCurrentCommit,
  getHumanFeedback,
  getKnowledgeRelativePath,
  getLatestMergedAutomatedPr,
  listCommitsSince,
  readKnowledge,
  readMeta,
} from "./state.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Structured context passed to the agentic workflow agent. */
export interface PrecomputedContext {
  config: {
    name: string;
    displayName: string;
    description: string;
  };

  /** "full" = rebuild everything, "incremental" = only changed areas, "skip" = no changes */
  mode: "full" | "incremental" | "skip";

  /** ISO date string for the run */
  date: string;

  /**
   * Changed source commits with pre-extracted diffs (incremental mode only).
   * Only code diffs are included — commit messages are deliberately excluded
   * to prevent prompt injection.
   */
  changes?: {
    commits: Array<{
      sha: string;
      diff: string;
    }>;
  };

  /**
   * Feedback from human corrections on the last doc-update PR.
   * Only code diffs from human commits are included.
   * Review comments and commit messages are deliberately excluded —
   * they are untrusted text that could contain prompt injection.
   * The agent infers reviewer intent from the code changes themselves.
   */
  feedback?: {
    prNumber: number;
    humanCommitDiffs: Array<{
      sha: string;
      diff: string;
    }>;
  };

  /** Current knowledge base content, or null if not yet built */
  knowledge: string | null;

  /** Repo-relative path to the knowledge base file */
  knowledgePath: string;

  /** File path prefixes the agent is allowed to modify (enforced by post-step) */
  allowedPaths: string[];

  /** The git commit hash at checkout time (before the agent runs) */
  checkoutCommit: string;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface PrecomputeArgs {
  config: string;
  output: string;
  fullRebuild: boolean;
}

function parsePrecomputeArgs(): PrecomputeArgs {
  const args = process.argv.slice(2);
  const parsed: PrecomputeArgs = {
    config: "",
    output: "",
    fullRebuild: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--config":
        parsed.config = args[++i];
        break;
      case "--output":
        parsed.output = args[++i];
        break;
      case "--full-rebuild":
        parsed.fullRebuild = true;
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!parsed.config || !parsed.output) {
    console.error(
      "Usage: npx tsx src/precompute.ts --config <name> --output <path> [--full-rebuild]",
    );
    process.exit(1);
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function log(msg: string): void {
  console.log(`[precompute] ${msg}`);
}

async function main(): Promise<void> {
  const args = parsePrecomputeArgs();
  const config = await loadConfig(args.config);
  const meta = args.fullRebuild ? null : await readMeta(config.name);
  const isFullMode = args.fullRebuild || meta === null;

  log(`Config: ${config.displayName} (${config.name})`);
  log(`Full rebuild: ${isFullMode}`);

  const context: PrecomputedContext = {
    config: {
      name: config.name,
      displayName: config.displayName,
      description: config.description,
    },
    mode: isFullMode ? "full" : "incremental",
    date: new Date().toISOString().split("T")[0],
    knowledge: await readKnowledge(config.name),
    knowledgePath: getKnowledgeRelativePath(config.name),
    allowedPaths: config.allowedPaths ?? [],
    checkoutCommit: getCurrentCommit(),
  };

  // --- Incremental change detection ---
  if (!isFullMode && meta) {
    const changedCommits = listCommitsSince(config.sourceCodePaths, meta.lastCommit);

    if (changedCommits.length === 0) {
      log("No source changes detected — writing skip context.");
      context.mode = "skip";
    } else {
      log(`Found ${changedCommits.length} changed commit(s). Extracting diffs...`);
      context.changes = {
        commits: changedCommits.map((sha) => ({
          sha,
          diff: getCommitDiff(sha, config.sourceCodePaths),
        })),
      };
    }
  }

  // --- Human feedback detection ---
  // Learn once from the latest merged automated PR that hasn't been processed yet.
  if (!isFullMode) {
    const latestMergedPr = getLatestMergedAutomatedPr(config.name);

    if (latestMergedPr && latestMergedPr !== meta?.lastPrNumber) {
      log(`Checking for human feedback on merged PR #${latestMergedPr}...`);
      const feedback = getHumanFeedback(latestMergedPr);

      if (feedback && feedback.commits.length > 0) {
        log(`Found ${feedback.commits.length} human commit(s). Extracting diffs...`);
        context.feedback = {
          prNumber: feedback.prNumber,
          // Extract only code diffs — no commit messages, no review comments
          humanCommitDiffs: feedback.commits
            .map((c) => ({
              sha: c.sha,
              diff: getCommitDiff(c.sha),
            }))
            .filter((c) => c.diff.length > 0),
        };
        if (context.feedback.humanCommitDiffs.length === 0) {
          context.feedback = undefined;
          log("Human commits had no extractable diffs.");
        }
      } else {
        log(`No human feedback detected on merged PR #${latestMergedPr}.`);
      }
    } else {
      log("No new merged automated PR found for feedback learning.");
    }
  }

  // --- Write output ---
  await mkdir(dirname(args.output), { recursive: true });
  await writeFile(args.output, JSON.stringify(context, null, 2), "utf-8");

  const sizeKB = (JSON.stringify(context).length / 1024).toFixed(1);
  log(`Context written to ${args.output} (${sizeKB} KB, mode: ${context.mode})`);
}

main().catch((err) => {
  console.error("[precompute] Fatal error:", err);
  process.exit(1);
});
