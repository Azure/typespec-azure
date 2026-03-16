/**
 * Doc-updater orchestrator using GitHub Copilot SDK.
 *
 * Pipeline:
 *   1. Feedback: Learn from human corrections on the last PR (separate session)
 *   2. Doc Update: Build/update knowledge + update documentation (single session)
 *
 * Usage:
 *   tsx src/index.ts --config <name> [--full-rebuild] [--dry-run] [--model <model>]
 */

import { CopilotClient } from "@github/copilot-sdk";
import { resolve } from "node:path";
import { parseArgs } from "./cli.js";
import { loadConfig } from "./config.js";
import {
  getCurrentCommit,
  getHumanFeedback,
  listCommitsSince,
  readKnowledge,
  readMeta,
  writeMeta,
} from "./knowledge.js";
import { buildDocUpdatePrompt, buildFeedbackPrompt, loadPromptFile } from "./prompts.js";
import { buildGitHubMcpConfig, log, runAgentSession } from "./session.js";

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
    console.log(`Full Rebuild:  ${args.fullRebuild}`);
    console.log();

    // Feedback
    try {
      const meta = args.fullRebuild ? null : await readMeta(config.name);
      if (meta?.lastPrNumber) {
        const feedback = getHumanFeedback(meta.lastPrNumber);
        if (feedback) {
          const existingKnowledge = (await readKnowledge(config.name)) ?? "(none)";
          const docUpdatePrompt = await loadPromptFile(config.name, "doc-update");
          const prompt = buildFeedbackPrompt(config, feedback, existingKnowledge, docUpdatePrompt);
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

    // Doc Update (includes knowledge build)
    try {
      const meta = args.fullRebuild ? null : await readMeta(config.name);
      let changedCommits: string[] | undefined;
      if (meta && !args.fullRebuild) {
        changedCommits = listCommitsSince(config.sourceCodePaths, meta.lastCommit);
        if (changedCommits.length === 0) {
          console.log("--- Doc Update ---");
          console.log("(skipped — no source changes detected)");
          return;
        }
      }
      const prompt = await buildDocUpdatePrompt(config, changedCommits);
      console.log("--- Doc Update Prompt ---");
      console.log(prompt);
    } catch (e) {
      console.log(`Doc update prompt error: ${e}`);
    }
    return;
  }

  // --- Run the pipeline ---

  // Ensure the Copilot CLI agent starts in the repo root so it can
  // access all packages, docs, and run commands correctly.
  process.chdir(repoRoot);

  const client = new CopilotClient();

  try {
    // Early exit: if incremental mode and no source changes, skip everything
    const meta = await readMeta(config.name);
    let changedCommits: string[] | undefined;

    if (!args.fullRebuild && meta) {
      changedCommits = listCommitsSince(config.sourceCodePaths, meta.lastCommit);
      if (changedCommits.length === 0) {
        await writeMeta(config.name, {
          ...meta,
          lastCommit: getCurrentCommit(),
          lastUpdated: new Date().toISOString(),
        });
        log("No source changes detected — nothing to do.");
        await client.stop();
        return;
      }
    }

    // Step 1: Feedback Loop — learn from human corrections on the last PR
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
          const prompt = buildFeedbackPrompt(config, feedback, existingKnowledge, docUpdatePrompt);
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

      // Clear lastPrNumber so we don't re-check this PR on the next run
      await writeMeta(config.name, { ...meta, lastPrNumber: undefined });
    }

    // Step 2: Doc Update (knowledge build + doc update in one session)
    log(`Starting doc update for ${config.displayName} (model: ${args.model})`);

    const docPrompt = await buildDocUpdatePrompt(config, changedCommits);

    await runAgentSession(client, docPrompt, {
      model: args.model,
      repoRoot,
      phaseName: "Doc Update",
      mcpServers: buildGitHubMcpConfig(),
    });

    // Record the commit we just analyzed
    await writeMeta(config.name, {
      lastCommit: getCurrentCommit(),
      lastUpdated: new Date().toISOString(),
      analyzedPaths: config.sourceCodePaths,
    });

    log("Doc update complete.");
  } finally {
    await client.stop();
  }

  log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
