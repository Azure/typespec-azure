/**
 * Metadata updater for the doc-updater agentic workflow.
 *
 * Records the checkout commit hash and timestamp so the next incremental
 * run knows where to start.
 *
 * Usage:
 *   npx tsx src/update-meta.ts --config <name> --commit <hash>
 */

import { loadConfig } from "./config.js";
import { getLatestMergedAutomatedPr, writeMeta } from "./state.js";

function parseArgs(): { config: string; commit: string } {
  const args = process.argv.slice(2);
  let config = "";
  let commit = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config") {
      config = args[++i];
    } else if (args[i] === "--commit") {
      commit = args[++i];
    }
  }

  if (!config || !commit) {
    console.error("Usage: npx tsx src/update-meta.ts --config <name> --commit <hash>");
    process.exit(1);
  }

  return { config, commit };
}

async function main(): Promise<void> {
  const { config: configName, commit } = parseArgs();
  const config = await loadConfig(configName);

  const latestMergedPr = getLatestMergedAutomatedPr(configName);

  await writeMeta(configName, {
    lastCommit: commit,
    lastUpdated: new Date().toISOString(),
    analyzedPaths: config.sourceCodePaths,
    lastPrNumber: latestMergedPr ?? undefined,
  });

  console.log(
    `[update-meta] Updated metadata for ${configName}: commit ${commit.slice(0, 8)}`,
  );
}

main().catch((err) => {
  console.error("[update-meta] Fatal error:", err);
  process.exit(1);
});
