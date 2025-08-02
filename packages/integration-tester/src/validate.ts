import { execa } from "execa";
import { readdir } from "fs/promises";
import { globby } from "globby";
import { dirname, relative } from "pathe";
import pc from "picocolors";
import type { IntegrationTestSuite } from "./config/types.js";
import type { TaskRunner } from "./runner.js";
import { log } from "./utils.js";

// Number of parallel TypeSpec compilations to run
const COMPILATION_CONCURRENCY = 4;

export async function validateSpecs(
  runner: TaskRunner,
  dir: string,
  suite: IntegrationTestSuite,
): Promise<void> {
  const tspConfigDirs = await findTspProjects(dir, suite.pattern ?? "**/tspconfig.yaml");

  if (tspConfigDirs.length === 0) {
    log("No tspconfig.yaml files found in specification directory");
    return;
  }

  runner.group(
    `Found ${pc.yellow(tspConfigDirs.length)} TypeSpec projects`,
    tspConfigDirs.map((projectDir) => pc.bold(relative(dir, projectDir))).join("\n"),
  );

  let successCount = 0;
  let failureCount = 0;
  const failedFolders: string[] = []; // Create a processor function that handles the compilation and logging
  const processProject = async (projectDir: string) => {
    const result = await verifyProject(runner, projectDir);
    runner.reportTaskWithDetails(
      result.success ? "pass" : "fail",
      relative(dir, projectDir),
      result.output,
    );
    return { dir: projectDir, result };
  };

  // Run compilations in parallel with limited concurrency
  const results = await runWithConcurrency(tspConfigDirs, COMPILATION_CONCURRENCY, processProject);

  // Count successes and failures
  for (const { dir, result } of results) {
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
      failedFolders.push(dir);
    }
  }

  log(`\n=== Summary ===`);
  const passed = pc.bold(pc.green(`${successCount} passed`));
  const failed = failureCount > 0 ? pc.bold(pc.red(`${failureCount} failed`)) : undefined;
  log([passed, failed].filter(Boolean).join(pc.gray(" | ")), pc.gray(`(${tspConfigDirs.length})`));

  if (failureCount > 0) {
    log("\nFailed folders:");
    failedFolders.forEach((folder) => log(`  - ${folder}`));

    // Exit with failure code to make the GitHub Actions job fail
    process.exit(1);
  }
}

async function findTspProjects(wd: string, pattern: string): Promise<string[]> {
  const result = await globby(pattern, {
    cwd: wd,
    absolute: true,
  });
  return result.map((x) => dirname(x));
}

async function findTspEntrypoint(directory: string): Promise<string | null> {
  try {
    const entries = await readdir(directory);

    // Prefer main.tsp, fall back to client.tsp
    if (entries.includes("main.tsp")) {
      return "main.tsp";
    }
    if (entries.includes("client.tsp")) {
      return "client.tsp";
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function verifyProject(
  runner: TaskRunner,
  dir: string,
): Promise<{ success: boolean; output: string }> {
  const entrypoint = await findTspEntrypoint(dir);

  if (!entrypoint) {
    const result = {
      success: false,
      output: "No main.tsp or client.tsp file found in directory",
    };
    runner.reportTaskWithDetails("fail", dir, result.output);
    return result;
  }

  return execTspCompile(dir, entrypoint, entrypoint === "client.tsp" ? ["--dry-run"] : []);
}
async function execTspCompile(
  directory: string,
  file: string,
  args: string[] = [],
): Promise<{ success: boolean; output: string }> {
  const { all } = await execa("npx", ["tsp", "compile", file, "--warn-as-error", ...args], {
    cwd: directory,
    stdio: "pipe",
    all: true,
    env: { FORCE_COLOR: pc.isColorSupported ? "1" : undefined }, // Force color output
  });
  return {
    success: true,
    output: all,
  };
}

// Function to run tasks with limited concurrency
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}
