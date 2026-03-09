/**
 * Doc-updater orchestrator using GitHub Copilot SDK.
 *
 * Pipeline:
 *   Phase 0 — Feedback: Learn from human corrections on the last PR
 *   Phase 1 — Knowledge Build: Analyze source code → build/update knowledge base (system-driven)
 *   Phase 2 — Doc Update: Use knowledge base → update documentation (per-package prompt)
 *
 * Usage:
 *   tsx src/index.ts --config <name> [--focus <area>] [--phase <phase>] [--full-rebuild] [--dry-run] [--model <model>]
 */

import { CopilotClient } from "@github/copilot-sdk";
import { resolve } from "node:path";
import { parseArgs } from "./cli.js";
import { loadConfig } from "./config.js";
import {
  chunkArray,
  getCurrentCommit,
  getHumanFeedback,
  listCommitsSince,
  readKnowledge,
  readMeta,
  writeMeta,
} from "./knowledge.js";
import {
  buildDocUpdatePrompt,
  buildFeedbackPrompt,
  buildFullKnowledgePrompt,
  buildIncrementalKnowledgePrompt,
  COMMITS_PER_BATCH,
  loadPromptFile,
} from "./prompts.js";
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
