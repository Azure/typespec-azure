/**
 * Metadata updater for the doc-updater agentic workflow.
 *
 * Records the checkout commit hash, timestamp, and latest processed PR number
 * locally without calling `gh` (which is unauthenticated inside the agent sandbox).
 *
 * Usage:
 *   node src/update-meta.ts --config <name> --commit <hash> [--context <path>] [--last-pr <number>]
 */

import { readFile } from "node:fs/promises";
import { loadConfig } from "./config.ts";
import { readMeta, writeMeta } from "./state.ts";

const DEFAULT_CONTEXT_PATH = "/tmp/gh-aw/agent/context.json";

interface UpdateMetaArgs {
  config: string;
  commit: string;
  contextPath: string;
  lastPrNumber?: number;
}

function parseArgs(): UpdateMetaArgs {
  const args = process.argv.slice(2);
  let config = "";
  let commit = "";
  let contextPath = DEFAULT_CONTEXT_PATH;
  let lastPrNumber: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config") {
      config = args[++i];
    } else if (args[i] === "--commit") {
      commit = args[++i];
    } else if (args[i] === "--context") {
      contextPath = args[++i];
    } else if (args[i] === "--last-pr") {
      const parsed = Number(args[++i]);
      if (Number.isInteger(parsed) && parsed > 0) {
        lastPrNumber = parsed;
      }
    }
  }

  if (!config || !commit) {
    console.error(
      "Usage: node src/update-meta.ts --config <name> --commit <hash> [--context <path>] [--last-pr <number>]",
    );
    process.exit(1);
  }

  return { config, commit, contextPath, lastPrNumber };
}

async function readContextLastPrNumber(
  contextPath: string,
  configName: string,
): Promise<number | undefined> {
  try {
    const raw = await readFile(contextPath, "utf-8");
    const parsed = JSON.parse(raw) as {
      config?: { name?: string };
      lastPrNumber?: number;
      feedback?: { prNumber?: number };
    };
    if (parsed.config?.name && parsed.config.name !== configName) {
      return undefined;
    }
    const candidate = parsed.lastPrNumber ?? parsed.feedback?.prNumber;
    return typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0
      ? candidate
      : undefined;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const { config: configName, commit, contextPath, lastPrNumber } = parseArgs();
  const config = await loadConfig(configName);
  const existingMeta = await readMeta(configName);
  const resolvedLastPr =
    lastPrNumber ??
    (await readContextLastPrNumber(contextPath, configName)) ??
    existingMeta?.lastPrNumber;

  await writeMeta(configName, {
    lastCommit: commit,
    lastUpdated: new Date().toISOString(),
    analyzedPaths: config.sourceCodePaths,
    lastPrNumber: resolvedLastPr,
  });

  console.log(`[update-meta] Updated metadata for ${configName}: commit ${commit.slice(0, 8)}`);
}

main().catch((err) => {
  console.error("[update-meta] Fatal error:", err);
  process.exit(1);
});
