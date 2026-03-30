/**
 * Print allowedPaths from a doc-updater config, one per line.
 *
 * This is used by the agentic workflow post-step validation so it can
 * deterministically enforce file scope without relying on shell YAML parsing
 * or root-level node module resolution.
 *
 * Usage:
 *   npx tsx eng/scripts/doc-updater/src/print-allowed-paths.ts --config <name>
 */

import { loadConfig } from "./config.js";

function parseArgs(): { config: string } {
  const args = process.argv.slice(2);
  let config = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config") {
      config = args[++i];
    }
  }

  if (!config) {
    console.error(
      "Usage: npx tsx eng/scripts/doc-updater/src/print-allowed-paths.ts --config <name>",
    );
    process.exit(1);
  }

  return { config };
}

async function main(): Promise<void> {
  const { config } = parseArgs();
  const loaded = await loadConfig(config);

  for (const path of loaded.allowedPaths ?? []) {
    console.log(path);
  }
}

main().catch((err) => {
  console.error("[print-allowed-paths] Fatal error:", err);
  process.exit(1);
});
