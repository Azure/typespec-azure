/**
 * Post-step metadata updater for the doc-updater agentic workflow.
 *
 * Run as a post-step after the agent completes to record the current
 * commit hash and timestamp, so the next incremental run knows where
 * to start.
 *
 * Usage:
 *   npx tsx src/update-meta.ts --config <name>
 */

import { loadConfig } from "./config.js";
import { getCurrentCommit, getLatestMergedAutomatedPr, writeMeta } from "./state.js";

function parseArgs(): { config: string } {
  const args = process.argv.slice(2);
  let config = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config") {
      config = args[++i];
    }
  }

  if (!config) {
    console.error("Usage: npx tsx src/update-meta.ts --config <name>");
    process.exit(1);
  }

  return { config };
}

async function main(): Promise<void> {
  const { config: configName } = parseArgs();
  const config = await loadConfig(configName);

  const currentCommit = getCurrentCommit();
  const latestMergedPr = getLatestMergedAutomatedPr(configName);

  await writeMeta(configName, {
    lastCommit: currentCommit,
    lastUpdated: new Date().toISOString(),
    analyzedPaths: config.sourceCodePaths,
    lastPrNumber: latestMergedPr ?? undefined,
  });

  console.log(
    `[update-meta] Updated metadata for ${configName}: commit ${currentCommit.slice(0, 8)}`,
  );
}

main().catch((err) => {
  console.error("[update-meta] Fatal error:", err);
  process.exit(1);
});
