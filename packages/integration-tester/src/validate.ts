import { execa } from "execa";
import { readdir } from "fs/promises";
import { globby } from "globby";
import { cpus } from "os";
import { dirname, relative } from "pathe";
import pc from "picocolors";
import type { IntegrationTestSuite } from "./config/types.js";
import type { TaskRunner } from "./runner.js";
import { log, ValidationFailedError } from "./utils.js";

// Number of parallel TypeSpec compilations to run
const COMPILATION_CONCURRENCY = cpus().length;

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
    const result = await verifyProject(runner, projectDir, suite);
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
    failedFolders.forEach((x) => log(`  - ${relative(dir, x)}`));

    throw new ValidationFailedError();
  }
}

async function findTspProjects(wd: string, pattern: string): Promise<string[]> {
  const result = await globby(pattern, {
    cwd: wd,
    absolute: true,
  });
  return result.map((x) => dirname(x));
}

async function findTspEntrypoint(
  directory: string,
  suite: IntegrationTestSuite,
): Promise<string | null> {
  try {
    const entries = await readdir(directory);

    for (const entry of suite.entrypoints ?? ["main.tsp"]) {
      if (entries.includes(entry)) {
        return entry;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function verifyProject(
  runner: TaskRunner,
  dir: string,
  suite: IntegrationTestSuite,
): Promise<{ success: boolean; output: string }> {
  const entrypoint = await findTspEntrypoint(dir, suite);

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
  const { failed, all } = await execa(
    "npm",
    ["exec", "--no", "--", "tsp", "compile", file, "--warn-as-error", ...args],
    {
      cwd: directory,
      stdio: "pipe",
      all: true,
      reject: false,
      env: { FORCE_COLOR: pc.isColorSupported ? "1" : undefined }, // Force color output
    },
  );
  return {
    success: !failed,
    output: all,
  };
}

// Function to run tasks with limited concurrency
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const toRun = [...items];
  const results: R[] = [];
  let completed = 0;
  let running = 0;

  return new Promise((resolve, reject) => {
    function runNext() {
      if (toRun.length === 0 || running >= concurrency) {
        return;
      }

      const item = toRun.shift();
      if (!item) {
        return;
      }

      running++;
      processor(item)
        .then((result) => {
          results.push(result);
          completed++;
          running--;

          if (completed === items.length) {
            resolve(results);
            return;
          }

          runNext();
        })
        .catch((error) => {
          reject(error);
        });
    }

    // Start initial batch of tasks up to concurrency limit
    for (let i = 0; i < Math.min(concurrency, toRun.length); i++) {
      runNext();
    }
  });
}
